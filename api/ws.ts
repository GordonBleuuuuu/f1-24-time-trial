import express from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { getSupabaseAdmin } from "../lib/supabase/admin.js";

const app = express();
const server = createServer(app);
const clients = new WebSocketServer({ server, maxPayload: 16 * 1024 });
let lastLap = "";
let lastSession = "";
type Track = { id: number; name: string; trackLength: number; weather?: string; gameSessionUid?: string };
type RelaySession = { id: string; user_id: string; driver_name: string; gamertag: string; input_setup: string; assist_preset: string; platform: string; expires_at: string };
type ProducerState = { link?: RelaySession; track?: Track; submitted: Set<string> };
const producerState = new WeakMap<WebSocket, ProducerState>();

function publish(raw: string, except?: WebSocket) { clients.clients.forEach((client) => { if (client !== except && client.readyState === WebSocket.OPEN) client.send(raw); }); }
clients.on("connection", (socket, request) => {
  const url = new URL(request.url || "/", "https://telemetry.local");
  const isProducer = Boolean(process.env.TELEMETRY_WRITE_KEY) && url.searchParams.get("key") === process.env.TELEMETRY_WRITE_KEY;
  const state: ProducerState = { submitted: new Set() };
  if (isProducer) producerState.set(socket, state);
  const pairingToken = url.searchParams.get("session");
  if (isProducer && pairingToken) {
    void getSupabaseAdmin()
      .from("telemetry_sessions")
      .select("id,user_id,driver_name,gamertag,input_setup,assist_preset,platform,expires_at")
      .eq("session_token", pairingToken)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return console.warn("Telemetry producer connected without a valid account link");
        state.link = data as RelaySession;
        console.info(`Verified relay linked to ${state.link.gamertag}`);
      });
  }
  console.info(`WebSocket connected: ${isProducer ? "telemetry producer" : "viewer"}; clients=${clients.clients.size}`);
  socket.send(JSON.stringify({ type: "hello", payload: { connectedAt: Date.now() } }));
  if (lastLap) socket.send(lastLap);
  if (lastSession) socket.send(lastSession);
  socket.on("message", async (data, isBinary) => {
    const rawPayload = Buffer.isBuffer(data) ? data : Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
    if (isBinary || rawPayload.length > 16 * 1024) return;
    let message: unknown; try { message = JSON.parse(rawPayload.toString()); } catch { return; }
    if (!message || typeof message !== "object" || !("type" in message)) return;
    const type = (message as { type: unknown }).type;
    if (type === "lap" && !isProducer) { console.warn("Rejected untrusted lap message"); return; }
    if (type !== "lap" && type !== "session" && type !== "identity") return;
    const raw = JSON.stringify(message);
    if (type === "session" && isProducer) state.track = (message as unknown as { payload: Track }).payload;
    if (type === "lap") {
      lastLap = raw;
      console.info(`Lap received; broadcasting to ${Math.max(0, clients.clients.size - 1)} viewer(s)`);
      if (isProducer) await saveVerifiedLap(state, (message as unknown as { payload: Record<string, unknown> }).payload);
    }
    if (type === "session") lastSession = raw;
    publish(raw, socket);
  });
});

async function saveVerifiedLap(state: ProducerState, lap: Record<string, unknown>) {
  const link = state.link, track = state.track;
  const lapTime = Number(lap.lastLapTime), lapNumber = Number(lap.lastCompletedLap);
  if (!link || !track || !Number.isInteger(lapTime) || lapTime < 5_000 || !lapNumber || lap.lastLapValid !== true) return;

  const fingerprint = `${track.gameSessionUid || "unknown"}:${lapNumber}`;
  if (state.submitted.has(fingerprint)) return;
  state.submitted.add(fingerprint);
  const { error } = await getSupabaseAdmin().from("laps").insert({
    user_id: link.user_id,
    telemetry_session_id: link.id,
    game_session_uid: track.gameSessionUid || "unknown",
    lap_number: lapNumber,
    driver_name: link.driver_name,
    gamertag: link.gamertag,
    car: String(lap.car || "Unknown car"),
    track_id: track.id,
    track_name: track.name,
    lap_time_ms: lapTime,
    sector1_ms: positiveInt(lap.sector1),
    sector2_ms: positiveInt(lap.sector2),
    sector3_ms: positiveInt(lap.sector3),
    input_setup: link.input_setup,
    assist_preset: link.assist_preset,
    weather: track.weather || "Unknown weather",
    platform: link.platform,
    valid: true,
    source_verified: true,
  });
  if (error) {
    state.submitted.delete(fingerprint);
    if (error.code !== "23505") console.error("Verified lap save failed:", error.message);
    return;
  }
  console.info(`Verified lap saved: ${link.gamertag} ${track.name} ${lapTime}ms`);
}

function positiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
app.get("/api/ws", (_request, response) => response.status(426).send("Upgrade Required"));
// Vercel's WebSocket beta accepts a Node HTTP server exported by an /api function.
export default server;
