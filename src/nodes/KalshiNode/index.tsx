'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KalshiConfig } from '../../atoms';
import { MarketSearch, MarketResult } from './MarketSearch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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

  // Unlock every clipping ancestor so the inline dropdown isn't cut off
  useEffect(() => {
    const unlocked: { el: HTMLElement; overflow: string }[] = [];
    const selectors = ['.canvas-node', '.wfb-canvas', '.react-flow__node'];
    let el: HTMLElement | null = containerRef.current;
    while (el) {
      for (const sel of selectors) {
        if (el.matches?.(sel)) unlocked.push({ el, overflow: el.style.overflow });
      }
      el = el.parentElement;
    }
    if (open) {
      unlocked.forEach(u => { u.el.style.overflow = 'visible'; });
    } else {
      unlocked.forEach(u => { u.el.style.overflow = u.overflow; });
    }
    return () => unlocked.forEach(u => { u.el.style.overflow = u.overflow; });
  }, [open]);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) { setResults([]); setOpen(false); return; }
      const res = await fetch(`/api/kalshi/search?q=${encodeURIComponent(q)}`, {
        headers: { accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.markets || []);
        setOpen(true);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(searchQuery), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, search]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.closest('.canvas-node')?.contains(t)) return;
      setOpen(false);
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
    <div className="space-y-4" ref={containerRef} style={{ position: 'relative' }}>
      <div>
        <Label>Market Ticker</Label>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onPaste={e => {
            const text = e.clipboardData.getData('text').trim();
            if (text) { setSearchQuery(text); search(text); }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search markets…"
        />

        {open && results.length > 0 && (
          <MarketSearch results={results} onSelect={selectMarket} />
        )}

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
          <Label htmlFor="kalshi-threshold">Price Threshold</Label>
          <input
            id="kalshi-threshold"
            type="number" min="0" max="1" step="0.01"
            value={config.priceThreshold}
            onChange={e => set('priceThreshold', e.target.value)}
            placeholder="0.65"
          />
        </div>
        <div>
          <Label htmlFor="kalshi-direction">Direction</Label>
          <select
            id="kalshi-direction"
            value={config.direction}
            onChange={e => set('direction', e.target.value as KalshiConfig['direction'])}
          >
            <option value="above">Above threshold</option>
            <option value="below">Below threshold</option>
            <option value="any">Any change</option>
          </select>
        </div>
      </div>

      <Card className="bg-emerald-500/5 border-emerald-500/15 p-3">
        <p className="text-xs text-emerald-400/80">
          Triggers when <span className="font-semibold font-mono">{config.marketTicker || 'market'}</span> YES price
          is <span className="font-semibold">{config.direction}</span>{' '}
          <span className="font-mono font-semibold">{(parseFloat(config.priceThreshold) * 100).toFixed(0)}¢</span>
        </p>
      </Card>
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
          <Badge variant="kalshi" className="text-[10px] px-1.5 py-0.5">SOURCE</Badge>
        </div>
        <p className="text-xs text-white/40">Read prediction market prices</p>
      </div>
    </div>
  );
}
