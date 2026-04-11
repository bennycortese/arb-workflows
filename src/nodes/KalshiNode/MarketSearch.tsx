'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface MarketResult {
  ticker: string;
  title: string;
  subtitle?: string;
  yes_bid: number;
  event_ticker?: string;
  category?: string;
}

/** Splits "yes Netflix,yes Disney,yes Amazon" → individual outcome markets */
function explodeOutcomes(markets: MarketResult[]): MarketResult[] {
  const out: MarketResult[] = [];
  for (const m of markets) {
    if (/^(yes|no)\s/i.test(m.title) && m.title.includes(',')) {
      const parts = m.title
        .split(',')
        .map(p => p.replace(/^(yes|no)\s+/i, '').trim())
        .filter(Boolean);
      parts.forEach(label => {
        out.push({ ...m, title: label });
      });
    } else {
      out.push(m);
    }
  }
  return out;
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

  const suffix = tickerSuffix(market.ticker);
  const leadWithSuffix = suffix.length <= 6 && suffix !== market.ticker;

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

  // Close tooltip on scroll/resize
  useEffect(() => {
    if (!tooltipPos) return;
    const hide = () => setTooltipPos(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide); };
  }, [tooltipPos]);

  const tooltip = tooltipPos && createPortal(
    <div
      style={{
        position: 'fixed',
        top: tooltipPos.top,
        left: tooltipPos.left,
        transform: 'translateY(-100%)',
        zIndex: 99999,
        width: 240,
        background: 'rgba(8,10,18,0.98)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 12,
        padding: '10px 12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.75)',
        pointerEvents: 'none',
      }}
    >
      <p className="text-[11px] text-white/80 leading-snug mb-1.5">{market.title}</p>
      <p className="text-[10px] font-mono text-white/35">{market.ticker}</p>
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
        className="w-full text-left flex flex-col gap-2.5 p-3 rounded-xl transition-all duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
        style={{
          minHeight: 88,
          background: hovered ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)',
          border: hovered ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.10)',
          boxShadow: hovered ? '0 0 0 1px rgba(52,211,153,0.08) inset' : 'none',
        }}
      >
        {market.yes_bid != null && (
          <span className="self-start text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
            {market.yes_bid}¢
          </span>
        )}

        {leadWithSuffix ? (
          <>
            <p className="text-[15px] font-semibold tracking-wide font-mono leading-none"
              style={{ color: hovered ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.88)' }}>
              {suffix}
            </p>
            <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {market.ticker}
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
  const cards = explodeOutcomes(results);

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
          {cards.length} results
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {cards.map((m, i) => (
          <MarketCard key={`${m.ticker}-${i}`} market={m} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
