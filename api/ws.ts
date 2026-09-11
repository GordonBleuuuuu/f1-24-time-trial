import express from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";

const app = express();
const server = createServer(app);
const clients = new WebSocketServer({ server, maxPayload: 16 * 1024 });
let lastLap = "";
let lastSession = "";

function publish(raw: string, except?: WebSocket) { clients.clients.forEach((client) => { if (client !== except && client.readyState === WebSocket.OPEN) client.send(raw); }); }
clients.on("connection", (socket, request) => {
  const url = new URL(request.url || "/", "https://telemetry.local");
  const isProducer = Boolean(process.env.TELEMETRY_WRITE_KEY) && url.searchParams.get("key") === process.env.TELEMETRY_WRITE_KEY;
  console.info(`WebSocket connected: ${isProducer ? "telemetry producer" : "viewer"}; clients=${clients.clients.size}`);
  socket.send(JSON.stringify({ type: "hello", payload: { connectedAt: Date.now() } }));
  if (lastLap) socket.send(lastLap);
  if (lastSession) socket.send(lastSession);
  socket.on("message", (data, isBinary) => {
    const rawPayload = Buffer.isBuffer(data) ? data : Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
    if (isBinary || rawPayload.length > 16 * 1024) return;
    let message: unknown; try { message = JSON.parse(rawPayload.toString()); } catch { return; }
    if (!message || typeof message !== "object" || !("type" in message)) return;
    const type = (message as { type: unknown }).type;
    if (type === "lap" && !isProducer) { console.warn("Rejected untrusted lap message"); return; }
    if (type !== "lap" && type !== "session" && type !== "identity") return;
    const raw = JSON.stringify(message);
    if (type === "lap") {
      lastLap = raw;
      console.info(`Lap received; broadcasting to ${Math.max(0, clients.clients.size - 1)} viewer(s)`);
    }
    if (type === "session") lastSession = raw;
    publish(raw, socket);
  });
});
app.get("/api/ws", (_request, response) => response.status(426).send("Upgrade Required"));
// Vercel's WebSocket beta accepts a Node HTTP server exported by an /api function.
export default server;
