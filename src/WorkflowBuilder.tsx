'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAtom } from 'jotai';
import { UserButton } from '@clerk/nextjs';
import { Button } from './@/components/ui/button';
import {
  ReactFlow,
  Background, BackgroundVariant, Controls,
  addEdge, useNodesState, useEdgesState, useReactFlow,
  Handle, Position, MarkerType, Panel,
  type Node as RFNode,
  type Edge as RFEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  workflowsAtom, activeWorkflowIdAtom,
  WorkflowNode, NodeType, createNode,
  KalshiConfig, PolymarketConfig, DiscordConfig, GmailConfig, NodeConfig,
} from './atoms';
import { KalshiNodeConfig, KalshiNodeHeader } from './nodes/KalshiNode';
import { PolymarketNodeConfig, PolymarketNodeHeader } from './nodes/PolymarketNode';
import { DiscordNodeConfig, DiscordNodeHeader } from './nodes/DiscordNode';
import { GmailNodeConfig, GmailNodeHeader } from './nodes/GmailNode';

// ── Node type picker ──────────────────────────────────────────────────────────
const ADD_OPTIONS: { type: NodeType; label: string; desc: string; role: 'source' | 'action'; color: string }[] = [
  { type: 'kalshi',     label: 'Kalshi',     desc: 'Read market prices',  role: 'source', color: '#4ade80' },
  { type: 'polymarket', label: 'Polymarket', desc: 'Read market prices',  role: 'source', color: '#60a5fa' },
  { type: 'discord',   label: 'Discord',    desc: 'Post to channel',      role: 'action', color: '#818cf8' },
  { type: 'gmail',     label: 'Gmail',      desc: 'Send email',           role: 'action', color: '#f87171' },
];

function NodePicker({ onPick, onClose }: { onPick: (t: NodeType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-white/[0.08] rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-4">Add a node</h3>
        <div className="space-y-2">
          <p className="text-xs text-white/30 font-mono-feature uppercase tracking-wider mb-2">Sources</p>
          {ADD_OPTIONS.filter(o => o.role === 'source').map(opt => (
            <button
              key={opt.type}
              onClick={() => { onPick(opt.type); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors text-left group"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
              <div>
                <div className="text-sm text-white font-medium">{opt.label}</div>
                <div className="text-xs text-white/40">{opt.desc}</div>
              </div>
            </button>
          ))}
          <p className="text-xs text-white/30 font-mono-feature uppercase tracking-wider mt-3 mb-2">Actions</p>
          {ADD_OPTIONS.filter(o => o.role === 'action').map(opt => (
            <button
              key={opt.type}
              onClick={() => { onPick(opt.type); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.05] transition-colors text-left group"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
              <div>
                <div className="text-sm text-white font-medium">{opt.label}</div>
                <div className="text-xs text-white/40">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-4" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Shared hook for node config ───────────────────────────────────────────────
function useNodeConfig(nodeId: string, workflowId: string) {
  const [workflows, setWorkflows] = useAtom(workflowsAtom);
  const workflow = workflows.find(w => w.id === workflowId);
  const node = workflow?.nodes.find(n => n.id === nodeId);

  const updateConfig = useCallback((config: NodeConfig) => {
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? { ...w, nodes: w.nodes.map(n => n.id === nodeId ? { ...n, config } : n) }
        : w
    ));
  }, [workflowId, nodeId, setWorkflows]);

  return { node, updateConfig };
}

// ── Canvas node shell (shared layout) ────────────────────────────────────────
function CanvasNodeShell({
  id,
  isSource,
  accentColor,
  header,
  configPanel,
}: {
  id: string;
  isSource: boolean;
  accentColor: string;
  header: React.ReactNode;
  configPanel: React.ReactNode;
}) {
  const { deleteElements } = useReactFlow();
  const [expanded, setExpanded] = useState(true);

  const removeNode = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div className="canvas-node" style={{ borderColor: `${accentColor}28` }}>
      {!isSource && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: accentColor, border: '2px solid rgba(7,11,20,0.8)', width: 12, height: 12 }}
        />
      )}

      {/* Header — draggable area */}
      <div className="cn-header" onClick={() => setExpanded(e => !e)}>
        {header}
        <div className="cn-actions nodrag" onClick={e => e.stopPropagation()}>
          <button className="cn-chevron" onClick={() => setExpanded(e => !e)}>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="cn-remove" onClick={removeNode} title="Remove node">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Config panel */}
      {expanded && (
        <div className="cn-config nodrag nopan">
          {configPanel}
        </div>
      )}

      {isSource && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: accentColor, border: '2px solid rgba(7,11,20,0.8)', width: 12, height: 12 }}
        />
      )}
    </div>
  );
}

