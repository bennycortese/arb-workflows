'use client';

import React from 'react';
import { EmailConfig } from '../atoms';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Props {
  config: EmailConfig;
  onChange: (config: EmailConfig) => void;
}

const VARS = ['{{market}}', '{{price}}', '{{threshold}}', '{{direction}}', '{{platform}}', '{{url}}'];

export function GmailNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof EmailConfig, value: string) =>
    onChange({ ...config, [key]: value });

  const emailError = config.toEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.toEmail)
    ? 'Enter a valid email address'
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email-to">To Email</Label>
        <input
          id="email-to"
          type="email"
          value={config.toEmail}
          onChange={e => set('toEmail', e.target.value)}
          placeholder="you@example.com"
        />
        {emailError && (
          <p className="mt-1 text-xs text-red-400/80">{emailError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email-subject">Subject</Label>
        <input
          id="email-subject"
          type="text"
          value={config.subject}
          onChange={e => set('subject', e.target.value)}
          placeholder="Market alert: {{market}}"
        />
      </div>

      <div>
        <Label htmlFor="email-body">Body Template</Label>
        <textarea
          id="email-body"
          value={config.bodyTemplate}
          onChange={e => set('bodyTemplate', e.target.value)}
          rows={5}
          placeholder={`Market: {{market}}\nPrice: {{price}}\nThreshold: {{threshold}}\nPlatform: {{platform}}`}
          className="resize-none font-mono text-xs leading-relaxed"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {VARS.map(v => (
            <Button
              key={v}
              type="button"
              variant="ghost"
              size="sm"
              className="font-mono text-[11px] h-6 px-2 border border-white/[0.08] text-white/40 hover:text-white/70"
              onClick={() => {
                const sep = config.bodyTemplate && !/\s$/.test(config.bodyTemplate) ? ' ' : '';
                set('bodyTemplate', config.bodyTemplate + sep + v);
              }}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      <Card className="bg-red-500/5 border-red-500/15 p-3 space-y-1">
        <p className="text-xs text-red-400/80">
          Sends to <span className="font-semibold">{config.toEmail || 'your email'}</span>
          {config.subject && (
            <> — subject: <span className="font-semibold">
              {config.subject.replace('{{market}}', 'Fed rate cut June')}
            </span></>
          )}
        </p>
        <p className="text-xs text-white/25">
          Sent via AgentMail from arbworkflow@agentmail.to
        </p>
      </Card>
    </div>
  );
}

export function GmailNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="14" viewBox="0 0 24 20" fill="none">
          <rect x="1" y="1" width="22" height="18" rx="2" stroke="#f87171" strokeWidth="1.5"/>
          <path d="M1 4l11 8 11-8" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Email</span>
          <Badge variant="email" className="text-[10px] px-1.5 py-0.5">ACTION</Badge>
        </div>
        <p className="text-xs text-white/40">Send email alert</p>
      </div>
    </div>
  );
}
