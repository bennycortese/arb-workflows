'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PolymarketConfig } from '../../atoms';
import { PolymarketSearch, PolyMarketResult } from './MarketSearch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Props {
  config: PolymarketConfig;
  onChange: (config: PolymarketConfig) => void;
}

export function PolymarketNodeConfig({ config, onChange }: Props) {
  const set = (key: keyof PolymarketConfig, value: string) =>
    onChange({ ...config, [key]: value });

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PolyMarketResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Unlock clipping ancestors when dropdown is open
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

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const res = await fetch(`/api/polymarket/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.markets || []);
      setOpen(true);
    }
  }, []);

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

  function selectMarket(m: PolyMarketResult) {
    set('marketSlug', m.slug);
    // Default outcomeIndex to 0 (Yes / first outcome)
    onChange({ ...config, marketSlug: m.slug, outcomeIndex: '0' });
    setSearchQuery('');
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="space-y-4" ref={containerRef} style={{ position: 'relative' }}>
      <div>
        <Label>Market</Label>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onPaste={e => {
            const text = e.clipboardData.getData('text').trim();
            if (text) { setSearchQuery(text); search(text); }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search or paste a Polymarket URL…"
        />
        <p className="mt-1 text-xs text-white/30">
          Paste a URL like <span className="text-blue-400 font-mono">polymarket.com/event/slug</span> or search by name
        </p>

        {open && results.length > 0 && (
          <PolymarketSearch results={results} onSelect={selectMarket} />
        )}

        {config.marketSlug && (
          <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.12)' }}>
            <span className="text-[10px] font-mono text-blue-400/90 flex-1 truncate">{config.marketSlug}</span>
            <button
              type="button"
              onClick={() => set('marketSlug', '')}
              className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="poly-outcome">Outcome Index</Label>
        <input
          id="poly-outcome"
          type="number"
          min="0"
          step="1"
          value={config.outcomeIndex}
          onChange={e => set('outcomeIndex', e.target.value)}
          placeholder="0"
        />
        <p className="mt-1 text-xs text-white/30">
          0 = Yes, 1 = No (check market for multi-outcome order)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="poly-threshold">Price Threshold</Label>
          <input
            id="poly-threshold"
            type="number"
            min="0" max="1" step="0.01"
            value={config.priceThreshold}
            onChange={e => set('priceThreshold', e.target.value)}
            placeholder="0.65"
          />
        </div>
        <div>
          <Label htmlFor="poly-direction">Direction</Label>
          <select
            id="poly-direction"
            value={config.direction}
            onChange={e => set('direction', e.target.value as PolymarketConfig['direction'])}
          >
            <option value="above">Above threshold</option>
            <option value="below">Below threshold</option>
            <option value="any">Any change</option>
          </select>
        </div>
      </div>

      <Card className="bg-blue-500/5 border-blue-500/15 p-3">
        <p className="text-xs text-blue-400/80">
          Triggers when outcome #{config.outcomeIndex || '0'} of{' '}
          <span className="font-semibold font-mono">{config.marketSlug || 'market'}</span> is{' '}
          <span className="font-semibold">{config.direction}</span>{' '}
          <span className="font-mono font-semibold">{(parseFloat(config.priceThreshold) * 100).toFixed(0)}¢</span>
        </p>
      </Card>
    </div>
  );
}

export function PolymarketNodeHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
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
          <Badge variant="polymarket" className="text-[10px] px-1.5 py-0.5">SOURCE</Badge>
        </div>
        <p className="text-xs text-white/40">Read prediction market prices</p>
      </div>
    </div>
  );
}
