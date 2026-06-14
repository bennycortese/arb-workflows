import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getStripe: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  isStripeConfigured: vi.fn(),
  getStripePriceIdMonthly: vi.fn(),
  getStripePriceIdYearly: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mocks.auth,
}));

vi.mock('../../src/lib/stripe', () => ({
  getStripe: mocks.getStripe,
}));

vi.mock('../../src/lib/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('../../src/lib/stripeConfig', () => ({
  isStripeConfigured: mocks.isStripeConfigured,
  getStripePriceIdMonthly: mocks.getStripePriceIdMonthly,
  getStripePriceIdYearly: mocks.getStripePriceIdYearly,
}));

import { GET as subscriptionStatus } from '../../src/app/api/subscription/status/route';
import { POST as createCheckout } from '../../src/app/api/stripe/checkout/route';
import { POST as createPortal } from '../../src/app/api/stripe/portal/route';
import { FREE_PLAN_LIMITS } from '../../src/lib/planLimits';

function checkoutRequest(billing: 'monthly' | 'yearly' = 'monthly'): Request {
  return new Request('https://www.marketping.ai/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ billing }),
  });
}

function subscriptionQuery(data: unknown, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const single = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn(() => ({ maybeSingle, single }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, maybeSingle, single };
}

describe('GET /api/subscription/status', () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getSupabaseAdmin.mockReset();
  });

  it('returns inactive for signed-out users without querying the database', async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await subscriptionStatus();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ active: false });
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it.each([
    ['active', true],
    ['past_due', false],
    ['canceled', false],
    [null, false],
  ])('maps subscription status %s to active=%s', async (status, active) => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const query = subscriptionQuery(status ? { status } : null);
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => query),
    });

    const response = await subscriptionStatus();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      active,
      status: status ?? 'inactive',
      plan: active ? 'pro' : 'free',
      limits: active ? null : FREE_PLAN_LIMITS,
    });
  });

  it('reports database failures instead of assuming an account is active', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const query = subscriptionQuery(null, { message: 'database unavailable' });
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => query),
    });

    const response = await subscriptionStatus();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      active: false,
      error: 'database unavailable',
    });
  });
});

describe('POST /api/stripe/checkout', () => {
  const checkoutCreate = vi.fn();
  const customerCreate = vi.fn();

  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getSupabaseAdmin.mockReset();
    mocks.isStripeConfigured.mockReset().mockReturnValue(true);
    mocks.getStripePriceIdMonthly.mockReset().mockReturnValue('price_monthly');
    mocks.getStripePriceIdYearly.mockReset().mockReturnValue('price_yearly');
    checkoutCreate.mockReset();
    customerCreate.mockReset();
    mocks.getStripe.mockReset().mockReturnValue({
      customers: { create: customerCreate },
      checkout: { sessions: { create: checkoutCreate } },
    });
  });

  it('rejects signed-out users', async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await createCheckout(checkoutRequest() as never);

    expect(response.status).toBe(401);
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it('prevents an active customer from starting a duplicate subscription', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const query = subscriptionQuery({
      stripe_customer_id: 'cus_active',
      status: 'active',
    });
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => query),
    });

    const response = await createCheckout(checkoutRequest() as never);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Your subscription is already active.',
      code: 'already_subscribed',
    });
    expect(checkoutCreate).not.toHaveBeenCalled();
  });

  it('reuses a prior customer and includes explicit success and cancellation URLs', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const query = subscriptionQuery({
      stripe_customer_id: 'cus_existing',
      status: 'canceled',
    });
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => query),
    });
    checkoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });

    const response = await createCheckout(checkoutRequest('yearly') as never);

    expect(response.status).toBe(200);
    expect(customerCreate).not.toHaveBeenCalled();
    expect(checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_existing',
      line_items: [{ price: 'price_yearly', quantity: 1 }],
      success_url:
        'https://www.marketping.ai/pricing?success=true&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.marketping.ai/pricing?canceled=true',
    }));
  });

  it('creates a Stripe customer for a first-time subscriber', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const query = subscriptionQuery(null);
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => query),
    });
    customerCreate.mockResolvedValue({ id: 'cus_new' });
    checkoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });

    await createCheckout(checkoutRequest() as never);

    expect(customerCreate).toHaveBeenCalledWith({ metadata: { userId: 'user-1' } });
    expect(checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_new',
    }));
  });
});

describe('POST /api/stripe/portal', () => {
  const portalCreate = vi.fn();

  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getSupabaseAdmin.mockReset();
    mocks.getStripe.mockReset().mockReturnValue({
      billingPortal: { sessions: { create: portalCreate } },
    });
    portalCreate.mockReset();
  });

  it('rejects signed-out users', async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await createPortal(checkoutRequest() as never);

    expect(response.status).toBe(401);
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it('directs Free users to upgrade instead of opening Stripe', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const query = subscriptionQuery(null);
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => query),
    });

    const response = await createPortal(checkoutRequest() as never);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Upgrade to Pro before opening subscription management.',
      code: 'free_plan',
    });
    expect(portalCreate).not.toHaveBeenCalled();
  });

  it('creates a billing portal session for active Pro users', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const query = subscriptionQuery({
      stripe_customer_id: 'cus_active',
      status: 'active',
    });
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => query),
    });
    portalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session' });

    const response = await createPortal(checkoutRequest() as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: 'https://billing.stripe.com/session',
    });
    expect(portalCreate).toHaveBeenCalledWith({
      customer: 'cus_active',
      return_url: 'https://www.marketping.ai/dashboard',
    });
  });

  it('returns a useful error when Stripe cannot create the portal session', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const query = subscriptionQuery({
      stripe_customer_id: 'cus_active',
      status: 'active',
    });
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => query),
    });
    portalCreate.mockRejectedValue(new Error('Stripe unavailable'));

    const response = await createPortal(checkoutRequest() as never);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Billing management is temporarily unavailable. Please try again shortly.',
    });
  });
});
