import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient<any>> | undefined;

// This client is server-only. Never import it from a component or expose its key.
export function getSupabaseAdmin() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server credentials are not configured.");
  client = createClient<any>(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}
