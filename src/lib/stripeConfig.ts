/** True when using Stripe test keys (local checkout with test cards). */
export function isStripeTestMode(): boolean {
  return process.env.STRIPE_TEST_MODE === 'true';
}

export function getStripeSecretKey(): string | undefined {
  if (isStripeTestMode()) {
    return process.env.STRIPE_TEST_SECRET_KEY;
  }
  return process.env.STRIPE_LIVE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY;
}

export function getStripeWebhookSecret(): string | undefined {
  if (isStripeTestMode()) {
    return process.env.STRIPE_TEST_WEBHOOK_SECRET;
  }
  return process.env.STRIPE_LIVE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
}

export function getStripePublishableKey(): string | undefined {
  if (isStripeTestMode()) {
    return process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY;
  }
  return process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

export function getStripePriceIdMonthly(): string | undefined {
  if (isStripeTestMode()) {
    return process.env.STRIPE_TEST_PRICE_ID_MONTHLY;
  }
  return process.env.STRIPE_LIVE_PRICE_ID_MONTHLY ?? process.env.STRIPE_PRICE_ID_MONTHLY;
}

export function getStripePriceIdYearly(): string | undefined {
  if (isStripeTestMode()) {
    return process.env.STRIPE_TEST_PRICE_ID_YEARLY;
  }
  return process.env.STRIPE_LIVE_PRICE_ID_YEARLY ?? process.env.STRIPE_PRICE_ID_YEARLY;
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey() && getStripePriceIdMonthly() && getStripePriceIdYearly());
}
