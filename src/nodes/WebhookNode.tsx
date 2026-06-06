'use client';

import React from 'react';
import { WebhookConfig } from '../atoms';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Props {
  config: WebhookConfig;
  onChange: (config: WebhookConfig) => void;
}

const VARS = ['{{market}}', '{{price}}', '{{threshold}}', '{{direction}}', '{{platform}}', '{{url}}'];

export function WebhookNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof WebhookConfig, value: string) =>
    onChange({ ...config, [key]: value });
  const urlError = config.webhookUrl && !config.webhookUrl.startsWith('https://')
    ? 'Webhook URL must use HTTPS'
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="generic-webhook-url">Endpoint URL</Label>
        <input
          id="generic-webhook-url"
          type="url"
          value={config.webhookUrl}
          onChange={e => set('webhookUrl', e.target.value)}
          placeholder="https://hooks.example.com/marketping"
        />
        {urlError && <p className="mt-1 text-xs text-red-400/80">{urlError}</p>}
      </div>
      <div>
        <Label htmlFor="generic-webhook-secret">Secret (optional)</Label>
        <input
          id="generic-webhook-secret"
          type="password"
          value={config.secret}
          onChange={e => set('secret', e.target.value)}
          placeholder="Sent as X-MarketPing-Secret"
          autoComplete="off"
        />
      </div>
      <div>
        <Label htmlFor="generic-webhook-template">Message Template</Label>
        <textarea
          id="generic-webhook-template"
          value={config.messageTemplate}
          onChange={e => set('messageTemplate', e.target.value)}
          rows={4}
          className="resize-none font-mono text-xs leading-relaxed"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {VARS.map(v => (
            <Button key={v} type="button" variant="ghost" size="sm"
              className="h-6 border border-white/[0.08] px-2 font-mono text-[11px] text-white/40"
              onClick={() => set('messageTemplate', `${config.messageTemplate}${config.messageTemplate ? ' ' : ''}${v}`)}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>
      <Card className="border-cyan-500/15 bg-cyan-500/5 p-3">
        <p className="text-xs leading-relaxed text-cyan-300/70">
          Sends a JSON POST containing the event, rendered message, market, platform, price,
          threshold, direction, and URL.
        </p>
      </Card>
    </div>
  );
}

export function WebhookNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
        <span className="font-mono text-sm font-bold text-cyan-400">{'{ }'}</span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Webhook</span>
          <Badge variant="webhook" className="px-1.5 py-0.5 text-[10px]">ACTION</Badge>
        </div>
        <p className="text-xs text-white/40">POST structured JSON</p>
      </div>
    </div>
  );
}
