import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

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

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ workflows: (data ?? []).map(rowToWorkflow) });
}
