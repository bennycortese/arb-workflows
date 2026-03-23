import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAtom } from 'jotai';
import { UserButton } from '@clerk/react';
import { Button } from './@/components/ui/button';
import { workflowsAtom, activeWorkflowIdAtom, WorkflowNode, NodeType, createNode, KalshiConfig, PolymarketConfig, DiscordConfig, GmailConfig, NodeConfig } from './atoms';
import { KalshiNodeConfig, KalshiNodeHeader } from './nodes/KalshiNode';
import { PolymarketNodeConfig, PolymarketNodeHeader } from './nodes/PolymarketNode';
import { DiscordNodeConfig, DiscordNodeHeader } from './nodes/DiscordNode';
import { GmailNodeConfig, GmailNodeHeader } from './nodes/GmailNode';

// ── Node type picker ──────────────────────────────────────────────────────────
const ADD_OPTIONS: { type: NodeType; label: string; desc: string; role: 'source' | 'action'; color: string }[] = [
  { type: 'kalshi', label: 'Kalshi', desc: 'Read market prices', role: 'source', color: '#4ade80' },
  { type: 'polymarket', label: 'Polymarket', desc: 'Read market prices', role: 'source', color: '#60a5fa' },
  { type: 'discord', label: 'Discord', desc: 'Post to channel', role: 'action', color: '#818cf8' },
  { type: 'gmail', label: 'Gmail', desc: 'Send email', role: 'action', color: '#f87171' },
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
              <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
              <div>
                <div className="text-sm text-white group-hover:text-white font-medium">{opt.label}</div>
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
              <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
              <div>
                <div className="text-sm text-white group-hover:text-white font-medium">{opt.label}</div>
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

// ── Single node card ──────────────────────────────────────────────────────────
function NodeCard({ node, index, total, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  node: WorkflowNode;
  index: number;
  total: number;
  onUpdate: (config: NodeConfig) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(node.expanded);

  function renderHeader() {
    switch (node.type) {
      case 'kalshi': return <KalshiNodeHeader />;
      case 'polymarket': return <PolymarketNodeHeader />;
      case 'discord': return <DiscordNodeHeader />;
      case 'gmail': return <GmailNodeHeader />;
    }
  }

  function renderConfig() {
    switch (node.type) {
      case 'kalshi':
        return <KalshiNodeConfig config={node.config as KalshiConfig} onChange={onUpdate} />;
      case 'polymarket':
        return <PolymarketNodeConfig config={node.config as PolymarketConfig} onChange={onUpdate} />;
      case 'discord':
        return <DiscordNodeConfig config={node.config as DiscordConfig} onChange={onUpdate} />;
      case 'gmail':
        return <GmailNodeConfig config={node.config as GmailConfig} onChange={onUpdate} />;
    }
  }

  return (
    <div className="relative">
      <div className="glass-card rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.1] transition-colors">
        {/* Node header */}
        <button
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setExpanded(e => !e)}
        >
          {renderHeader()}
          <div className="flex items-center gap-2 ml-4" onClick={e => e.stopPropagation()}>
            {index > 0 && (
              <button onClick={onMoveUp} className="p-1 text-white/20 hover:text-white/60 transition-colors" title="Move up">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            {index < total - 1 && (
              <button onClick={onMoveDown} className="p-1 text-white/20 hover:text-white/60 transition-colors" title="Move down">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            <button onClick={onRemove} className="p-1 text-white/20 hover:text-red-400 transition-colors" title="Remove node">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-white/20 hover:text-white/60 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </button>

        {/* Config panel */}
        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-white/[0.05]">
            <div className="pt-4">
              {renderConfig()}
            </div>
          </div>
        )}
      </div>

      {/* Connector line between nodes */}
      {index < total - 1 && (
        <div className="flex justify-center my-1">
          <div className="w-px h-6 connector-line" />
        </div>
      )}
    </div>
  );
}

// ── Run log ───────────────────────────────────────────────────────────────────
interface RunLogEntry {
  ts: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

function RunLog({ entries }: { entries: RunLogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-6 glass-card rounded-xl p-4">
      <h3 className="text-xs font-mono-feature text-white/40 uppercase tracking-wider mb-3">Run log</h3>
      <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto">
        {entries.map((e, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-white/20 flex-shrink-0">{e.ts}</span>
            <span className={e.type === 'error' ? 'text-red-400' : e.type === 'success' ? 'text-emerald-400' : 'text-white/60'}>
              {e.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WorkflowBuilder page ──────────────────────────────────────────────────────
export default function WorkflowBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useAtom(workflowsAtom);
  const [activeId] = useAtom(activeWorkflowIdAtom);

  const workflowId = id ?? activeId ?? '';
  const workflow = workflows.find(w => w.id === workflowId);

  const [showPicker, setShowPicker] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<RunLogEntry[]>([]);

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <p className="text-white/50">Workflow not found.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  function updateWorkflow(updater: (nodes: WorkflowNode[]) => WorkflowNode[]) {
    setWorkflows(prev => prev.map(w =>
      w.id === workflowId ? { ...w, nodes: updater(w.nodes) } : w
    ));
  }

  function addNode(type: NodeType) {
    updateWorkflow(nodes => [...nodes, createNode(type)]);
  }

  function removeNode(nodeId: string) {
    updateWorkflow(nodes => nodes.filter(n => n.id !== nodeId));
  }

  function updateNodeConfig(nodeId: string, config: NodeConfig) {
    updateWorkflow(nodes => nodes.map(n => n.id === nodeId ? { ...n, config } : n));
  }

  function moveNode(index: number, dir: 'up' | 'down') {
    updateWorkflow(nodes => {
      const arr = [...nodes];
      const target = dir === 'up' ? index - 1 : index + 1;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  function updateName(name: string) {
    setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, name } : w));
  }

  async function runWorkflow() {
    const newLog: RunLogEntry[] = [];
    const ts = () => new Date().toLocaleTimeString();

    if (workflow.nodes.length === 0) {
      setLog([{ ts: ts(), message: 'No nodes to run — add at least one source and one action.', type: 'error' }]);
      return;
    }

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
    newLog.push({ ts: ts(), message: `Starting workflow "${workflow.name}"...`, type: 'info' });
    setLog([...newLog]);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL ?? 'http://localhost:5000'}/api/workflows/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      });

      const data = await response.json() as { success: boolean; results: { nodeId: string; type: string; status: string; message: string }[]; error?: string };

      if (!response.ok) throw new Error(data.error ?? 'Server error');

      for (const result of data.results) {
        newLog.push({
          ts: ts(),
          message: `[${result.type.toUpperCase()}] ${result.message}`,
          type: result.status === 'error' ? 'error' : result.status === 'ok' ? 'success' : 'info',
        });
      }

      setWorkflows(prev => prev.map(w => w.id === workflowId ? {
        ...w,
        lastRun: new Date().toISOString(),
        lastStatus: data.success ? 'success' : 'error',
      } : w));
    } catch (err: any) {
      newLog.push({ ts: ts(), message: `Error: ${err.message}`, type: 'error' });
    }

    setLog([...newLog]);
    setRunning(false);
  }

  const sourceCount = workflow.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket').length;
  const actionCount = workflow.nodes.filter(n => n.type === 'discord' || n.type === 'gmail').length;
  const canRun = sourceCount > 0 && actionCount > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-white/[0.05] bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[900px] mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-white/40 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          <input
            type="text"
            value={workflow.name}
            onChange={e => updateName(e.target.value)}
            className="bg-transparent border-none text-white font-medium text-sm focus:outline-none focus:ring-0 min-w-0 flex-1 p-0"
            style={{ boxShadow: 'none' }}
          />

          <div className="flex items-center gap-2 ml-auto">
            {!canRun && (
              <span className="text-xs text-white/30 hidden sm:block">Add a source + action to run</span>
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
                  Running...
                </span>
              ) : '▶ Run now'}
            </Button>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Builder */}
      <main className="max-w-[700px] mx-auto px-6 py-10">
        {/* Status chips */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <span className={`text-xs font-mono-feature px-2.5 py-1 rounded-md ${sourceCount > 0 ? 'badge-teal' : 'bg-white/[0.04] text-white/30 border border-white/[0.06]'}`}>
            {sourceCount} source{sourceCount !== 1 ? 's' : ''}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className={`text-xs font-mono-feature px-2.5 py-1 rounded-md ${actionCount > 0 ? 'badge-teal' : 'bg-white/[0.04] text-white/30 border border-white/[0.06]'}`}>
            {actionCount} action{actionCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Nodes */}
        <div className="space-y-0">
          {workflow.nodes.length === 0 && (
            <div className="text-center py-16 glass-card rounded-xl border border-dashed border-white/[0.08]">
              <p className="text-white/30 text-sm mb-4">No nodes yet</p>
              <Button variant="outline" size="sm" onClick={() => setShowPicker(true)}>
                + Add your first node
              </Button>
            </div>
          )}

          {workflow.nodes.map((node, i) => (
            <NodeCard
              key={node.id}
              node={node}
              index={i}
              total={workflow.nodes.length}
              onUpdate={config => updateNodeConfig(node.id, config)}
              onRemove={() => removeNode(node.id)}
              onMoveUp={() => moveNode(i, 'up')}
              onMoveDown={() => moveNode(i, 'down')}
            />
          ))}
        </div>

        {/* Add node button */}
        {workflow.nodes.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-center">
              <div className="w-px h-4 bg-white/[0.08]" />
            </div>
            <div className="flex justify-center mt-1">
              <Button variant="outline" size="sm" onClick={() => setShowPicker(true)}>
                + Add node
              </Button>
            </div>
          </div>
        )}

        <RunLog entries={log} />

        {/* Help text */}
        {workflow.nodes.length > 0 && (
          <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <p className="text-xs text-white/30 leading-relaxed">
              <span className="text-white/50 font-medium">Tip:</span> Workflows run manually for now. Enable coming soon — ArbFlow will poll your markets on a schedule and fire actions automatically.
            </p>
          </div>
        )}
      </main>

      {showPicker && <NodePicker onPick={addNode} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