// ── Individual canvas node types (must be defined at module level for RF) ─────

function KalshiCanvasNode({ id, data }: NodeProps) {
  const workflowId = (data as { workflowId: string }).workflowId;
  const { node, updateConfig } = useNodeConfig(id, workflowId);
  if (!node) return null;
  return (
    <CanvasNodeShell
      id={id}
      isSource={true}
      accentColor="#4ade80"
      header={<KalshiNodeHeader />}
      configPanel={<KalshiNodeConfig config={node.config as KalshiConfig} onChange={updateConfig} />}
    />
  );
}

function PolymarketCanvasNode({ id, data }: NodeProps) {
  const workflowId = (data as { workflowId: string }).workflowId;
  const { node, updateConfig } = useNodeConfig(id, workflowId);
  if (!node) return null;
  return (
    <CanvasNodeShell
      id={id}
      isSource={true}
      accentColor="#60a5fa"
      header={<PolymarketNodeHeader />}
      configPanel={<PolymarketNodeConfig config={node.config as PolymarketConfig} onChange={updateConfig} />}
    />
  );
}

function DiscordCanvasNode({ id, data }: NodeProps) {
  const workflowId = (data as { workflowId: string }).workflowId;
  const { node, updateConfig } = useNodeConfig(id, workflowId);
  if (!node) return null;
  return (
    <CanvasNodeShell
      id={id}
      isSource={false}
      accentColor="#818cf8"
      header={<DiscordNodeHeader />}
      configPanel={<DiscordNodeConfig config={node.config as DiscordConfig} onChange={updateConfig} />}
    />
  );
}

function GmailCanvasNode({ id, data }: NodeProps) {
  const workflowId = (data as { workflowId: string }).workflowId;
  const { node, updateConfig } = useNodeConfig(id, workflowId);
  if (!node) return null;
  return (
    <CanvasNodeShell
      id={id}
      isSource={false}
      accentColor="#f87171"
      header={<GmailNodeHeader />}
      configPanel={<GmailNodeConfig config={node.config as GmailConfig} onChange={updateConfig} />}
    />
  );
}

const nodeTypes = {
  kalshi:     KalshiCanvasNode,
  polymarket: PolymarketCanvasNode,
  discord:    DiscordCanvasNode,
  gmail:      GmailCanvasNode,
};

// ── Edge style ────────────────────────────────────────────────────────────────
const edgeStyle = {
  stroke: 'rgba(255,255,255,0.18)',
  strokeWidth: 2,
};
const edgeMarker = {
  type: MarkerType.ArrowClosed,
  color: 'rgba(255,255,255,0.18)',
};

function makeEdge(source: string, target: string): RFEdge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    style: edgeStyle,
    markerEnd: edgeMarker,
  };
}

// ── Default positions ─────────────────────────────────────────────────────────
function defaultPosition(node: WorkflowNode, allNodes: WorkflowNode[]) {
  const isSource = node.type === 'kalshi' || node.type === 'polymarket';
  const peers = allNodes.filter(n =>
    isSource
      ? (n.type === 'kalshi' || n.type === 'polymarket')
      : (n.type === 'discord' || n.type === 'gmail')
  );
  const idx = peers.findIndex(n => n.id === node.id);
  return { x: isSource ? 80 : 560, y: 80 + Math.max(0, idx) * 420 };
}

