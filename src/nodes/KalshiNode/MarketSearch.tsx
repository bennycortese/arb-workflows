'use client';

import React, { useState, useRef } from 'react';

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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
          Open Markets
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{results.length} results</span>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 10 }}>
        {results.map(m => (
          <MarketCard key={m.ticker} market={m} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
