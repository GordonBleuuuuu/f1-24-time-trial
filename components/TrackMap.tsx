import type { TrackInfo } from "@/lib/telemetry";

// Broadcast-style simplified circuit profiles. The telemetry packet selects the profile by track ID.
const outlines = [
  "M80 150 C102 48 232 41 325 86 L370 145 L322 190 L365 250 C313 372 144 370 70 285 L102 215 L62 180 Z",
  "M72 126 C128 35 245 43 286 111 L365 121 L330 188 L367 260 L292 350 L149 336 L76 263 L112 196 Z",
  "M88 103 L211 60 L338 105 L360 205 L312 334 L190 365 L82 293 L57 192 Z",
  "M62 126 C110 62 204 94 252 70 L340 108 L353 204 L293 243 L323 334 L185 362 L94 315 L73 232 L115 184 Z",
  "M74 95 L256 68 L351 143 L318 214 L355 287 L240 356 L112 325 L66 246 L105 182 Z",
];

export function TrackMap({ track }: { track: TrackInfo }) {
  const outline = outlines[Math.abs(track.id) % outlines.length];
  const corners = [[92,125,"1"],[205,72,"2"],[330,120,"3"],[348,220,"4"],[292,330,"5"],[175,348,"6"],[78,275,"7"],[76,180,"8"]];
  return <section className="scanline relative min-h-[340px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#171722] to-[#0b0b10] p-5"><div className="absolute left-5 top-4"><p className="text-[10px] font-bold tracking-[.25em] text-f1">Circuit monitor</p><h2 className="text-xl font-bold uppercase">{track.name}</h2><p className="text-[10px] uppercase tracking-wider text-zinc-500">{track.country}</p></div><svg viewBox="0 0 430 430" className="mx-auto mt-7 h-[310px] w-full max-w-[460px]" aria-label={`${track.name} track map`}><path d={outline} fill="none" stroke="#343440" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" /><path d={outline} fill="none" stroke="#f1f1f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d={outline.split(" L").slice(0, 3).join(" L")} fill="none" stroke="#e10600" strokeWidth="5" strokeLinecap="round" /><circle cx="86" cy="115" r="10" fill="#e10600" />{corners.map(([x, y, label]) => <g key={String(label)}><circle cx={x} cy={y} r="12" fill="#22222d" stroke="#555563" /><text x={x} y={(y as number) + 4} textAnchor="middle" fill="#e8e8e8" fontSize="11" fontFamily="monospace">{label}</text></g>)}<circle cx="276" cy="82" r="8" fill="#e10600" className="animate-pulse" /><text x="291" y="86" fill="white" fontSize="12" fontFamily="monospace">LIVE</text></svg><div className="absolute bottom-4 right-5 font-timing text-[10px] uppercase tracking-wider text-zinc-500">Track ID {track.id} · Live position</div></section>;
}
