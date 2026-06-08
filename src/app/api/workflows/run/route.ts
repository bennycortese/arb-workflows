import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { evaluateAndNotify, WorkflowLike } from '../../../../lib/thresholdEval';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { workflow: WorkflowLike };
  const { workflow } = body;

  if (!workflow || !Array.isArray(workflow.nodes)) {
    return NextResponse.json({ error: 'Invalid workflow payload' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: ownedWorkflow } = await supabase
    .from('workflows')
    .select('id')
    .eq('id', workflow.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!ownedWorkflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  // Manual runs skip dedup, but still use the shared history pipeline.
  const results = await evaluateAndNotify(workflow, 'manual', supabase);
  const success = results.every(r => r.status !== 'error');
  return NextResponse.json({ success, results });
}
