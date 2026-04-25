'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { UserButton } from '@clerk/nextjs';
import { Button } from './@/components/ui/button';
import {
  ReactFlow,
  Background, BackgroundVariant, Controls,
  addEdge, useNodesState, useEdgesState, useReactFlow,
  Handle, Position, Panel,
  BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
  type Node as RFNode,
  type Edge as RFEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  workflowsAtom, activeWorkflowIdAtom,
  WorkflowNode, NodeType, createNode,
  KalshiConfig, PolymarketConfig, DiscordConfig, EmailConfig, NodeConfig,
  saveWorkflowAtom,
} from './atoms';
import { useSetAtom } from 'jotai';
import { KalshiNodeConfig, KalshiNodeHeader } from './nodes/KalshiNode';
import { PolymarketNodeConfig, PolymarketNodeHeader } from './nodes/PolymarketNode';
import { DiscordNodeConfig, DiscordNodeHeader } from './nodes/DiscordNode';
import { GmailNodeConfig, GmailNodeHeader } from './nodes/GmailNode';

// ── Node type picker ──────────────────────────────────────────────────────────
const ADD_OPTIONS: { type: NodeType; label: string; desc: string; role: 'source' | 'action'; color: string }[] = [
  { type: 'kalshi',     label: 'Kalshi',     desc: 'Read market prices',  role: 'source', color: '#4ade80' },
  { type: 'polymarket', label: 'Polymarket', desc: 'Read market prices',  role: 'source', color: '#60a5fa' },
  { type: 'discord',   label: 'Discord',    desc: 'Post to channel',      role: 'action', color: '#818cf8' },
  { type: 'email',     label: 'Email',      desc: 'Send email',           role: 'action', color: '#f87171' },
];

function NodePicker({ onPick, onClose }: { onPick: (t: NodeType) => void; onClose: () => void }) {
  const t = useTranslations('builder');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-white/[0.08] rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-4">{t('addNodeTitle')}</h3>
        <div className="space-y-2">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{t('sourcesLabel')}</p>
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
          <p className="text-xs text-white/30 uppercase tracking-wider mt-3 mb-2">{t('actionsLabel')}</p>
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
        <Button variant="ghost" size="sm" className="w-full mt-4" onClick={onClose}>
          {useTranslations('common')('cancel')}
        </Button>
      </div>
    </div>
  );
}

// ── Custom draggable + deletable edge ────────────────────────────────────────
function DeletableEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  selected, data,
}: EdgeProps) {
  const { deleteElements, screenToFlowPosition, setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const isDragging = useRef(false);
  const t = useTranslations('builder');

  const waypoint = (data as any)?.waypoint as { x: number; y: number } | undefined;

  // Quadratic bezier through waypoint, or smoothstep when straight
  let edgePath: string;
  let midX: number;
  let midY: number;
  if (waypoint) {
    edgePath = `M ${sourceX} ${sourceY} Q ${waypoint.x} ${waypoint.y} ${targetX} ${targetY}`;
    midX = waypoint.x;
    midY = waypoint.y;
  } else {
    const [p] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 14 });
    edgePath = p;
    midX = (sourceX + targetX) / 2;
    midY = (sourceY + targetY) / 2;
  }

  const isHighlighted = selected || hovered;
  const stroke = isHighlighted ? 'rgba(6,182,212,0.75)' : 'rgba(255,255,255,0.22)';

  // Drag the path to bend it
  const onPathMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = true;

    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      const pos = screenToFlowPosition({ x: me.clientX, y: me.clientY });
      setEdges(eds => eds.map(edge =>
        edge.id === id ? { ...edge, data: { ...edge.data, waypoint: pos } } : edge
      ));
    };
    const onUp = (me: MouseEvent) => {
      isDragging.current = false;
      const pos = screenToFlowPosition({ x: me.clientX, y: me.clientY });
      (data as any)?.onWaypointChange?.(id, pos);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [id, data, screenToFlowPosition, setEdges]);

