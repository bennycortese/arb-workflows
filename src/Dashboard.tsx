'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { useUser, UserButton } from '@clerk/nextjs';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './@/components/ui/button';
import { workflowsAtom, activeWorkflowIdAtom, Workflow, WorkflowNode } from './atoms';

// ─── Node meta ────────────────────────────────────────────────────────────────
const NODE_META: Record<string, { color: string; accent: string; label: string }> = {
  kalshi:     { color: '#10b981', accent: 'rgba(16,185,129,0.18)', label: 'Kalshi' },
  polymarket: { color: '#3b82f6', accent: 'rgba(59,130,246,0.18)', label: 'Poly' },
  discord:    { color: '#818cf8', accent: 'rgba(129,140,248,0.18)', label: 'Discord' },
  gmail:      { color: '#f87171', accent: 'rgba(248,113,113,0.18)', label: 'Gmail' },
};

// ─── Mini canvas ──────────────────────────────────────────────────────────────
function MiniCanvas({ nodes }: { nodes: WorkflowNode[] }) {
  const W = 240;
  const H = 88;
  const nodeW = 58;
  const nodeH = 26;
  const gapX = 22;
  const y = (H - nodeH) / 2;
  const totalW = nodes.length * nodeW + Math.max(0, nodes.length - 1) * gapX;
  const startX = Math.max(8, (W - totalW) / 2);

  if (nodes.length === 0) {
    return (
      <div className="mini-canvas-empty">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>Empty workflow</span>
      </div>
    );
  }

  return (
    <div className="mini-canvas">
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0 0 L5 2.5 L0 5z" fill="rgba(255,255,255,0.2)" />
          </marker>
        </defs>
        {nodes.slice(0, 4).map((node, i) => {
          const x = startX + i * (nodeW + gapX);
          const meta = NODE_META[node.type] ?? { color: '#94a3b8', accent: 'rgba(148,163,184,0.18)', label: node.type };
          return (
            <g key={node.id}>
              {i > 0 && (
                <line
                  x1={x - gapX + 3} y1={y + nodeH / 2}
                  x2={x - 3}        y2={y + nodeH / 2}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                />
              )}
              <rect x={x} y={y} width={nodeW} height={nodeH} rx={7}
                fill={meta.accent} stroke={meta.color} strokeWidth="1" strokeOpacity={0.6} />
              <text
                x={x + nodeW / 2} y={y + nodeH / 2 + 4}
                textAnchor="middle"
                fill={meta.color}
                fontSize="7.5"
                fontWeight="700"
                fontFamily="JetBrains Mono, Fira Code, monospace"
                letterSpacing="0.8"
              >
                {meta.label.toUpperCase()}
              </text>
            </g>
          );
        })}
        {nodes.length > 4 && (
          <text
            x={W - 6} y={y + nodeH / 2 + 4}
            textAnchor="end"
            fill="rgba(255,255,255,0.25)"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
          >
            +{nodes.length - 4}
          </text>
        )}
      </svg>
    </div>
  );
}

