import "server-only";
import { env } from "node:process";
import { createClient } from "@supabase/supabase-js";

export function createRsvpClient() {
  // Read at runtime in this server-only module. This also lets integration tests
  // replace both values with a local fixture without touching the live project.
  const url = Reflect.get(env, "NEXT_PUBLIC_SUPABASE_URL") as string | undefined;
  // Upserts need SELECT + UPDATE privileges. A server-only key lets us keep
  // anonymous guests from reading everyone's phone numbers and messages.
  const key = (Reflect.get(env, "SUPABASE_SECRET_KEY") || Reflect.get(env, "SUPABASE_SERVICE_ROLE_KEY")) as string | undefined;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) },
  });
}