return (
    <>
      {/* Fat invisible hit area for easy hover/click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={40}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={onPathMouseDown}
        style={{ cursor: 'grab' }}
      />
      <BaseEdge
        path={edgePath}
        style={{ stroke, strokeWidth: isHighlighted ? 2.5 : 1.8, transition: 'stroke 0.15s, stroke-width 0.15s' }}
        markerEnd={`url(#arrow-${id})`}
      />
      <defs>
        <marker id={`arrow-${id}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0 0 L0 6 L9 3 z" fill={stroke} style={{ transition: 'fill 0.15s' }} />
        </marker>
      </defs>

      {/* Delete button at midpoint — only shows on hover/select */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
            pointerEvents: 'all',
          }}
          className={`nodrag nopan edge-mid-wrap ${isHighlighted ? 'edge-mid-visible' : ''}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            className="edge-delete-btn"
            onClick={e => { e.stopPropagation(); deleteElements({ edges: [{ id }] }); }}
            onDoubleClick={e => e.stopPropagation()}
            title={t('deleteConnection')}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { deletable: DeletableEdge };

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

// ── Canvas node shell ─────────────────────────────────────────────────────────
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
  const t = useTranslations('nodes');

  const removeNode = useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [id, deleteElements]);

  return (
    <div className="canvas-node" style={{ borderColor: `${accentColor}28` }}>
      {/* Target handle (left) — for action nodes */}
      {!isSource && (
        <Handle
          type="target"
          position={Position.Left}
          className="cn-handle"
          style={{ background: accentColor }}
          title={t('dragToConnect')}
        />
      )}

      {/* Header — drag area */}
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
          <button className="cn-remove" onClick={removeNode} title={t('removeNode')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Config panel — draggable from any non-interactive area */}
      {expanded && (
        <div
          className="cn-config"
          onMouseDown={e => {
            if ((e.target as HTMLElement).closest('input, textarea, select, button, a, label, [role="option"]')) {
              e.stopPropagation(); // don't start a node drag when clicking inputs/buttons
            }
          }}
        >
          {configPanel}
        </div>
      )}

      {/* Source handle (right) — for source nodes */}
      {isSource && (
        <Handle
          type="source"
          position={Position.Right}
          className="cn-handle"
          style={{ background: accentColor }}
          title={t('dragToConnect')}
        />
      )}
    </div>
  );
}

// ── Individual canvas node types (module-level = stable refs for React Flow) ──

function KalshiCanvasNode({ id, data }: NodeProps) {
  const workflowId = (data as { workflowId: string }).workflowId;
  const { node, updateConfig } = useNodeConfig(id, workflowId);
  if (!node) return null;
  return (
    <CanvasNodeShell
      id={id} isSource={true} accentColor="#4ade80"
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
      id={id} isSource={true} accentColor="#60a5fa"
      header={<PolymarketNodeHeader />}
      configPanel={<PolymarketNodeConfig config={node.config as PolymarketConfig} onChange={updateConfig} />}
    />
  );
}

function DiscordCanvasNode({ id, data }: NodeProps) {
  const workflowId = (data as { workflowId: string }).workflowId;
  const { node, updateConfig } = useNodeConfig(id, workflowId);
  const [workflows] = useAtom(workflowsAtom);
  const workflow = workflows.find(w => w.id === workflowId);

  if (!node) return null;

  const sourceNode = workflow?.nodes.find(n => n.type === 'kalshi' || n.type === 'polymarket');
  let previewVars: Record<string, string> | undefined;
  if (sourceNode?.type === 'kalshi') {
    const cfg = sourceNode.config as KalshiConfig;
    const t = (parseFloat(cfg.priceThreshold || '0.5') * 100).toFixed(0);
    previewVars = {
      platform: 'Kalshi',
      market: cfg.marketTicker || 'MARKET',
      price: '??¢',
      threshold: `${t}¢`,
      direction: cfg.direction,
      url: cfg.marketTicker ? `https://kalshi.com/markets/${cfg.marketTicker}` : '',
    };
  } else if (sourceNode?.type === 'polymarket') {
    const cfg = sourceNode.config as PolymarketConfig;
    const t = (parseFloat(cfg.priceThreshold || '0.5') * 100).toFixed(0);
    previewVars = {
      platform: 'Polymarket',
      market: cfg.marketSlug || 'market-slug',
      price: '??¢',
      threshold: `${t}¢`,
      direction: cfg.direction,
      url: cfg.marketSlug ? `https://polymarket.com/event/${cfg.marketSlug}` : '',
    };
  }

  return (
    <CanvasNodeShell
      id={id} isSource={false} accentColor="#818cf8"
      header={<DiscordNodeHeader />}
      configPanel={<DiscordNodeConfig config={node.config as DiscordConfig} onChange={updateConfig} previewVars={previewVars} />}
    />
  );
}

