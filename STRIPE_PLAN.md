# Stripe Integration Plan

## Pricing

Single "Pro" plan — **$19/month** (or **$149/year**, ~34% savings).  
No free tier. No trial. Users pay upfront to access workflows.

Rationale: prediction market traders already spend money on data feeds; $19/mo is under-priced enough to convert but high enough to filter serious users.

---

## Access Control Model

- **Unauthenticated** → can view landing page + pricing page only
- **Authenticated, no subscription** → redirected to `/pricing` from any app route
- **Authenticated + active subscription** → full access to `/dashboard`, `/workflow/*`

Subscription status stored in **two places**:
1. **Supabase** `subscriptions` table (source of truth)
2. **Clerk `publicMetadata.subscribed: true/false`** (read in middleware synchronously, no DB call needed)

---

## Files to Create / Modify

### New files
| File | Purpose |
|------|---------|
| `supabase/migrations/002_subscriptions.sql` | Subscriptions table |
| `src/lib/stripe.ts` | Stripe server client singleton |
| `src/app/api/stripe/checkout/route.ts` | Creates Stripe Checkout session |
| `src/app/api/stripe/webhook/route.ts` | Handles Stripe webhook events |
| `src/app/api/stripe/portal/route.ts` | Creates Customer Portal session |
| `src/app/pricing/page.tsx` | Pricing/paywall page |

### Modified files
| File | Change |
|------|--------|
| `src/middleware.ts` | Add subscription gate: redirect `/dashboard`, `/workflow/*` to `/pricing` if not subscribed |
| `src/LandingPage.tsx` | Update nav + hero CTA to link to `/pricing` instead of direct sign-in |

---

## Database Schema (002_subscriptions.sql)

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,         -- Clerk user ID
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive', -- active | inactive | past_due | canceled
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Routes

### POST /api/stripe/checkout
1. Verify Clerk auth → get `userId`
2. Upsert Stripe Customer (look up by `stripe_customer_id` in DB, or create new)
3. Create `checkout.sessions` with `mode: 'subscription'`, pass `userId` in metadata
4. Return `{ url }` → frontend redirects

### POST /api/stripe/webhook
Stripe calls this. Verified via `stripe.webhooks.constructEvent`.

Events handled:
- `checkout.session.completed` → upsert subscription row, set `status=active`, update Clerk `publicMetadata.subscribed = true`
- `customer.subscription.updated` → update `status` + `current_period_end` in Supabase + Clerk
- `customer.subscription.deleted` → set `status=canceled` in Supabase, set `publicMetadata.subscribed = false`

### POST /api/stripe/portal
1. Verify Clerk auth
2. Look up `stripe_customer_id` in Supabase
3. Create `billingPortal.sessions`
4. Return `{ url }`

---

## Middleware Changes

```typescript
// Public: /, /pricing, /api/*
// Protected app routes: /dashboard, /workflow/*
//   → require auth AND publicMetadata.subscribed === true
//   → else redirect to /pricing

const isProtectedAppRoute = createRouteMatcher(['/dashboard', '/workflow/(.*)']);

if (isProtectedAppRoute(request)) {
  const { userId, sessionClaims } = await auth();
  const isSubscribed = sessionClaims?.publicMetadata?.subscribed === true;
  if (!isSubscribed) redirect to /pricing
}
```

---

## Pricing Page (/pricing)

- Shows the $19/month plan (and $149/year toggle)
- "Subscribe" button → calls `/api/stripe/checkout` → redirects to Stripe Checkout
- If already signed in, goes straight to checkout
- If not signed in, shows Clerk sign-in modal first
- Success redirect: `/dashboard?success=true`
- Cancel redirect: `/pricing`

---

## Environment Variables Needed

```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
```

Stripe dashboard setup required:
1. Create Product "ArbFlow Pro"
2. Create two Prices: $19/month recurring, $149/year recurring
3. Create Webhook endpoint pointing to `https://yourdomain.com/api/stripe/webhook`
4. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## Implementation Order

1. `002_subscriptions.sql` (run in Supabase)
2. `src/lib/stripe.ts`
3. `src/app/api/stripe/checkout/route.ts`
4. `src/app/api/stripe/webhook/route.ts`
5. `src/app/api/stripe/portal/route.ts`
6. `src/app/pricing/page.tsx`
7. `src/middleware.ts` (update)
8. `src/LandingPage.tsx` (update CTAs)
