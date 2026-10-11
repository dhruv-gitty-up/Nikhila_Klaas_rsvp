import { NextResponse } from "next/server";
import { PHONE_ERROR, validatePhone } from "@/lib/rsvp";
import { STATUS_NOT_FOUND, type RsvpStatus } from "@/lib/rsvp-status";
import { createRsvpClient } from "@/lib/supabase";

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host") ?? new URL(request.url).host;
    try {
      const source = new URL(origin);
      if (source.host !== host || !["http:", "https:"].includes(source.protocol)) {
        return reply({ error: "Please check your status from our wedding website." }, 403);
      }
    } catch {
      return reply({ error: "Please check your status from our wedding website." }, 403);
    }
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return reply({ error: "Please enter a valid phone number." }, 415);
  }
  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 1024) {
      return reply({ error: "Please enter a valid phone number." }, 413);
    }
    input = JSON.parse(body);
  } catch {
    return reply({ error: "Please enter a valid phone number." }, 400);
  }
  const phone = validatePhone(input && typeof input === "object" ? (input as Record<string, unknown>).phone : null);
  if (!phone) return reply({ error: PHONE_ERROR }, 400);
  try {
    const supabase = createRsvpClient();
    if (!supabase) return reply({ error: "Status checks aren’t available just yet. Please check back soon." }, 503);
    const { data, error } = await supabase.from("rsvps").select("*").eq("phone", phone).single();
    // A unique phone guarantees at most one match; PGRST116 means no reply.
    if (error?.code === "PGRST116") return reply({ error: STATUS_NOT_FOUND }, 404);
    if (error || !data) {
      if (error) console.error("RSVP status lookup failed", { code: error.code });
      return reply({ error: "We couldn’t check your status. Please try again in a moment." }, 502);
    }
    // Return only the guest summary and the requested host note. Guest messages
    // and database identifiers stay on the server.
    const result: RsvpStatus = {
      names: data.names, attending: data.attending, guest_count: data.guest_count,
      room_confirmed: data.room_confirmed === true,
      admin_comments: typeof data.admin_comments === "string" ? data.admin_comments : null,
    };
    return reply({ data: result });
  } catch {
    return reply({ error: "We couldn’t connect just now. Please try again in a moment." }, 502);
  }
}
