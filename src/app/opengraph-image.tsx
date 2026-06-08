import { ImageResponse } from 'next/og';

export const alt = 'MarketPing - Kalshi and Polymarket price alerts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#070b14',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 52 }}>
          <div
            style={{
              width: 58,
              height: 58,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              background: 'rgba(6,182,212,0.15)',
              border: '2px solid rgba(6,182,212,0.35)',
              color: '#22d3ee',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            MP
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>MarketPing</div>
        </div>
        <div style={{ maxWidth: 1000, fontSize: 72, lineHeight: 1.05, fontWeight: 800 }}>
          Kalshi &amp; Polymarket price alerts
        </div>
        <div style={{ marginTop: 34, fontSize: 30, color: '#94a3b8' }}>
          No-code prediction market monitoring for every notification channel.
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 58 }}>
          {['Discord', 'Telegram', 'Slack', 'Email', 'SMS', 'Webhooks'].map(channel => (
            <div
              key={channel}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 20,
                color: '#cbd5e1',
              }}
            >
              {channel}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
