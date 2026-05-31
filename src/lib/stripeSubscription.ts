import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { getStripe } from './stripe';
import { getSupabaseAdmin } from './supabase';

export async function setClerkSubscribed(userId: string, subscribed: boolean) {
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { subscribed },
  });
}

async function upsertSubscription(params: {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: params.userId,
      stripe_customer_id: params.customerId,
      stripe_subscription_id: params.subscriptionId,
      status: params.status,
      current_period_end: params.currentPeriodEnd?.toISOString() ?? null,
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    console.error('[stripe] subscriptions upsert failed:', error.message);
    throw new Error(error.message);
  }
}

/** Activate user after successful Stripe Checkout (webhook or confirm-session). */
export async function activateFromCheckoutSession(
  checkoutSession: Stripe.Checkout.Session
): Promise<void> {
  const userId = checkoutSession.metadata?.userId;
  const customerId = checkoutSession.customer as string;
  const subscriptionId = checkoutSession.subscription as string;
  if (!userId || !subscriptionId) {
    throw new Error('Checkout session missing userId or subscription');
  }
  if (checkoutSession.status !== 'complete') {
    throw new Error('Checkout session is not complete yet');
  }

  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const periodEndTs = sub.items.data[0]?.current_period_end;
  const periodEnd = periodEndTs ? new Date(periodEndTs * 1000) : null;

  await upsertSubscription({
    userId,
    customerId,
    subscriptionId,
    status: 'active',
    currentPeriodEnd: periodEnd,
  });
  await setClerkSubscribed(userId, true);
}
