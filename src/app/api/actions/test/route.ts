import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendActionNotification,
  testNotificationVars,
  type WorkflowNode,
} from '../../../../lib/thresholdEval';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getAccountPlan, isFreeAction } from '../../../../lib/planLimits';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const node = await request.json() as WorkflowNode;
  const actionTypes = new Set(['discord', 'email', 'sms', 'webhook', 'telegram', 'slack']);
  if (!node?.id || !actionTypes.has(node.type) || !node.config) {
    return NextResponse.json({ error: 'Invalid action configuration' }, { status: 400 });
  }

  try {
    const plan = await getAccountPlan(getSupabaseAdmin(), userId);
    if (plan === 'free' && !isFreeAction(node.type)) {
      return NextResponse.json(
        {
          error: 'The Free plan can test Email and Telegram actions. Upgrade to Pro to test this action.',
          code: 'free_plan_limit',
        },
        { status: 403 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not verify account plan' },
      { status: 500 },
    );
  }

  const result = await sendActionNotification(node, testNotificationVars());
  return NextResponse.json(
    { result },
    { status: result.status === 'error' ? 400 : 200 },
  );
}
