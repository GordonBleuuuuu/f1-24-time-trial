"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { formatMs, type TrackInfo } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase/client";

type Lap = { id: string; track_name: string; car: string; lap_time_ms: number; recorded_at: string; source_verified: boolean };
export function PersonalDashboard({ user, track }: { user: User | null; track: TrackInfo }) {
  const [laps, setLaps] = useState<Lap[]>([]);
  useEffect(() => { if (!supabase || !user) return; void supabase.from("laps").select("id,track_name,car,lap_time_ms,recorded_at,source_verified").eq("user_id", user.id).eq("valid", true).order("recorded_at", { ascending: false }).limit(12).then(({ data }) => setLaps(data || [])); }, [user]);
  const currentBest = useMemo(() => laps.filter((lap) => lap.track_name === track.name).reduce((best, lap) => Math.min(best, lap.lap_time_ms), Infinity), [laps, track.name]);
  if (!user || !supabase) return null;
  return <section className="mt-5 overflow-hidden border border-white/10 bg-panel"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-f1">Driver garage</p><h2 className="text-xl font-bold uppercase">Your lap history</h2></div><div className="text-right"><p className="text-[10px] uppercase text-zinc-500">{track.name} PB</p><b className="font-timing">{Number.isFinite(currentBest) ? formatMs(currentBest) : "—"}</b></div></div>{laps.length ? <ol className="font-timing text-sm">{laps.map((lap) => <li key={lap.id} className="grid grid-cols-[1fr_auto] items-center border-t border-white/[.06] px-4 py-3"><span><b>{lap.track_name}</b><small className="ml-2 text-zinc-500">{lap.car} · {new Date(lap.recorded_at).toLocaleDateString()}</small></span><span className="flex items-center gap-2"><b>{formatMs(lap.lap_time_ms)}</b>{lap.source_verified && <i className="not-italic text-[9px] font-bold text-lime-300">VERIFIED</i>}</span></li>)}</ol> : <p className="px-4 py-8 text-center text-sm text-zinc-500">Your completed verified laps will appear here.</p>}</section>;
}
