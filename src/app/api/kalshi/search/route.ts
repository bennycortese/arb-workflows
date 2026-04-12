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

// Kalshi URL slugs often concatenate event ticker + outcome code without a separating dash.
// e.g. kxncaambgame-26jan17bulmd → event: KXNCAAMBGAME-26JAN17, outcome: BULMD
// Detect by finding a date-like segment (\d{2}[A-Z]{3}\d{2}) followed by trailing letters.
function extractEventTicker(ticker: string): string | null {
  const m = ticker.match(/^(.+\d{2}[A-Z]{3}\d{2})([A-Z]{2,})$/);
  return m ? m[1] : null;
}

async function tryEventTicker(eventTicker: string, apiKey: string | null): Promise<any[] | null> {
  const url = new URL(`${BASE}/markets`);
  url.searchParams.set('event_ticker', eventTicker);
  url.searchParams.set('status', 'open');
  url.searchParams.set('limit', '25');
  const res = await kalshiFetch(url.toString(), apiKey);
  if (!res.ok) return null;
  const data = await res.json();
  const markets: any[] = data.markets || [];
  return markets.length > 0 ? markets : null;
}

export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    const apiKey = request.headers.get('x-kalshi-api-key');

    if (!q) return NextResponse.json({ markets: [] });

    const qUpper = q.toUpperCase();

    // Strategy 1: if query looks like a ticker, try multiple event_ticker forms
    if (looksLikeTicker(q)) {
      // 1a. Try as-is (works when user pastes a real event ticker like KXNCAAMBGAME-26JAN17)
      const directEvent = await tryEventTicker(qUpper, apiKey);
      if (directEvent) return NextResponse.json({ markets: directEvent });

      // 1b. Try extracting event ticker from URL-concatenated form
      // (e.g. kxncaambgame-26jan17bulmd → KXNCAAMBGAME-26JAN17)
      const extracted = extractEventTicker(qUpper);
      if (extracted) {
        const extractedMarkets = await tryEventTicker(extracted, apiKey);
        if (extractedMarkets) return NextResponse.json({ markets: extractedMarkets });
      }

      // 1c. Try fetching the market directly by ticker
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
