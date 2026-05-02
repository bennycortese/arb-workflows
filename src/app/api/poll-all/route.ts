import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { evaluateAndNotify } from '../../../lib/thresholdEval';

const BATCH_SIZE = 5;

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('enabled', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!workflows || workflows.length === 0) return NextResponse.json({ ran: 0 });

  // Process in batches to avoid Vercel's 60s timeout
  let ran = 0;
  for (let i = 0; i < workflows.length; i += BATCH_SIZE) {
    const batch = workflows.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(wf =>
        evaluateAndNotify(
          { id: wf.id, nodes: wf.nodes ?? [], edges: wf.edges ?? [] },
          'cron',
          supabase
        )
      )
    );
    ran += batch.length;
  }

  return NextResponse.json({ ran });
}