function GmailCanvasNode({ id, data }: NodeProps) {
  const workflowId = (data as { workflowId: string }).workflowId;
  const { node, updateConfig } = useNodeConfig(id, workflowId);
  if (!node) return null;
  return (
    <CanvasNodeShell
      id={id} isSource={false} accentColor="#f87171"
      header={<GmailNodeHeader />}
      configPanel={<GmailNodeConfig config={node.config as EmailConfig} onChange={updateConfig} />}
    />
  );
}

const nodeTypes = {
  kalshi:     KalshiCanvasNode,
  polymarket: PolymarketCanvasNode,
  discord:    DiscordCanvasNode,
  email:      GmailCanvasNode,
};

// ── Edge factory ──────────────────────────────────────────────────────────────
type WaypointCb = (edgeId: string, wp: { x: number; y: number } | undefined) => void;

function makeEdge(source: string, target: string, onWaypointChange?: WaypointCb, waypoint?: { x: number; y: number }): RFEdge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'deletable',
    data: { onWaypointChange, waypoint },
  };
}

// ── Default node positions ────────────────────────────────────────────────────
function defaultPosition(node: WorkflowNode, allNodes: WorkflowNode[]) {
  const isSource = node.type === 'kalshi' || node.type === 'polymarket';
  const peers = allNodes.filter(n =>
    isSource
      ? (n.type === 'kalshi' || n.type === 'polymarket')
      : (n.type === 'discord' || n.type === 'email')
  );
  const idx = peers.findIndex(n => n.id === node.id);
  return { x: isSource ? 80 : 560, y: 80 + Math.max(0, idx) * 420 };
}

