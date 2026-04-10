'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KalshiConfig } from '../atoms';

interface MarketResult {
  ticker: string;
  title: string;
  subtitle?: string;
  yes_bid: number;
  event_ticker?: string;
  category?: string;
}

interface Props {
  config: KalshiConfig;
  onChange: (config: KalshiConfig) => void;
}

function parseOutcomes(raw: string): string[] | null {
  if (/^(yes|no)\s/i.test(raw) && raw.includes(',')) {
    return raw.split(',').map(p => p.replace(/^(yes|no)\s+/i, '').trim()).filter(Boolean);
  }
  return null;
}

export function KalshiNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof KalshiConfig, value: string) =>
    onChange({ ...config, [key]: value });

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<MarketResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Unlock canvas-node overflow so the dropdown escapes the clipping box
  useEffect(() => {
    const node = containerRef.current?.closest('.canvas-node') as HTMLElement | null;
    if (!node) return;
    if (open) {
      node.style.overflow = 'visible';
      node.style.position = 'relative';
    } else {
      node.style.overflow = '';
      node.style.position = '';
    }
    return () => {
      node.style.overflow = '';
      node.style.position = '';
    };
  }, [open]);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) { setResults([]); setOpen(false); return; }
      const headers: Record<string, string> = { accept: 'application/json' };
      if (config.apiKey) headers['x-kalshi-api-key'] = config.apiKey;
      const res = await fetch(`/api/kalshi/search?q=${encodeURIComponent(q)}`, { headers });
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, search]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.closest('.canvas-node')?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function selectMarket(m: MarketResult) {
    set('marketTicker', m.ticker);
    setSearchQuery('');
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="space-y-4" ref={containerRef}>
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
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search markets…"
        />

        {/* Dropdown — position: absolute relative to .canvas-node (overflow: visible when open) */}
        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 560,
              zIndex: 9999,
              borderRadius: 14,
              background: 'rgba(9, 12, 21, 0.98)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 14px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
                Open Markets
              </span>
              {results.length > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{results.length} results</span>
              )}
            </div>

            {results.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 10 }}>
                {results.map(m => (
                  <MarketCard key={m.ticker} market={m} onSelect={selectMarket} />
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No markets found</p>
              </div>
            )}
          </div>
        )}

        {/* Selected chip */}
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
            type="number" min="0" max="1" step="0.01"
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

function MarketCard({ market, onSelect }: { market: MarketResult; onSelect: (m: MarketResult) => void }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outcomes = parseOutcomes(market.title);
  const isMulti = outcomes !== null && outcomes.length > 1;
  const displayTitle = isMulti
    ? outcomes!.slice(0, 3).join(' · ') + (outcomes!.length > 3 ? ' · …' : '')
    : market.title;

  function handleMouseEnter() {
    setHovered(true);
    if (isMulti) tooltipTimeout.current = setTimeout(() => setTooltipVisible(true), 280);
  }
  function handleMouseLeave() {
    setHovered(false);
    setTooltipVisible(false);
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => onSelect(market)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 8,
          padding: '12px',
          minHeight: 100,
          borderRadius: 10,
          border: hovered ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.07)',
          background: hovered ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.03)',
          transition: 'background 0.12s, border-color 0.12s',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {/* Price + options count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
          {market.yes_bid != null && (
            <span style={{
              fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
              padding: '2px 7px', borderRadius: 6,
              background: 'rgba(52,211,153,0.1)', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.2)',
            }}>
              {market.yes_bid}¢
            </span>
          )}
          {isMulti && (
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 5, marginLeft: 'auto',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {outcomes!.length} options
            </span>
          )}
        </div>

        {/* Title */}
        <p style={{
          fontSize: 12, lineHeight: 1.4, margin: 0, flex: 1,
          color: hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.72)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
          transition: 'color 0.12s',
        }}>
          {displayTitle}
        </p>

        {/* Ticker */}
        <p style={{
          fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.18)',
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
        }}>
          {market.ticker}
        </p>
      </button>

      {/* Tooltip for multi-outcome markets */}
      {tooltipVisible && isMulti && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: 'rgba(9, 12, 21, 0.97)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '10px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          minWidth: 160, maxWidth: 220,
          pointerEvents: 'none',
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8, marginTop: 0 }}>
            All {outcomes!.length} options
          </p>
          {outcomes!.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(52,211,153,0.5)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>{o}</span>
            </div>
          ))}
        </div>
      )}
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
