import { createHmac } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/telegram', () => ({
  assertTelegramChatSignature: vi.fn((chatId: string, signature: string) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    const expected = createHmac('sha256', token).update(chatId).digest('hex');
    if (signature !== expected) throw new Error('Telegram destination is not connected');
  }),
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}));

import {
  evaluateAndNotify,
  sendActionNotification,
  testNotificationVars,
  type WorkflowNode,
} from '../../src/lib/thresholdEval';
import {
  assertTelegramChatSignature,
  sendTelegramMessage,
} from '../../src/lib/telegram';

const vars = testNotificationVars();

function node(
  type: WorkflowNode['type'],
  config: WorkflowNode['config'],
  id = `${type}-1`,
): WorkflowNode {
  return { id, type, config };
}

function okJson(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('source node contracts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Kalshi node', () => {
    it('fetches the configured ticker and triggers at an equal above threshold', async () => {
      const fetchMock = vi.fn().mockResolvedValue(okJson({
        market: { yes_bid_dollars: '0.50', title: 'Fed decision' },
      }));
      vi.stubGlobal('fetch', fetchMock);

      const results = await evaluateAndNotify({
        id: 'wf-kalshi',
        nodes: [node('kalshi', {
          apiKey: '',
          marketTicker: 'kx-fed',
          priceThreshold: '0.50',
          direction: 'above',
        })],
      }, 'manual', null);

      expect(String(fetchMock.mock.calls[0][0])).toContain('/markets/KX-FED');
      expect(results).toEqual([expect.objectContaining({
        type: 'kalshi',
        status: 'ok',
        message: expect.stringContaining('50¢'),
      })]);
    });

    it('reports a provider error without crashing the workflow run', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        new Response('market unavailable', { status: 404, statusText: 'Not Found' }),
      ));

      const results = await evaluateAndNotify({
        id: 'wf-kalshi-error',
        nodes: [node('kalshi', {
          apiKey: '',
          marketTicker: 'missing',
          priceThreshold: '0.50',
          direction: 'above',
        })],
      }, 'manual', null);

      expect(results[0]).toEqual(expect.objectContaining({
        type: 'kalshi',
        status: 'error',
        message: expect.stringContaining('Kalshi API 404'),
      }));
    });
  });

  describe('Polymarket node', () => {
    it('reads the configured outcome and applies a below threshold', async () => {
      const fetchMock = vi.fn().mockResolvedValue(okJson([{
        question: 'Will the bill pass?',
        outcomes: JSON.stringify(['Yes', 'No']),
        outcomePrices: JSON.stringify([0.62, 0.38]),
      }]));
      vi.stubGlobal('fetch', fetchMock);

      const results = await evaluateAndNotify({
        id: 'wf-poly',
        nodes: [node('polymarket', {
          marketSlug: 'will-the-bill-pass',
          outcomeIndex: '1',
          priceThreshold: '0.40',
          direction: 'below',
        })],
      }, 'manual', null);

      expect(String(fetchMock.mock.calls[0][0])).toContain('slug=will-the-bill-pass');
      expect(results[0]).toEqual(expect.objectContaining({
        type: 'polymarket',
        status: 'ok',
        message: expect.stringContaining('(No) at 38¢'),
      }));
    });

    it('returns a clear error when the market cannot be found', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson([])));

      const results = await evaluateAndNotify({
        id: 'wf-poly-missing',
        nodes: [node('polymarket', {
          marketSlug: 'missing-market',
          outcomeIndex: '0',
          priceThreshold: '0.50',
          direction: 'above',
        })],
      }, 'manual', null);

      expect(results[0]).toEqual(expect.objectContaining({
        type: 'polymarket',
        status: 'error',
        message: 'Market not found',
      }));
    });
  });
});

