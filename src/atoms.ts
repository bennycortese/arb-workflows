import { atom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';

export type NodeType = 'kalshi' | 'polymarket' | 'discord' | 'gmail';

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

export interface GmailConfig {
  toEmail: string;
  subject: string;
  bodyTemplate: string;
}

export type NodeConfig = KalshiConfig | PolymarketConfig | DiscordConfig | GmailConfig;

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

export const defaultGmailConfig: GmailConfig = {
  toEmail: '',
  subject: 'Market alert: {{market}}',
  bodyTemplate: 'Market: {{market}}\nCurrent price: {{price}}\nThreshold: {{threshold}}\nDirection: {{direction}}\nPlatform: {{platform}}',
};

function makeDefaultConfig(type: NodeType): NodeConfig {
  switch (type) {
    case 'kalshi': return { ...defaultKalshiConfig };
    case 'polymarket': return { ...defaultPolymarketConfig };
    case 'discord': return { ...defaultDiscordConfig };
    case 'gmail': return { ...defaultGmailConfig };
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
