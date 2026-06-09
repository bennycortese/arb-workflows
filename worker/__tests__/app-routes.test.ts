import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  evaluateAndNotify: vi.fn(),
  sendActionNotification: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: mocks.auth,
}));

vi.mock('../../src/lib/thresholdEval', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/thresholdEval')>();
  return {
    ...actual,
    evaluateAndNotify: mocks.evaluateAndNotify,
    sendActionNotification: mocks.sendActionNotification,
  };
});

vi.mock('../../src/lib/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

import { POST as testAction } from '../../src/app/api/actions/test/route';
import { POST as runWorkflow } from '../../src/app/api/workflows/run/route';
import { POST as saveWorkflow } from '../../src/app/api/workflows/save/route';

function jsonRequest(body: unknown): Request {
  return new Request('https://www.marketping.ai/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeRunSupabase(ownedWorkflow: { id: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: ownedWorkflow, error: null });
  const eqUser = vi.fn(() => ({ maybeSingle }));
  const eqId = vi.fn(() => ({ eq: eqUser }));
  const select = vi.fn(() => ({ eq: eqId }));
  return {
    from: vi.fn(() => ({ select })),
    spies: { select, eqId, eqUser, maybeSingle },
  };
}

function makeSaveSupabase(options: {
  ownedByOther?: { id: string } | null;
  workflowError?: { message: string } | null;
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.ownedByOther ?? null,
    error: null,
  });
  const neq = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ neq }));
  const select = vi.fn(() => ({ eq }));
  const workflowUpsert = vi.fn().mockResolvedValue({
    error: options.workflowError ?? null,
  });
  const stateUpsert = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === 'workflows') {
        return { select, upsert: workflowUpsert };
      }
      if (table === 'workflow_market_states') {
        return { upsert: stateUpsert };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
    spies: { select, eq, neq, maybeSingle, workflowUpsert, stateUpsert },
  };
}

describe('POST /api/actions/test', () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.sendActionNotification.mockReset();
  });

  it('rejects signed-out requests', async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await testAction(jsonRequest({}) as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(mocks.sendActionNotification).not.toHaveBeenCalled();
  });

  it('rejects source nodes and malformed actions', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });

    const response = await testAction(jsonRequest({
      id: 'source-1',
      type: 'kalshi',
      config: {},
    }) as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid action configuration' });
  });

  it('returns a successful provider test result', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    mocks.sendActionNotification.mockResolvedValue({
      nodeId: 'slack-1',
      type: 'slack',
      status: 'ok',
      message: 'Test Slack message sent',
    });
    const action = {
      id: 'slack-1',
      type: 'slack',
      config: { webhookUrl: 'https://hooks.slack.com/services/T/B/S' },
    };

    const response = await testAction(jsonRequest(action) as never);

    expect(response.status).toBe(200);
    expect(mocks.sendActionNotification).toHaveBeenCalledWith(
      action,
      expect.objectContaining({ market: 'Test market', price: '57¢' }),
    );
  });

  it('maps provider failures to a 400 response', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    mocks.sendActionNotification.mockResolvedValue({
      nodeId: 'email-1',
      type: 'email',
      status: 'error',
      message: 'AgentMail API 500',
    });

    const response = await testAction(jsonRequest({
      id: 'email-1',
      type: 'email',
      config: { toEmail: 'user@example.com' },
    }) as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      result: expect.objectContaining({ status: 'error' }),
    });
  });
});

