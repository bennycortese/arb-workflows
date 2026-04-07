import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { fillTemplate } from '../../../../lib/template';

// ── Types ─────────────────────────────────────────────────────────────────────

type NodeType = 'kalshi' | 'polymarket' | 'discord' | 'gmail';

interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, string>;
}

interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
}

interface RunResult {
  nodeId: string;
  type: NodeType;
  status: 'ok' | 'skip' | 'error';
  message: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendDiscord(webhookUrl: string, content: string): Promise<void> {
  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!resp.ok) throw new Error(`Discord webhook failed: ${resp.status} ${resp.statusText}`);
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text: body,
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json() as { workflow: Workflow };
  const { workflow } = body;

  if (!workflow || !Array.isArray(workflow.nodes)) {
    return NextResponse.json({ error: 'Invalid workflow payload' }, { status: 400 });
  }

  const results: RunResult[] = [];
  const marketVars: Record<string, string> = {
    platform: '',
    market: '',
    price: '',
    threshold: '',
    direction: '',
    url: '',
  };

  let thresholdMet = false;

  // ── Step 1: Evaluate source nodes ─────────────────────────────────────────
  for (const node of workflow.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket')) {
    try {
      if (node.type === 'kalshi') {
        const { marketTicker, apiKey: nodeApiKey, priceThreshold, direction } = node.config;
        const apiKey = nodeApiKey || process.env.KALSHI_API_KEY;

        const url = `https://api.elections.kalshi.com/trade-api/v2/markets/${marketTicker.toUpperCase()}`;
        console.log('[Kalshi] fetching', url, 'apiKey?', !!apiKey);
        const resp = await fetch(url, {
          headers: {
            accept: 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          cache: 'no-store',
        }).catch((e: any) => { throw new Error(`fetch failed: ${e.message} — cause: ${JSON.stringify(e.cause)}`); });

        if (!resp.ok) throw new Error(`Kalshi API ${resp.status}: ${await resp.text()}`);

        const data = await resp.json() as { market?: { yes_bid_dollars?: string; title?: string } };
        const price = parseFloat(data.market?.yes_bid_dollars ?? '0');
        const priceFraction = price;
        const threshold = parseFloat(priceThreshold ?? '0.5');
        const title = data.market?.title ?? marketTicker;

        marketVars.platform = 'Kalshi';
        marketVars.market = title;
        marketVars.price = `${(priceFraction * 100).toFixed(0)}¢`;
        marketVars.threshold = `${(threshold * 100).toFixed(0)}¢`;
        marketVars.direction = direction ?? 'any';
        marketVars.url = `https://kalshi.com/markets/${marketTicker}`;

        if (
          direction === 'any' ||
          (direction === 'above' && priceFraction >= threshold) ||
          (direction === 'below' && priceFraction <= threshold)
        ) {
          thresholdMet = true;
          results.push({ nodeId: node.id, type: 'kalshi', status: 'ok', message: `${title} at ${marketVars.price} — threshold met` });
        } else {
          results.push({ nodeId: node.id, type: 'kalshi', status: 'skip', message: `${title} at ${marketVars.price} — threshold not met (${direction} ${marketVars.threshold})` });
        }
      }

      if (node.type === 'polymarket') {
        const { marketSlug, priceThreshold, direction, outcomeIndex } = node.config;

        const url = `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(marketSlug)}&limit=1`;
        const resp = await fetch(url, { headers: { accept: 'application/json' } });

        if (!resp.ok) throw new Error(`Polymarket API ${resp.status}`);

        const data = await resp.json() as { question?: string; outcomePrices?: string; outcomes?: string }[];
        const market = data[0];
        if (!market) throw new Error('Market not found');

        const prices: number[] = JSON.parse(market.outcomePrices ?? '[]');
        const idx = parseInt(outcomeIndex ?? '0', 10);
        const price = prices[idx] ?? 0;
        const threshold = parseFloat(priceThreshold ?? '0.5');
        const title = market.question ?? marketSlug;
        const outcomes: string[] = JSON.parse(market.outcomes ?? '[]');

        marketVars.platform = 'Polymarket';
        marketVars.market = title;
        marketVars.price = `${(price * 100).toFixed(0)}¢`;
        marketVars.threshold = `${(threshold * 100).toFixed(0)}¢`;
        marketVars.direction = direction ?? 'any';
        marketVars.url = `https://polymarket.com/event/${marketSlug}`;

        if (
          direction === 'any' ||
          (direction === 'above' && price >= threshold) ||
          (direction === 'below' && price <= threshold)
        ) {
          thresholdMet = true;
          results.push({ nodeId: node.id, type: 'polymarket', status: 'ok', message: `${title} (${outcomes[idx] ?? 'outcome'}) at ${marketVars.price} — threshold met` });
        } else {
          results.push({ nodeId: node.id, type: 'polymarket', status: 'skip', message: `${title} at ${marketVars.price} — threshold not met (${direction} ${marketVars.threshold})` });
        }
      }
    } catch (err: any) {
      results.push({ nodeId: node.id, type: node.type, status: 'error', message: err.message });
    }
  }

  // ── Step 2: Fire action nodes if threshold met ────────────────────────────
  for (const node of workflow.nodes.filter(n => n.type === 'discord' || n.type === 'gmail')) {
    if (!thresholdMet) {
      results.push({ nodeId: node.id, type: node.type, status: 'skip', message: 'Skipped — no threshold was met' });
      continue;
    }

    try {
      if (node.type === 'discord') {
        const { webhookUrl, messageTemplate } = node.config;
        if (!webhookUrl) throw new Error('Webhook URL not configured');
        const message = fillTemplate(messageTemplate ?? '{{market}} hit {{price}}', marketVars);
        await sendDiscord(webhookUrl, message);
        results.push({ nodeId: node.id, type: 'discord', status: 'ok', message: 'Message sent to Discord' });
      }

      if (node.type === 'gmail') {
        const { toEmail, subject, bodyTemplate } = node.config;
        if (!toEmail) throw new Error('Recipient email not configured');
        if (!process.env.GMAIL_USER) throw new Error('GMAIL_USER not set in server env');
        const subjectFilled = fillTemplate(subject ?? 'ArbFlow Alert', marketVars);
        const bodyFilled = fillTemplate(bodyTemplate ?? '{{market}}: {{price}}', marketVars);
        await sendEmail(toEmail, subjectFilled, bodyFilled);
        results.push({ nodeId: node.id, type: 'gmail', status: 'ok', message: `Email sent to ${toEmail}` });
      }
    } catch (err: any) {
      results.push({ nodeId: node.id, type: node.type, status: 'error', message: err.message });
    }
  }

  const success = results.every(r => r.status !== 'error');
  return NextResponse.json({ success, results });
}
