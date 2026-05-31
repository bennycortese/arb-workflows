# ArbFlow — Planned Features

## MVP (done)
- [x] Landing page (hero, nodes showcase, how it works, CTA)
- [x] Auth via Clerk
- [x] Dashboard — create / list / delete workflows, enable toggle
- [x] Workflow builder — linear node pipeline
- [x] Kalshi source node (API key + ticker + threshold)
- [x] Polymarket source node (slug + outcome + threshold)
- [x] Discord action node (webhook + message template)
- [x] Gmail action node (nodemailer + App Password)
- [x] Server: proxy Kalshi API, proxy Polymarket Gamma API
- [x] Server: run workflow endpoint (fetch prices → check threshold → fire actions)
- Fix

---

## Next up

### Scheduling / polling
- [ ] Cron-based workflow runs (node-cron on server)
- [ ] Per-workflow polling interval (e.g. every 5 min, 15 min, 1 hour)
- [ ] "Enable" toggle actually activates cron job
- [ ] Debounce: don't re-alert if already alerted in last N hours

### Persistence
- [ ] Store workflows in Supabase / Postgres (currently in-memory / client Jotai)
- [ ] User-scoped workflows via Clerk user ID
- [ ] Run history table (workflow_runs)

### New nodes
- [ ] **Telegram node** — send message via Bot API
- [ ] **Slack node** — post to channel via webhook
- [ ] **Webhook node** — fire arbitrary HTTP request with market data
- [ ] **Filter node** — conditional logic (e.g. only trigger if volume > X)
- [ ] **Arbitrage node** — compare same event across Kalshi + Polymarket, alert on spread
- [ ] **Airtable node** — log market snapshots to a table
- [ ] **Notion node** — append to a database

### Kalshi improvements
- [ ] Market search/autocomplete by keyword
- [ ] Multiple tickers in one node
- [ ] Support series-level queries
- [ ] OAuth login flow (instead of raw API key)

### Polymarket improvements
- [ ] CLOB API integration for real-time orderbook data
- [ ] Market search by keyword (Gamma API `/markets?search=`)
- [ ] Volume and liquidity fields in template vars

### UI/UX
- [ ] Drag-and-drop node reordering (react-dnd or dnd-kit)
- [ ] Visual canvas mode (n8n-style) with connectors
- [ ] Node validation — highlight misconfigured nodes before run
- [ ] Dark/light mode toggle
- [ ] Mobile-responsive workflow builder

### Notifications
- [ ] In-app notification center (run history, alert feed)
- [ ] Browser push notifications

### Auth & billing
- [ ] Free tier: 3 workflows, 15-min poll interval
- [ ] Pro tier: unlimited workflows, 1-min poll interval, Slack + Telegram
- [ ] Stripe integration for Pro

### Monitoring
- [ ] Run log persistence (last 50 runs per workflow)
- [ ] Uptime/health dashboard
- [ ] Alert on consecutive failures

### Market data enhancements
- [ ] Price chart sparkline in node preview
- [ ] Historical price context in alert messages
- [ ] Related market suggestions (Kalshi ↔ Polymarket cross-reference)
