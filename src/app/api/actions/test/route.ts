import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendActionNotification,
  testNotificationVars,
  type WorkflowNode,
} from '../../../../lib/thresholdEval';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const node = await request.json() as WorkflowNode;
  const actionTypes = new Set(['discord', 'email', 'sms', 'webhook', 'telegram', 'slack']);
  if (!node?.id || !actionTypes.has(node.type) || !node.config) {
    return NextResponse.json({ error: 'Invalid action configuration' }, { status: 400 });
  }

  const result = await sendActionNotification(node, testNotificationVars());
  return NextResponse.json(
    { result },
    { status: result.status === 'error' ? 400 : 200 },
  );
}
