"use client";

import { useEffect, useState } from "react";
import { formatMs, type TrackInfo } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase/client";

type Lap = { id: string; driver_name: string; gamertag: string; car: string; lap_time_ms: number; recorded_at: string };
export function GlobalLeaderboard({ track }: { track: TrackInfo }) {
  const [laps, setLaps] = useState<Lap[]>([]);
  useEffect(() => { const client = supabase; if (!client || track.id < 0) return; const load = () => client.from("laps").select("id,driver_name,gamertag,car,lap_time_ms,recorded_at").eq("track_id", track.id).eq("valid", true).order("lap_time_ms").limit(10).then(({ data }) => setLaps(data || [])); load(); const channel = client.channel(`track-${track.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "laps", filter: `track_id=eq.${track.id}` }, load).subscribe(); return () => { client.removeChannel(channel); }; }, [track.id]);
  if (!supabase) return null;
  return <section className="mt-5 overflow-hidden border border-white/10 bg-panel"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-f1">Worldwide</p><h2 className="text-xl font-bold uppercase">{track.name} all-time</h2></div><span className="text-xs text-zinc-400">TOP 10</span></div>{laps.length ? <ol className="timing-grid font-timing text-sm">{laps.map((lap, index) => <li key={lap.id} className="grid grid-cols-[3rem_1fr_auto] items-center border-t border-white/[.06] px-4 py-3"><b className="text-f1">{index + 1}</b><span><b>{lap.gamertag || lap.driver_name}</b><small className="ml-2 text-zinc-500">{lap.car}</small></span><b>{formatMs(lap.lap_time_ms)}</b></li>)}</ol> : <p className="px-4 py-8 text-center text-sm text-zinc-500">No verified laps recorded for this circuit yet.</p>}</section>;
}
