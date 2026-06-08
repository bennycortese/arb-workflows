'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KalshiConfig } from '../../atoms';
import { MarketSearch, MarketResult } from './MarketSearch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { normalizeMarketIdentifier } from '../../lib/marketInput';
import { DirectionField } from '../shared/fields';

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
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);
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
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        setSearchError('');
        return;
      }
      const searchId = ++searchIdRef.current;
      setSearching(true);
      setSearchError('');
      try {
        const res = await fetch(`/api/kalshi/search?q=${encodeURIComponent(q)}`, {
          headers: { accept: 'application/json' },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Kalshi search failed (${res.status})`);
        if (searchId !== searchIdRef.current) return;
        setResults(data.markets || []);
        setOpen((data.markets || []).length > 0);
        if ((data.markets || []).length === 0) setSearchError('No Kalshi markets found');
      } catch (error) {
        if (searchId !== searchIdRef.current) return;
        setResults([]);
        setOpen(false);
        setSearchError(error instanceof Error ? error.message : 'Could not search Kalshi');
      } finally {
        if (searchId === searchIdRef.current) setSearching(false);
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
        {!config.marketTicker && (
          <>
            <input
              type="text"
              className="nodrag nopan"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onPaste={e => {
                const text = normalizeMarketIdentifier(e.clipboardData.getData('text'));
                if (text) {
                  e.preventDefault();
                  setSearchQuery(text);
                  search(text);
                }
              }}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Search markets…"
            />

            {open && results.length > 0 && (
              <MarketSearch results={results} onSelect={selectMarket} />
            )}
            {searching && <p className="mt-1 text-xs text-white/35">Searching Kalshi...</p>}
            {!searching && searchError && (
              <p className="mt-1 text-xs text-red-400/80">{searchError}</p>
            )}
          </>
        )}

        {config.marketTicker && (
          <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
            <span className="text-[10px] font-mono text-emerald-400/90 flex-1 truncate">{config.marketTicker}</span>
            <button
              type="button"
              className="nodrag nopan text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
              onClick={() => set('marketTicker', '')}
              onPointerDown={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="nodrag nopan">
          <Label htmlFor="kalshi-threshold">Price Threshold</Label>
          <input
            id="kalshi-threshold"
            type="number" min="0" max="1" step="0.01"
            className="nodrag nopan"
            value={config.priceThreshold}
            onChange={e => set('priceThreshold', e.target.value)}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            placeholder="0.65"
          />
        </div>
        <DirectionField
          id="kalshi-direction"
          value={config.direction}
          onChange={v => set('direction', v)}
        />
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
