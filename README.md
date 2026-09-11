# F1 24 Time Trial Live

A Next.js live leaderboard fed by F1 24 PC UDP telemetry. The interface is original broadcast-inspired artwork, without F1 logos or proprietary track images.

## Run it

1. In F1 24, enable UDP telemetry; set IP to `127.0.0.1`, port to `20777`, and packet format to 2024.
2. Copy `.env.example` to `.env.local` and choose a long `TELEMETRY_WRITE_KEY`.
3. Install and start the dashboard:

   ```powershell
   npm install
   npm run dev
   ```

4. In a second PowerShell window, run the local bridge:

   ```powershell
   $env:TELEMETRY_WS_URL = "wss://YOUR-PROJECT.vercel.app/api/ws"
   $env:TELEMETRY_WRITE_KEY = "the-same-secret-configured-on-vercel"
   npm run listener
   ```

## Deploy

1. Push this directory to Git or run `npx vercel` here.
2. Enable Fluid compute/WebSocket public beta in Vercel if your account exposes an opt-in.
3. Create the `TELEMETRY_WRITE_KEY` environment variable in Vercel, deploy, and use the same value in the listener process.
4. Open the deployment, register the driver, then start the time-trial session.

The UDP listener parses packet IDs 2 (lap data), 4 (participants), and 11 (session history). Vercel WebSockets are public beta; for durable multi-viewer fan-out or reconnect replay, use Redis pub/sub plus persisted latest-lap state.

## Global leaderboard and accounts

1. Create a Supabase project, then run `supabase/schema.sql` once in its SQL Editor.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` locally and in Vercel Environment Variables.
3. Redeploy. Drivers can create email accounts from the dashboard; each completed valid lap is saved to their account and appears in the live per-track global top 10.
