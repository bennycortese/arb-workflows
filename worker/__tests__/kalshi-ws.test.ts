import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KalshiWSManager } from '../kalshi-ws';
import { notify } from '../notifier';

vi.mock('../notifier', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}));

const mockNotify = vi.mocked(notify);

// ---- Fixtures ----------------------------------------------------------------

function makeWorkflow(priceThreshold = '0.45', direction = 'above', enabled = true) {
  return {
    id: 'wf-1',
    enabled,
    nodes: [
      {
        id: 'node-1',
        type: 'kalshi',
        config: { marketTicker: 'TICKER', priceThreshold, direction },
      },
      {
        id: 'email-1',
        type: 'email',
        config: { toEmail: 'user@example.com', subject: 'Alert', bodyTemplate: '{{price}}' },
      },
    ],
  };
}

/**
 * Builds a minimal Supabase mock whose state is shared via a mutable closure.
 * When processUpdate calls upsert({ threshold_triggered: ... }), the closure
 * is updated so subsequent state reads reflect the new value — exactly how the
 * real Supabase table works across consecutive polls.
 */
function makeSupabase(workflow: any) {
  // null = no row yet (first ever poll for this workflow+node)
  let dbState: { threshold_triggered: boolean } | null = null;

  const upsert = vi.fn(async (data: Record<string, any>) => {
    if ('threshold_triggered' in data) {
      dbState = { threshold_triggered: data.threshold_triggered as boolean };
    }
    return { data: null, error: null };
  });

  const supabase = {
    from: (table: string) => {
      if (table === 'workflows') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: workflow, error: null }),
            }),
          }),
        };
      }
      // workflow_market_states — read current dbState, write via upsert
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: dbState, error: null }),
            }),
          }),
        }),
        upsert,
      };
    },
  };

  return { supabase, upsert, getDbState: () => dbState };
}

// Helper to call the private processUpdate without going through the real WebSocket
async function processUpdate(
  manager: KalshiWSManager,
  price: number,
  workflowId = 'wf-1',
  nodeId = 'node-1',
  marketKey = 'TICKER'
) {
  await (manager as any).processUpdate(workflowId, nodeId, 'kalshi', marketKey, price);
}

// ---- Tests -------------------------------------------------------------------

describe('KalshiWSManager — observer processes messages continuously', () => {
  it('routes every incoming ticker message to processUpdate', async () => {
    const workflow = makeWorkflow();
    const { supabase } = makeSupabase(workflow);
    const manager = new KalshiWSManager('api-key', supabase as any);
    manager.watch('TICKER', 'wf-1', 'node-1');

    const processUpdateSpy = vi
      .spyOn(manager as any, 'processUpdate')
      .mockResolvedValue(undefined);

    const msg = { type: 'ticker', msg: { market_ticker: 'TICKER', yes_bid: 50 } };

    // Simulate 5 consecutive WebSocket pushes
    for (let i = 0; i < 5; i++) {
      await (manager as any).handleMessage(msg);
    }

    expect(processUpdateSpy).toHaveBeenCalledTimes(5);
  });

  it('passes the correct price (yes_bid / 100) to processUpdate', async () => {
    const workflow = makeWorkflow();
    const { supabase } = makeSupabase(workflow);
    const manager = new KalshiWSManager('api-key', supabase as any);
    manager.watch('TICKER', 'wf-1', 'node-1');

    const processUpdateSpy = vi
      .spyOn(manager as any, 'processUpdate')
      .mockResolvedValue(undefined);

    await (manager as any).handleMessage({
      type: 'ticker',
      msg: { market_ticker: 'TICKER', yes_bid: 72 },
    });

    expect(processUpdateSpy).toHaveBeenCalledWith('wf-1', 'node-1', 'kalshi', 'TICKER', 0.72);
  });

  it('ignores non-ticker message types', async () => {
    const workflow = makeWorkflow();
    const { supabase } = makeSupabase(workflow);
    const manager = new KalshiWSManager('api-key', supabase as any);
    manager.watch('TICKER', 'wf-1', 'node-1');

    const processUpdateSpy = vi
      .spyOn(manager as any, 'processUpdate')
      .mockResolvedValue(undefined);

    await (manager as any).handleMessage({ type: 'subscribed', msg: {} });
    await (manager as any).handleMessage({ type: 'heartbeat' });

    expect(processUpdateSpy).not.toHaveBeenCalled();
  });

  it('ignores ticker messages with no market_ticker field', async () => {
    const workflow = makeWorkflow();
    const { supabase } = makeSupabase(workflow);
    const manager = new KalshiWSManager('api-key', supabase as any);
    manager.watch('TICKER', 'wf-1', 'node-1');

    const processUpdateSpy = vi
      .spyOn(manager as any, 'processUpdate')
      .mockResolvedValue(undefined);

    await (manager as any).handleMessage({ type: 'ticker', msg: { yes_bid: 50 } });

    expect(processUpdateSpy).not.toHaveBeenCalled();
  });

  it('routes to all subscribers watching the same ticker', async () => {
    const workflow1 = { ...makeWorkflow(), id: 'wf-1' };
    const workflow2 = { ...makeWorkflow(), id: 'wf-2' };

    const { supabase } = makeSupabase(workflow1);
    const manager = new KalshiWSManager('api-key', supabase as any);
    manager.watch('TICKER', 'wf-1', 'node-1');
    manager.watch('TICKER', 'wf-2', 'node-2');

    const processUpdateSpy = vi
      .spyOn(manager as any, 'processUpdate')
      .mockResolvedValue(undefined);

    await (manager as any).handleMessage({
      type: 'ticker',
      msg: { market_ticker: 'TICKER', yes_bid: 50 },
    });

    expect(processUpdateSpy).toHaveBeenCalledTimes(2);
  });
});

