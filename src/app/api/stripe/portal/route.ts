import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase';

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
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
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
