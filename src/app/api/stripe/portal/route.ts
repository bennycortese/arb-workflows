import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase';

async function getPortalConfigurationId(stripe: ReturnType<typeof getStripe>) {
  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 1,
  });

  if (configurations.data[0]) {
    return configurations.data[0].id;
  }

  const configuration = await stripe.billingPortal.configurations.create({
    name: 'MarketPing subscription management',
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: ['too_expensive', 'missing_features', 'unused', 'other'],
        },
      },
    },
  });

  return configuration.id;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id,status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (data?.status !== 'active' || !data.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Upgrade to Pro before opening subscription management.', code: 'free_plan' },
      { status: 409 },
    );
  }

  try {
    const origin = new URL(request.url).origin;
    const stripe = getStripe();
    const configuration = await getPortalConfigurationId(stripe);
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      configuration,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[stripe/portal] failed to create portal session:', error);
    return NextResponse.json(
      { error: 'Billing management is temporarily unavailable. Please try again shortly.' },
      { status: 502 },
    );
  }
}
