import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify } from '../notifier';

const AGENTMAIL_ENDPOINT =
  'https://api.agentmail.to/v0/inboxes/marketping@agentmail.to/messages/send';

function makeKalshiNode(overrides: Record<string, any> = {}) {
  return {
    id: 'source-1',
    type: 'kalshi',
    config: {
      marketTicker: 'TICKER-A',
      priceThreshold: '0.45',
      direction: 'above',
      ...overrides,
    },
  };
}

function makeEmailNode(overrides: Record<string, any> = {}) {
  return {
    id: 'email-1',
    type: 'email',
    config: {
      toEmail: 'user@example.com',
      subject: 'Alert: {{market}}',
      bodyTemplate: '{{market}} hit {{price}} (threshold: {{threshold}})',
      ...overrides,
    },
  };
}

function makeDiscordNode(overrides: Record<string, any> = {}) {
  return {
    id: 'discord-1',
    type: 'discord',
    config: {
      webhookUrl: 'https://discord.com/api/webhooks/123/abc',
      messageTemplate: '{{market}} hit {{price}}',
      ...overrides,
    },
  };
}

function makeSmsNode(overrides: Record<string, any> = {}) {
  return {
    id: 'sms-1',
    type: 'sms',
    config: {
      toPhone: '+14155550123',
      messageTemplate: 'MarketPing: {{market}} at {{price}}',
      smsConsent: true,
      ...overrides,
    },
  };
}

function makeWebhookNode(overrides: Record<string, any> = {}) {
  return {
    id: 'webhook-1',
    type: 'webhook',
    config: {
      webhookUrl: 'https://example.com/hooks/marketping',
      secret: 'shared-secret',
      messageTemplate: '{{market}} hit {{price}}',
      ...overrides,
    },
  };
}

function makeTelegramNode(overrides: Record<string, any> = {}) {
  return {
    id: 'telegram-1',
    type: 'telegram',
    config: {
      botToken: '123456:ABC_def',
      chatId: '-1001234567890',
      messageTemplate: '{{market}} hit {{price}}',
      ...overrides,
    },
  };
}

function makeSlackNode(overrides: Record<string, any> = {}) {
  return {
    id: 'slack-1',
    type: 'slack',
    config: {
      webhookUrl: 'https://hooks.slack.com/services/T1/B1/secret',
      messageTemplate: '{{market}} hit {{price}}',
      ...overrides,
    },
  };
}

function makeWorkflow(actionNodes: any[], edges?: { source: string; target: string }[]) {
  return {
    id: 'wf-1',
    enabled: true,
    nodes: [makeKalshiNode(), ...actionNodes],
    edges,
  };
}

describe('notify — email', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.AGENT_MAIL_API_KEY = 'test-api-key';
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AGENT_MAIL_API_KEY;
    vi.unstubAllGlobals();
  });

  it('sends to the AgentMail endpoint with the correct payload', async () => {
    await notify(makeWorkflow([makeEmailNode()]), makeKalshiNode(), 0.50);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(AGENTMAIL_ENDPOINT);
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.to).toBe('user@example.com');
  });

  it('fills subject and body templates with market variables', async () => {
    await notify(makeWorkflow([makeEmailNode()]), makeKalshiNode(), 0.50);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.subject).toBe('Alert: TICKER-A');
    expect(body.text).toBe('TICKER-A hit 50¢ (threshold: 45¢)');
  });

  it('includes the Authorization header with the API key', async () => {
    await notify(makeWorkflow([makeEmailNode()]), makeKalshiNode(), 0.50);

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe('Bearer test-api-key');
  });

  it('skips send when toEmail is empty', async () => {
    await notify(makeWorkflow([makeEmailNode({ toEmail: '' })]), makeKalshiNode(), 0.50);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an error when AGENT_MAIL_API_KEY is not set', async () => {
    delete process.env.AGENT_MAIL_API_KEY;

    const results = await notify(makeWorkflow([makeEmailNode()]), makeKalshiNode(), 0.50);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeId: 'email-1', status: 'error', message: 'AGENT_MAIL_API_KEY not set' }),
    ]));
  });

  it('formats price in cents with the ¢ symbol', async () => {
    await notify(makeWorkflow([makeEmailNode({ bodyTemplate: '{{price}}' })]), makeKalshiNode(), 0.50);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toBe('50¢');
  });

  it('formats threshold in cents with the ¢ symbol', async () => {
    await notify(makeWorkflow([makeEmailNode({ bodyTemplate: '{{threshold}}' })]), makeKalshiNode(), 0.50);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toBe('45¢');
  });

  it('includes the Kalshi market URL', async () => {
    await notify(makeWorkflow([makeEmailNode({ bodyTemplate: '{{url}}' })]), makeKalshiNode(), 0.50);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toBe('https://kalshi.com/markets/TICKER-A');
  });
});

