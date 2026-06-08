'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TelegramConfig } from '../atoms';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { NodeSelect } from '@/components/ui/node-select';
import { ActionTestButton } from './shared/ActionTestButton';

interface Props {
  config: TelegramConfig;
  onChange: (config: TelegramConfig) => void;
}

interface TelegramConnection {
  chatId: string;
  chatType: string;
  label: string;
  username?: string;
  signature: string;
}

const VARS = ['{{market}}', '{{price}}', '{{threshold}}', '{{direction}}', '{{platform}}', '{{url}}'];

export function TelegramNodeConfig({ config, onChange }: Props) {
  const [connections, setConnections] = useState<TelegramConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof TelegramConfig>(key: K, value: TelegramConfig[K]) =>
    onChange({ ...config, [key]: value });

  const loadConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/telegram/connections', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not load Telegram connections');
      setConnections(data.connections ?? []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Telegram connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
    const onFocus = () => loadConnections();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadConnections]);

  async function connectTelegram(destination: 'chat' | 'group') {
    setConnecting(true);
    setError('');
    try {
      const response = await fetch('/api/telegram/connect', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not connect Telegram');
      window.open(destination === 'group' ? data.groupUrl : data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect Telegram');
    } finally {
      setConnecting(false);
    }
  }

  function selectChat(chatId: string) {
    const connection = connections.find(item => item.chatId === chatId);
    onChange({
      ...config,
      chatId,
      chatLabel: connection?.label ?? '',
      chatSignature: connection?.signature ?? '',
    });
  }

  return (
    <div className="space-y-4">
      {connections.length > 0 && (
        <NodeSelect
          id="telegram-chat"
          label="Destination"
          value={config.chatId}
          onChange={selectChat}
          placeholder="Select a Telegram chat"
          options={connections.map(connection => ({
            value: connection.chatId,
            label: `${connection.label} (${connection.chatType})`,
          }))}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={connecting}
          onClick={() => connectTelegram('chat')}
        >
          {connecting ? 'Opening...' : 'Connect chat'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={connecting}
          onClick={() => connectTelegram('group')}
        >
          Connect group
        </Button>
      </div>

      {loading && <p className="text-xs text-white/30">Loading Telegram connections...</p>}
      {error && <p className="text-xs text-red-400/80">{error}</p>}

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
          {config.chatId
            ? `Alerts will be sent to ${config.chatLabel || 'the selected Telegram chat'}.`
            : 'Connect a private chat or add the MarketPing bot to a group, then return here to select it.'}
        </p>
      </Card>
      <ActionTestButton type="telegram" config={config} />
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
        <p className="text-xs text-white/40">Send through the MarketPing bot</p>
      </div>
    </div>
  );
}
