import Stripe from 'stripe';
import { getStripeSecretKey, isStripeTestMode } from './stripeConfig';

let _stripe: Stripe | null = null;
let _stripeKey: string | null = null;

export function getStripe(): Stripe {
  const key = getStripeSecretKey();
  if (!key) {
    throw new Error(
      isStripeTestMode()
        ? 'STRIPE_TEST_SECRET_KEY is not set (STRIPE_TEST_MODE=true)'
        : 'STRIPE_LIVE_SECRET_KEY (or STRIPE_SECRET_KEY) is not set'
    );
  }
  if (!_stripe || _stripeKey !== key) {
    _stripe = new Stripe(key);
    _stripeKey = key;
  }
  return _stripe;
}
