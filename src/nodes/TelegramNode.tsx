'use client';

import React from 'react';
import { TelegramConfig } from '../atoms';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Props {
  config: TelegramConfig;
  onChange: (config: TelegramConfig) => void;
}

const VARS = ['{{market}}', '{{price}}', '{{threshold}}', '{{direction}}', '{{platform}}', '{{url}}'];

export function TelegramNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof TelegramConfig, value: string) =>
    onChange({ ...config, [key]: value });
  const tokenError = config.botToken && !/^\d+:[A-Za-z0-9_-]+$/.test(config.botToken)
    ? 'Enter the token provided by BotFather'
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="telegram-token">Bot Token</Label>
        <input
          id="telegram-token"
          type="password"
          value={config.botToken}
          onChange={e => set('botToken', e.target.value)}
          placeholder="123456789:AA..."
          autoComplete="off"
        />
        {tokenError && <p className="mt-1 text-xs text-red-400/80">{tokenError}</p>}
      </div>
      <div>
        <Label htmlFor="telegram-chat">Chat ID</Label>
        <input
          id="telegram-chat"
          type="text"
          value={config.chatId}
          onChange={e => set('chatId', e.target.value)}
          placeholder="-1001234567890"
        />
        <p className="mt-1 text-xs text-white/30">Works with private chats, groups, and channels.</p>
      </div>
      <div>
        <Label htmlFor="telegram-template">Message Template</Label>
        <textarea
          id="telegram-template"
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
      <Card className="border-sky-500/15 bg-sky-500/5 p-3">
        <p className="text-xs text-sky-300/70">
          Create a bot with @BotFather, add it to the destination chat, then enter its token and chat ID.
        </p>
      </Card>
    </div>
  );
}

export function TelegramNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 4L3 11l7 2.5M21 4l-4 16-7-6.5M21 4L10 13.5M10 13.5V19l3-3" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Telegram</span>
          <Badge variant="telegram" className="px-1.5 py-0.5 text-[10px]">ACTION</Badge>
        </div>
        <p className="text-xs text-white/40">Send through a Telegram bot</p>
      </div>
    </div>
  );
}
