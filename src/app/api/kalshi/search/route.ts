import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://api.elections.kalshi.com/trade-api/v2';

async function kalshiFetch(url: string, apiKey: string | null) {
  return fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });
}

// Looks like a ticker/event slug: all caps, contains dashes, no spaces
function looksLikeTicker(q: string) {
  return /^[A-Z0-9][A-Z0-9\-]+$/.test(q.trim().toUpperCase()) && q.includes('-');
}

export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    const apiKey = request.headers.get('x-kalshi-api-key');

    if (!q) return NextResponse.json({ markets: [] });

    const qUpper = q.toUpperCase();

    // Strategy 1: if query looks like a ticker, try fetching by event_ticker
    // This returns all individual outcome markets for that event
    if (looksLikeTicker(q)) {
      const eventUrl = new URL(`${BASE}/markets`);
      eventUrl.searchParams.set('event_ticker', qUpper);
      eventUrl.searchParams.set('status', 'open');
      eventUrl.searchParams.set('limit', '25');

      const eventRes = await kalshiFetch(eventUrl.toString(), apiKey);
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        const eventMarkets: any[] = eventData.markets || [];
        if (eventMarkets.length > 0) {
return NextResponse.json({ markets: eventMarkets });
        }
      }

      // Also try fetching the market directly by ticker
      const directRes = await kalshiFetch(`${BASE}/markets/${qUpper}`, apiKey);
      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData.market) {
          return NextResponse.json({ markets: [directData.market] });
        }
      }
    }

    // Strategy 2: full-text search
    const searchUrl = new URL(`${BASE}/markets`);
    searchUrl.searchParams.set('limit', '25');
    searchUrl.searchParams.set('status', 'open');
    searchUrl.searchParams.set('search', q);

    const res = await kalshiFetch(searchUrl.toString(), apiKey);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Kalshi API error: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const markets: any[] = data.markets || [];
    return NextResponse.json({ markets: markets.slice(0, 9) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
