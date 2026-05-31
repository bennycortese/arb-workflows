import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '../../../../lib/stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getStripeWebhookSecret } from '../../../../lib/stripeConfig';
import { clerkClient } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

async function setSubscribed(userId: string, subscribed: boolean) {
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
  await supabase.from('subscriptions').upsert(
    {
      user_id: params.userId,
      stripe_customer_id: params.customerId,
      stripe_subscription_id: params.subscriptionId,
      status: params.status,
      current_period_end: params.currentPeriodEnd?.toISOString() ?? null,
    },
    { onConflict: 'user_id' }
  );
}

async function getUserIdByCustomer(customerId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.user_id ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      if (!userId || !subscriptionId) break;

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
      await setSubscribed(userId, true);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const userId = await getUserIdByCustomer(customerId);
      if (!userId) break;

      const status = sub.status === 'active' ? 'active'
        : sub.status === 'past_due' ? 'past_due'
        : sub.status === 'canceled' ? 'canceled'
        : 'inactive';

      const periodEndTs2 = sub.items.data[0]?.current_period_end;
      const periodEnd = periodEndTs2 ? new Date(periodEndTs2 * 1000) : null;

      await upsertSubscription({
        userId,
        customerId,
        subscriptionId: sub.id,
        status,
        currentPeriodEnd: periodEnd,
      });
      await setSubscribed(userId, status === 'active');
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const userId = await getUserIdByCustomer(customerId);
      if (!userId) break;

      const supabase = getSupabaseAdmin();
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', stripe_subscription_id: sub.id })
        .eq('user_id', userId);
      await setSubscribed(userId, false);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
