'use client';

import React from 'react';
import { SlackConfig } from '../atoms';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ActionTestButton } from './shared/ActionTestButton';

interface Props {
  config: SlackConfig;
  onChange: (config: SlackConfig) => void;
}

const VARS = ['{{market}}', '{{price}}', '{{threshold}}', '{{direction}}', '{{platform}}', '{{url}}'];

export function SlackNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof SlackConfig, value: string) =>
    onChange({ ...config, [key]: value });
  const urlError = config.webhookUrl && !config.webhookUrl.startsWith('https://hooks.slack.com/')
    ? 'Enter a hooks.slack.com incoming webhook URL'
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="slack-webhook">Incoming Webhook URL</Label>
        <input
          id="slack-webhook"
          type="url"
          value={config.webhookUrl}
          onChange={e => set('webhookUrl', e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
        />
        {urlError && <p className="mt-1 text-xs text-red-400/80">{urlError}</p>}
      </div>
      <div>
        <Label htmlFor="slack-template">Message Template</Label>
        <textarea
          id="slack-template"
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
      <Card className="border-purple-500/15 bg-purple-500/5 p-3">
        <p className="text-xs text-purple-300/70">
          Create an incoming webhook in your Slack app and choose the destination channel.
        </p>
      </Card>
      <ActionTestButton type="slack" config={config} />
    </div>
  );
}

export function SlackNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10">
        <span className="text-lg font-bold text-purple-400">#</span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Slack</span>
          <Badge variant="slack" className="px-1.5 py-0.5 text-[10px]">ACTION</Badge>
        </div>
        <p className="text-xs text-white/40">Post to a Slack channel</p>
      </div>
    </div>
  );
}
