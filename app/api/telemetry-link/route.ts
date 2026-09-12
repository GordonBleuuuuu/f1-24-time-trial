import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Sign in before linking the relay." }, { status: 401 });

  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Your sign-in session has expired." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const driverName = String(body.driverName || auth.user.user_metadata.display_name || "Driver").slice(0, 80);
  const gamertag = String(body.gamertag || auth.user.user_metadata.gamertag || "Driver").slice(0, 40);
  const inputSetup = String(body.inputSetup || "Unspecified").slice(0, 80);
  const assistPreset = String(body.assistPreset || "Unspecified").slice(0, 80);
  const platform = String(body.platform || "PC").slice(0, 40);
  const sessionToken = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from("telemetry_sessions").insert({
    user_id: auth.user.id,
    driver_name: driverName,
    gamertag,
    input_setup: inputSetup,
    assist_preset: assistPreset,
    platform,
    session_token: sessionToken,
    expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: "Could not create the relay link." }, { status: 500 });

  return NextResponse.json({ sessionToken, expiresAt });
}
