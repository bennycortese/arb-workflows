import type { SupabaseClient } from '@supabase/supabase-js';
import { fillTemplate } from './template';

type NodeType = 'kalshi' | 'polymarket' | 'discord' | 'email' | 'sms';

export interface NotificationResult {
  nodeId: string;
  type: NodeType;
  status: 'ok' | 'skip' | 'error';
  message: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface Workflow {
  id: string;
  nodes: WorkflowNode[];
  edges?: { source: string; target: string }[];
}

export async function notify(
  workflow: Workflow,
  sourceNode: WorkflowNode,
  price: number,
  supabase?: SupabaseClient
): Promise<NotificationResult[]> {
  const vars = notificationVars(sourceNode, price);
  const actions = connectedActions(workflow, sourceNode.id);
  const results: NotificationResult[] = [{
    nodeId: sourceNode.id,
    type: sourceNode.type as NodeType,
    status: 'ok',
    message: `${vars.market} at ${vars.price} - threshold met`,
  }];

  for (const action of actions) {
    const type = action.type as NodeType;
    try {
      if (type === 'discord') {
        const webhookUrl = stringConfig(action, 'webhookUrl');
        if (!webhookUrl) throw new Error('Webhook URL not configured');
        await sendDiscord(
          webhookUrl,
          fillTemplate(stringConfig(action, 'messageTemplate') || '{{market}} hit {{price}}', vars)
        );
        results.push(ok(action, `Message sent to Discord (${vars.platform}: ${vars.market})`));
      }

      if (type === 'email') {
        const toEmail = stringConfig(action, 'toEmail');
        if (!toEmail) throw new Error('Recipient email not configured');
        await sendEmail(
          toEmail,
          fillTemplate(stringConfig(action, 'subject') || 'MarketPing Alert', vars),
          fillTemplate(stringConfig(action, 'bodyTemplate') || '{{market}}: {{price}}', vars)
        );
        results.push(ok(action, `Email sent to ${toEmail} (${vars.platform}: ${vars.market})`));
      }

      if (type === 'sms') {
        const toPhone = stringConfig(action, 'toPhone');
        if (!toPhone) throw new Error('Phone number not configured');
        if (action.config.smsConsent !== true) throw new Error('SMS consent has not been confirmed');
        await sendSms(
          toPhone,
          fillTemplate(stringConfig(action, 'messageTemplate') || '{{market}}: {{price}}', vars)
        );
        results.push(ok(action, `SMS sent to ${toPhone} (${vars.platform}: ${vars.market})`));
      }
    } catch (error) {
      results.push({
        nodeId: action.id,
        type,
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (supabase) await logRun(supabase, workflow.id, results);
  return results;
}

function connectedActions(workflow: Workflow, sourceNodeId: string): WorkflowNode[] {
  const actions = workflow.nodes.filter(node =>
    node.type === 'discord' || node.type === 'email' || node.type === 'sms'
  );
  const edges = workflow.edges ?? [];
  if (edges.length === 0) return actions;

  const connectedIds = new Set(
    edges.filter(edge => edge.source === sourceNodeId).map(edge => edge.target)
  );
  return actions.filter(action => connectedIds.has(action.id));
}

function notificationVars(sourceNode: WorkflowNode, price: number): Record<string, string> {
  const platform = sourceNode.type === 'kalshi' ? 'Kalshi' : 'Polymarket';
  const marketKey = sourceNode.type === 'kalshi'
    ? stringConfig(sourceNode, 'marketTicker')
    : stringConfig(sourceNode, 'marketSlug');
  const threshold = parseFloat(stringConfig(sourceNode, 'priceThreshold') || '0.5');

  return {
    platform,
    market: marketKey,
    price: `${(price * 100).toFixed(0)}¢`,
    threshold: `${(threshold * 100).toFixed(0)}¢`,
    direction: stringConfig(sourceNode, 'direction') || 'any',
    url: sourceNode.type === 'kalshi'
      ? `https://kalshi.com/markets/${marketKey}`
      : `https://polymarket.com/event/${marketKey}`,
  };
}

function stringConfig(node: WorkflowNode, key: string): string {
  const value = node.config[key];
  return typeof value === 'string' ? value : '';
}

function ok(action: WorkflowNode, message: string): NotificationResult {
  return {
    nodeId: action.id,
    type: action.type as NodeType,
    status: 'ok',
    message,
  };
}

async function sendDiscord(webhookUrl: string, content: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.AGENT_MAIL_API_KEY;
  if (!apiKey) throw new Error('AGENT_MAIL_API_KEY not set');

  const response = await fetch(
    'https://api.agentmail.to/v0/inboxes/marketping@agentmail.to/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, text: body }),
    }
  );
  if (!response.ok) throw new Error(`AgentMail API failed: ${response.status} ${response.statusText}`);
}

async function sendSms(to: string, body: string): Promise<void> {
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
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twilio API failed: ${response.status} ${detail}`);
  }
}

async function logRun(
  supabase: SupabaseClient,
  workflowId: string,
  results: NotificationResult[]
): Promise<void> {
  const finishedAt = new Date().toISOString();
  const status = results.some(result => result.status === 'error') ? 'error' : 'success';

  const { error: runError } = await supabase.from('workflow_runs').insert({
    workflow_id: workflowId,
    finished_at: finishedAt,
    status,
    triggered_by: 'worker',
    results,
  });
  if (runError) console.error('[notifier] failed to log workflow run:', runError);

  const { error: workflowError } = await supabase
    .from('workflows')
    .update({ last_run: finishedAt, last_status: status })
    .eq('id', workflowId);
  if (workflowError) console.error('[notifier] failed to update workflow status:', workflowError);
}
