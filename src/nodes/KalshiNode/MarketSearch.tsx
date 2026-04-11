'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface MarketResult {
  ticker: string;
  title: string;
  subtitle?: string;
  yes_bid: number;
  event_ticker?: string;
  category?: string;
}

function parseOutcomes(raw: string): string[] | null {
  if (/^(yes|no)\s/i.test(raw) && raw.includes(',')) {
    return raw.split(',').map(p => p.replace(/^(yes|no)\s+/i, '').trim()).filter(Boolean);
  }
  return null;
}

function MarketCard({ market, onSelect }: { market: MarketResult; onSelect: (m: MarketResult) => void }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outcomes = parseOutcomes(market.title);
  const isMulti = outcomes !== null && outcomes.length > 1;
  const displayTitle = isMulti
    ? outcomes!.slice(0, 3).join(' · ') + (outcomes!.length > 3 ? ' · …' : '')
    : market.title;

  function handleMouseEnter() {
    if (isMulti) tooltipTimeout.current = setTimeout(() => setTooltipVisible(true), 280);
  }
  function handleMouseLeave() {
    setTooltipVisible(false);
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
  }

  return (
    <div style={{ position: 'relative' }}>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onSelect(market)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={e => e.key === 'Enter' && onSelect(market)}
        className="cursor-pointer p-3 flex flex-col gap-2 min-h-[96px] transition-all duration-100
          hover:bg-white/[0.05] hover:border-emerald-500/25 group"
      >
        {/* Top row: price badge + options count */}
        <div className="flex items-center gap-2">
          {market.yes_bid != null && (
            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md
              bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {market.yes_bid}¢
            </span>
          )}
          {isMulti && (
            <Badge variant="muted" className="text-[10px] ml-auto">
              {outcomes!.length} options
            </Badge>
          )}
        </div>

        {/* Title */}
        <p className="text-[12px] leading-snug text-white/70 group-hover:text-white/90 transition-colors flex-1
          overflow-hidden"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
          {displayTitle}
        </p>

        {/* Ticker */}
        <p className="text-[10px] font-mono text-white/20 truncate">
          {market.ticker}
        </p>
      </Card>

      {/* Hover tooltip for multi-outcome markets */}
      {tooltipVisible && isMulti && (
        <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-[10000]
          rounded-xl border border-white/[0.12] p-3 pointer-events-none"
          style={{
            background: 'rgba(9,12,21,0.97)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            minWidth: 160, maxWidth: 220,
          }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
            All {outcomes!.length} options
          </p>
          {outcomes!.map((o, i) => (
            <div key={i} className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 flex-shrink-0" />
              <span className="text-[11px] text-white/75 leading-snug">{o}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  results: MarketResult[];
  onSelect: (m: MarketResult) => void;
}

export function MarketSearch({ results, onSelect }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 720,
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
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.05]">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Open Markets
        </span>
        <span className="text-[10px] text-white/20">{results.length} results</span>
      </div>

      {/* 3-column grid of cards */}
      <div className="grid grid-cols-3 gap-2 p-2.5">
        {results.map(m => (
          <MarketCard key={m.ticker} market={m} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
