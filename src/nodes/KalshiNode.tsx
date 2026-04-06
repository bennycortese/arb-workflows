'use client';

import React from 'react';
import { KalshiConfig } from '../atoms';

interface Props {
  config: KalshiConfig;
  onChange: (config: KalshiConfig) => void;
}

export function KalshiNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof KalshiConfig, value: string) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
          API Key
        </label>
        <input
          type="text"
          value={config.apiKey}
          onChange={e => set('apiKey', e.target.value)}
          placeholder="kalshi_live_..."
          className="font-mono text-sm"
        />
        <p className="mt-1 text-xs text-white/30">
          Find your key at <span className="text-cyan-400">kalshi.com/account/api</span>
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
          Market Ticker
        </label>
        <input
          type="text"
          value={config.marketTicker}
          onChange={e => set('marketTicker', e.target.value)}
          placeholder="INXD-25DEC31-T5500"
        />
        <p className="mt-1 text-xs text-white/30">
          Copy the ticker from the Kalshi market page URL
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
            Price Threshold
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={config.priceThreshold}
            onChange={e => set('priceThreshold', e.target.value)}
            placeholder="0.65"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wide">
            Direction
          </label>
          <select
            value={config.direction}
            onChange={e => set('direction', e.target.value as KalshiConfig['direction'])}
          >
            <option value="above">Above threshold</option>
            <option value="below">Below threshold</option>
            <option value="any">Any change</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3">
        <p className="text-xs text-emerald-400/80">
          Triggers when <span className="font-semibold font-mono">{config.marketTicker || 'market'}</span> YES price
          is <span className="font-semibold">{config.direction}</span>{' '}
          <span className="font-mono font-semibold">{(parseFloat(config.priceThreshold) * 100).toFixed(0)}¢</span>
        </p>
      </div>
    </div>
  );
}

export function KalshiNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 3v18h18" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="m7 16 4-4 4 4 4-4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Kalshi</span>
          <span className="badge-kalshi text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-wide">SOURCE</span>
        </div>
        <p className="text-xs text-white/40">Read prediction market prices</p>
      </div>
    </div>
  );
}
