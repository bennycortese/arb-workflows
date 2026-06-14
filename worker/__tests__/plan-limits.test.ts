import { describe, expect, it } from 'vitest';
import {
  FREE_PLAN_LIMITS,
  isFreeAction,
  validateFreeWorkflow,
} from '../../src/lib/planLimits';

const source = (type: 'kalshi' | 'polymarket') => ({ type });
const action = (type: string) => ({ type });

describe('Free plan limits', () => {
  it('allows one workflow with two sources and one Email or Telegram action', () => {
    expect(validateFreeWorkflow({
      id: 'wf-1',
      nodes: [source('kalshi'), source('polymarket'), action('telegram')],
    })).toBeNull();
    expect(FREE_PLAN_LIMITS.activeWorkflows).toBe(1);
  });

  it('rejects a second active workflow', () => {
    expect(validateFreeWorkflow(
      { id: 'wf-2', nodes: [source('kalshi'), action('email')] },
      [{ id: 'wf-1', enabled: true, nodes: [] }],
    )).toContain('one active workflow');
  });

  it('rejects too many sources, actions, and Pro-only actions', () => {
    expect(validateFreeWorkflow({
      nodes: [source('kalshi'), source('polymarket'), source('kalshi'), action('email')],
    })).toContain('two active');

    expect(validateFreeWorkflow({
      nodes: [source('kalshi'), action('email'), action('telegram')],
    })).toContain('one action');

    expect(validateFreeWorkflow({
      nodes: [source('kalshi'), action('slack')],
    })).toContain('Email or Telegram');
  });

  it('classifies only Email and Telegram as Free actions', () => {
    expect(isFreeAction('email')).toBe(true);
    expect(isFreeAction('telegram')).toBe(true);
    expect(isFreeAction('sms')).toBe(false);
    expect(isFreeAction('webhook')).toBe(false);
  });
});