// ── Run log ───────────────────────────────────────────────────────────────────
interface RunLogEntry {
  ts: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// ── WorkflowBuilder ───────────────────────────────────────────────────────────
export default function WorkflowBuilder() {
  const params = useParams();
  const id = params.id as string | undefined;
  const router = useRouter();
  const [workflows, setWorkflows] = useAtom(workflowsAtom);
  const [activeId] = useAtom(activeWorkflowIdAtom);

  const workflowId = id ?? activeId ?? '';
  const workflow = workflows.find(w => w.id === workflowId);

  const [rfNodes, setRFNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [rfEdges, setRFEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<RunLogEntry[]>([]);

  // Init RF state from jotai when the workflow is loaded
  useEffect(() => {
    if (!workflow) return;

    const nodes: RFNode[] = workflow.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position ?? defaultPosition(n, workflow.nodes),
      data: { workflowId },
    }));

    const edges: RFEdge[] = (workflow.edges ?? []).map(e =>
      makeEdge(e.source, e.target)
    );

    setRFNodes(nodes);
    setRFEdges(edges);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]); // intentionally only on workflowId change — custom nodes manage their own config

  // Sync drag positions → jotai
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: RFNode) => {
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? { ...w, nodes: w.nodes.map(n => n.id === node.id ? { ...n, position: node.position } : n) }
        : w
    ));
  }, [workflowId, setWorkflows]);

  // Node changes (incl. keyboard Delete)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    const removed = changes.filter(c => c.type === 'remove');
    if (removed.length === 0) return;
    const removedIds = new Set(removed.map((c: any) => c.id));
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? {
            ...w,
            nodes: w.nodes.filter(n => !removedIds.has(n.id)),
            edges: (w.edges ?? []).filter(e => !removedIds.has(e.source) && !removedIds.has(e.target)),
          }
        : w
    ));
  }, [onNodesChange, workflowId, setWorkflows]);

  // Edge changes (incl. keyboard Delete)
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    const removed = changes.filter(c => c.type === 'remove');
    if (removed.length === 0) return;
    const removedIds = new Set(removed.map((c: any) => c.id));
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? { ...w, edges: (w.edges ?? []).filter(e => !removedIds.has(e.id)) }
        : w
    ));
  }, [onEdgesChange, workflowId, setWorkflows]);

  // New connection drawn by user
  const onConnect = useCallback((connection: Connection) => {
    const edge = makeEdge(connection.source!, connection.target!);
    setRFEdges(eds => addEdge(edge, eds));
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? { ...w, edges: [...(w.edges ?? []), { id: edge.id, source: connection.source!, target: connection.target! }] }
        : w
    ));
  }, [workflowId, setWorkflows, setRFEdges]);

  // Add a node from the picker
  function addNode(type: NodeType) {
    if (!workflow) return;
    const node = createNode(type);
    const isSource = type === 'kalshi' || type === 'polymarket';
    const peers = workflow.nodes.filter(n =>
      isSource ? (n.type === 'kalshi' || n.type === 'polymarket')
               : (n.type === 'discord' || n.type === 'gmail')
    );
    const position = { x: isSource ? 80 : 560, y: 80 + peers.length * 420 };
    const nodeWithPos = { ...node, position };

    setWorkflows(prev => prev.map(w =>
      w.id === workflowId ? { ...w, nodes: [...w.nodes, nodeWithPos] } : w
    ));
    setRFNodes(prev => [...prev, {
      id: node.id,
      type: node.type,
      position,
      data: { workflowId },
    }]);
  }

  function updateName(name: string) {
    setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, name } : w));
  }

  async function runWorkflow() {
    if (!workflow) return;
    const ts = () => new Date().toLocaleTimeString();
    const newLog: RunLogEntry[] = [];

    const sources = workflow.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket');
    const actions = workflow.nodes.filter(n => n.type === 'discord' || n.type === 'gmail');

    if (sources.length === 0) {
      setLog([{ ts: ts(), message: 'No source node (Kalshi/Polymarket) configured.', type: 'error' }]);
      return;
    }
    if (actions.length === 0) {
      setLog([{ ts: ts(), message: 'No action node (Discord/Gmail) configured.', type: 'error' }]);
      return;
    }

    setRunning(true);
    newLog.push({ ts: ts(), message: `Starting "${workflow.name}"…`, type: 'info' });
    setLog([...newLog]);

    try {
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      });
      const data = await response.json() as {
        success: boolean;
        results: { nodeId: string; type: string; status: string; message: string }[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'Server error');
      for (const result of data.results) {
        newLog.push({
          ts: ts(),
          message: `[${result.type.toUpperCase()}] ${result.message}`,
          type: result.status === 'error' ? 'error' : result.status === 'ok' ? 'success' : 'info',
        });
      }
      setWorkflows(prev => prev.map(w =>
        w.id === workflowId
          ? { ...w, lastRun: new Date().toISOString(), lastStatus: data.success ? 'success' : 'error' }
          : w
      ));
    } catch (err: any) {
      newLog.push({ ts: ts(), message: `Error: ${err.message}`, type: 'error' });
    }

    setLog([...newLog]);
    setRunning(false);
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-white/50">Workflow not found.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const sourceCount = workflow.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket').length;
  const actionCount = workflow.nodes.filter(n => n.type === 'discord' || n.type === 'gmail').length;
  const canRun = sourceCount > 0 && actionCount > 0;

  return (
    <div className="wfb-root">
      {/* ── Header ── */}
      <header className="wfb-header">
        <button onClick={() => router.push('/dashboard')} className="wfb-back" title="Back to dashboard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <input
          type="text"
          value={workflow.name}
          onChange={e => updateName(e.target.value)}
          className="wfb-name-input nodrag"
        />

        <div className="wfb-header-right">
          <div className="wfb-chips">
            <span className={`wfb-chip ${sourceCount > 0 ? 'wfb-chip-on' : 'wfb-chip-off'}`}>
              {sourceCount} source{sourceCount !== 1 ? 's' : ''}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`wfb-chip ${actionCount > 0 ? 'wfb-chip-on' : 'wfb-chip-off'}`}>
              {actionCount} action{actionCount !== 1 ? 's' : ''}
            </span>
          </div>

          {!canRun && (
            <span className="text-xs text-white/25 hidden sm:block">Add a source + action to run</span>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={!canRun || running}
            onClick={runWorkflow}
          >
            {running ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-black/30 border-t-black/80 rounded-full animate-spin" />
                Running…
              </span>
            ) : '▶ Run now'}
          </Button>

          <UserButton />
        </div>
      </header>

      {/* ── Canvas ── */}
      <div className="wfb-canvas">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.35, maxZoom: 1 }}
          deleteKeyCode="Delete"
          minZoom={0.2}
          maxZoom={1.5}
          style={{ background: 'transparent' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1}
            color="rgba(255,255,255,0.05)"
          />
          <Controls className="rf-controls" showInteractive={false} />

          {/* Add node button */}
          <Panel position="bottom-center" style={{ marginBottom: 24 }}>
            <button className="wfb-add-btn" onClick={() => setShowPicker(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add node
            </button>
          </Panel>

          {/* Run log */}
          {log.length > 0 && (
            <Panel position="bottom-right" style={{ marginBottom: 24, marginRight: 16 }}>
              <div className="wfb-run-log">
                <div className="wfb-log-header">
                  <span>Run log</span>
                  <button className="wfb-log-clear" onClick={() => setLog([])}>✕</button>
                </div>
                <div className="wfb-log-entries">
                  {log.map((e, i) => (
                    <div key={i} className={`wfb-log-row log-${e.type}`}>
                      <span className="wfb-log-ts">{e.ts}</span>
                      <span>{e.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {/* Empty state hint */}
          {workflow.nodes.length === 0 && (
            <Panel position="top-center" style={{ marginTop: 120 }}>
              <div className="wfb-empty-hint">
                <p className="text-white/30 text-sm mb-3">Drop your first node to start building</p>
                <button className="wfb-add-btn" onClick={() => setShowPicker(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Add first node
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {showPicker && <NodePicker onPick={addNode} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
