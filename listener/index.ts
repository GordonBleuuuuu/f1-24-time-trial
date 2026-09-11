import dgram from "node:dgram";
import WebSocket from "ws";
const UDP_PORT = Number(process.env.F1_UDP_PORT || 20777), WS_URL = process.env.TELEMETRY_WS_URL, WRITE_KEY = process.env.TELEMETRY_WRITE_KEY;
if (!WS_URL) throw new Error("Set TELEMETRY_WS_URL, e.g. wss://your-project.vercel.app/api/ws");
if (!WRITE_KEY) throw new Error("Set TELEMETRY_WRITE_KEY to the Vercel environment variable value.");
type Header = { packetFormat: number; packetId: number; playerCarIndex: number };
type HistoryLap = { lapTime: number; sector1: number; sector2: number; sector3: number; valid: boolean };
type Participant = { name: string; teamId: number; team: string };
type Track = { id: number; name: string; country: string; trackLength: number };
const TEAM_NAMES: Record<number, string> = { 0: "Mercedes", 1: "Ferrari", 2: "Red Bull Racing", 3: "Williams", 4: "Aston Martin", 5: "Alpine", 6: "RB", 7: "Haas", 8: "McLaren", 9: "Alfa Romeo", 85: "Kick Sauber" };
const TRACKS: Record<number, Omit<Track, "id" | "trackLength">> = { 0: { name: "Albert Park", country: "Australia" }, 2: { name: "Shanghai International Circuit", country: "China" }, 3: { name: "Bahrain International Circuit", country: "Bahrain" }, 4: { name: "Circuit de Barcelona-Catalunya", country: "Spain" }, 5: { name: "Circuit de Monaco", country: "Monaco" }, 6: { name: "Circuit Gilles-Villeneuve", country: "Canada" }, 7: { name: "Silverstone", country: "Great Britain" }, 9: { name: "Hungaroring", country: "Hungary" }, 10: { name: "Circuit de Spa-Francorchamps", country: "Belgium" }, 11: { name: "Autodromo Nazionale Monza", country: "Italy" }, 12: { name: "Marina Bay Street Circuit", country: "Singapore" }, 13: { name: "Suzuka International Racing Course", country: "Japan" }, 14: { name: "Yas Marina Circuit", country: "Abu Dhabi" }, 15: { name: "Circuit of the Americas", country: "United States" }, 16: { name: "Interlagos", country: "Brazil" }, 17: { name: "Red Bull Ring", country: "Austria" }, 19: { name: "Autodromo Hermanos Rodriguez", country: "Mexico" }, 20: { name: "Baku City Circuit", country: "Azerbaijan" }, 26: { name: "Circuit Zandvoort", country: "Netherlands" }, 27: { name: "Imola", country: "Italy" }, 28: { name: "Autodromo Internacional do Algarve", country: "Portugal" }, 29: { name: "Jeddah Corniche Circuit", country: "Saudi Arabia" }, 30: { name: "Miami International Autodrome", country: "United States" }, 31: { name: "Las Vegas Strip Circuit", country: "United States" }, 32: { name: "Lusail International Circuit", country: "Qatar" } };
const HEADER_SIZE = 29, LAP_DATA_SIZE = 57, PARTICIPANT_SIZE = 56, historyByCar = new Map<number, HistoryLap[]>(), participants = new Map<number, Participant>();
const duration = (minutes: number, milliseconds: number) => minutes * 60_000 + milliseconds;
const cleanName = (buffer: Buffer) => buffer.toString("utf8").replace(/\0.*$/, "").trim();
function readHeader(packet: Buffer): Header | null { return packet.length < HEADER_SIZE ? null : { packetFormat: packet.readUInt16LE(0), packetId: packet.readUInt8(6), playerCarIndex: packet.readUInt8(27) }; }
function parseParticipants(packet: Buffer) { const activeCars = packet.readUInt8(HEADER_SIZE); for (let car = 0; car < Math.min(activeCars, 22); car++) { const offset = HEADER_SIZE + 1 + car * PARTICIPANT_SIZE; if (offset + PARTICIPANT_SIZE > packet.length) break; const teamId = packet.readUInt8(offset + 3); participants.set(car, { name: cleanName(packet.subarray(offset + 7, offset + 55)), teamId, team: TEAM_NAMES[teamId] || `Team ${teamId}` }); } }
function parseSessionHistory(packet: Buffer) { if (packet.length < HEADER_SIZE + 8) return; const carIndex = packet.readUInt8(HEADER_SIZE), numLaps = packet.readUInt8(HEADER_SIZE + 1), laps: HistoryLap[] = []; let offset = HEADER_SIZE + 8; for (let lap = 0; lap < Math.min(numLaps, 100); lap++, offset += 14) { if (offset + 14 > packet.length) break; const flags = packet.readUInt8(offset + 13); laps.push({ lapTime: packet.readUInt32LE(offset), sector1: duration(packet.readUInt8(offset + 6), packet.readUInt16LE(offset + 4)), sector2: duration(packet.readUInt8(offset + 9), packet.readUInt16LE(offset + 7)), sector3: duration(packet.readUInt8(offset + 12), packet.readUInt16LE(offset + 10)), valid: Boolean(flags & 1) }); } historyByCar.set(carIndex, laps); }
let announcedTrack = -999;
function parseSession(packet: Buffer) { if (packet.length < HEADER_SIZE + 8) return; const id = packet.readInt8(HEADER_SIZE + 7); if (id === announcedTrack) return; announcedTrack = id; const known = TRACKS[id], trackLength = packet.readUInt16LE(HEADER_SIZE + 4); const track: Track = known ? { id, ...known, trackLength } : { id, name: `Circuit ${id}`, country: "Unknown location", trackLength }; console.log(`Session track: ${track.name} (${track.country})`); broadcast({ type: "session", payload: track }); }
function parseLapData(packet: Buffer, header: Header) { const car = header.playerCarIndex, offset = HEADER_SIZE + car * LAP_DATA_SIZE; if (offset + LAP_DATA_SIZE > packet.length) return; const participant = participants.get(car), completed = historyByCar.get(car)?.filter((lap) => lap.valid) ?? [], previous = completed.at(-1), bestSector = (field: "sector1" | "sector2" | "sector3") => { const candidate = Math.min(...completed.map((lap) => lap[field]).filter(Boolean), Infinity); return Number.isFinite(candidate) ? candidate : 0; }, lastLapTime = packet.readUInt32LE(offset), currentLapTime = packet.readUInt32LE(offset + 4), sector1 = duration(packet.readUInt8(offset + 10), packet.readUInt16LE(offset + 8)), sector2 = duration(packet.readUInt8(offset + 13), packet.readUInt16LE(offset + 11)), deltaToLeader = duration(packet.readUInt8(offset + 19), packet.readUInt16LE(offset + 17)), lapDistance = packet.readFloatLE(offset + 20); broadcast({ type: "lap", payload: { carIndex: car, position: packet.readUInt8(offset + 32), currentLap: packet.readUInt8(offset + 33), currentLapTime, lastLapTime, sector1, sector2, sector3: previous?.lapTime === lastLapTime ? previous.sector3 : 0, personalBestSector1: bestSector("sector1"), personalBestSector2: bestSector("sector2"), personalBestSector3: bestSector("sector3"), deltaToLeader, lapDistance, teamId: participant?.teamId ?? -1, team: participant?.team ?? "Unknown team", car: participant?.team ?? "Unknown car", driverName: participant?.name ?? "PLAYER", lapValid: packet.readUInt8(offset + 37) === 0, timestamp: Date.now() } }); }
let ws: WebSocket | undefined;
function connect() { const separator = WS_URL!.includes("?") ? "&" : "?"; ws = new WebSocket(`${WS_URL}${separator}key=${encodeURIComponent(WRITE_KEY!)}`); ws.on("open", () => console.log(`Connected to telemetry relay (${WS_URL})`)); ws.on("close", () => { console.log("Relay disconnected; retrying in 2 seconds…"); setTimeout(connect, 2000); }); ws.on("error", () => ws?.close()); }
function broadcast(message: unknown) { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message)); }
connect();
const udp = dgram.createSocket("udp4");
const announcedPackets = new Set<string>();
let lastLapForwardLog = 0;
udp.on("message", (packet) => {
  const header = readHeader(packet);
  if (!header) return;
  const packetKey = `${header.packetFormat}:${header.packetId}`;
  if (!announcedPackets.has(packetKey)) {
    announcedPackets.add(packetKey);
    console.log(`F1 UDP received: format=${header.packetFormat}, packetId=${header.packetId}`);
  }
  if (header.packetFormat !== 2024) return;
  if (header.packetId === 1) parseSession(packet);
  if (header.packetId === 4) parseParticipants(packet);
  if (header.packetId === 11) parseSessionHistory(packet);
  if (header.packetId === 2) {
    if (Date.now() - lastLapForwardLog > 2_000) {
      lastLapForwardLog = Date.now();
      console.log("Forwarding F1 lap telemetry to Vercel…");
    }
    parseLapData(packet, header);
  }
});
udp.on("error", (error) => console.error("UDP listener error:", error.message));
udp.bind(UDP_PORT, "0.0.0.0", () => console.log(`F1 24 UDP listener bound to 0.0.0.0:${UDP_PORT}`));
