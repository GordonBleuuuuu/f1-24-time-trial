import type { TrackInfo } from "@/lib/telemetry";

const supportedTrackIds = new Set([0, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 26, 27, 28, 29, 30, 31, 32]);

export function TrackMap({ track }: { track: TrackInfo }) {
  const hasAccurateMap = supportedTrackIds.has(track.id);
  return <section className="scanline relative min-h-[340px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#171722] to-[#0b0b10] p-5"><div className="absolute left-5 top-4 z-10"><p className="text-[10px] font-bold tracking-[.25em] text-f1">Circuit monitor</p><h2 className="max-w-[230px] text-xl font-bold uppercase leading-none">{track.name}</h2><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{track.country}</p></div>{hasAccurateMap ? <img src={`/tracks/${track.id}.svg`} alt={`${track.name} circuit layout`} className="mx-auto mt-8 h-[306px] w-full max-w-[410px] object-contain opacity-95" /> : <div className="grid h-[310px] place-items-center pt-14 text-center"><div><div className="mx-auto mb-4 h-36 w-60 rounded-[44%_56%_49%_51%/43%_45%_55%_57%] border-[10px] border-zinc-500" /><p className="font-timing text-xs text-zinc-400">Circuit map loading</p></div></div>}<div className="absolute bottom-4 right-5 text-right font-timing text-[10px] uppercase tracking-wider text-zinc-500"><div>Track ID {track.id} · Live position</div><a className="text-zinc-600 hover:text-zinc-300" href="https://github.com/julesr0y/f1-circuits-svg" target="_blank" rel="noreferrer">Circuit layouts: Jules Roy · CC BY 4.0</a></div></section>;
}
