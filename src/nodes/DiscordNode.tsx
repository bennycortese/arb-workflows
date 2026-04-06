'use client';

import React from 'react';
import { DiscordConfig } from '../atoms';

interface Props {
  config: DiscordConfig;
  onChange: (config: DiscordConfig) => void;
}

export function DiscordNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof DiscordConfig, value: string) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
          Webhook URL
        </label>
        <input
          type="url"
          value={config.webhookUrl}
          onChange={e => set('webhookUrl', e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
        />
        <p className="mt-1 text-xs text-white/30">
          Server Settings → Integrations → Webhooks → New Webhook
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
          Message Template
        </label>
        <textarea
          value={config.messageTemplate}
          onChange={e => set('messageTemplate', e.target.value)}
          rows={3}
          placeholder="Alert: {{market}} crossed {{threshold}} — now at {{price}}"
          className="resize-none"
        />
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {['{{market}}', '{{price}}', '{{threshold}}', '{{direction}}', '{{platform}}'].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => set('messageTemplate', config.messageTemplate + v)}
              className="text-xs font-mono bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/50 hover:text-white/80 px-1.5 py-0.5 rounded transition-colors"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/15 p-3">
        <p className="text-xs text-indigo-400/80 leading-relaxed">
          Preview: <span className="text-indigo-300">{
            config.messageTemplate
              .replace('{{market}}', 'Fed rate cut June')
              .replace('{{price}}', '0.72')
              .replace('{{threshold}}', '0.65')
              .replace('{{direction}}', 'above')
              .replace('{{platform}}', 'Polymarket')
          }</span>
        </p>
      </div>
    </div>
  );
}

export function DiscordNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="14" viewBox="0 0 71 55" fill="none">
          <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.9a.2.2 0 0 0-.2.1 40.8 40.8 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.3 37.3 0 0 0 25.5 1a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.7 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 31 .3 43.7a.2.2 0 0 0 .1.1 58.8 58.8 0 0 0 17.7 8.9.2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0c.4.3.7.6 1.1.9a.2.2 0 0 1 0 .4 36.1 36.1 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47 47 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.6 58.6 0 0 0 17.8-8.9.2.2 0 0 0 .1-.1C72.9 29.3 70 16.5 60.2 5a.2.2 0 0 0-.1-.1ZM23.7 36.3c-3.5 0-6.4-3.2-6.4-7.1 0-4 2.8-7.1 6.4-7.1 3.6 0 6.5 3.2 6.4 7.1 0 4-2.8 7.1-6.4 7.1Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.1 0-4 2.8-7.1 6.4-7.1 3.6 0 6.5 3.2 6.4 7.1 0 4-2.8 7.1-6.4 7.1Z" fill="#818cf8"/>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Discord</span>
          <span className="badge-discord text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide">ACTION</span>
        </div>
        <p className="text-xs text-white/40">Send alert to a Discord channel</p>
      </div>
    </div>
  );
}
