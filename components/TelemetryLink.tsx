"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { DriverDetails } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase/client";

export function TelemetryLink({ user, details }: { user: User | null; details: DriverDetails | null }) {
  const [command, setCommand] = useState("");
  const [message, setMessage] = useState("");
  if (!user || !details || !supabase) return null;
  const client = supabase;
  const driver = details;

  async function createLink() {
    setMessage("");
    const { data: { session } } = await client.auth.getSession();
    if (!session) return setMessage("Your sign-in expired. Please sign in again.");
    const response = await fetch("/api/telemetry-link", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ driverName: driver.name, gamertag: driver.gamertag, inputSetup: driver.input }),
    });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error || "Could not link the relay.");
    setCommand(`$env:TELEMETRY_SESSION_TOKEN = "${payload.sessionToken}"`);
    setMessage("Copy this one-time relay link. It expires in 12 hours.");
  }
  return <section className="mt-5 border border-white/10 bg-panel p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-f1">Verified relay</p><h2 className="text-lg font-bold uppercase">Save authenticated laps</h2><p className="mt-1 max-w-2xl text-xs text-zinc-400">This pairs the UDP listener running on this PC with your signed-in account. Invalid laps and duplicate lap numbers are rejected before they enter the leaderboard.</p></div><button onClick={createLink} className="bg-f1 px-4 py-2 text-xs font-bold uppercase hover:bg-red-500">Generate relay link</button></div>{message && <p className="mt-3 text-xs text-yellow-200">{message}</p>}{command && <div className="mt-3 flex flex-wrap gap-2"><code className="min-w-0 flex-1 overflow-x-auto border border-white/10 bg-black/35 p-3 text-xs text-lime-300">{command}</code><button onClick={() => void navigator.clipboard.writeText(command)} className="border border-white/25 px-3 text-xs font-bold uppercase hover:border-f1">Copy</button></div>}<p className="mt-2 text-[11px] text-zinc-500">In the same PowerShell window: paste the line, then restart <code>npm run listener</code>. Never share the generated value.</p></section>;
}
