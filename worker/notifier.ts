import { fillTemplate } from './template';

export async function notify(
  workflow: any,
  sourceNode: any,
  price: number
): Promise<void> {
  const platform  = sourceNode.type === 'kalshi' ? 'Kalshi' : 'Polymarket';
  const marketKey = sourceNode.type === 'kalshi'
    ? sourceNode.config.marketTicker
    : sourceNode.config.marketSlug;
  const threshold = parseFloat(sourceNode.config.priceThreshold ?? '0.5');

  const vars: Record<string, string> = {
    platform,
    market:    marketKey,
    price:     `${(price * 100).toFixed(0)}¢`,
    threshold: `${(threshold * 100).toFixed(0)}¢`,
    direction: sourceNode.config.direction ?? 'any',
    url: sourceNode.type === 'kalshi'
      ? `https://kalshi.com/markets/${marketKey}`
      : `https://polymarket.com/event/${marketKey}`,
  };

  const actionNodes = (workflow.nodes as any[]).filter(
    (n: any) => n.type === 'discord' || n.type === 'email'
  );

  await Promise.allSettled(actionNodes.map(async (action: any) => {
    if (action.type === 'discord') {
      await sendDiscord(
        action.config.webhookUrl,
        fillTemplate(action.config.messageTemplate ?? '{{market}} hit {{price}}', vars)
      );
    } else if (action.type === 'email') {
      await sendEmail(
        action.config.toEmail,
        fillTemplate(action.config.subject ?? 'ArbFlow Alert', vars),
        fillTemplate(action.config.bodyTemplate ?? '{{market}}: {{price}}', vars)
      );
    }
  }));
}

async function sendDiscord(webhookUrl: string, content: string): Promise<void> {
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!to) return;
  const apiKey = process.env.AGENT_MAIL_API_KEY;
  if (!apiKey) { console.error('[notifier] AGENT_MAIL_API_KEY not set'); return; }
  await fetch('https://api.agentmail.to/v0/inboxes/arbworflow@agentmail.to/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, text: body }),
  });
}
