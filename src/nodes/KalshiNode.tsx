'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KalshiConfig } from '../atoms';

interface MarketResult {
  ticker: string;
  title: string;
  yes_bid: number; // cents
  event_ticker?: string;
}

interface Props {
  config: KalshiConfig;
  onChange: (config: KalshiConfig) => void;
}

export function KalshiNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof KalshiConfig, value: string) =>
    onChange({ ...config, [key]: value });

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<MarketResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const headers: Record<string, string> = { accept: 'application/json' };
        if (config.apiKey) headers['x-kalshi-api-key'] = config.apiKey;
        const res = await fetch(
          `/api/kalshi/search?q=${encodeURIComponent(q)}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.markets || []);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [config.apiKey]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(searchQuery), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectMarket(m: MarketResult) {
    set('marketTicker', m.ticker);
    setSearchQuery('');
    setOpen(false);
    setResults([]);
  }

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

        {/* Search box */}
        <div ref={containerRef} className="relative">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Search markets by name or keyword…"
              className="pl-8 text-sm"
            />
            {loading && (
              <svg
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 animate-spin"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
          </div>

          {open && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-[hsl(222,22%,8%)] shadow-xl overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                {results.map(m => (
                  <button
                    key={m.ticker}
                    type="button"
                    onClick={() => selectMarket(m)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs text-white/80 leading-snug flex-1">{m.title}</span>
                      {m.yes_bid != null && (
                        <span className="text-xs font-mono text-emerald-400 flex-shrink-0 mt-0.5">
                          {m.yes_bid}¢
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-white/35 mt-0.5 block">{m.ticker}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {open && !loading && searchQuery && results.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-[hsl(222,22%,8%)] shadow-xl px-3 py-2">
              <p className="text-xs text-white/30">No open markets found for "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Selected ticker display */}
        {config.marketTicker && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/15 px-3 py-2">
            <span className="text-xs text-white/40">Selected:</span>
            <span className="text-xs font-mono text-emerald-400 flex-1">{config.marketTicker}</span>
            <button
              type="button"
              onClick={() => set('marketTicker', '')}
              className="text-white/20 hover:text-white/50 transition-colors"
              title="Clear"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Manual entry fallback */}
        {!config.marketTicker && (
          <p className="mt-1.5 text-xs text-white/25">
            Or paste a ticker directly:{' '}
            <button
              type="button"
              onClick={() => {
                const ticker = window.prompt('Enter ticker (e.g. INXD-25DEC31-T5500)');
                if (ticker) set('marketTicker', ticker.trim().toUpperCase());
              }}
              className="text-cyan-400/70 hover:text-cyan-400 underline transition-colors"
            >
              enter manually
            </button>
          </p>
        )}
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
