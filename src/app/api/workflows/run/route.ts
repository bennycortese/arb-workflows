import { NextRequest, NextResponse } from 'next/server';
import { evaluateAndNotify, WorkflowLike } from '../../../../lib/thresholdEval';

export async function POST(request: NextRequest) {
  const body = await request.json() as { workflow: WorkflowLike };
  const { workflow } = body;

  if (!workflow || !Array.isArray(workflow.nodes)) {
    return NextResponse.json({ error: 'Invalid workflow payload' }, { status: 400 });
  }

  // Manual runs skip dedup — always fire if threshold is met
  const results = await evaluateAndNotify(workflow, 'manual', null);
  const success = results.every(r => r.status !== 'error');
  return NextResponse.json({ success, results });
}
