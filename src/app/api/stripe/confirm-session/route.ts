import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { activateFromCheckoutSession } from '../../../../lib/stripeSubscription';

/** Fallback when webhooks cannot reach localhost — confirms checkout after redirect. */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await request.json() as { sessionId: string };
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  try {
    const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId);
    if (checkoutSession.metadata?.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await activateFromCheckoutSession(checkoutSession);
    return NextResponse.json({ subscribed: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Activation failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
