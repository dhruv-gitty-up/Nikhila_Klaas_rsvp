import { NextResponse } from "next/server";
import { validateRsvp } from "@/lib/rsvp";
import { createRsvpClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    // Next's request URL can contain its internal hostname. Compare the incoming
    // browser origin with Host so 127.0.0.1 and deployed domains work correctly.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    let sameHost = false;
    try {
      const source = new URL(origin);
      sameHost = source.host === host && ["http:", "https:"].includes(source.protocol);
    } catch { /* A malformed or opaque origin is not an allowed browser origin. */ }
    if (!sameHost) {
      return NextResponse.json({ error: "Please submit your RSVP from our wedding website." }, { status: 403 });
    }
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Please submit a valid RSVP." }, { status: 415 });
  }
  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 12000) {
      return NextResponse.json({ error: "Your message is too long." }, { status: 413 });
    }
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Please submit a valid RSVP." }, { status: 400 });
  }
  const result = validateRsvp(input);
  if (!result.data) return NextResponse.json({ error: result.error, field: result.field }, { status: 400 });
  try {
    const supabase = createRsvpClient();
    if (!supabase) {
      return NextResponse.json({ error: "RSVPs aren’t open just yet. Please check back soon." }, { status: 503 });
    }
    // Save only validated columns; keep the phone identifier and guest replies private.
    const { error } = await supabase.from("rsvps").upsert(result.data, { onConflict: "phone" });
    if (error) {
      console.error("RSVP upsert failed", { code: error.code });
      return NextResponse.json({ error: "We couldn’t save your RSVP. Please try again in a moment." }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "We couldn’t connect just now. Please try again in a moment." }, { status: 502 });
  }
}
