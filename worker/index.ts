import { createClient } from '@supabase/supabase-js';
import { KalshiWSManager } from './kalshi-ws';
import { PolymarketWSManager } from './polymarket-ws';

const SUPABASE_URL          = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const KALSHI_API_KEY        = process.env.KALSHI_API_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const kalshiWS = new KalshiWSManager(KALSHI_API_KEY, supabase);
const polyWS   = new PolymarketWSManager(supabase);

function registerWorkflow(wf: any) {
  const nodes = (wf.nodes as any[]) ?? [];
  for (const node of nodes) {
    if (node.type === 'kalshi' && node.config?.marketTicker) {
      kalshiWS.watch(node.config.marketTicker, wf.id, node.id);
    } else if (node.type === 'polymarket' && node.config?.marketSlug) {
      polyWS.watch(node.config.marketSlug, wf.id, node.id);
    }
  }
}

async function bootstrap() {
  console.log('[worker] starting…');

  // 1. Load all currently enabled workflows
  const { data: workflows, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('enabled', true);

  if (error) { console.error('[worker] failed to load workflows:', error); process.exit(1); }

  for (const wf of workflows ?? []) registerWorkflow(wf);
  console.log(`[worker] loaded ${(workflows ?? []).length} enabled workflow(s)`);

  // 2. Connect WS managers (Polymarket resolves slugs before opening WS)
  kalshiWS.connect();
  await polyWS.connect();

  // 3. Subscribe to Supabase Realtime for live workflow changes
  supabase
    .channel('workflow-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workflows' }, ({ new: wf }) => {
      console.log('[worker] new workflow:', wf.id);
      if (wf.enabled) registerWorkflow(wf);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workflows' }, ({ new: wf }) => {
      console.log('[worker] workflow updated:', wf.id, 'enabled:', wf.enabled);
      kalshiWS.unregisterWorkflow(wf.id);
      polyWS.unregisterWorkflow(wf.id);
      if (wf.enabled) registerWorkflow(wf);
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'workflows' }, ({ old: wf }) => {
      console.log('[worker] workflow deleted:', wf.id);
      kalshiWS.unregisterWorkflow(wf.id);
      polyWS.unregisterWorkflow(wf.id);
    })
    .subscribe((status) => console.log('[worker] realtime status:', status));

  // 4. Periodic full re-sync every 60s — guards against missed Realtime events
  setInterval(async () => {
    const { data } = await supabase.from('workflows').select('*').eq('enabled', true);
    const activeIds = new Set((data ?? []).map((w: any) => w.id));
    for (const wf of data ?? []) registerWorkflow(wf);
    console.log(`[worker] re-sync: ${activeIds.size} enabled workflow(s)`);
  }, 60_000);

  console.log('[worker] online');
}

bootstrap().catch(err => {
  console.error('[worker] fatal startup error:', err);
  process.exit(1);
});
