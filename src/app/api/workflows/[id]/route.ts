import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getAccountPlan, validateFreeWorkflow } from '../../../../lib/planLimits';

function rowToWorkflow(row: any) {
  return {
    id: row.id,
    name: row.name,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    enabled: row.enabled,
    createdAt: row.created_at,
    lastRun: row.last_run ?? undefined,
    lastStatus: row.last_status ?? undefined,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ workflow: rowToWorkflow(data) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const supabase = getSupabaseAdmin();

  // Verify ownership before updating
  const { data: existing } = await supabase
    .from('workflows')
    .select('id,nodes,enabled')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const effectiveEnabled = body.enabled ?? existing.enabled;
  if (effectiveEnabled) {
    try {
      const plan = await getAccountPlan(supabase, userId);
      if (plan === 'free') {
        const { data: otherEnabled, error: enabledError } = await supabase
          .from('workflows')
          .select('id,nodes,enabled')
          .eq('user_id', userId)
          .eq('enabled', true)
          .neq('id', id);
        if (enabledError) {
          return NextResponse.json({ error: enabledError.message }, { status: 500 });
        }
        const limitError = validateFreeWorkflow(
          { id, nodes: body.nodes ?? existing.nodes ?? [] },
          otherEnabled ?? [],
        );
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

  const patch: Record<string, any> = {};
  if (body.name       !== undefined) patch.name       = body.name;
  if (body.nodes      !== undefined) patch.nodes      = body.nodes;
  if (body.edges      !== undefined) patch.edges      = body.edges;
  if (body.enabled    !== undefined) patch.enabled    = body.enabled;
  if (body.lastRun    !== undefined) patch.last_run   = body.lastRun;
  if (body.lastStatus !== undefined) patch.last_status = body.lastStatus;

  const { data, error } = await supabase
    .from('workflows')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ workflow: rowToWorkflow(data) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Verify ownership before deleting
  const { data: existing } = await supabase
    .from('workflows')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
