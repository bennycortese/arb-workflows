'use client';

import React from 'react';
import { GmailConfig } from '../atoms';

interface Props {
  config: GmailConfig;
  onChange: (config: GmailConfig) => void;
}

export function GmailNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof GmailConfig, value: string) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
          To Email
        </label>
        <input
          type="email"
          value={config.toEmail}
          onChange={e => set('toEmail', e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
          Subject
        </label>
        <input
          type="text"
          value={config.subject}
          onChange={e => set('subject', e.target.value)}
          placeholder="📈 ArbFlow Alert: {{market}}"
        />
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
          Body Template
        </label>
        <textarea
          value={config.bodyTemplate}
          onChange={e => set('bodyTemplate', e.target.value)}
          rows={5}
          placeholder="Market: {{market}}&#10;Price: {{price}}&#10;Threshold: {{threshold}}"
          className="resize-none font-mono text-xs leading-relaxed"
        />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {['{{market}}', '{{price}}', '{{threshold}}', '{{direction}}', '{{platform}}', '{{url}}'].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => set('bodyTemplate', config.bodyTemplate + v)}
              className="text-xs font-mono bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/50 hover:text-white/80 px-1.5 py-0.5 rounded transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3">
        <p className="text-xs text-red-400/80">
          Sends to <span className="font-semibold">{config.toEmail || 'your email'}</span> with subject:{' '}
          <span className="font-semibold">
            {config.subject.replace('{{market}}', 'BTCUSD') || '(no subject)'}
          </span>
        </p>
        <p className="text-xs text-white/30 mt-1">
          Requires Gmail OAuth setup in server config
        </p>
      </div>
    </div>
  );
}

export function GmailNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <svg width="18" height="14" viewBox="0 0 24 20" fill="none">
          <rect x="1" y="1" width="22" height="18" rx="2" stroke="#f87171" strokeWidth="1.5"/>
          <path d="M1 4l11 8 11-8" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Gmail</span>
          <span className="badge-gmail text-xs px-1.5 py-0.5 rounded font-mono-feature">ACTION</span>
        </div>
        <p className="text-xs text-white/40">Send email alert</p>
      </div>
    </div>
  );
}
