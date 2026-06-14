export const FREE_PLAN_LIMITS = {
  activeWorkflows: 1,
  activeSources: 2,
  actionsPerWorkflow: 1,
  allowedActions: ['email', 'telegram'] as const,
};

export type AccountPlan = 'free' | 'pro';

type WorkflowNodeLike = {
  type?: string;
};

type WorkflowLike = {
  id?: string;
  nodes?: WorkflowNodeLike[];
};

type EnabledWorkflowLike = WorkflowLike & {
  enabled?: boolean;
};

const SOURCE_TYPES = new Set(['kalshi', 'polymarket']);
const ACTION_TYPES = new Set(['discord', 'email', 'sms', 'webhook', 'telegram', 'slack']);
const FREE_ACTION_TYPES = new Set<string>(FREE_PLAN_LIMITS.allowedActions);

export async function getAccountPlan(supabase: any, userId: string): Promise<AccountPlan> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.status === 'active' ? 'pro' : 'free';
}

export function validateFreeWorkflow(
  workflow: WorkflowLike,
  otherEnabledWorkflows: EnabledWorkflowLike[] = [],
): string | null {
  const nodes = workflow.nodes ?? [];
  const sources = nodes.filter(node => SOURCE_TYPES.has(node.type ?? ''));
  const actions = nodes.filter(node => ACTION_TYPES.has(node.type ?? ''));
  const unsupportedAction = actions.find(node => !FREE_ACTION_TYPES.has(node.type ?? ''));

  if (otherEnabledWorkflows.length >= FREE_PLAN_LIMITS.activeWorkflows) {
    return 'The Free plan supports one active workflow. Pause your other workflow or upgrade to Pro.';
  }
  if (sources.length > FREE_PLAN_LIMITS.activeSources) {
    return 'The Free plan supports up to two active Kalshi or Polymarket sources.';
  }
  if (actions.length > FREE_PLAN_LIMITS.actionsPerWorkflow) {
    return 'The Free plan supports one action per workflow.';
  }
  if (unsupportedAction) {
    return 'The Free plan supports Email or Telegram actions. Upgrade to Pro for SMS, Slack, Discord, and webhooks.';
  }

  return null;
}

export function isFreeAction(type: string): boolean {
  return FREE_ACTION_TYPES.has(type);
}
