import type { SupabaseClient } from '@supabase/supabase-js';
import { fillTemplate } from './template';
import { WorkflowGraph } from './workflowGraph';
import { assertTelegramChatSignature, sendTelegramMessage } from './telegram';
import { fetchWithRetry } from './retry';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NodeType =
  | 'kalshi'
  | 'polymarket'
  | 'discord'
  | 'email'
  | 'sms'
  | 'webhook'
  | 'telegram'
  | 'slack';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, string> & { smsConsent?: boolean };
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
  const resp = await fetchWithRetry(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!resp.ok) throw new Error(`Discord webhook failed: ${resp.status} ${resp.statusText}`);
}

export async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM_NUMBER;
  const username = apiKeySid ?? accountSid;
  const password = apiKeySecret ?? authToken;
  if (!accountSid || !username || !password || !from) {
    throw new Error('Twilio env vars not set');
  }

  const payload = new URLSearchParams({ To: to, From: from, Body: body });
  const response = await fetchWithRetry(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Twilio API ${response.status}: ${await response.text()}`);
  }
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.AGENT_MAIL_API_KEY;
  if (!apiKey) throw new Error('AGENT_MAIL_API_KEY not set in server env');

  const resp = await fetchWithRetry('https://api.agentmail.to/v0/inboxes/marketping@agentmail.to/messages/send', {
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

function validatePublicHttpsUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') throw new Error('Webhook URL must use HTTPS');

  const hostname = url.hostname.toLowerCase();
  const blocked =
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^\[?f[cd][0-9a-f]{2}:/i.test(hostname) ||
    /^\[?fe[89ab][0-9a-f]:/i.test(hostname);
  if (blocked) throw new Error('Private network webhook URLs are not allowed');
  return url;
}

async function sendWebhook(
  webhookUrl: string,
  secret: string,
  message: string,
  vars: Record<string, string>
): Promise<void> {
  const url = validatePublicHttpsUrl(webhookUrl);
  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'X-MarketPing-Secret': secret } : {}),
    },
    body: JSON.stringify({
      event: 'market.threshold_crossed',
      message,
      market: vars.market,
      platform: vars.platform,
      price: vars.price,
      threshold: vars.threshold,
      direction: vars.direction,
      url: vars.url,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error(`Webhook failed: ${resp.status} ${resp.statusText}`);
}

async function sendSlack(webhookUrl: string, text: string): Promise<void> {
  const url = validatePublicHttpsUrl(webhookUrl);
  if (url.hostname !== 'hooks.slack.com') throw new Error('Invalid Slack webhook URL');
  const resp = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) throw new Error(`Slack webhook failed: ${resp.status} ${resp.statusText}`);
}

const TEST_VARS: Record<string, string> = {
  platform: 'MarketPing Test',
  market: 'Test market',
  price: '57¢',
  threshold: '50¢',
  direction: 'above',
  url: 'https://www.marketping.ai',
};

export async function sendActionNotification(
  node: WorkflowNode,
  vars: Record<string, string>,
): Promise<RunResult> {
  try {
    if (node.type === 'discord') {
      const { webhookUrl, messageTemplate } = node.config;
      if (!webhookUrl) throw new Error('Webhook URL not configured');
      await sendDiscord(webhookUrl, fillTemplate(messageTemplate ?? '{{market}} hit {{price}}', vars));
      return { nodeId: node.id, type: 'discord', status: 'ok', message: 'Test message sent to Discord' };
    }

    if (node.type === 'email') {
      const { toEmail, subject, bodyTemplate } = node.config;
      if (!toEmail) throw new Error('Recipient email not configured');
      await sendEmail(
        toEmail,
        fillTemplate(subject ?? 'MarketPing Alert', vars),
        fillTemplate(bodyTemplate ?? '{{market}}: {{price}}', vars),
      );
      return { nodeId: node.id, type: 'email', status: 'ok', message: `Test email sent to ${toEmail}` };
    }

    if (node.type === 'sms') {
      const { toPhone, messageTemplate, smsConsent } = node.config;
      if (!toPhone) throw new Error('Phone number not configured');
      if (smsConsent !== true) throw new Error('SMS consent has not been confirmed');
      await sendSms(toPhone, fillTemplate(messageTemplate ?? '{{market}}: {{price}}', vars));
      return { nodeId: node.id, type: 'sms', status: 'ok', message: `Test SMS sent to ${toPhone}` };
    }

    if (node.type === 'webhook') {
      const { webhookUrl, secret, messageTemplate } = node.config;
      if (!webhookUrl) throw new Error('Webhook URL not configured');
      await sendWebhook(
        webhookUrl,
        secret ?? '',
        fillTemplate(messageTemplate ?? '{{market}}: {{price}}', vars),
        vars,
      );
      return { nodeId: node.id, type: 'webhook', status: 'ok', message: 'Test webhook delivered' };
    }

    if (node.type === 'telegram') {
      const { chatId, chatSignature, messageTemplate } = node.config;
      if (!chatId) throw new Error('Telegram chat ID not configured');
      assertTelegramChatSignature(chatId, chatSignature ?? '');
      await sendTelegramMessage(chatId, fillTemplate(messageTemplate ?? '{{market}}: {{price}}', vars));
      return { nodeId: node.id, type: 'telegram', status: 'ok', message: 'Test Telegram message sent' };
    }

    if (node.type === 'slack') {
      const { webhookUrl, messageTemplate } = node.config;
      if (!webhookUrl) throw new Error('Slack webhook URL not configured');
      await sendSlack(webhookUrl, fillTemplate(messageTemplate ?? '{{market}}: {{price}}', vars));
      return { nodeId: node.id, type: 'slack', status: 'ok', message: 'Test Slack message sent' };
    }

    throw new Error('Unsupported action type');
  } catch (error) {
    return {
      nodeId: node.id,
      type: node.type,
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function testNotificationVars(): Record<string, string> {
  return { ...TEST_VARS };
}

// ── Price fetchers ─────────────────────────────────────────────────────────────

async function fetchKalshiPrice(
  marketTicker: string,
  apiKey?: string
): Promise<{ price: number; title: string; finalized: boolean }> {
  const url = `https://api.elections.kalshi.com/trade-api/v2/markets/${marketTicker.toUpperCase()}`;
  const resp = await fetchWithRetry(url, {
    headers: {
      accept: 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Kalshi API ${resp.status}: ${await resp.text()}`);
  const data = await resp.json() as {
    market?: {
      yes_bid_dollars?: string;
      last_price_dollars?: string;
      settlement_value_dollars?: string;
      title?: string;
      status?: string;
    };
  };
  const market = data.market;
  if (!market) throw new Error('Kalshi market not found');
  const finalized = market.status === 'finalized' || market.status === 'settled';
  const rawPrice = finalized
    ? market.settlement_value_dollars
    : market.yes_bid_dollars ?? market.last_price_dollars;
  const price = Number.parseFloat(rawPrice ?? '');
  if (!Number.isFinite(price)) throw new Error('Kalshi price is unavailable');
  return {
    price,
    title: market.title ?? marketTicker,
    finalized,
  };
}

async function fetchPolymarketPrice(
  marketSlug: string,
  outcomeIndex: number
): Promise<{ price: number; title: string; outcomeLabel: string }> {
  const url = `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(marketSlug)}&limit=1`;
  const resp = await fetchWithRetry(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Polymarket API ${resp.status}`);
  const data = await resp.json() as { question?: string; outcomePrices?: string; outcomes?: string }[];
  const market = data[0];
  if (!market) throw new Error('Polymarket market is no longer available. Reselect this market.');
  const prices: number[] = JSON.parse(market.outcomePrices ?? '[]');
  const outcomes: string[] = JSON.parse(market.outcomes ?? '[]');
  const price = prices[outcomeIndex];
  if (!Number.isFinite(price)) {
    throw new Error('Polymarket outcome is no longer available. Reselect this market.');
  }
  return {
    price,
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

        if (fetched.finalized) {
          await resolveDedup(
            workflow.id, node.id, 'kalshi', marketTicker, price, false, triggeredBy, supabase
          );
          results.push({
            nodeId: node.id,
            type: 'kalshi',
            status: 'skip',
            message: `${title} finalized at ${vars.price}`,
          });
          continue;
        }

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
      const actionResult = await sendActionNotification(node, vars);
      results.push(actionResult.status === 'ok'
        ? {
            ...actionResult,
            message: `${actionResult.message.replace(/^Test /, '')} (${vars.platform}: ${vars.market})`,
          }
        : actionResult);
    }
  }

  // ── Step 3: Keep history focused on user-visible events ───────────────────
  if (supabase && shouldLogRun(triggeredBy, results)) {
    const status = results.every(r => r.status !== 'error') ? 'success' : 'error';
    const finishedAt = new Date().toISOString();
    if (status === 'error' && await isRepeatedRecentError(supabase, workflow.id, results)) {
      return results;
    }
    await supabase.from('workflow_runs').insert({
      workflow_id: workflow.id,
      finished_at: finishedAt,
      status,
      triggered_by: triggeredBy,
      results,
    });
    await supabase.from('workflows').update({
      last_run: finishedAt,
      last_status: status,
    }).eq('id', workflow.id);
  }

  return results;
}

