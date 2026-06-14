import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { FREE_PLAN_LIMITS } from '../../../../lib/planLimits';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ active: false }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ active: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    active: data?.status === 'active',
    status: data?.status ?? 'inactive',
    plan: data?.status === 'active' ? 'pro' : 'free',
    limits: data?.status === 'active' ? null : FREE_PLAN_LIMITS,
  });
}