describe('KalshiWSManager — anti-spam deduplication', () => {
  beforeEach(() => {
    mockNotify.mockClear();
  });

  it('notifies on the first threshold crossing', async () => {
    const { supabase } = makeSupabase(makeWorkflow());
    const manager = new KalshiWSManager('api-key', supabase as any);

    await processUpdate(manager, 0.50); // above 0.45 — first time

    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-notify when price stays above threshold on consecutive polls', async () => {
    const { supabase } = makeSupabase(makeWorkflow());
    const manager = new KalshiWSManager('api-key', supabase as any);

    await processUpdate(manager, 0.50); // first crossing → notify
    await processUpdate(manager, 0.52); // still above → silent
    await processUpdate(manager, 0.55); // still above → silent

    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('resets the trigger when price drops back below threshold', async () => {
    const { supabase, getDbState } = makeSupabase(makeWorkflow());
    const manager = new KalshiWSManager('api-key', supabase as any);

    await processUpdate(manager, 0.50); // crosses above → triggered=true
    await processUpdate(manager, 0.40); // drops below → should reset to false

    expect(getDbState()).toEqual({ threshold_triggered: false });
  });

  it('notifies again after price exits zone and re-enters', async () => {
    const { supabase } = makeSupabase(makeWorkflow());
    const manager = new KalshiWSManager('api-key', supabase as any);

    await processUpdate(manager, 0.50); // first crossing → notify (#1)
    await processUpdate(manager, 0.40); // drops below → reset
    await processUpdate(manager, 0.50); // crosses above again → notify (#2)

    expect(mockNotify).toHaveBeenCalledTimes(2);
  });

  // The exact scenario from the user: threshold goes 40¢ → 50¢, threshold at 45¢
  it('user scenario: 40¢ → 50¢ with threshold at 45¢ triggers once, not on every poll', async () => {
    const { supabase } = makeSupabase(makeWorkflow('0.45', 'above'));
    const manager = new KalshiWSManager('api-key', supabase as any);

    // Polls while price is below threshold — no notifications
    await processUpdate(manager, 0.40);
    await processUpdate(manager, 0.42);
    await processUpdate(manager, 0.44);
    expect(mockNotify).not.toHaveBeenCalled();

    // Price crosses the 45¢ threshold — NOTIFY exactly once
    await processUpdate(manager, 0.50);
    expect(mockNotify).toHaveBeenCalledTimes(1);

    // Price continues to rise — no additional notifications
    await processUpdate(manager, 0.52);
    await processUpdate(manager, 0.55);
    await processUpdate(manager, 0.60);
    expect(mockNotify).toHaveBeenCalledTimes(1); // still just the one
  });
});

describe('KalshiWSManager — disabled workflow', () => {
  beforeEach(() => {
    mockNotify.mockClear();
  });

  it('does not notify when workflow.enabled is false', async () => {
    const { supabase } = makeSupabase(makeWorkflow('0.45', 'above', false));
    const manager = new KalshiWSManager('api-key', supabase as any);

    await processUpdate(manager, 0.50);

    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe('KalshiWSManager — watch / unregisterWorkflow', () => {
  it('does not add duplicate subscriptions for the same workflow+node', () => {
    const { supabase } = makeSupabase(makeWorkflow());
    const manager = new KalshiWSManager('api-key', supabase as any);

    manager.watch('TICKER', 'wf-1', 'node-1');
    manager.watch('TICKER', 'wf-1', 'node-1'); // duplicate

    const subs: Map<string, any[]> = (manager as any).subs;
    expect(subs.get('TICKER')).toHaveLength(1);
  });

  it('normalises ticker to uppercase', () => {
    const { supabase } = makeSupabase(makeWorkflow());
    const manager = new KalshiWSManager('api-key', supabase as any);

    manager.watch('ticker-lowercase', 'wf-1', 'node-1');

    const subs: Map<string, any[]> = (manager as any).subs;
    expect(subs.has('TICKER-LOWERCASE')).toBe(true);
  });

  it('removes a workflow from all ticker subscriptions on unregister', () => {
    const { supabase } = makeSupabase(makeWorkflow());
    const manager = new KalshiWSManager('api-key', supabase as any);

    manager.watch('TICKER', 'wf-1', 'node-1');
    manager.watch('TICKER', 'wf-2', 'node-2');
    manager.unregisterWorkflow('wf-1');

    const subs: Map<string, any[]> = (manager as any).subs;
    expect(subs.get('TICKER')).toHaveLength(1);
    expect(subs.get('TICKER')![0].workflowId).toBe('wf-2');
  });

  it('removes the ticker key entirely when the last subscriber is unregistered', () => {
    const { supabase } = makeSupabase(makeWorkflow());
    const manager = new KalshiWSManager('api-key', supabase as any);

    manager.watch('TICKER', 'wf-1', 'node-1');
    manager.unregisterWorkflow('wf-1');

    const subs: Map<string, any[]> = (manager as any).subs;
    expect(subs.has('TICKER')).toBe(false);
  });
});
