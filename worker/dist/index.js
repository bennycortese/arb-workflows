"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const kalshi_ws_1 = require("./kalshi-ws");
const polymarket_ws_1 = require("./polymarket-ws");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KALSHI_API_KEY = process.env.KALSHI_API_KEY ?? '';
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const kalshiWS = new kalshi_ws_1.KalshiWSManager(KALSHI_API_KEY, supabase);
const polyWS = new polymarket_ws_1.PolymarketWSManager(supabase);
const registeredWorkflowIds = new Set();
function registerWorkflow(wf) {
    registeredWorkflowIds.add(wf.id);
    const nodes = wf.nodes ?? [];
    for (const node of nodes) {
        if (node.type === 'kalshi' && node.config?.marketTicker) {
            kalshiWS.watch(node.config.marketTicker, wf.id, node.id);
        }
        else if (node.type === 'polymarket' && node.config?.marketSlug) {
            polyWS.watch(node.config.marketSlug, wf.id, node.id);
        }
    }
}
function unregisterWorkflow(workflowId) {
    kalshiWS.unregisterWorkflow(workflowId);
    polyWS.unregisterWorkflow(workflowId);
    registeredWorkflowIds.delete(workflowId);
}
async function bootstrap() {
    console.log('[worker] starting…');
    // 1. Load all currently enabled workflows
    const { data: workflows, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('enabled', true);
    if (error) {
        console.error('[worker] failed to load workflows:', error);
        process.exit(1);
    }
    for (const wf of workflows ?? [])
        registerWorkflow(wf);
    console.log(`[worker] loaded ${(workflows ?? []).length} enabled workflow(s)`);
    // 2. Connect WS managers (Polymarket resolves slugs before opening WS)
    kalshiWS.connect();
    await polyWS.connect();
    // 3. Subscribe to Supabase Realtime for live workflow changes
    supabase
        .channel('workflow-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workflows' }, ({ new: wf }) => {
        console.log('[worker] new workflow:', wf.id);
        if (wf.enabled)
            registerWorkflow(wf);
    })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'workflows' }, ({ new: wf }) => {
        console.log('[worker] workflow updated:', wf.id, 'enabled:', wf.enabled);
        unregisterWorkflow(wf.id);
        if (wf.enabled)
            registerWorkflow(wf);
    })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'workflows' }, ({ old: wf }) => {
        console.log('[worker] workflow deleted:', wf.id);
        unregisterWorkflow(wf.id);
    })
        .subscribe((status) => console.log('[worker] realtime status:', status));
    // 4. Periodic full re-sync every 60s — guards against missed Realtime events
    setInterval(async () => {
        const { data } = await supabase.from('workflows').select('*').eq('enabled', true);
        const activeIds = new Set((data ?? []).map((w) => w.id));
        for (const workflowId of registeredWorkflowIds) {
            if (!activeIds.has(workflowId))
                unregisterWorkflow(workflowId);
        }
        for (const wf of data ?? [])
            registerWorkflow(wf);
        console.log(`[worker] re-sync: ${activeIds.size} enabled workflow(s)`);
    }, 60_000);
    console.log('[worker] online');
}
bootstrap().catch(err => {
    console.error('[worker] fatal startup error:', err);
    process.exit(1);
});
