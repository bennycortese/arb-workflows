'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom, useSetAtom } from 'jotai';
import { useUser, UserButton } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './@/components/ui/button';
import {
  workflowsAtom, activeWorkflowIdAtom, Workflow, WorkflowNode, WorkflowEdge,
  workflowsLoadedAtom, saveWorkflowAtom, deleteWorkflowAtom,
} from './atoms';
import { WorkflowGraph } from './lib/workflowGraph';

// ─── Node meta ────────────────────────────────────────────────────────────────
const NODE_META: Record<string, { color: string; accent: string; label: string }> = {
  kalshi:     { color: '#10b981', accent: 'rgba(16,185,129,0.18)', label: 'Kalshi' },
  polymarket: { color: '#3b82f6', accent: 'rgba(59,130,246,0.18)', label: 'Poly' },
  discord:    { color: '#818cf8', accent: 'rgba(129,140,248,0.18)', label: 'Discord' },
  email:      { color: '#f87171', accent: 'rgba(248,113,113,0.18)', label: 'Email' },
};

// ─── Mini canvas ──────────────────────────────────────────────────────────────
function MiniCanvas({ nodes, edges }: { nodes: WorkflowNode[]; edges?: WorkflowEdge[] }) {
  const t = useTranslations('dashboard');
  const W = 240, nodeW = 62, nodeH = 26, padX = 18, rowGap = 10, padY = 14;

  if (nodes.length === 0) {
    return (
      <div className="mini-canvas-empty">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>{t('noNodes')}</span>
      </div>
    );
  }

  const graph = new WorkflowGraph(nodes, edges);
  const { sourceNodes: sources, actionNodes: actions } = graph;

  // Single-column layout when only one side is populated
  if (sources.length === 0 || actions.length === 0) {
    const all = [...sources, ...actions];
    const gapX = 22;
    const totalW = all.length * nodeW + Math.max(0, all.length - 1) * gapX;
    const startX = Math.max(8, (W - totalW) / 2);
    const H = 88;
    const y = (H - nodeH) / 2;
    return (
      <div className="mini-canvas">
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0 0 L5 2.5 L0 5z" fill="rgba(255,255,255,0.2)" />
            </marker>
          </defs>
          {all.map((node, i) => {
            const x = startX + i * (nodeW + gapX);
            const meta = NODE_META[node.type] ?? { color: '#94a3b8', accent: 'rgba(148,163,184,0.18)', label: node.type };
            return (
              <g key={node.id}>
                {i > 0 && (
                  <line x1={x - gapX + 3} y1={y + nodeH / 2} x2={x - 3} y2={y + nodeH / 2}
                    stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
                )}
                <rect x={x} y={y} width={nodeW} height={nodeH} rx={7}
                  fill={meta.accent} stroke={meta.color} strokeWidth="1" strokeOpacity={0.6} />
                <text x={x + nodeW / 2} y={y + nodeH / 2 + 4} textAnchor="middle" fill={meta.color}
                  fontSize="7.5" fontWeight="700" fontFamily="Inter, -apple-system, sans-serif" letterSpacing="0.8">
                  {meta.label.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Two-column layout: sources left, actions right
  const rowCount = Math.max(sources.length, actions.length);
  const rowH = nodeH + rowGap;
  const H = Math.max(88, rowCount * rowH - rowGap + padY * 2);

  const srcX = padX;
  const actX = W - padX - nodeW;

  function colY(count: number, i: number) {
    const totalH = count * rowH - rowGap;
    return (H - totalH) / 2 + i * rowH;
  }

  const posMap = new Map<string, { x: number; y: number }>();
  sources.forEach((n, i) => posMap.set(n.id, { x: srcX, y: colY(sources.length, i) }));
  actions.forEach((n, i) => posMap.set(n.id, { x: actX, y: colY(actions.length, i) }));

  const edgesToDraw = graph.sourceActionEdges;

  return (
    <div className="mini-canvas">
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0 0 L5 2.5 L0 5z" fill="rgba(255,255,255,0.2)" />
          </marker>
        </defs>
        {edgesToDraw.map((e, i) => {
          const src = posMap.get(e.source);
          const tgt = posMap.get(e.target);
          if (!src || !tgt) return null;
          return (
            <line key={i}
              x1={src.x + nodeW} y1={src.y + nodeH / 2}
              x2={tgt.x - 3}     y2={tgt.y + nodeH / 2}
              stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" markerEnd="url(#arrowhead)"
            />
          );
        })}
        {[...sources, ...actions].map(node => {
          const pos = posMap.get(node.id);
          if (!pos) return null;
          const meta = NODE_META[node.type] ?? { color: '#94a3b8', accent: 'rgba(148,163,184,0.18)', label: node.type };
          return (
            <g key={node.id}>
              <rect x={pos.x} y={pos.y} width={nodeW} height={nodeH} rx={7}
                fill={meta.accent} stroke={meta.color} strokeWidth="1" strokeOpacity={0.6} />
              <text x={pos.x + nodeW / 2} y={pos.y + nodeH / 2 + 4} textAnchor="middle" fill={meta.color}
                fontSize="7.5" fontWeight="700" fontFamily="Inter, -apple-system, sans-serif" letterSpacing="0.8">
                {meta.label.toUpperCase()}
              </text>
            </g>
          );
        })}
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
  const t = useTranslations('dashboard');
  const isError = workflow.lastStatus === 'error';
  const isLive  = workflow.enabled && !isError;

  return (
    <div className="workflow-card group" onClick={onOpen}>
      <div className="wf-canvas-area">
        <MiniCanvas nodes={workflow.nodes} edges={workflow.edges} />
        <span className={`wf-status-badge ${isError ? 'badge-error' : isLive ? 'badge-live' : 'badge-paused'}`}>
          {isError ? t('statusError') : isLive ? t('statusLive') : t('statusPaused')}
        </span>
      </div>

      <div className="wf-card-body">
        <div className="flex items-center justify-between gap-2">
          <h3 className="wf-card-name group-hover:text-cyan-300 transition-colors">
            {workflow.name}
          </h3>
          <div onClick={e => e.stopPropagation()}>
            <button
              onClick={onToggle}
              className={`wf-toggle ${workflow.enabled ? 'wf-toggle-on' : 'wf-toggle-off'}`}
              title={workflow.enabled ? t('disableWorkflow') : t('enableWorkflow')}
            >
              <span className={`wf-toggle-knob ${workflow.enabled ? 'knob-on' : 'knob-off'}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="wf-card-meta">
            {workflow.nodes.length === 0
              ? t('noNodes')
              : `${workflow.nodes.length} node${workflow.nodes.length !== 1 ? 's' : ''}`}
            {workflow.lastRun ? ` · ${timeAgo(workflow.lastRun)}` : ''}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="wf-delete-btn"
            title={t('deleteWorkflow')}
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

type RunRecord = {
  id: string;
  workflowId: string;
  workflowName: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'success' | 'error' | 'running';
  triggeredBy: 'manual' | 'worker' | 'cron';
  results: { type: string; status: string; message: string }[];
};

function runSummary(run: RunRecord): string {
  const ok = run.results.filter(r => r.status === 'ok');
  if (ok.length === 0) return run.results[0]?.message ?? 'No details';
  return ok.map(r => r.message).join(' · ');
}

function RunHistoryPanel() {
  const t = useTranslations('dashboard');
  const [runs, setRuns] = useState<RunRecord[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let active = true;
    const loadRuns = async () => {
      try {
        const response = await fetch('/api/workflows/runs?limit=30', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not load run history');
        if (active) {
          setRuns(data.runs ?? []);
          setLoadError('');
        }
      } catch (error) {
        if (active) {
          setRuns(current => current ?? []);
          setLoadError(error instanceof Error ? error.message : 'Could not load run history');
        }
      }
    };
    loadRuns();
    const timer = window.setInterval(loadRuns, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const triggerLabel = (by: RunRecord['triggeredBy']) => {
    if (by === 'cron') return t('triggeredCron');
    if (by === 'worker') return t('triggeredWorker');
    return t('triggeredManual');
  };

  return (
    <div className="db-run-history">
      <button type="button" className="db-run-history-header" onClick={() => setExpanded(v => !v)}>
        <span className="db-run-history-title">{t('runHistory')}</span>
        <span className="db-run-history-count">{runs ? runs.length : '…'}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          className={`db-run-history-chevron ${expanded ? 'expanded' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {expanded && (
        <div className="db-run-history-body">
          {loadError && <p className="db-run-history-error">{loadError}</p>}
          {runs === null ? (
            <p className="db-run-history-empty">{t('runHistoryLoading')}</p>
          ) : runs.length === 0 ? (
            <p className="db-run-history-empty">{t('runHistoryEmpty')}</p>
          ) : (
            <ul className="db-run-history-list">
              {runs.map(run => (
                <li key={run.id} className="db-run-history-item">
                  <div className="db-run-history-item-top">
                    <span className={`db-run-status db-run-status-${run.status}`}>{run.status}</span>
                    <span className="db-run-workflow">{run.workflowName}</span>
                    <span className="db-run-meta">{triggerLabel(run.triggeredBy)} · {timeAgo(run.startedAt)}</span>
                  </div>
                  <p className="db-run-summary">{runSummary(run)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New workflow modal ────────────────────────────────────────────────────────
function NewWorkflowModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const [name, setName] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <h2 className="text-white font-semibold text-base mb-1">{t('newWorkflowModalTitle')}</h2>
        <p className="text-white/40 text-sm mb-4">{t('newWorkflowModalSubtitle')}</p>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCreate(name.trim() || 'New Workflow');
            if (e.key === 'Escape') onClose();
          }}
          placeholder={t('newWorkflowPlaceholder')}
          className="mb-4"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>{tc('cancel')}</Button>
          <Button variant="primary" size="sm" onClick={() => onCreate(name.trim() || 'New Workflow')}>
            {t('createWorkflow')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations('dashboard');
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{t('emptyTitle')}</h3>
      <p className="text-white/40 text-sm mb-6 max-w-xs text-center leading-relaxed">
        {t('emptySubtitle')}
      </p>
      <Button variant="primary" onClick={onCreate}>
        {t('emptyAction')}
      </Button>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const t = useTranslations('dashboard');
  const [workflows, setWorkflows] = useAtom(workflowsAtom);
  const [, setActiveId] = useAtom(activeWorkflowIdAtom);
  const [loaded, setLoaded] = useAtom(workflowsLoadedAtom);
  const saveWorkflow = useSetAtom(saveWorkflowAtom);
  const deleteWorkflowRemote = useSetAtom(deleteWorkflowAtom);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [accountPlan, setAccountPlan] = useState<'free' | 'pro' | null>(null);

  async function openBillingPortal() {
    if (accountPlan === 'free') {
      router.push('/pricing');
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(t('portalError'));
      }
    } catch {
      alert(t('portalError'));
    } finally {
      setPortalLoading(false);
    }
  }

  // Load workflows from Supabase on first mount
  useEffect(() => {
    if (loaded) return;
    fetch('/api/workflows/list')
      .then(r => r.json())
      .then(data => {
        if (data.workflows) setWorkflows(data.workflows);
        setLoaded(true);
      })
      .catch(err => {
        console.error('[marketping] load failed:', err);
        setLoaded(true); // don't block UI on error
      });
  }, [loaded, setWorkflows, setLoaded]);

  useEffect(() => {
    fetch('/api/subscription/status')
      .then(response => response.ok ? response.json() : null)
      .then(data => setAccountPlan(data?.plan === 'pro' ? 'pro' : 'free'))
      .catch(() => setAccountPlan('free'));
  }, []);

  function createWorkflow(name: string) {
    const wf: Workflow = {
      id: uuidv4(),
      name,
      nodes: [],
      enabled: false,
      createdAt: new Date().toISOString(),
    };
    setWorkflows(prev => [wf, ...prev]);
    saveWorkflow(wf);
    setActiveId(wf.id);
    router.push(`/workflow/${wf.id}`);
  }

  function deleteWorkflow(id: string) {
    setWorkflows(prev => prev.filter(w => w.id !== id));
    deleteWorkflowRemote(id);
  }

  async function toggleWorkflow(id: string) {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) return;

    const updated = { ...workflow, enabled: !workflow.enabled };
    const response = await fetch('/api/workflows/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(data.error ?? 'Could not update this workflow.');
      return;
    }
    setWorkflows(prev => prev.map(w => w.id === id ? updated : w));
  }

  function openWorkflow(id: string) {
    setActiveId(id);
    router.push(`/workflow/${id}`);
  }

  const filtered = search
    ? workflows.filter(w => w.name.toLowerCase().includes(search.toLowerCase()))
    : workflows;

  const stats = [
    { label: t('statWorkflows'), value: workflows.length },
    { label: t('statActive'),    value: workflows.filter(w => w.enabled).length },
    { label: t('statNodes'),     value: workflows.reduce((a, w) => a + w.nodes.length, 0) },
    { label: t('statMarkets'),   value: workflows.reduce((a, w) => a + w.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket').length, 0) },
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
          <span className="db-logo-text">MarketPing</span>
        </button>

        <nav className="db-nav">
          <button className="db-nav-item db-nav-active">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span>{t('title')}</span>
          </button>
        </nav>

        <div className="db-sidebar-footer">
          <UserButton />
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="db-main">
        <header className="db-topbar">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="db-topbar-title">
              {user?.firstName ? `${user.firstName}'s workflows` : t('title')}
            </span>
            <div className="db-search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-white/30 flex-shrink-0">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="db-search-input"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={openBillingPortal} disabled={portalLoading}>
              {portalLoading ? '…' : accountPlan === 'free' ? 'Upgrade to Pro' : t('manageSubscription')}
            </Button>
            {accountPlan && (
              <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                {accountPlan}
              </span>
            )}
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              {t('newWorkflow')}
            </Button>
          </div>
        </header>

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

        {loaded && <RunHistoryPanel />}

        <div className="db-canvas">
          {!loaded ? (
            <div className="empty-state">
              <div className="flex items-center gap-2 text-white/35 text-sm">
                <span className="w-4 h-4 border border-white/20 border-t-white/50 rounded-full animate-spin flex-shrink-0" />
                Loading workflows…
              </div>
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState onCreate={() => setCreating(true)} />
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p className="text-white/40 text-sm">
                {t('noResults', { search })}
              </p>
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

      {creating && (
        <NewWorkflowModal
          onClose={() => setCreating(false)}
          onCreate={(name) => { setCreating(false); createWorkflow(name); }}
        />
      )}
    </div>
  );
}
