import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';

config();

const app = express();
const port = process.env.PORT || 5000;

// ── Security middleware ───────────────────────────────────────────────────────

app.use(helmet({ crossOriginEmbedderPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '256kb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120 });
app.use(limiter);

// ── Types (mirror client atoms) ───────────────────────────────────────────────

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

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  );
}

// ── Kalshi API ────────────────────────────────────────────────────────────────

app.get('/api/kalshi/markets', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.query as { ticker?: string };
    const apiKey = req.headers['x-kalshi-api-key'] as string | undefined;

    if (!ticker) return res.status(400).json({ error: 'ticker required' });

    const url = `https://trading-api.kalshi.com/trade-api/v2/markets/${ticker}`;
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        ...(apiKey ? { 'Authorization': `Token ${apiKey}` } : {}),
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Kalshi API error: ${response.statusText}` });
    }

    const data = await response.json() as Record<string, unknown>;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Polymarket API ────────────────────────────────────────────────────────────

app.get('/api/polymarket/markets', async (req: Request, res: Response) => {
  try {
    const { slug } = req.query as { slug?: string };
    if (!slug) return res.status(400).json({ error: 'slug required' });

    // Gamma API for market metadata
    const url = `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}&limit=1`;
    const response = await fetch(url, { headers: { 'accept': 'application/json' } });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Polymarket API error: ${response.statusText}` });
    }

    const data = await response.json() as Record<string, unknown>[];
    res.json(data[0] ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Discord webhook ───────────────────────────────────────────────────────────

async function sendDiscord(webhookUrl: string, content: string): Promise<void> {
  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!resp.ok) throw new Error(`Discord webhook failed: ${resp.status} ${resp.statusText}`);
}

// ── Gmail via nodemailer ──────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // App password (not account password)
    },
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject,
    text: body,
  });
}

// ── Run workflow ──────────────────────────────────────────────────────────────

app.post('/api/workflows/run', async (req: Request, res: Response) => {
  const { workflow } = req.body as { workflow: Workflow };

  if (!workflow || !Array.isArray(workflow.nodes)) {
    return res.status(400).json({ error: 'Invalid workflow payload' });
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

  // ── Step 1: Evaluate source nodes ──────────────────────────────────────────
  for (const node of workflow.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket')) {
    try {
      if (node.type === 'kalshi') {
        const { marketTicker, apiKey, priceThreshold, direction } = node.config;

        const url = `https://trading-api.kalshi.com/trade-api/v2/markets/${marketTicker}`;
        const resp = await fetch(url, {
          headers: {
            accept: 'application/json',
            ...(apiKey ? { Authorization: `Token ${apiKey}` } : {}),
          },
        });

        if (!resp.ok) throw new Error(`Kalshi API ${resp.status}`);

        const data = await resp.json() as { market?: { yes_bid?: number; title?: string } };
        const price = data.market?.yes_bid ?? 0;
        const priceFraction = price / 100; // Kalshi prices are in cents
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

  // ── Step 2: Fire action nodes if threshold met ─────────────────────────────
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
        results.push({ nodeId: node.id, type: 'discord', status: 'ok', message: `Message sent to Discord` });
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
  res.json({ success, results });
});

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`ArbFlow server running on port ${port}`);
});
