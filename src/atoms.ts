import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';

export type NodeType = 'kalshi' | 'polymarket' | 'discord' | 'email' | 'sms';

export interface KalshiConfig {
  apiKey: string;
  marketTicker: string;
  priceThreshold: string;
  direction: 'above' | 'below' | 'any';
}

export interface PolymarketConfig {
  marketSlug: string;
  priceThreshold: string;
  direction: 'above' | 'below' | 'any';
  outcomeIndex: string;
}

export interface DiscordConfig {
  webhookUrl: string;
  messageTemplate: string;
}

export interface EmailConfig {
  toEmail: string;
  subject: string;
  bodyTemplate: string;
}

export interface SmsConfig {
  toPhone: string;
  messageTemplate: string;
  smsConsent: boolean;
}

export type NodeConfig = KalshiConfig | PolymarketConfig | DiscordConfig | EmailConfig | SmsConfig;

export interface WorkflowNode {
  id: string;
  type: NodeType;
  config: NodeConfig;
  expanded: boolean;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  waypoint?: { x: number; y: number };
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges?: WorkflowEdge[];
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  lastStatus?: 'success' | 'error' | 'running';
}

export const defaultKalshiConfig: KalshiConfig = {
  apiKey: '',
  marketTicker: '',
  priceThreshold: '0.5',
  direction: 'above',
};

export const defaultPolymarketConfig: PolymarketConfig = {
  marketSlug: '',
  priceThreshold: '0.5',
  direction: 'above',
  outcomeIndex: '0',
};

export const defaultDiscordConfig: DiscordConfig = {
  webhookUrl: '',
  messageTemplate: 'Alert: {{market}} crossed {{threshold}} — now at {{price}} on {{platform}}',
};

export const defaultEmailConfig: EmailConfig = {
  toEmail: '',
  subject: 'Market alert: {{market}}',
  bodyTemplate: 'Market: {{market}}\nCurrent price: {{price}}\nThreshold: {{threshold}}\nDirection: {{direction}}\nPlatform: {{platform}}',
};

export const defaultSmsConfig: SmsConfig = {
  toPhone: '',
  messageTemplate: 'MarketPing: {{market}} crossed {{threshold}} — now {{price}} on {{platform}}. {{url}}',
  smsConsent: false,
};

function makeDefaultConfig(type: NodeType): NodeConfig {
  switch (type) {
    case 'kalshi':     return { ...defaultKalshiConfig };
    case 'polymarket': return { ...defaultPolymarketConfig };
    case 'discord':    return { ...defaultDiscordConfig };
    case 'email':      return { ...defaultEmailConfig };
    case 'sms':        return { ...defaultSmsConfig };
  }
}

export function createNode(type: NodeType): WorkflowNode {
  return {
    id: uuidv4(),
    type,
    config: makeDefaultConfig(type),
    expanded: true,
  };
}

// ── Global atoms ─────────────────────────────────────────────────────────────

export const workflowsAtom = atom<Workflow[]>([]);

export const activeWorkflowIdAtom = atom<string | null>(null);

export const activeWorkflowAtom = atom(
  (get) => {
    const id = get(activeWorkflowIdAtom);
    const workflows = get(workflowsAtom);
    return workflows.find(w => w.id === id) ?? null;
  }
);

// True after the initial load from /api/workflows/list completes (prevents double-fetch)
export const workflowsLoadedAtom = atom(false);

// Write-only atom: fire-and-forget persist to Supabase
export const saveWorkflowAtom = atom(
  null,
  (_get, _set, workflow: Workflow) => {
    fetch('/api/workflows/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    }).catch(err => console.error('[marketping] save failed:', err));
  }
);

// Write-only atom: fire-and-forget delete from Supabase
export const deleteWorkflowAtom = atom(
  null,
  (_get, _set, workflowId: string) => {
    fetch(`/api/workflows/${workflowId}`, { method: 'DELETE' })
      .catch(err => console.error('[marketping] delete failed:', err));
  }
);
