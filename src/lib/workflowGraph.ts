export const SOURCE_TYPES = new Set(['kalshi', 'polymarket']);
export const ACTION_TYPES = new Set(['discord', 'email', 'sms']);

export function isSourceType(type: string): boolean { return SOURCE_TYPES.has(type); }
export function isActionType(type: string): boolean { return ACTION_TYPES.has(type); }

export interface GraphEdge { source: string; target: string; }
export interface GraphNode  { id: string; type: string; }

/**
 * Lightweight graph wrapper over a workflow's nodes + edges.
 * Generic so it works with both atoms.WorkflowNode (rich config) and
 * thresholdEval.WorkflowNode (config: Record<string, string>).
 */
export class WorkflowGraph<N extends GraphNode> {
  readonly sourceNodes: N[];
  readonly actionNodes: N[];
  private readonly nodeMap: Map<string, N>;
  private readonly edges: GraphEdge[];

  constructor(nodes: N[], edges?: GraphEdge[]) {
    this.sourceNodes = nodes.filter(n => isSourceType(n.type));
    this.actionNodes = nodes.filter(n => isActionType(n.type));
    this.nodeMap = new Map(nodes.map(n => [n.id, n]));
    this.edges = edges ?? [];
  }

  /**
   * Source nodes connected to the given action node, in edge order.
   * Falls back to all source nodes when no edges are defined.
   */
  sourcesFor(actionNodeId: string): N[] {
    if (this.edges.length === 0) return this.sourceNodes;
    return this.edges
      .filter(e => e.target === actionNodeId)
      .map(e => this.nodeMap.get(e.source))
      .filter((n): n is N => n !== undefined && isSourceType(n.type));
  }

  /**
   * Edges that connect a source to an action node.
   * Falls back to a synthetic all-to-all set when no edges are defined.
   */
  get sourceActionEdges(): GraphEdge[] {
    if (this.edges.length > 0) {
      return this.edges.filter(e => {
        const src = this.nodeMap.get(e.source);
        const tgt = this.nodeMap.get(e.target);
        return src && isSourceType(src.type) && tgt && isActionType(tgt.type);
      });
    }
    return this.sourceNodes.flatMap(s =>
      this.actionNodes.map(a => ({ source: s.id, target: a.id }))
    );
  }
}