// ─── Workflow card ─────────────────────────────────────────────────────────────
function WorkflowCard({ workflow, onDelete, onToggle, onOpen }: {
  workflow: Workflow;
  onDelete: () => void;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const isError  = workflow.lastStatus === 'error';
  const isLive   = workflow.enabled && !isError;

  return (
    <div className="workflow-card group" onClick={onOpen}>
      {/* Canvas preview */}
      <div className="wf-canvas-area">
        <MiniCanvas nodes={workflow.nodes} />
        <span className={`wf-status-badge ${isError ? 'badge-error' : isLive ? 'badge-live' : 'badge-paused'}`}>
          {isError ? 'Error' : isLive ? 'Live' : 'Paused'}
        </span>
      </div>

      {/* Info */}
      <div className="wf-card-body">
        <div className="flex items-center justify-between gap-2">
          <h3 className="wf-card-name group-hover:text-cyan-300 transition-colors">
            {workflow.name}
          </h3>
          <div onClick={e => e.stopPropagation()}>
            <button
              onClick={onToggle}
              className={`wf-toggle ${workflow.enabled ? 'wf-toggle-on' : 'wf-toggle-off'}`}
              title={workflow.enabled ? 'Disable' : 'Enable'}
            >
              <span className={`wf-toggle-knob ${workflow.enabled ? 'knob-on' : 'knob-off'}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="wf-card-meta">
            {workflow.nodes.length === 0 ? 'No nodes' : `${workflow.nodes.length} node${workflow.nodes.length !== 1 ? 's' : ''}`}
            {workflow.lastRun ? ` · ${timeAgo(workflow.lastRun)}` : ''}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="wf-delete-btn"
            title="Delete workflow"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── New workflow modal ────────────────────────────────────────────────────────
function NewWorkflowModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold text-base mb-1">New workflow</h2>
        <p className="text-white/40 text-sm mb-4">Give your automation a name to get started.</p>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCreate(name.trim() || 'New Workflow');
            if (e.key === 'Escape') onClose();
          }}
          placeholder="e.g. BTC > $60k → Discord"
          className="mb-4"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onCreate(name.trim() || 'New Workflow')}>
            Create workflow
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">No workflows yet</h3>
      <p className="text-white/40 text-sm mb-6 max-w-xs text-center leading-relaxed">
        Build your first automation — track Kalshi and Polymarket prices and trigger alerts anywhere.
      </p>
      <Button variant="primary" onClick={onCreate}>
        Create your first workflow
      </Button>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [workflows, setWorkflows] = useAtom(workflowsAtom);
  const [, setActiveId] = useAtom(activeWorkflowIdAtom);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  function createWorkflow(name: string) {
    const wf: Workflow = {
      id: uuidv4(),
      name,
      nodes: [],
      enabled: false,
      createdAt: new Date().toISOString(),
    };
    setWorkflows(prev => [wf, ...prev]);
    setActiveId(wf.id);
    router.push(`/workflow/${wf.id}`);
  }

  function deleteWorkflow(id: string) {
    setWorkflows(prev => prev.filter(w => w.id !== id));
  }

  function toggleWorkflow(id: string) {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  }

  function openWorkflow(id: string) {
    setActiveId(id);
    router.push(`/workflow/${id}`);
  }

  const filtered = search
    ? workflows.filter(w => w.name.toLowerCase().includes(search.toLowerCase()))
    : workflows;

  const stats = [
    { label: 'Workflows', value: workflows.length },
    { label: 'Active',    value: workflows.filter(w => w.enabled).length },
    { label: 'Nodes',     value: workflows.reduce((a, w) => a + w.nodes.length, 0) },
    { label: 'Markets',   value: workflows.reduce((a, w) => a + w.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket').length, 0) },
  ];

  return (
    <div className="db-root">
      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <button onClick={() => router.push('/')} className="db-logo">
          <div className="db-logo-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#06b6d4"/>
            </svg>
          </div>
          <span className="db-logo-text">ArbFlow</span>
        </button>

        <nav className="db-nav">
          <button className="db-nav-item db-nav-active">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span>Workflows</span>
          </button>
        </nav>

        <div className="db-sidebar-footer">
          <UserButton />
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="db-main">
        {/* Topbar */}
        <header className="db-topbar">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="db-topbar-title">
              {user?.firstName ? `${user.firstName}'s workflows` : 'Workflows'}
            </span>
            <div className="db-search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-white/30 flex-shrink-0">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search workflows…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="db-search-input"
              />
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            + New workflow
          </Button>
        </header>

        {/* Stats strip */}
        {workflows.length > 0 && (
          <div className="db-stats-strip">
            {stats.map(s => (
              <div key={s.label} className="db-stat-chip">
                <span className="db-stat-value">{s.value}</span>
                <span className="db-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div className="db-canvas">
          {workflows.length === 0 ? (
            <EmptyState onCreate={() => setCreating(true)} />
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p className="text-white/40 text-sm">No workflows match "{search}"</p>
            </div>
          ) : (
            <div className="wf-grid">
              {filtered.map(wf => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  onDelete={() => deleteWorkflow(wf.id)}
                  onToggle={() => toggleWorkflow(wf.id)}
                  onOpen={() => openWorkflow(wf.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {creating && (
        <NewWorkflowModal
          onClose={() => setCreating(false)}
          onCreate={(name) => { setCreating(false); createWorkflow(name); }}
        />
      )}
    </div>
  );
}
