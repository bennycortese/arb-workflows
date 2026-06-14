import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getAccountPlan, validateFreeWorkflow } from '../../../../lib/planLimits';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workflow = await request.json();
  if (!workflow?.id || !workflow?.name) {
    return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: ownedByOther } = await supabase
    .from('workflows')
    .select('id')
    .eq('id', workflow.id)
    .neq('user_id', userId)
    .maybeSingle();

  if (ownedByOther) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (workflow.enabled) {
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
  }

  const { error } = await supabase.from('workflows').upsert({
    id: workflow.id,
    user_id: userId,
    name: workflow.name,
    nodes: workflow.nodes ?? [],
    edges: workflow.edges ?? [],
    enabled: workflow.enabled ?? false,
    last_run: workflow.lastRun ?? null,
    last_status: workflow.lastStatus ?? null,
  }, { onConflict: 'id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Upsert market state rows so the worker/poller know which markets to watch
  const sourceNodes = (workflow.nodes ?? []).filter(
    (n: any) => n.type === 'kalshi' || n.type === 'polymarket'
  );

  if (sourceNodes.length > 0) {
    await supabase.from('workflow_market_states').upsert(
      sourceNodes.map((n: any) => ({
        workflow_id: workflow.id,
        node_id: n.id,
        platform: n.type,
        market_key: n.type === 'kalshi'
          ? (n.config?.marketTicker ?? '')
          : (n.config?.marketSlug ?? ''),
      })),
      { onConflict: 'workflow_id,node_id', ignoreDuplicates: false }
    );
  }

  return NextResponse.json({ ok: true });
}
