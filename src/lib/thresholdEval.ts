import type { SupabaseClient } from '@supabase/supabase-js';
import { fillTemplate } from './template';
import { WorkflowGraph } from './workflowGraph';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NodeType = 'kalshi' | 'polymarket' | 'discord' | 'email';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, string>;
}

export interface WorkflowLike {
  id: string;
  nodes: WorkflowNode[];
  edges?: { source: string; target: string }[];
}

export interface RunResult {
  nodeId: string;
  type: NodeType;
  status: 'ok' | 'skip' | 'error';
  message: string;
}

// ── Notification helpers ───────────────────────────────────────────────────────

export async function sendDiscord(webhookUrl: string, content: string): Promise<void> {
  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!resp.ok) throw new Error(`Discord webhook failed: ${resp.status} ${resp.statusText}`);
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.AGENT_MAIL_API_KEY;
  if (!apiKey) throw new Error('AGENT_MAIL_API_KEY not set in server env');

  const resp = await fetch('https://api.agentmail.to/v0/inboxes/arbworflow@agentmail.to/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, text: body }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AgentMail API ${resp.status}: ${errText}`);
  }
}

// ── Price fetchers ─────────────────────────────────────────────────────────────

async function fetchKalshiPrice(
  marketTicker: string,
  apiKey?: string
): Promise<{ price: number; title: string }> {
  const url = `https://api.elections.kalshi.com/trade-api/v2/markets/${marketTicker.toUpperCase()}`;
  const resp = await fetch(url, {
    headers: {
      accept: 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Kalshi API ${resp.status}: ${await resp.text()}`);
  const data = await resp.json() as { market?: { yes_bid_dollars?: string; title?: string } };
  return {
    price: parseFloat(data.market?.yes_bid_dollars ?? '0'),
    title: data.market?.title ?? marketTicker,
  };
}

async function fetchPolymarketPrice(
  marketSlug: string,
  outcomeIndex: number
): Promise<{ price: number; title: string; outcomeLabel: string }> {
  const url = `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(marketSlug)}&limit=1`;
  const resp = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Polymarket API ${resp.status}`);
  const data = await resp.json() as { question?: string; outcomePrices?: string; outcomes?: string }[];
  const market = data[0];
  if (!market) throw new Error('Market not found');
  const prices: number[] = JSON.parse(market.outcomePrices ?? '[]');
  const outcomes: string[] = JSON.parse(market.outcomes ?? '[]');
  return {
    price: prices[outcomeIndex] ?? 0,
    title: market.question ?? marketSlug,
    outcomeLabel: outcomes[outcomeIndex] ?? 'outcome',
  };
}

// ── Core evaluator ────────────────────────────────────────────────────────────
//
// triggeredBy:
//   'manual' — user clicked "Run Now"; always notify if threshold met, no dedup
//   'worker' | 'cron' — automated; apply dedup via workflow_market_states
//
// supabase:
//   Required when triggeredBy !== 'manual' for state reads/writes and run logging.
//   Pass null for manual runs (no DB side effects).

export async function evaluateAndNotify(
  workflow: WorkflowLike,
  triggeredBy: 'manual' | 'worker' | 'cron',
  supabase: SupabaseClient | null
): Promise<RunResult[]> {
  const results: RunResult[] = [];

  // Keyed by source node ID — only populated when that source triggers a notification
  const triggeredVars = new Map<string, Record<string, string>>();

  // ── Step 1: Evaluate source nodes ──────────────────────────────────────────
  for (const node of workflow.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket')) {
    try {
      let price = 0;
      let title = '';
      const vars: Record<string, string> = {
        platform: '', market: '', price: '', threshold: '', direction: '', url: '',
      };

      if (node.type === 'kalshi') {
        const { marketTicker, apiKey: nodeApiKey, priceThreshold, direction } = node.config;
        const apiKey = nodeApiKey || process.env.KALSHI_API_KEY;
        const fetched = await fetchKalshiPrice(marketTicker, apiKey);
        price = fetched.price;
        title = fetched.title;

        const threshold = parseFloat(priceThreshold ?? '0.5');
        vars.platform  = 'Kalshi';
        vars.market    = title;
        vars.price     = `${(price * 100).toFixed(0)}¢`;
        vars.threshold = `${(threshold * 100).toFixed(0)}¢`;
        vars.direction = direction ?? 'any';
        vars.url       = `https://kalshi.com/markets/${marketTicker}`;

        const inZone =
          direction === 'any' ||
          (direction === 'above' && price >= threshold) ||
          (direction === 'below' && price <= threshold);

        if (inZone) {
          const shouldNotify = await resolveDedup(
            workflow.id, node.id, 'kalshi', marketTicker, price, inZone, triggeredBy, supabase
          );
          if (shouldNotify) {
            triggeredVars.set(node.id, vars);
            results.push({ nodeId: node.id, type: 'kalshi', status: 'ok', message: `${title} at ${vars.price} — threshold met` });
          } else {
            results.push({ nodeId: node.id, type: 'kalshi', status: 'skip', message: `${title} at ${vars.price} — already notified (dedup)` });
          }
        } else {
          await resolveDedup(workflow.id, node.id, 'kalshi', marketTicker, price, inZone, triggeredBy, supabase);
          results.push({ nodeId: node.id, type: 'kalshi', status: 'skip', message: `${title} at ${vars.price} — threshold not met (${direction} ${vars.threshold})` });
        }
      }

      if (node.type === 'polymarket') {
        const { marketSlug, priceThreshold, direction, outcomeIndex } = node.config;
        const idx = parseInt(outcomeIndex ?? '0', 10);
        const fetched = await fetchPolymarketPrice(marketSlug, idx);
        price = fetched.price;
        title = fetched.title;

        const threshold = parseFloat(priceThreshold ?? '0.5');
        vars.platform  = 'Polymarket';
        vars.market    = title;
        vars.price     = `${(price * 100).toFixed(0)}¢`;
        vars.threshold = `${(threshold * 100).toFixed(0)}¢`;
        vars.direction = direction ?? 'any';
        vars.url       = `https://polymarket.com/event/${marketSlug}`;

        const inZone =
          direction === 'any' ||
          (direction === 'above' && price >= threshold) ||
          (direction === 'below' && price <= threshold);

        if (inZone) {
          const shouldNotify = await resolveDedup(
            workflow.id, node.id, 'polymarket', marketSlug, price, inZone, triggeredBy, supabase
          );
          if (shouldNotify) {
            triggeredVars.set(node.id, vars);
            results.push({ nodeId: node.id, type: 'polymarket', status: 'ok', message: `${title} (${fetched.outcomeLabel}) at ${vars.price} — threshold met` });
          } else {
            results.push({ nodeId: node.id, type: 'polymarket', status: 'skip', message: `${title} at ${vars.price} — already notified (dedup)` });
          }
        } else {
          await resolveDedup(workflow.id, node.id, 'polymarket', marketSlug, price, inZone, triggeredBy, supabase);
          results.push({ nodeId: node.id, type: 'polymarket', status: 'skip', message: `${title} at ${vars.price} — threshold not met (${direction} ${vars.threshold})` });
        }
      }
    } catch (err: any) {
      results.push({ nodeId: node.id, type: node.type as NodeType, status: 'error', message: err.message });
    }
  }

  // ── Step 2: Fire action nodes — one message per connected triggered source ──
  const graph = new WorkflowGraph(workflow.nodes, workflow.edges);
  for (const node of graph.actionNodes) {
    const connectedTriggeredVars = graph.sourcesFor(node.id)
      .filter(s => triggeredVars.has(s.id))
      .map(s => triggeredVars.get(s.id)!);

    if (connectedTriggeredVars.length === 0) {
      results.push({ nodeId: node.id, type: node.type as NodeType, status: 'skip', message: 'Skipped — no connected threshold was met' });
      continue;
    }

    for (const vars of connectedTriggeredVars) {
      try {
        if (node.type === 'discord') {
          const { webhookUrl, messageTemplate } = node.config;
          if (!webhookUrl) throw new Error('Webhook URL not configured');
          await sendDiscord(webhookUrl, fillTemplate(messageTemplate ?? '{{market}} hit {{price}}', vars));
          results.push({ nodeId: node.id, type: 'discord', status: 'ok', message: `Message sent to Discord (${vars.platform}: ${vars.market})` });
        }

        if (node.type === 'email') {
          const { toEmail, subject, bodyTemplate } = node.config;
          if (!toEmail) throw new Error('Recipient email not configured');
          await sendEmail(
            toEmail,
            fillTemplate(subject ?? 'ArbFlow Alert', vars),
            fillTemplate(bodyTemplate ?? '{{market}}: {{price}}', vars)
          );
          results.push({ nodeId: node.id, type: 'email', status: 'ok', message: `Email sent to ${toEmail} (${vars.platform}: ${vars.market})` });
        }
      } catch (err: any) {
        results.push({ nodeId: node.id, type: node.type as NodeType, status: 'error', message: err.message });
      }
    }
  }

  // ── Step 3: Log the run to Supabase (automated runs only) ──────────────────
  if (supabase && triggeredBy !== 'manual') {
    const status = results.every(r => r.status !== 'error') ? 'success' : 'error';
    await supabase.from('workflow_runs').insert({
      workflow_id: workflow.id,
      finished_at: new Date().toISOString(),
      status,
      triggered_by: triggeredBy,
      results,
    });
    await supabase.from('workflows').update({
      last_run: new Date().toISOString(),
      last_status: status,
    }).eq('id', workflow.id);
  }

  return results;
}

// ── Dedup logic ───────────────────────────────────────────────────────────────
//
// Returns true if we should send a notification:
//   - manual: always true if inZone
//   - automated: true only if inZone AND not already triggered (first crossing)
//
// Also resets threshold_triggered when price exits the zone.

async function resolveDedup(
  workflowId: string,
  nodeId: string,
  platform: string,
  marketKey: string,
  price: number,
  inZone: boolean,
  triggeredBy: 'manual' | 'worker' | 'cron',
  supabase: SupabaseClient | null
): Promise<boolean> {
  if (triggeredBy === 'manual') return inZone;
  if (!supabase) return inZone;

  const { data: state } = await supabase
    .from('workflow_market_states')
    .select('threshold_triggered')
    .eq('workflow_id', workflowId)
    .eq('node_id', nodeId)
    .single();

  const alreadyTriggered = state?.threshold_triggered ?? false;
  const shouldNotify = inZone && !alreadyTriggered;
  const shouldReset  = !inZone && alreadyTriggered;

  // Upsert updated state
  await supabase.from('workflow_market_states').upsert({
    workflow_id: workflowId,
    node_id: nodeId,
    platform,
    market_key: marketKey,
    last_price: price,
    last_checked_at: new Date().toISOString(),
    ...(shouldNotify ? { threshold_triggered: true, last_triggered_at: new Date().toISOString() } : {}),
    ...(shouldReset  ? { threshold_triggered: false } : {}),
  }, { onConflict: 'workflow_id,node_id' });

  return shouldNotify;
}