const ACTION_TYPES = new Set<NodeType>([
  'discord', 'email', 'sms', 'webhook', 'telegram', 'slack',
]);

function shouldLogRun(
  triggeredBy: 'manual' | 'worker' | 'cron',
  results: RunResult[],
): boolean {
  if (triggeredBy === 'manual') return true;
  return results.some(result =>
    result.status === 'error' ||
    (result.status === 'ok' && ACTION_TYPES.has(result.type))
  );
}

function errorSignature(results: RunResult[]): string {
  return results
    .filter(result => result.status === 'error')
    .map(result => `${result.nodeId}:${result.type}:${result.message}`)
    .sort()
    .join('|');
}

async function isRepeatedRecentError(
  supabase: SupabaseClient,
  workflowId: string,
  results: RunResult[],
): Promise<boolean> {
  const { data, error } = await supabase
    .from('workflow_runs')
    .select('started_at,results')
    .eq('workflow_id', workflowId)
    .eq('status', 'error')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.started_at || !Array.isArray(data.results)) return false;
  const ageMs = Date.now() - new Date(data.started_at).getTime();
  if (ageMs > 6 * 60 * 60 * 1000) return false;
  return errorSignature(data.results as RunResult[]) === errorSignature(results);
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

  const { data, error } = await supabase.rpc('claim_market_threshold', {
    p_workflow_id: workflowId,
    p_node_id: nodeId,
    p_platform: platform,
    p_market_key: marketKey,
    p_price: price,
    p_in_zone: inZone,
  });
  if (error) throw new Error(`Could not claim threshold: ${error.message}`);
  return data === true;
}
