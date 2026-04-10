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
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search markets…"
          />

          {/* Results — wider than input, centered, pops to both sides */}
          {open && (results.length > 0 || searchQuery) && (
            <div
              className="absolute z-[100] mt-1.5 rounded-xl overflow-hidden"
              style={{
                width: 320,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(10, 13, 22, 0.97)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {results.length > 0 ? (
                <>
                  <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
                      Open Markets
                    </span>
                    <span className="text-[10px] text-white/20">{results.length} results</span>
                  </div>
                  <div className="px-1.5 pb-1.5 flex flex-col gap-0.5">
                    {results.map(m => (
                      <button
                        key={m.ticker}
                        type="button"
                        onClick={() => selectMarket(m)}
                        className="w-full text-left rounded-lg px-2.5 py-2 flex items-center gap-3 transition-colors group"
                        style={{ background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Green dot */}
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 flex-shrink-0 mt-px" />

                        {/* Title + ticker */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/85 truncate leading-tight">{m.title}</p>
                          <p className="text-[10px] font-mono text-white/25 mt-0.5 truncate">{m.ticker}</p>
                        </div>

                        {/* YES price pill */}
                        {m.yes_bid != null && (
                          <span
                            className="flex-shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
                            style={{
                              background: 'rgba(52, 211, 153, 0.1)',
                              color: '#34d399',
                              border: '1px solid rgba(52,211,153,0.15)',
                            }}
                          >
                            {m.yes_bid}¢
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-white/25">No markets found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected ticker chip */}
        {config.marketTicker && (
          <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
            <span className="text-[10px] font-mono text-emerald-400/90 flex-1 truncate">{config.marketTicker}</span>
            <button
              type="button"
              onClick={() => set('marketTicker', '')}
              className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
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
