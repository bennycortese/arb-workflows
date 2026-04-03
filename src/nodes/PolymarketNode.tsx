'use client';

import React from 'react';
import { PolymarketConfig } from '../atoms';

interface Props {
  config: PolymarketConfig;
  onChange: (config: PolymarketConfig) => void;
}

export function PolymarketNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof PolymarketConfig, value: string) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
          Market Slug
        </label>
        <input
          type="text"
          value={config.marketSlug}
          onChange={e => set('marketSlug', e.target.value)}
          placeholder="will-trump-win-2024"
        />
        <p className="mt-1 text-xs text-white/30">
          Find the slug in the Polymarket URL: polymarket.com/event/<span className="text-blue-400">slug</span>
        </p>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
          Outcome Index
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={config.outcomeIndex}
          onChange={e => set('outcomeIndex', e.target.value)}
          placeholder="0"
        />
        <p className="mt-1 text-xs text-white/30">
          0 = first outcome (Yes), 1 = second outcome (No)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
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
          <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
            Direction
          </label>
          <select
            value={config.direction}
            onChange={e => set('direction', e.target.value as PolymarketConfig['direction'])}
          >
            <option value="above">Above threshold</option>
            <option value="below">Below threshold</option>
            <option value="any">Any change</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-3">
        <p className="text-xs text-blue-400/80">
          Triggers when outcome #{config.outcomeIndex || '0'} of{' '}
          <span className="font-semibold">{config.marketSlug || 'market'}</span> is{' '}
          <span className="font-semibold">{config.direction}</span>{' '}
          <span className="font-mono font-semibold">{(parseFloat(config.priceThreshold) * 100).toFixed(0)}¢</span>
        </p>
      </div>
    </div>
  );
}

export function PolymarketNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#60a5fa" strokeWidth="2"/>
          <path d="M12 3c0 0 4 3 4 9s-4 9-4 9" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 3c0 0-4 3-4 9s4 9 4 9" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
          <path d="M3 12h18" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Polymarket</span>
          <span className="badge-polymarket text-xs px-1.5 py-0.5 rounded font-mono-feature">SOURCE</span>
        </div>
        <p className="text-xs text-white/40">Read prediction market prices</p>
      </div>
    </div>
  );
}
