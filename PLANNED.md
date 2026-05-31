# MarketPing — Planned Features

> Product name in UI: **MarketPing**. Legacy docs may still say ArbFlow.

---

## MVP (done)

- [x] Landing page (hero, nodes showcase, how it works, CTA)
- [x] Auth via Clerk
- [x] Dashboard — create / list / delete workflows, enable toggle
- [x] Workflow builder — visual canvas (React Flow) with node connections
- [x] Kalshi source node (API key + ticker + threshold) + market search
- [x] Polymarket source node (slug + outcome + threshold) + market search
- [x] Discord action node (webhook + message template)
- [x] Email action node (AgentMail)
- [x] SMS action node (Twilio) — UI only; worker path incomplete
- [x] Server: proxy Kalshi + Polymarket APIs (auth-protected)
- [x] Server: run workflow endpoint (fetch prices → check threshold → fire actions)
- [x] Workflows persisted in Supabase, scoped by Clerk user ID
- [x] Threshold dedup via `workflow_market_states` (crossing-based, not time-based)
- [x] Automated execution: Railway worker (WebSocket) + Vercel cron fallback (5 min)
- [x] Stripe billing code: checkout, webhook, customer portal routes
- [x] Subscription gate in middleware (Clerk `publicMetadata.subscribed`)
- [x] Pricing page ($19/mo, $149/yr, paid-only)
- [x] API route auth (middleware + per-route Clerk checks)

---

## Pre-launch blockers

These must be done before launch. See also `PRELAUNCH_NEEDS.md`.

### Stripe (ops, not code)

The **subscription middleware is implemented** in `src/middleware.ts` — it gates `/dashboard`, `/workflow/*`, and workflow/market API routes on `publicMetadata.subscribed === true`. What’s missing is **Stripe Dashboard + env setup**:

- [ ] Create Stripe products/prices ($19/mo, $149/yr)
- [ ] Set env vars in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY`
- [ ] Configure webhook → `/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] End-to-end test: subscribe → webhook fires → Clerk metadata updated → dashboard access granted
- [ ] Fix post-checkout redirect race: success URL is `/dashboard?success=true` but middleware blocks until webhook sets `subscribed` — redirect to `/pricing?success=true` or poll until metadata refreshes

### Security & data

- [x] Audit API route auth — middleware no longer marks all `/api/*` public; workflow/kalshi/polymarket routes require auth + subscription
- [ ] Add Supabase RLS policies — RLS is enabled but no policies exist; add `user_id`-scoped policies on `workflows`, `workflow_market_states`, `workflow_runs`, `subscriptions`
- [ ] User secrets (Discord webhooks, API keys, phone numbers) stored in plaintext JSONB — encrypt or vault before scaling

### Product parity & copy

- [ ] Fix landing page copy — `messages/en.json` says “free” / “no credit card”; pricing says paid-only. Align copy.
- [ ] Update stale landing copy (node count, email provider references)
- [ ] Unify worker vs app notification logic — worker ignores graph edges, doesn’t support SMS, uses different AgentMail inbox, doesn’t write run history
- [ ] Fix AgentMail inbox typo in worker (`arbworflow` → `marketping`)
- [ ] Set up Twilio env vars; confirm SMS works end-to-end from builder + worker

### UX gaps

- [ ] Add “Manage subscription” link on dashboard → `/api/stripe/portal`
- [ ] Run history UI — `workflow_runs` table exists but no alert feed in dashboard

---

## Nice-to-have before launch

- [ ] Deploy + verify Railway worker (Kalshi/Polymarket WebSockets, Supabase Realtime)
- [ ] Error tracking (Sentry or similar) on Next.js app + worker
- [ ] CI: build, lint, worker tests on push
- [ ] README / deploy runbook (env vars, migrations, Stripe webhook setup)
- [ ] Health check endpoints (`/api/health`, worker health for Railway)
- [ ] Rate limiting on workflow runs and market search routes

---

## Next up (post-launch)

### Scheduling / polling
- [ ] Per-workflow polling interval (currently global 5-min cron)
- [ ] Time-based debounce (“don’t re-alert for N hours”) — current dedup is threshold-crossing only
- [ ] Reconcile worker vs cron execution paths (avoid duplicate/missed alerts)

### New nodes
- [ ] **Telegram node** — send message via Bot API
- [ ] **Slack node** — post to channel via webhook
- [ ] **Webhook node** — fire arbitrary HTTP request with market data
- [ ] **Filter node** — conditional logic (e.g. only trigger if volume > X)
- [ ] **Arbitrage node** — compare same event across Kalshi + Polymarket, alert on spread
- [ ] **Airtable node** — log market snapshots to a table
- [ ] **Notion node** — append to a database

### Kalshi improvements
- [ ] Multiple tickers in one node
- [ ] Support series-level queries
- [ ] OAuth login flow (instead of raw API key)

### Polymarket improvements
- [ ] CLOB API integration for real-time orderbook data
- [ ] Volume and liquidity fields in template vars

### UI/UX
- [ ] Node validation — highlight misconfigured nodes before run
- [ ] Dark/light mode toggle
- [ ] Mobile-responsive workflow builder
- [ ] In-app notification center (run history, alert feed)
- [ ] Browser push notifications

### Auth & billing (future tiers)
- [ ] Free tier limits (if desired — currently paid-only per `STRIPE_PLAN.md`)

### Monitoring
- [ ] Uptime/health dashboard
- [ ] Alert on consecutive failures

### Market data enhancements
- [ ] Price chart sparkline in node preview
- [ ] Historical price context in alert messages
- [ ] Related market suggestions (Kalshi ↔ Polymarket cross-reference)
