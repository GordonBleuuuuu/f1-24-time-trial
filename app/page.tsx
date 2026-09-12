"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AccountPanel } from "@/components/AccountPanel";
import { GlobalLeaderboard } from "@/components/GlobalLeaderboard";
import { PersonalDashboard } from "@/components/PersonalDashboard";
import { TelemetryLink } from "@/components/TelemetryLink";
import { Leaderboard } from "@/components/Leaderboard";
import { TrackMap } from "@/components/TrackMap";
import type { DriverDetails, DriverLap, TelemetryEnvelope, TrackInfo } from "@/lib/telemetry";
import type { User } from "@supabase/supabase-js";

function websocketUrl() {
  if (process.env.NEXT_PUBLIC_TELEMETRY_WS_URL) return process.env.NEXT_PUBLIC_TELEMETRY_WS_URL;
  if (typeof window === "undefined") return "";
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws`;
}

export default function Dashboard() {
  const socket = useRef<WebSocket | null>(null);
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [laps, setLaps] = useState<Record<number, DriverLap>>({});
  const [track, setTrack] = useState<TrackInfo>({ id: -1, name: "TIME TRIAL", country: "Awaiting session", trackLength: 0 });
  const [account, setAccount] = useState<User | null>(null);

  useEffect(() => {
    let disposed = false;
    const connect = () => {
      const ws = new WebSocket(websocketUrl());
      socket.current = ws;
      ws.onopen = () => { if (!disposed) setConnected(true); };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as TelemetryEnvelope;
          if (message.type === "lap") setLaps((current) => ({ ...current, [message.payload.carIndex]: message.payload }));
          if (message.type === "session") setTrack(message.payload);
        } catch { /* Ignore non-telemetry frames. */ }
      };
      ws.onclose = () => { if (!disposed) { setConnected(false); reconnect.current = setTimeout(connect, 2000); } };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => { disposed = true; if (reconnect.current) clearTimeout(reconnect.current); socket.current?.close(); };
  }, []);

  const liveLaps = useMemo(() => Object.values(laps), [laps]);
  const driver = liveLaps[0];
  const details: DriverDetails | null = account ? {
    name: String(account.user_metadata.display_name || account.email?.split("@")[0] || "Driver"),
    gamertag: String(account.user_metadata.gamertag || account.email?.split("@")[0] || "Driver"),
    input: String(account.user_metadata.input_setup || "Unspecified"),
    assistPreset: String(account.user_metadata.assist_preset || "Unspecified"),
    platform: String(account.user_metadata.platform || "PC"),
  } : null;

  return <main className="min-h-screen bg-ink pb-10">
    <header className="border-b-4 border-f1 bg-[#e10600] px-5 py-3 text-white sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="text-[10px] font-bold tracking-[.22em] text-white/80">F1 24 · PC TELEMETRY</p><h1 className="text-xl font-bold uppercase leading-none">Time Trial Live</h1></div><div className="flex items-center gap-3 text-xs font-bold uppercase"><span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-lime-300" : "bg-zinc-800"}`} />{connected ? "Signal linked" : "Reconnecting"}<AccountPanel onUserChange={setAccount} /></div></div></header>
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-zinc-500">Session telemetry</p><h2 className="text-3xl font-bold uppercase">{driver?.team || "Waiting for session"}</h2></div>{details && <div className="border-l-2 border-f1 pl-3 text-right"><p className="text-sm font-bold uppercase">{details.name} <span className="text-zinc-400">/ {details.gamertag}</span></p><p className="text-xs text-zinc-500">{details.input}</p></div>}</div>
      <div className="grid gap-5 lg:grid-cols-[1.45fr_.9fr]"><Leaderboard laps={liveLaps} identity={details || undefined} /><TrackMap track={track} lapDistance={driver?.lapDistance ?? 0} /></div>
      <GlobalLeaderboard track={track} />
      <TelemetryLink user={account} details={details} />
      <PersonalDashboard user={account} track={track} />
      <p className="mt-5 text-center text-xs text-zinc-600">Purple = session best · Green = personal best · Yellow = slower split · Telemetry is sourced from your local F1 24 UDP stream.</p>
    </div>
  </main>;
}
