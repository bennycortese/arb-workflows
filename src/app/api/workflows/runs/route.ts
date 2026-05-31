import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 100);

  const supabase = getSupabaseAdmin();

  const { data: workflows, error: wfError } = await supabase
    .from('workflows')
    .select('id, name')
    .eq('user_id', userId);

  if (wfError) return NextResponse.json({ error: wfError.message }, { status: 500 });
  if (!workflows?.length) return NextResponse.json({ runs: [] });

  const nameById = new Map(workflows.map(w => [w.id, w.name]));

  const { data: runs, error: runsError } = await supabase
    .from('workflow_runs')
    .select('id, workflow_id, started_at, finished_at, status, triggered_by, results')
    .in('workflow_id', workflows.map(w => w.id))
    .order('started_at', { ascending: false })
    .limit(limit);

  if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 });

  return NextResponse.json({
    runs: (runs ?? []).map(r => ({
      id: r.id,
      workflowId: r.workflow_id,
      workflowName: nameById.get(r.workflow_id) ?? 'Unknown workflow',
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      status: r.status,
      triggeredBy: r.triggered_by,
      results: r.results ?? [],
    })),
  });
}
