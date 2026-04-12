'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface MarketResult {
  ticker: string;
  title: string;
  yes_sub_title?: string;  // Kalshi's per-outcome name, e.g. "Netflix", "Peacock"
  no_sub_title?: string;
  yes_bid: number;
  event_ticker?: string;
  category?: string;
}

interface Outcome { side: 'yes' | 'no'; name: string; }

/** Parse "yes X,yes Y,no Z" into structured outcomes */
function parseOutcomes(title: string): Outcome[] | null {
  if (!/^(yes|no)\s/i.test(title) || !title.includes(',')) return null;
  const parts = title.split(',').map(p => {
    const m = p.match(/^(yes|no)\s+(.+)$/i);
    return m ? { side: m[1].toLowerCase() as 'yes' | 'no', name: m[2].trim() } : null;
  }).filter(Boolean) as Outcome[];
  return parts.length > 1 ? parts : null;
}

/** Best human-readable short label for a market */
function outcomeLabel(market: MarketResult): string | null {
  if (market.yes_sub_title && market.yes_sub_title.trim()) return market.yes_sub_title.trim();
  return null;
}

/** Extract the outcome suffix from a ticker, e.g. KXAISTREAMSERIES-27-NET → NET */
function tickerSuffix(ticker: string): string {
  const parts = ticker.split('-');
  return parts[parts.length - 1] ?? ticker;
}

function MarketCard({ market, onSelect }: { market: MarketResult; onSelect: (m: MarketResult) => void }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLButtonElement>(null);

  const label = outcomeLabel(market);
  const suffix = tickerSuffix(market.ticker);
  const leadWithSuffix = (label !== null) || (suffix.length <= 6 && suffix !== market.ticker);
  const displayLabel = label ?? suffix;
  const outcomes = leadWithSuffix ? null : parseOutcomes(market.title);

  function onEnter() {
    setHovered(true);
    tooltipTimer.current = setTimeout(() => {
      if (cardRef.current) {
        const r = cardRef.current.getBoundingClientRect();
        setTooltipPos({ top: r.top - 8, left: r.left });
      }
    }, 250);
  }
  function onLeave() {
    setHovered(false);
    setTooltipPos(null);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }

  useEffect(() => {
    if (!tooltipPos) return;
    const hide = () => setTooltipPos(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide); };
  }, [tooltipPos]);

  const tooltipContent = outcomes ? (
    // Parlay tooltip: full outcome list with yes/no indicators
    <>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: 'rgba(255,255,255,0.35)' }}>
        {outcomes.length}-pick parlay
      </p>
      <div className="flex flex-col gap-1">
        {outcomes.map((o, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="text-[9px] font-mono font-semibold mt-0.5 flex-shrink-0"
              style={{ color: o.side === 'yes' ? '#34d399' : '#f87171' }}>
              {o.side.toUpperCase()}
            </span>
            <span className="text-[11px] text-white/75 leading-snug">{o.name}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-mono text-white/25 mt-2">{market.ticker}</p>
    </>
  ) : (
    // Regular tooltip: raw title + ticker
    <>
      <p className="text-[11px] text-white/80 leading-snug mb-1.5">{market.title}</p>
      <p className="text-[10px] font-mono text-white/35">{market.ticker}</p>
    </>
  );

  const tooltip = tooltipPos && createPortal(
    <div
      style={{
        position: 'fixed',
        top: tooltipPos.top,
        left: tooltipPos.left,
        transform: 'translateY(-100%)',
        zIndex: 99999,
        width: outcomes ? 280 : 240,
        background: 'rgba(8,10,18,0.98)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.75)',
        pointerEvents: 'none',
      }}
    >
      {tooltipContent}
    </div>,
    document.body
  );

  return (
    <div>
      <button
        ref={cardRef}
        type="button"
        onClick={() => onSelect(market)}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="w-full text-left flex flex-col gap-2 p-3 rounded-xl transition-all duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
        style={{
          minHeight: 88,
          background: hovered ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)',
          border: hovered ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.10)',
          boxShadow: hovered ? '0 0 0 1px rgba(52,211,153,0.08) inset' : 'none',
        }}
      >
        {/* Top row: price + parlay badge */}
        <div className="flex items-center gap-2">
          {market.yes_bid != null && (
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              {market.yes_bid}¢
            </span>
          )}
          {outcomes && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {outcomes.length} picks
            </span>
          )}
        </div>

        {/* Body */}
        {leadWithSuffix ? (
          <>
            <p className="text-[15px] font-semibold tracking-wide font-mono leading-none"
              style={{ color: hovered ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.88)' }}>
              {displayLabel}
            </p>
            <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {market.ticker}
            </p>
          </>
        ) : outcomes ? (
          // Parlay: show first 3 names + overflow count
          <>
            <p className="text-[12px] font-medium leading-snug"
              style={{ color: hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)' }}>
              {outcomes.slice(0, 3).map(o => o.name).join(' · ')}
              {outcomes.length > 3 && (
                <span style={{ color: 'rgba(255,255,255,0.3)' }}> +{outcomes.length - 3} more</span>
              )}
            </p>
            <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.22)' }}>
              Hover for full breakdown
            </p>
          </>
        ) : (
          <>
            <p className="text-[12px] font-medium leading-snug flex-1 overflow-hidden"
              style={{
                color: hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.82)',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
              }}>
              {market.title}
            </p>
            <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {market.ticker}
            </p>
          </>
        )}
      </button>

      {tooltip}
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
        background: 'rgba(8, 10, 18, 0.99)',
        border: '1px solid rgba(255,255,255,0.13)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          Open Markets
        </span>
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {results.length} results
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {results.map((m, i) => (
          <MarketCard key={`${m.ticker}-${i}`} market={m} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
