import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { useUser, UserButton } from '@clerk/react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './@/components/ui/button';
import { Card } from './@/components/ui/card';
import { workflowsAtom, activeWorkflowIdAtom, Workflow } from './atoms';

function NodePill({ type }: { type: string }) {
  const styles: Record<string, string> = {
    kalshi: 'badge-kalshi',
    polymarket: 'badge-polymarket',
    discord: 'badge-discord',
    gmail: 'badge-gmail',
  };
  return (
    <span className={`${styles[type] ?? 'bg-white/[0.06] text-white/40 border border-white/[0.08]'} text-[10px] px-1.5 py-0.5 rounded font-mono-feature`}>
      {type.toUpperCase()}
    </span>
  );
}

function WorkflowCard({ workflow, onDelete, onToggle, onOpen }: {
  workflow: Workflow;
  onDelete: () => void;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const statusDot = workflow.lastStatus === 'error' ? 'status-error'
    : workflow.enabled ? 'status-live'
    : 'status-paused';

  return (
    <Card className="p-5 hover:border-white/[0.1] transition-colors cursor-pointer group" onClick={onOpen}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={statusDot} />
          <h3 className="font-medium text-white text-sm group-hover:text-cyan-300 transition-colors">
            {workflow.name}
          </h3>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {/* Toggle */}
          <button
            onClick={onToggle}
            className={`relative w-9 h-5 rounded-full transition-colors ${workflow.enabled ? 'bg-cyan-500' : 'bg-white/[0.1]'}`}
            title={workflow.enabled ? 'Disable workflow' : 'Enable workflow'}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${workflow.enabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Nodes pipeline preview */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {workflow.nodes.length === 0 ? (
          <span className="text-xs text-white/25">No nodes added</span>
        ) : (
          workflow.nodes.map((node, i) => (
            <React.Fragment key={node.id}>
              <NodePill type={node.type} />
              {i < workflow.nodes.length - 1 && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5h6M6 3l2 2-2 2" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </React.Fragment>
          ))
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-white/25 font-mono-feature">
          {workflow.lastRun ? `Last run ${new Date(workflow.lastRun).toLocaleString()}` : 'Never run'}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="text-xs text-white/20 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-white font-semibold mb-2">No workflows yet</h3>
      <p className="text-white/40 text-sm mb-8 max-w-xs">
        Create your first workflow to start automating Kalshi and Polymarket alerts.
      </p>
      <Button variant="primary" onClick={onCreate}>
        + Create workflow
      </Button>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useAtom(workflowsAtom);
  const [, setActiveId] = useAtom(activeWorkflowIdAtom);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  function createWorkflow() {
    const name = newName.trim() || 'New Workflow';
    const wf: Workflow = {
      id: uuidv4(),
      name,
      nodes: [],
      enabled: false,
      createdAt: new Date().toISOString(),
    };
    setWorkflows(prev => [wf, ...prev]);
    setActiveId(wf.id);
    navigate(`/workflow/${wf.id}`);
  }

  function deleteWorkflow(id: string) {
    setWorkflows(prev => prev.filter(w => w.id !== id));
  }

  function toggleWorkflow(id: string) {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  }

  function openWorkflow(id: string) {
    setActiveId(id);
    navigate(`/workflow/${id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-white/[0.05] bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
              <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#06b6d4"/>
                </svg>
              </div>
              <span className="font-semibold text-sm">ArbFlow</span>
            </button>
            <span className="text-white/20">/</span>
            <span className="text-white/60 text-sm">Dashboard</span>
          </div>
          <UserButton />
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">
              Workflows
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              {user?.firstName ? `Hey ${user.firstName} — ` : ''}{workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </p>
          </div>
          {workflows.length > 0 && !creating && (
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              + New workflow
            </Button>
          )}
        </div>

        {/* New workflow form */}
        {creating && (
          <div className="glass-card rounded-xl p-5 mb-6 border border-cyan-500/20">
            <h3 className="text-sm font-medium text-white mb-3">Name your workflow</h3>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createWorkflow(); if (e.key === 'Escape') setCreating(false); }}
                placeholder="e.g. BTC threshold → Discord"
                className="flex-1"
              />
              <Button variant="primary" size="sm" onClick={createWorkflow}>Create</Button>
              <Button variant="outline" size="sm" onClick={() => { setCreating(false); setNewName(''); }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Workflows grid */}
        {workflows.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map(wf => (
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

        {/* Stats bar */}
        {workflows.length > 0 && (
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { label: 'Active workflows', value: workflows.filter(w => w.enabled).length },
              { label: 'Total nodes', value: workflows.reduce((a, w) => a + w.nodes.length, 0) },
              { label: 'Markets tracked', value: workflows.reduce((a, w) => a + w.nodes.filter(n => n.type === 'kalshi' || n.type === 'polymarket').length, 0) },
            ].map(stat => (
              <div key={stat.label} className="glass-card rounded-xl p-4 text-center">
                <div className="text-2xl font-bold font-mono-feature text-cyan-400">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