describe('POST /api/workflows/run', () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.evaluateAndNotify.mockReset();
    mocks.getSupabaseAdmin.mockReset();
  });

  it('rejects signed-out and malformed requests', async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null });
    expect((await runWorkflow(jsonRequest({}) as never)).status).toBe(401);

    mocks.auth.mockResolvedValueOnce({ userId: 'user-1' });
    expect((await runWorkflow(jsonRequest({ workflow: {} }) as never)).status).toBe(400);
  });

  it('does not run a workflow owned by another user', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const supabase = makeRunSupabase(null);
    mocks.getSupabaseAdmin.mockReturnValue(supabase as never);

    const response = await runWorkflow(jsonRequest({
      workflow: { id: 'wf-other', nodes: [] },
    }) as never);

    expect(response.status).toBe(404);
    expect(mocks.evaluateAndNotify).not.toHaveBeenCalled();
  });

  it('executes an owned workflow through the manual evaluation path', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const supabase = makeRunSupabase({ id: 'wf-1' });
    mocks.getSupabaseAdmin.mockReturnValue(supabase as never);
    const workflow = {
      id: 'wf-1',
      nodes: [{ id: 'source-1', type: 'kalshi', config: {} }],
    };
    mocks.evaluateAndNotify.mockResolvedValue([
      { nodeId: 'source-1', type: 'kalshi', status: 'ok', message: 'threshold met' },
    ]);

    const response = await runWorkflow(jsonRequest({ workflow }) as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      results: [expect.objectContaining({ status: 'ok' })],
    });
    expect(mocks.evaluateAndNotify).toHaveBeenCalledWith(workflow, 'manual', supabase);
  });

  it('reports a completed run as unsuccessful when a node fails', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const supabase = makeRunSupabase({ id: 'wf-1' });
    mocks.getSupabaseAdmin.mockReturnValue(supabase as never);
    mocks.evaluateAndNotify.mockResolvedValue([
      { nodeId: 'email-1', type: 'email', status: 'error', message: 'delivery failed' },
    ]);

    const response = await runWorkflow(jsonRequest({
      workflow: { id: 'wf-1', nodes: [] },
    }) as never);

    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(false);
  });
});

describe('POST /api/workflows/save', () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.getSupabaseAdmin.mockReset();
  });

  it('rejects signed-out and malformed requests', async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null });
    expect((await saveWorkflow(jsonRequest({}) as never)).status).toBe(401);

    mocks.auth.mockResolvedValueOnce({ userId: 'user-1' });
    expect((await saveWorkflow(jsonRequest({ id: 'wf-1' }) as never)).status).toBe(400);
  });

  it('prevents overwriting a workflow owned by another user', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const supabase = makeSaveSupabase({ ownedByOther: { id: 'wf-1' } });
    mocks.getSupabaseAdmin.mockReturnValue(supabase as never);

    const response = await saveWorkflow(jsonRequest({
      id: 'wf-1',
      name: 'Not mine',
    }) as never);

    expect(response.status).toBe(404);
    expect(supabase.spies.workflowUpsert).not.toHaveBeenCalled();
  });

  it('persists workflow edges and source market state rows', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const supabase = makeSaveSupabase();
    mocks.getSupabaseAdmin.mockReturnValue(supabase as never);
    const workflow = {
      id: 'wf-1',
      name: 'Launch monitor',
      enabled: true,
      nodes: [
        {
          id: 'kalshi-1',
          type: 'kalshi',
          config: { marketTicker: 'KX-FED' },
        },
        {
          id: 'poly-1',
          type: 'polymarket',
          config: { marketSlug: 'fed-decision' },
        },
        {
          id: 'slack-1',
          type: 'slack',
          config: { webhookUrl: 'https://hooks.slack.com/services/T/B/S' },
        },
      ],
      edges: [{ source: 'kalshi-1', target: 'slack-1' }],
    };

    const response = await saveWorkflow(jsonRequest(workflow) as never);

    expect(response.status).toBe(200);
    expect(supabase.spies.workflowUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'wf-1',
        user_id: 'user-1',
        edges: workflow.edges,
        enabled: true,
      }),
      { onConflict: 'id' },
    );
    expect(supabase.spies.stateUpsert).toHaveBeenCalledWith([
      expect.objectContaining({
        node_id: 'kalshi-1',
        platform: 'kalshi',
        market_key: 'KX-FED',
      }),
      expect.objectContaining({
        node_id: 'poly-1',
        platform: 'polymarket',
        market_key: 'fed-decision',
      }),
    ], {
      onConflict: 'workflow_id,node_id',
      ignoreDuplicates: false,
    });
  });

  it('returns database errors instead of claiming a successful save', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user-1' });
    const supabase = makeSaveSupabase({
      workflowError: { message: 'database unavailable' },
    });
    mocks.getSupabaseAdmin.mockReturnValue(supabase as never);

    const response = await saveWorkflow(jsonRequest({
      id: 'wf-1',
      name: 'Workflow',
      nodes: [],
    }) as never);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'database unavailable' });
  });
});
