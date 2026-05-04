import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify } from '../notifier';

const AGENTMAIL_ENDPOINT =
  'https://api.agentmail.to/v0/inboxes/arbworflow@agentmail.to/messages/send';

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

function makeWorkflow(actionNodes: any[]) {
  return {
    id: 'wf-1',
    enabled: true,
    nodes: [makeKalshiNode(), ...actionNodes],
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

  it('skips send and logs error when AGENT_MAIL_API_KEY is not set', async () => {
    delete process.env.AGENT_MAIL_API_KEY;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await notify(makeWorkflow([makeEmailNode()]), makeKalshiNode(), 0.50);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AGENT_MAIL_API_KEY'));
    consoleSpy.mockRestore();
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
