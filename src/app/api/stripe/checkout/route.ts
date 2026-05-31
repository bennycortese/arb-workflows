import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  const { billing } = await request.json() as { billing: 'monthly' | 'yearly' };
  const priceId = billing === 'yearly'
    ? process.env.STRIPE_PRICE_ID_YEARLY!
    : process.env.STRIPE_PRICE_ID_MONTHLY!;

  const supabase = getSupabaseAdmin();

  // Look up existing customer or create one
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  let customerId = existing?.stripe_customer_id;
  if (!customerId) {
    const customer = await getStripe().customers.create({ metadata: { userId } });
    customerId = customer.id;
  }

  const origin = new URL(request.url).origin;
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId },
    success_url: `${origin}/pricing?success=true`,
    cancel_url: `${origin}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
