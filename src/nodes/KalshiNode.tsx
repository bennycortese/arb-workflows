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
        <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
          API Key
        </label>
        <input
          type="text"
          value={config.apiKey}
          onChange={e => set('apiKey', e.target.value)}
          placeholder="kalshi_api_key_..."
          className="font-mono text-sm"
        />
        <p className="mt-1 text-xs text-white/30">
          Get your API key from <span className="text-cyan-400">kalshi.com/account/api</span>
        </p>
      </div>

      <div>
        <label className="block text-xs text-white/50 mb-1.5 font-mono-feature uppercase tracking-wider">
          Market Ticker
        </label>
        <input
          type="text"
          value={config.marketTicker}
          onChange={e => set('marketTicker', e.target.value)}
          placeholder="BTCZ-25DEC31-T100000"
        />
        <p className="mt-1 text-xs text-white/30">
          The Kalshi market identifier (e.g. BTCZ-25DEC31-T100000)
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
          Triggers when <span className="font-semibold">{config.marketTicker || 'market'}</span> YES price
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
      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 3v18h18" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="m7 16 4-4 4 4 4-4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Kalshi</span>
          <span className="badge-kalshi text-xs px-1.5 py-0.5 rounded font-mono-feature">SOURCE</span>
        </div>
        <p className="text-xs text-white/40">Read prediction market prices</p>
      </div>
    </div>
  );
}
