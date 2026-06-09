import { describe, expect, it } from 'vitest';
import {
  ACTION_TYPES,
  SOURCE_TYPES,
  WorkflowGraph,
  isActionType,
  isSourceType,
} from '../../src/lib/workflowGraph';

const nodes = [
  { id: 'kalshi-1', type: 'kalshi' },
  { id: 'poly-1', type: 'polymarket' },
  { id: 'email-1', type: 'email' },
  { id: 'slack-1', type: 'slack' },
  { id: 'unknown-1', type: 'filter' },
];

describe('WorkflowGraph', () => {
  it('keeps source and action registries in sync with supported nodes', () => {
    expect([...SOURCE_TYPES]).toEqual(['kalshi', 'polymarket']);
    expect([...ACTION_TYPES]).toEqual([
      'discord',
      'email',
      'sms',
      'webhook',
      'telegram',
      'slack',
    ]);
    expect(isSourceType('kalshi')).toBe(true);
    expect(isSourceType('email')).toBe(false);
    expect(isActionType('telegram')).toBe(true);
    expect(isActionType('polymarket')).toBe(false);
  });

  it('falls back to all sources and all actions for legacy workflows without edges', () => {
    const graph = new WorkflowGraph(nodes);

    expect(graph.sourceNodes.map(node => node.id)).toEqual(['kalshi-1', 'poly-1']);
    expect(graph.actionNodes.map(node => node.id)).toEqual(['email-1', 'slack-1']);
    expect(graph.sourcesFor('email-1').map(node => node.id)).toEqual([
      'kalshi-1',
      'poly-1',
    ]);
    expect(graph.sourceActionEdges).toEqual([
      { source: 'kalshi-1', target: 'email-1' },
      { source: 'kalshi-1', target: 'slack-1' },
      { source: 'poly-1', target: 'email-1' },
      { source: 'poly-1', target: 'slack-1' },
    ]);
  });

  it('uses only valid source-to-action edges and preserves edge order', () => {
    const graph = new WorkflowGraph(nodes, [
      { source: 'poly-1', target: 'email-1' },
      { source: 'kalshi-1', target: 'email-1' },
      { source: 'unknown-1', target: 'slack-1' },
      { source: 'kalshi-1', target: 'missing' },
      { source: 'email-1', target: 'slack-1' },
    ]);

    expect(graph.sourcesFor('email-1').map(node => node.id)).toEqual([
      'poly-1',
      'kalshi-1',
    ]);
    expect(graph.sourcesFor('slack-1')).toEqual([]);
    expect(graph.sourceActionEdges).toEqual([
      { source: 'poly-1', target: 'email-1' },
      { source: 'kalshi-1', target: 'email-1' },
    ]);
  });
});