describe('notify — discord', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to the Discord webhook URL', async () => {
    await notify(makeWorkflow([makeDiscordNode()]), makeKalshiNode(), 0.50);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://discord.com/api/webhooks/123/abc');
  });

  it('fills message template with market variables', async () => {
    await notify(makeWorkflow([makeDiscordNode()]), makeKalshiNode(), 0.50);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.content).toBe('TICKER-A hit 50¢');
  });

  it('skips send when webhookUrl is empty', async () => {
    await notify(makeWorkflow([makeDiscordNode({ webhookUrl: '' })]), makeKalshiNode(), 0.50);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses default message template when messageTemplate is missing', async () => {
    const node = makeDiscordNode();
    delete node.config.messageTemplate;
    await notify(makeWorkflow([node]), makeKalshiNode(), 0.50);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.content).toContain('TICKER-A');
  });
});

describe('notify — multiple action nodes', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.AGENT_MAIL_API_KEY = 'test-api-key';
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AGENT_MAIL_API_KEY;
    vi.unstubAllGlobals();
  });

  it('fires both email and discord when both are present', async () => {
    await notify(
      makeWorkflow([makeEmailNode(), makeDiscordNode()]),
      makeKalshiNode(),
      0.50
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain(AGENTMAIL_ENDPOINT);
    expect(urls).toContain('https://discord.com/api/webhooks/123/abc');
  });

  it('fires two emails when two email nodes are present', async () => {
    const email2 = makeEmailNode({ toEmail: 'other@example.com' });
    email2.id = 'email-2';
    await notify(makeWorkflow([makeEmailNode(), email2]), makeKalshiNode(), 0.50);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const recipients = fetchMock.mock.calls.map(([, opts]) => JSON.parse(opts.body).to);
    expect(recipients).toContain('user@example.com');
    expect(recipients).toContain('other@example.com');
  });

  it('sends nothing when the workflow has no action nodes', async () => {
    await notify({ id: 'wf-1', enabled: true, nodes: [makeKalshiNode()] }, makeKalshiNode(), 0.50);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('notify — graph routing', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.AGENT_MAIL_API_KEY = 'test-api-key';
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AGENT_MAIL_API_KEY;
    vi.unstubAllGlobals();
  });

  it('fires only actions connected to the triggering source', async () => {
    const otherSource = {
      id: 'source-2',
      type: 'kalshi',
      config: { marketTicker: 'TICKER-B', priceThreshold: '0.40', direction: 'above' },
    };
    const workflow = {
      id: 'wf-1',
      nodes: [makeKalshiNode(), otherSource, makeEmailNode(), makeDiscordNode()],
      edges: [
        { source: 'source-1', target: 'email-1' },
        { source: 'source-2', target: 'discord-1' },
      ],
    };

    const results = await notify(workflow, makeKalshiNode(), 0.50);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(AGENTMAIL_ENDPOINT);
    expect(results.map(result => result.nodeId)).toEqual(['source-1', 'email-1']);
  });

  it('falls back to all actions for legacy workflows without edges', async () => {
    await notify(makeWorkflow([makeEmailNode(), makeDiscordNode()]), makeKalshiNode(), 0.50);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('notify — SMS', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_API_KEY_SID = 'SKtest';
    process.env.TWILIO_API_KEY_SECRET = 'secret';
    process.env.TWILIO_PHONE_NUMBER = '+18443521200';
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_API_KEY_SID;
    delete process.env.TWILIO_API_KEY_SECRET;
    delete process.env.TWILIO_PHONE_NUMBER;
    vi.unstubAllGlobals();
  });

  it('sends SMS through Twilio using API key authentication', async () => {
    const results = await notify(makeWorkflow([makeSmsNode()]), makeKalshiNode(), 0.50);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json');
    expect(options.headers.Authorization).toBe(`Basic ${Buffer.from('SKtest:secret').toString('base64')}`);
    expect(options.body).toContain('To=%2B14155550123');
    expect(options.body).toContain('From=%2B18443521200');
    expect(results[1]).toEqual(expect.objectContaining({ nodeId: 'sms-1', status: 'ok' }));
  });

  it('does not send without affirmative SMS consent', async () => {
    const results = await notify(
      makeWorkflow([makeSmsNode({ smsConsent: false })]),
      makeKalshiNode(),
      0.50
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(results[1]).toEqual(expect.objectContaining({
      nodeId: 'sms-1',
      status: 'error',
      message: 'SMS consent has not been confirmed',
    }));
  });
});

describe('notify — generic webhook', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts structured JSON and the optional shared secret', async () => {
    const results = await notify(makeWorkflow([makeWebhookNode()]), makeKalshiNode(), 0.50);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe('https://example.com/hooks/marketping');
    expect(options.headers['X-MarketPing-Secret']).toBe('shared-secret');
    expect(JSON.parse(options.body)).toEqual(expect.objectContaining({
      event: 'market.threshold_crossed',
      message: 'TICKER-A hit 50¢',
      market: 'TICKER-A',
      platform: 'Kalshi',
      price: '50¢',
      threshold: '45¢',
    }));
    expect(results[1]).toEqual(expect.objectContaining({ type: 'webhook', status: 'ok' }));
  });

  it('rejects private-network destinations', async () => {
    const results = await notify(
      makeWorkflow([makeWebhookNode({ webhookUrl: 'https://127.0.0.1/hook' })]),
      makeKalshiNode(),
      0.50
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(results[1]).toEqual(expect.objectContaining({
      status: 'error',
      message: 'Private network webhook URLs are not allowed',
    }));
  });
});

