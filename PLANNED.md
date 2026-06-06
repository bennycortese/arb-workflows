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
- [x] SMS action node (Twilio) — works via app/cron path; worker path does not send SMS
- [x] Server: proxy Kalshi + Polymarket APIs (auth-protected)
- [x] Server: run workflow endpoint (fetch prices → check threshold → fire actions)
- [x] Workflows persisted in Supabase, scoped by Clerk user ID
- [x] Threshold dedup via `workflow_market_states` (crossing-based, not time-based)
- [x] Automated execution: Railway worker (WebSocket) + Vercel cron fallback (5 min)
- [x] Stripe billing: checkout, webhook, customer portal routes
- [x] Stripe ops: env vars configured; API verified ($19/mo + $149/yr prices active)
- [x] Subscription gate in middleware (Clerk `publicMetadata.subscribed`)
- [x] Pricing page ($19/mo, $149/yr, paid-only)
- [x] API route auth (middleware + per-route Clerk checks; save route IDOR fixed)
- [x] `SmsNode.tsx` committed to git
- [x] Production build passes; worker tests pass (55/55)

---

## Pre-launch (remaining)

### Copy & UX

- [x] **Fix landing page copy** — aligned with paid-only pricing, AgentMail, and 8 nodes
- [x] **Post-checkout redirect race** — success redirects to `/pricing?success=true` with session polling
- [x] **Billing portal link** — “Manage subscription” on dashboard
- [x] **Run history UI** — recent alerts panel + `/api/workflows/runs`

### Worker / app parity

- [x] **Unify notification logic** — worker respects graph edges, sends Discord/email/SMS, and writes `workflow_runs` plus workflow status.
- [x] **Fix AgentMail inbox typo in worker** — worker now sends from `marketping@agentmail.to`.

### Security & infra (lower urgency — app uses service-role key)

- [ ] **Supabase RLS policies** — RLS enabled on tables but no `CREATE POLICY` statements. Not blocking launch while all DB access goes through server routes with `user_id` checks, but add before exposing Supabase client-side.
- [ ] **Encrypt user secrets in JSONB** — Discord webhooks, API keys, phone numbers stored in plaintext workflow nodes.

### Optional integrations (only if you use the feature)

- [ ] **Twilio env vars** — not in local `.env`; needed only if testing SMS locally.
- [ ] **KALSHI_API_KEY** — optional; public markets work without it.

### Manual verification (do once before launch)

- [ ] **Stripe webhook e2e** — subscribe with test card → webhook fires (`checkout.session.completed`) → Clerk `publicMetadata.subscribed = true` → dashboard access granted. Code handles the right events; just confirm in Stripe dashboard + live test.

---

## Nice-to-have before launch

- [ ] Deploy + verify Railway worker (WebSocket feeds, Supabase Realtime)
- [ ] Error tracking (Sentry) on Next.js app + worker
- [ ] CI: build + worker tests on push
- [ ] README / deploy runbook
- [ ] Health check endpoints (`/api/health`, worker health for Railway)
- [ ] Rate limiting on workflow runs and market search

---

## Next up (post-launch)

### Scheduling / polling
- [ ] Per-workflow polling interval (currently global 5-min cron)
- [ ] Time-based debounce (“don’t re-alert for N hours”)
- [ ] Reconcile worker vs cron paths (avoid duplicate/missed alerts)

### New nodes
- [x] **Telegram node** — send message via Bot API
- [x] **Slack node** — post to channel via webhook
- [x] **Webhook node** — fire structured HTTP request with market data
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
- [ ] Node validation — highlight misconfigured nodes before run (Run now still excludes SMS from action check)
- [ ] Dark/light mode toggle
- [ ] Mobile-responsive workflow builder
- [ ] In-app notification center
- [ ] Browser push notifications

### Auth & billing (future tiers)
- [ ] Free tier limits (currently paid-only per `STRIPE_PLAN.md`)

### Monitoring
- [ ] Uptime/health dashboard
- [ ] Alert on consecutive failures

### Market data enhancements
- [ ] Price chart sparkline in node preview
- [ ] Historical price context in alert messages
- [ ] Related market suggestions (Kalshi ↔ Polymarket cross-reference)