// ── Run log type ──────────────────────────────────────────────────────────────
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
  const saveWorkflow = useSetAtom(saveWorkflowAtom);
  const t = useTranslations('builder');

  const workflowId = id ?? activeId ?? '';
  const workflow = workflows.find(w => w.id === workflowId);

  const [rfNodes, setRFNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [rfEdges, setRFEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<RunLogEntry[]>([]);

  // Debounced auto-save: 1.5s after the last change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!workflow) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveWorkflow(workflow), 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [workflow]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist waypoint changes from edge drag → jotai
  const onWaypointChange = useCallback((edgeId: string, wp: { x: number; y: number } | undefined) => {
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? { ...w, edges: (w.edges ?? []).map(e => e.id === edgeId ? { ...e, waypoint: wp } : e) }
        : w
    ));
  }, [workflowId, setWorkflows]);

  // Init React Flow state from jotai on workflow load
  useEffect(() => {
    if (!workflow) return;
    setRFNodes(workflow.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position ?? defaultPosition(n, workflow.nodes),
      data: { workflowId },
    })));
    setRFEdges((workflow.edges ?? []).map(e =>
      makeEdge(e.source, e.target, onWaypointChange, e.waypoint)
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // Persist drag positions → jotai
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: RFNode) => {
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? { ...w, nodes: w.nodes.map(n => n.id === node.id ? { ...n, position: node.position } : n) }
        : w
    ));
  }, [workflowId, setWorkflows]);

  // Node changes (Delete / Backspace removes selected nodes)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    const removed = changes.filter(c => c.type === 'remove');
    if (!removed.length) return;
    const ids = new Set(removed.map((c: any) => c.id));
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? {
            ...w,
            nodes: w.nodes.filter(n => !ids.has(n.id)),
            edges: (w.edges ?? []).filter(e => !ids.has(e.source) && !ids.has(e.target)),
          }
        : w
    ));
  }, [onNodesChange, workflowId, setWorkflows]);

  // Edge changes (Delete / Backspace removes selected edges)
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
    const removed = changes.filter(c => c.type === 'remove');
    if (!removed.length) return;
    const ids = new Set(removed.map((c: any) => c.id));
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? { ...w, edges: (w.edges ?? []).filter(e => !ids.has(e.id)) }
        : w
    ));
  }, [onEdgesChange, workflowId, setWorkflows]);

  // New connection drawn by user
  const onConnect = useCallback((connection: Connection) => {
    const edge = makeEdge(connection.source!, connection.target!, onWaypointChange);
    setRFEdges(eds => addEdge(edge, eds));
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId
        ? { ...w, edges: [...(w.edges ?? []), { id: edge.id, source: connection.source!, target: connection.target! }] }
        : w
    ));
  }, [workflowId, setWorkflows, setRFEdges, onWaypointChange]);

  // Add a node from the picker
  function addNode(type: NodeType) {
    if (!workflow) return;
    const node = createNode(type);
    const isSource = type === 'kalshi' || type === 'polymarket';
    const peers = workflow.nodes.filter(n =>
      isSource ? (n.type === 'kalshi' || n.type === 'polymarket')
               : (n.type === 'discord' || n.type === 'email')
    );
    const position = { x: isSource ? 80 : 560, y: 80 + peers.length * 420 };
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId ? { ...w, nodes: [...w.nodes, { ...node, position }] } : w
    ));
    setRFNodes(prev => [...prev, { id: node.id, type: node.type, position, data: { workflowId } }]);
  }

  function updateName(name: string) {
    setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, name } : w));
  }

  async function runWorkflow() {
    if (!workflow) return;
    const ts = () => new Date().toLocaleTimeString();
    const newLog: RunLogEntry[] = [];
    const sources = workflow.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket');
    const actions = workflow.nodes.filter(n => n.type === 'discord' || n.type === 'email');

    if (!sources.length) { setLog([{ ts: ts(), message: t('noSourceError'), type: 'error' }]); return; }
    if (!actions.length) { setLog([{ ts: ts(), message: t('noActionError'), type: 'error' }]); return; }

    setRunning(true);
    newLog.push({ ts: ts(), message: `Starting "${workflow.name}"…`, type: 'info' });
    setLog([...newLog]);

    try {
      const res = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      });
      const data = await res.json() as {
        success: boolean;
        results: { nodeId: string; type: string; status: string; message: string }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Server error');
      for (const r of data.results) {
        newLog.push({
          ts: ts(),
          message: `[${r.type.toUpperCase()}] ${r.message}`,
          type: r.status === 'error' ? 'error' : r.status === 'ok' ? 'success' : 'info',
        });
      }
      setWorkflows(prev => prev.map(w => {
        if (w.id !== workflowId) return w;
        const updated = { ...w, lastRun: new Date().toISOString(), lastStatus: (data.success ? 'success' : 'error') as 'success' | 'error' };
        saveWorkflow(updated);
        return updated;
      }));
    } catch (err: any) {
      newLog.push({ ts: ts(), message: `Error: ${err.message}`, type: 'error' });
    }
    setLog([...newLog]);
    setRunning(false);
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-white/50">{t('workflowNotFound')}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>{t('backButton')}</Button>
      </div>
    );
  }

  const sourceCount = workflow.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket').length;
  const actionCount = workflow.nodes.filter(n => n.type === 'discord' || n.type === 'email').length;
  const canRun = sourceCount > 0 && actionCount > 0;

  return (
    <div className="wfb-root">
      {/* ── Header ── */}
      <header className="wfb-header">
        <button onClick={() => router.push('/dashboard')} className="wfb-back" title={t('backToDashboard')}>
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
              {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`wfb-chip ${actionCount > 0 ? 'wfb-chip-on' : 'wfb-chip-off'}`}>
              {actionCount} {actionCount === 1 ? 'action' : 'actions'}
            </span>
          </div>

          {!canRun && (
            <span className="text-xs text-white/25 hidden sm:block">{t('addSourceHint')}</span>
          )}

          <Button variant="primary" size="sm" disabled={!canRun || running} onClick={runWorkflow}>
            {running ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-black/30 border-t-black/80 rounded-full animate-spin" />
                {t('running')}
              </span>
            ) : t('runNow')}
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
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.35, maxZoom: 1 }}
          deleteKeyCode={['Delete', 'Backspace']}
          minZoom={0.2}
          maxZoom={1.5}
          style={{ background: 'transparent' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.05)" />
          <Controls className="rf-controls" showInteractive={false} />

          {/* Add node button */}
          <Panel position="bottom-center" style={{ marginBottom: 24 }}>
            <button className="wfb-add-btn" onClick={() => setShowPicker(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {t('addNode')}
            </button>
          </Panel>

          {/* Run log */}
          {log.length > 0 && (
            <Panel position="bottom-right" style={{ marginBottom: 24, marginRight: 16 }}>
              <div className="wfb-run-log">
                <div className="wfb-log-header">
                  <span>{t('runLog')}</span>
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

          {/* Empty state */}
          {workflow.nodes.length === 0 && (
            <Panel position="top-center" style={{ marginTop: 120 }}>
              <div className="wfb-empty-hint">
                <p className="text-white/30 text-sm mb-3">{t('emptyHint')}</p>
                <button className="wfb-add-btn" onClick={() => setShowPicker(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {t('addFirstNode')}
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
