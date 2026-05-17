# Pre-launch checklist

## Blockers

- [ ] **Set up Stripe** — create products ($19/mo, $149/yr), copy price IDs into `STRIPE_PRICE_ID_MONTHLY` / `STRIPE_PRICE_ID_YEARLY`. Configure a webhook pointing to `/api/stripe/webhook` for `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` events. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

- [ ] **Set up Twilio** — fill in `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. Also commit `src/nodes/SmsNode.tsx` (currently untracked in git).

- [ ] **Add Supabase RLS** — the `workflows` table has no row-level security policies. Add `user_id = auth.uid()` RLS on all tables so users can only access their own data.

- [ ] **Audit API route auth** — middleware marks all `/api/(.*)` routes as public. Confirm every API route returns 401 when `userId` is missing (especially `/api/workflows/*`).

- [ ] **Fix landing page copy** — `messages/en.json` says "Start automating free" and "Free to use. No credit card required." The pricing page says "No free tier. No trial." These contradict each other — update the landing page copy to match reality.

## Nice-to-have before launch

- [ ] **Deploy worker to Railway** — confirm the WebSocket connections to Kalshi and Polymarket are live and the Supabase Realtime subscription picks up workflow changes.

- [ ] **Add error tracking** — integrate Sentry (or similar) so production failures are visible. Right now errors are invisible unless a user reports them.

- [ ] **Test Stripe webhook end-to-end** — subscribe with a test card → confirm `customer.subscription.created` fires → confirm Clerk `publicMetadata.subscribed` is set to `true` → confirm dashboard access is granted.
