"use client";

import { useEffect, useRef, useState } from "react";
import type { TrackInfo } from "@/lib/telemetry";

const supportedTrackIds = new Set([0, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 26, 27, 28, 29, 30, 31, 32]);
type Marker = { x: number; y: number };

export function TrackMap({ track, lapDistance }: { track: TrackInfo; lapDistance: number }) {
  const [pathData, setPathData] = useState("");
  const pathRef = useRef<SVGPathElement>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const hasAccurateMap = supportedTrackIds.has(track.id);
  // The source circuit vectors are traced in the opposite direction to F1 UDP lap distance.
  const progress = track.trackLength > 0 && lapDistance >= 0 ? 1 - Math.min(1, lapDistance / track.trackLength) : 1;

  useEffect(() => {
    setPathData("");
    if (!hasAccurateMap) return;
    fetch(`/tracks/${track.id}.svg`).then((response) => response.text()).then((svg) => {
      const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
      setPathData(parsed.querySelector("path")?.getAttribute("d") || "");
    }).catch(() => setPathData(""));
  }, [hasAccurateMap, track.id]);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || !pathData) return;
    const point = path.getPointAtLength(path.getTotalLength() * progress);
    setMarker({ x: point.x, y: point.y });
  }, [pathData, progress]);

  return <section className="scanline relative min-h-[340px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#171722] to-[#0b0b10] p-5"><div className="absolute left-5 top-4 z-10"><p className="text-[10px] font-bold tracking-[.25em] text-f1">Circuit monitor</p><h2 className="max-w-[230px] text-xl font-bold uppercase leading-none">{track.name}</h2><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{track.country}</p></div>{pathData ? <svg viewBox="0 0 500 500" className="mx-auto mt-8 h-[306px] w-full max-w-[410px]" aria-label={`${track.name} live circuit map`}><path ref={pathRef} d={pathData} fill="none" stroke="#343440" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" /><path d={pathData} fill="none" stroke="#f1f1f1" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />{marker && <g><circle cx={marker.x} cy={marker.y} r="16" fill="#e10600" opacity=".25" className="animate-ping" /><circle cx={marker.x} cy={marker.y} r="8" fill="#e10600" stroke="white" strokeWidth="3" /><text x={marker.x + 14} y={marker.y - 12} fill="white" fontSize="12" fontFamily="monospace">YOU</text></g>}</svg> : <div className="grid h-[310px] place-items-center pt-14 text-center"><p className="font-timing text-xs text-zinc-400">{hasAccurateMap ? "Loading circuit layout…" : "Circuit map loading"}</p></div>}<div className="absolute bottom-4 right-5 text-right font-timing text-[10px] uppercase tracking-wider text-zinc-500"><div>{track.trackLength ? `${track.trackLength.toLocaleString()} m` : "Track ID " + track.id} · Live position</div><a className="text-zinc-600 hover:text-zinc-300" href="https://github.com/julesr0y/f1-circuits-svg" target="_blank" rel="noreferrer">Circuit layouts: Jules Roy · CC BY 4.0</a></div></section>;
}