describe('action node contracts', () => {
  beforeEach(() => {
    process.env.AGENT_MAIL_API_KEY = 'agent-test-key';
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_API_KEY_SID = 'SKtest';
    process.env.TWILIO_API_KEY_SECRET = 'twilio-secret';
    process.env.TWILIO_PHONE_NUMBER = '+18443521200';
    process.env.TELEGRAM_BOT_TOKEN = '123456:ABC_def';
    vi.mocked(sendTelegramMessage).mockClear();
    vi.mocked(assertTelegramChatSignature).mockClear();
  });

  afterEach(() => {
    delete process.env.AGENT_MAIL_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_API_KEY_SID;
    delete process.env.TWILIO_API_KEY_SECRET;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.TELEGRAM_BOT_TOKEN;
    vi.unstubAllGlobals();
  });

  describe('Discord node', () => {
    it('posts the rendered template to the configured webhook', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendActionNotification(node('discord', {
        webhookUrl: 'https://discord.com/api/webhooks/123/secret',
        messageTemplate: '{{market}} is {{price}}',
      }), vars);

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toBe('https://discord.com/api/webhooks/123/secret');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        content: 'Test market is 57¢',
      });
      expect(result.status).toBe('ok');
    });

    it('rejects an empty webhook configuration', async () => {
      const result = await sendActionNotification(node('discord', {
        webhookUrl: '',
        messageTemplate: '',
      }), vars);
      expect(result).toEqual(expect.objectContaining({
        status: 'error',
        message: 'Webhook URL not configured',
      }));
    });
  });

  describe('Email node', () => {
    it('sends the rendered subject and body through AgentMail', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendActionNotification(node('email', {
        toEmail: 'trader@example.com',
        subject: '{{platform}} alert',
        bodyTemplate: '{{market}} reached {{price}}',
      }), vars);

      expect(fetchMock.mock.calls[0][0]).toContain('api.agentmail.to');
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer agent-test-key');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        to: 'trader@example.com',
        subject: 'MarketPing Test alert',
        text: 'Test market reached 57¢',
      });
      expect(result.status).toBe('ok');
    });

    it('fails clearly when the recipient is missing', async () => {
      const result = await sendActionNotification(node('email', {
        toEmail: '',
        subject: '',
        bodyTemplate: '',
      }), vars);
      expect(result).toEqual(expect.objectContaining({
        status: 'error',
        message: 'Recipient email not configured',
      }));
    });
  });

  describe('SMS node', () => {
    it('requires affirmative consent before contacting Twilio', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendActionNotification(node('sms', {
        toPhone: '+14155550123',
        messageTemplate: '{{market}} at {{price}}',
        smsConsent: false,
      }), vars);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        status: 'error',
        message: 'SMS consent has not been confirmed',
      }));
    });

    it('sends a form-encoded Twilio request using API key authentication', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendActionNotification(node('sms', {
        toPhone: '+14155550123',
        messageTemplate: '{{market}} at {{price}}',
        smsConsent: true,
      }), vars);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('/Accounts/ACtest/Messages.json');
      expect(options.headers.Authorization).toBe(
        `Basic ${Buffer.from('SKtest:twilio-secret').toString('base64')}`,
      );
      expect(options.body).toContain('To=%2B14155550123');
      expect(options.body).toContain('Body=Test+market+at+57%C2%A2');
      expect(result.status).toBe('ok');
    });
  });

  describe('Webhook node', () => {
    it('posts structured market data with the optional secret header', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendActionNotification(node('webhook', {
        webhookUrl: 'https://example.com/market-events',
        secret: 'shared-secret',
        messageTemplate: '{{market}} crossed {{threshold}}',
      }), vars);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url.toString()).toBe('https://example.com/market-events');
      expect(options.headers['X-MarketPing-Secret']).toBe('shared-secret');
      expect(JSON.parse(options.body)).toEqual({
        event: 'market.threshold_crossed',
        message: 'Test market crossed 50¢',
        market: 'Test market',
        platform: 'MarketPing Test',
        price: '57¢',
        threshold: '50¢',
        direction: 'above',
        url: 'https://www.marketping.ai',
      });
      expect(result.status).toBe('ok');
    });

    it.each([
      'http://example.com/hook',
      'https://localhost/hook',
      'https://127.0.0.1/hook',
      'https://10.0.0.1/hook',
      'https://192.168.1.5/hook',
    ])('rejects unsafe destination %s', async (webhookUrl) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendActionNotification(node('webhook', {
        webhookUrl,
        secret: '',
        messageTemplate: '',
      }), vars);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.status).toBe('error');
    });
  });

  describe('Telegram node', () => {
    it('verifies the saved destination before sending', async () => {
      const chatId = '-1001234567890';
      const signature = createHmac('sha256', process.env.TELEGRAM_BOT_TOKEN!)
        .update(chatId)
        .digest('hex');

      const result = await sendActionNotification(node('telegram', {
        chatId,
        chatLabel: 'Trading alerts',
        chatSignature: signature,
        messageTemplate: '{{market}} at {{price}}',
      }), vars);

      expect(assertTelegramChatSignature).toHaveBeenCalledWith(chatId, signature);
      expect(sendTelegramMessage).toHaveBeenCalledWith(chatId, 'Test market at 57¢');
      expect(result.status).toBe('ok');
    });

    it('rejects a destination with an invalid signature', async () => {
      const result = await sendActionNotification(node('telegram', {
        chatId: '-1001234567890',
        chatLabel: 'Untrusted chat',
        chatSignature: 'invalid',
        messageTemplate: '',
      }), vars);

      expect(sendTelegramMessage).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        status: 'error',
        message: 'Telegram destination is not connected',
      }));
    });
  });

  describe('Slack node', () => {
    it('posts the rendered text to a Slack incoming webhook', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendActionNotification(node('slack', {
        webhookUrl: 'https://hooks.slack.com/services/T1/B1/secret',
        messageTemplate: '{{market}} at {{price}}',
      }), vars);

      expect(fetchMock.mock.calls[0][0].toString()).toBe(
        'https://hooks.slack.com/services/T1/B1/secret',
      );
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        text: 'Test market at 57¢',
      });
      expect(result.status).toBe('ok');
    });

    it('rejects non-Slack webhook hosts', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const result = await sendActionNotification(node('slack', {
        webhookUrl: 'https://example.com/services/T1/B1/secret',
        messageTemplate: '',
      }), vars);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        status: 'error',
        message: 'Invalid Slack webhook URL',
      }));
    });
  });
});
