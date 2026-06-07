'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface MarketResult {
  ticker: string;
  title: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  yes_bid: number;
  event_ticker?: string;
  category?: string;
}

interface Outcome { side: 'yes' | 'no'; name: string; }

function parseOutcomes(title: string): Outcome[] | null {
  if (!/^(yes|no)\s/i.test(title) || !title.includes(',')) return null;
  const parts = title.split(',').map(p => {
    const m = p.trim().match(/^(yes|no)\s+(.+)$/i);
    return m ? { side: m[1].toLowerCase() as 'yes' | 'no', name: m[2].trim() } : null;
  }).filter(Boolean) as Outcome[];
  return parts.length > 1 ? parts : null;
}

function outcomeLabel(market: MarketResult): string | null {
  if (market.yes_sub_title?.trim()) return market.yes_sub_title.trim();
  return null;
}

function tickerSuffix(ticker: string): string {
  const parts = ticker.split('-');
  return parts[parts.length - 1] ?? ticker;
}

// ─── Parlay card ─────────────────────────────────────────────────────────────

function ParlayCard({ market, outcomes, hovered }: {
  market: MarketResult;
  outcomes: Outcome[];
  hovered: boolean;
}) {
  const preview = outcomes.slice(0, 2);
  const rest = outcomes.length - preview.length;

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {market.yes_bid != null && (
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              {market.yes_bid}¢
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.38)' }}>
          {outcomes.length}-pick
        </span>
      </div>

      {/* Pick rows */}
      <div className="flex flex-col gap-1 flex-1">
        {preview.map((o, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold w-5 text-center rounded flex-shrink-0"
              style={{
                color: o.side === 'yes' ? '#34d399' : '#f87171',
                background: o.side === 'yes' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                padding: '1px 0',
              }}>
              {o.side === 'yes' ? 'Y' : 'N'}
            </span>
            <span className="text-[11px] font-medium truncate"
              style={{ color: hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.72)' }}>
              {o.name}
            </span>
          </div>
        ))}
        {rest > 0 && (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)', paddingLeft: '1.625rem' }}>
            +{rest} more · hover
          </p>
        )}
      </div>
    </>
  );
}

// ─── Single-outcome card ──────────────────────────────────────────────────────

function SingleCard({ market, hovered }: { market: MarketResult; hovered: boolean }) {
  const label = outcomeLabel(market);
  const suffix = tickerSuffix(market.ticker);
  const leadWithCode = (label !== null) || (suffix.length <= 6 && suffix !== market.ticker);
  const displayLabel = label ?? suffix;

  return (
    <>
      {market.yes_bid != null && (
        <span className="self-start text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
          style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
          {market.yes_bid}¢
        </span>
      )}
      {leadWithCode ? (
        <>
          <p className="text-[15px] font-semibold tracking-wide font-mono leading-none"
            style={{ color: hovered ? '#fff' : 'rgba(255,255,255,0.88)' }}>
            {displayLabel}
          </p>
          <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {market.ticker}
          </p>
        </>
      ) : (
        <>
          <p className="text-[12px] font-medium leading-snug overflow-hidden flex-1"
            style={{
              color: hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.82)',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
            }}>
            {market.title}
          </p>
          <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {market.ticker}
          </p>
        </>
      )}
    </>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ParlayTooltip({ market, outcomes }: { market: MarketResult; outcomes: Outcome[] }) {
  return (
    <>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          {outcomes.length}-Pick Parlay
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {outcomes.map((o, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[9px] font-mono font-bold mt-0.5 flex-shrink-0 rounded px-1"
              style={{
                color: o.side === 'yes' ? '#34d399' : '#f87171',
                background: o.side === 'yes' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
              }}>
              {o.side === 'yes' ? 'YES' : 'NO'}
            </span>
            <span className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {o.name}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>
          {market.ticker}
        </p>
      </div>
    </>
  );
}

function SingleTooltip({ market }: { market: MarketResult }) {
  return (
    <>
      <p className="text-[11px] text-white/80 leading-snug mb-1.5">{market.title}</p>
      <p className="text-[10px] font-mono text-white/35">{market.ticker}</p>
    </>
  );
}

// ─── MarketCard ───────────────────────────────────────────────────────────────

function MarketCard({ market, onSelect }: { market: MarketResult; onSelect: (m: MarketResult) => void }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLButtonElement>(null);

  const outcomes = parseOutcomes(market.title);
  const isParlay = outcomes !== null;

  function onEnter() {
    setHovered(true);
    tooltipTimer.current = setTimeout(() => {
      if (cardRef.current) {
        const r = cardRef.current.getBoundingClientRect();
        setTooltipPos({ top: r.top - 8, left: r.left });
      }
    }, 200);
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

  const tooltip = tooltipPos && createPortal(
    <div style={{
      position: 'fixed',
      top: tooltipPos.top,
      left: tooltipPos.left,
      transform: 'translateY(-100%)',
      zIndex: 99999,
      width: isParlay ? 300 : 240,
      background: 'rgba(8,10,18,0.98)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: '10px 12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.75)',
      pointerEvents: 'none',
    }}>
      {isParlay
        ? <ParlayTooltip market={market} outcomes={outcomes} />
        : <SingleTooltip market={market} />
      }
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
          background: hovered ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.04)',
          border: hovered ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: hovered ? '0 0 0 1px rgba(52,211,153,0.06) inset' : 'none',
        }}
      >
        {isParlay
          ? <ParlayCard market={market} outcomes={outcomes} hovered={hovered} />
          : <SingleCard market={market} hovered={hovered} />
        }
      </button>
      {tooltip}
    </div>
  );
}

// ─── MarketSearch ─────────────────────────────────────────────────────────────

interface Props {
  results: MarketResult[];
  onSelect: (m: MarketResult) => void;
}

export function MarketSearch({ results, onSelect }: Props) {
  const [filter, setFilter] = useState('');
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredResults = normalizedFilter
    ? results.filter(m => [
        m.ticker,
        m.title,
        m.yes_sub_title,
        m.no_sub_title,
        m.event_ticker,
        m.category,
      ].some(value => value?.toLowerCase().includes(normalizedFilter)))
    : results;

  return (
    <div className="nowheel nodrag nopan" style={{
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 720,
      zIndex: 9999,
      borderRadius: 14,
      background: 'rgba(8,10,18,0.99)',
      border: '1px solid rgba(255,255,255,0.13)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)',
      backdropFilter: 'blur(24px)',
      overflow: 'hidden',
    }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          Open Markets
        </span>
        <input
          type="search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          placeholder="Filter markets..."
          aria-label="Filter open markets"
          className="nodrag nopan min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-emerald-400/40"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        <span className="whitespace-nowrap text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {filteredResults.length === results.length
            ? `${results.length} results`
            : `${filteredResults.length} of ${results.length}`}
        </span>
      </div>

      <div
        className="nowheel grid grid-cols-3 gap-2 overflow-y-scroll p-3"
        style={{
          height: 'min(520px, 65vh)',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable',
        }}
      >
        {filteredResults.map((m, i) => (
          <MarketCard key={`${m.ticker}-${i}`} market={m} onSelect={onSelect} />
        ))}
        {filteredResults.length === 0 && (
          <div className="col-span-3 py-10 text-center text-xs text-white/35">
            No markets match &ldquo;{filter.trim()}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
