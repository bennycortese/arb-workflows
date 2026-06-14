import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { evaluateAndNotify, WorkflowLike } from '../../../../lib/thresholdEval';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getAccountPlan, validateFreeWorkflow } from '../../../../lib/planLimits';

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

  try {
    const plan = await getAccountPlan(supabase, userId);
    if (plan === 'free') {
      const { data: otherEnabled, error: enabledError } = await supabase
        .from('workflows')
        .select('id,nodes,enabled')
        .eq('user_id', userId)
        .eq('enabled', true)
        .neq('id', workflow.id);
      if (enabledError) {
        return NextResponse.json({ error: enabledError.message }, { status: 500 });
      }
      const limitError = validateFreeWorkflow(workflow, otherEnabled ?? []);
      if (limitError) {
        return NextResponse.json(
          { error: limitError, code: 'free_plan_limit' },
          { status: 403 },
        );
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not verify account plan' },
      { status: 500 },
    );
  }

  // Manual runs skip dedup, but still use the shared history pipeline.
  const results = await evaluateAndNotify(workflow, 'manual', supabase);
  const success = results.every(r => r.status !== 'error');
  return NextResponse.json({ success, results });
}