describe('notify — Telegram', () => {
  it('calls sendMessage with the configured chat', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const results = await notify(makeWorkflow([makeTelegramNode()]), makeKalshiNode(), 0.50);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.telegram.org/bot123456:ABC_def/sendMessage'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      chat_id: '-1001234567890',
      text: 'TICKER-A hit 50¢',
      disable_web_page_preview: true,
    });
    expect(results[1]).toEqual(expect.objectContaining({ type: 'telegram', status: 'ok' }));
    vi.unstubAllGlobals();
  });

  it('rejects malformed bot tokens before sending', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const results = await notify(
      makeWorkflow([makeTelegramNode({ botToken: 'not-a-token' })]),
      makeKalshiNode(),
      0.50
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(results[1]).toEqual(expect.objectContaining({
      status: 'error',
      message: 'Invalid Telegram bot token',
    }));
    vi.unstubAllGlobals();
  });
});

describe('notify — Slack', () => {
  it('posts the rendered text to a Slack incoming webhook', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const results = await notify(makeWorkflow([makeSlackNode()]), makeKalshiNode(), 0.50);

    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      'https://hooks.slack.com/services/T1/B1/secret'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ text: 'TICKER-A hit 50¢' });
    expect(results[1]).toEqual(expect.objectContaining({ type: 'slack', status: 'ok' }));
    vi.unstubAllGlobals();
  });

  it('rejects non-Slack webhook hosts', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const results = await notify(
      makeWorkflow([makeSlackNode({ webhookUrl: 'https://example.com/slack' })]),
      makeKalshiNode(),
      0.50
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(results[1]).toEqual(expect.objectContaining({
      status: 'error',
      message: 'Invalid Slack webhook URL',
    }));
    vi.unstubAllGlobals();
  });
});

describe('notify — run logging', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes worker run history and workflow status', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'workflow_runs') return { insert };
        if (table === 'workflows') return { update };
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    await notify(makeWorkflow([makeDiscordNode()]), makeKalshiNode(), 0.50, supabase as any);

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      workflow_id: 'wf-1',
      status: 'success',
      triggered_by: 'worker',
      results: expect.arrayContaining([
        expect.objectContaining({ nodeId: 'source-1', type: 'kalshi', status: 'ok' }),
        expect.objectContaining({ nodeId: 'discord-1', status: 'ok' }),
      ]),
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ last_status: 'success' }));
    expect(eq).toHaveBeenCalledWith('id', 'wf-1');
  });

  it('records error status when any provider fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const supabase = {
      from: vi.fn((table: string) =>
        table === 'workflow_runs' ? { insert } : { update }
      ),
    };

    const results = await notify(
      makeWorkflow([makeDiscordNode()]),
      makeKalshiNode(),
      0.50,
      supabase as any
    );

    expect(results.some(result => result.status === 'error')).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ last_status: 'error' }));
  });
});

describe('notify — Polymarket source node', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.AGENT_MAIL_API_KEY = 'test-api-key';
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    delete process.env.AGENT_MAIL_API_KEY;
    vi.unstubAllGlobals();
  });

  it('uses marketSlug for market name and Polymarket URL', async () => {
    const polyNode = {
      id: 'poly-1',
      type: 'polymarket',
      config: {
        marketSlug: 'will-it-rain',
        priceThreshold: '0.45',
        direction: 'above',
      },
    };
    const workflow = { id: 'wf-1', enabled: true, nodes: [polyNode, makeEmailNode({ bodyTemplate: '{{market}} {{url}}' })] };

    await notify(workflow, polyNode, 0.50);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toContain('will-it-rain');
    expect(body.text).toContain('https://polymarket.com/event/will-it-rain');
  });
});
