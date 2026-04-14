'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface PolyMarketResult {
  slug: string;
  question: string;
  outcomes: string;        // JSON string: '["Yes","No"]' or '["Tiger Woods","Rory McIlroy",...]'
  outcomePrices: string;   // JSON string: '["0.65","0.35"]'
  conditionId?: string;
  groupItemTitle?: string; // e.g. player name in a multi-outcome event
}

function parsePrices(raw: string): number[] {
  try { return (JSON.parse(raw) as string[]).map(Number); } catch { return []; }
}

function parseOutcomes(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

/** Best short label — groupItemTitle (e.g. player name) or first word of question */
function cardLabel(m: PolyMarketResult): string {
  if (m.groupItemTitle?.trim()) return m.groupItemTitle.trim();
  // Strip "Will X ..." → "X"
  const q = m.question.replace(/^Will\s+/i, '').replace(/\?$/, '').trim();
  return q.length <= 40 ? q : q.slice(0, 38) + '…';
}

function MarketCard({ market, onSelect }: { market: PolyMarketResult; onSelect: (m: PolyMarketResult) => void }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLButtonElement>(null);

  const outcomes = parseOutcomes(market.outcomes);
  const prices = parsePrices(market.outcomePrices);
  const yesPrice = prices[0] != null ? Math.round(prices[0] * 100) : null;
  const label = cardLabel(market);
  const isBinary = outcomes.length === 2 &&
    outcomes[0]?.toLowerCase() === 'yes' && outcomes[1]?.toLowerCase() === 'no';

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
      width: 260,
      background: 'rgba(8,10,18,0.98)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: '10px 12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.75)',
      pointerEvents: 'none',
    }}>
      <p className="text-[11px] text-white/80 leading-snug mb-2">{market.question}</p>
      {!isBinary && outcomes.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {outcomes.slice(0, 6).map((o, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[10px] text-white/60">{o}</span>
              {prices[i] != null && (
                <span className="text-[10px] font-mono" style={{ color: '#60a5fa' }}>
                  {Math.round(prices[i] * 100)}¢
                </span>
              )}
            </div>
          ))}
          {outcomes.length > 6 && (
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              +{outcomes.length - 6} more outcomes
            </span>
          )}
        </div>
      )}
      <p className="text-[10px] font-mono text-white/25">{market.slug}</p>
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
        className="w-full text-left flex flex-col gap-2 p-3 rounded-xl transition-all duration-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50"
        style={{
          minHeight: 88,
          background: hovered ? 'rgba(96,165,250,0.07)' : 'rgba(255,255,255,0.04)',
          border: hovered ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: hovered ? '0 0 0 1px rgba(96,165,250,0.06) inset' : 'none',
        }}
      >
        {/* Price */}
        {yesPrice != null && (
          <span className="self-start text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
            {yesPrice}¢
          </span>
        )}

        {/* Label */}
        <p className="text-[13px] font-semibold leading-snug"
          style={{ color: hovered ? '#fff' : 'rgba(255,255,255,0.85)' }}>
          {label}
        </p>

        {/* Slug */}
        <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {market.slug}
        </p>
      </button>
      {tooltip}
    </div>
  );
}

interface Props {
  results: PolyMarketResult[];
  onSelect: (m: PolyMarketResult) => void;
}

export function PolymarketSearch({ results, onSelect }: Props) {
  return (
    <div style={{
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
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          Markets
        </span>
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {results.length} results
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {results.map((m, i) => (
          <MarketCard key={`${m.slug}-${i}`} market={m} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
