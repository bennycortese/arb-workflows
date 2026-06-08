"use strict";
// For future markets with no websockets
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in polling worker for prediction markets that don't offer a real-time
// WebSocket feed. Calls /api/poll-all on a tight interval so you get
// sub-minute latency without upgrading Vercel's cron plan.
//
// How to use:
//   1. Set env vars below (copy from your Railway Kalshi worker service)
//   2. Swap index.ts entrypoint to this file, or run it as a second Railway
//      service alongside the WS worker
//   3. Tune POLL_INTERVAL_MS — 10–15s is a safe default for most HTTP APIs
//
// Deploy on Railway (free tier):
//   - Start command: npx ts-node --esm polling-fallback.ts
//   - Or build first: tsc && node dist/polling-fallback.js
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
// Required env vars:
//   POLL_ALL_URL    — full URL to your Vercel endpoint, e.g.
//                     https://your-app.vercel.app/api/poll-all
//   CRON_SECRET     — must match the secret set in your Vercel env
// Optional:
//   POLL_INTERVAL_MS — how often to poll in ms (default: 15000)
const retry_1 = require("./retry");
const POLL_ALL_URL = process.env.POLL_ALL_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? '15000');
let polling = false;
if (!POLL_ALL_URL || !CRON_SECRET) {
    console.error('[poll] POLL_ALL_URL and CRON_SECRET are required');
    process.exit(1);
}
async function poll() {
    if (polling) {
        console.warn('[poll] previous poll still running; skipping overlap');
        return;
    }
    polling = true;
    try {
        const res = await (0, retry_1.fetchWithRetry)(POLL_ALL_URL, {
            headers: { Authorization: `Bearer ${CRON_SECRET}` },
            signal: AbortSignal.timeout(30_000),
        });
        const json = await res.json();
        if (!res.ok)
            throw new Error(json.error ?? res.statusText);
        console.log(`[poll] ${new Date().toISOString()} — ran ${json.ran ?? 0} workflow(s)`);
    }
    catch (err) {
        console.error('[poll] error:', err.message);
    }
    finally {
        polling = false;
    }
}
console.log(`[poll] Starting — interval ${POLL_INTERVAL_MS}ms → ${POLL_ALL_URL}`);
poll();
setInterval(poll, POLL_INTERVAL_MS);
