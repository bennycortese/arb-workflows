import { NextRequest, NextResponse } from 'next/server';

const GAMMA = 'https://gamma-api.polymarket.com';

async function gFetch(url: string) {
  return fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { accept: 'application/json' },
  });
}

/** Strip Polymarket URL down to just the slug.
 *  https://polymarket.com/event/the-masters-winner-2026 → the-masters-winner-2026
 *  https://polymarket.com/market/will-trump-win → will-trump-win
 */
function extractSlug(q: string): string {
  return q
    .trim()
    .replace(/^https?:\/\/(www\.)?polymarket\.com\/(event|market)\//i, '')
    .replace(/\/.*$/, '') // strip any trailing path segments
    .trim();
}

/** Fetch all markets belonging to an event slug */
async function fetchByEventSlug(slug: string): Promise<any[] | null> {
  const url = `${GAMMA}/events?slug=${encodeURIComponent(slug)}&limit=1`;
  const res = await gFetch(url);
  if (!res.ok) return null;
  const events: any[] = await res.json();
  const event = events[0];
  if (!event) return null;
  // event.markets is an array of market objects
  const markets: any[] = event.markets || [];
  return markets.length > 0 ? markets : null;
}

/** Fetch a single market by its own slug */
async function fetchByMarketSlug(slug: string): Promise<any | null> {
  const url = `${GAMMA}/markets?slug=${encodeURIComponent(slug)}&limit=1`;
  const res = await gFetch(url);
  if (!res.ok) return null;
  const markets: any[] = await res.json();
  return markets[0] ?? null;
}

/** Full-text search across events, return their markets */
async function textSearch(q: string): Promise<any[]> {
  const url = `${GAMMA}/events?search=${encodeURIComponent(q)}&limit=5&active=true&closed=false`;
  const res = await gFetch(url);
  if (!res.ok) return [];
  const events: any[] = await res.json();
  // Flatten all markets from matching events, up to 9 total
  return events.flatMap((e: any) => e.markets || []).slice(0, 9);
}

export async function GET(request: NextRequest) {
  try {
    const raw = (request.nextUrl.searchParams.get('q') || '').trim();
    if (!raw) return NextResponse.json({ markets: [] });

    const slug = extractSlug(raw);

    // Strategy 1: try as event slug (covers pasted event URLs and bare event slugs)
    const byEvent = await fetchByEventSlug(slug);
    if (byEvent) return NextResponse.json({ markets: byEvent });

    // Strategy 2: try as a market slug
    const byMarket = await fetchByMarketSlug(slug);
    if (byMarket) return NextResponse.json({ markets: [byMarket] });

    // Strategy 3: full-text search
    const searched = await textSearch(slug);
    return NextResponse.json({ markets: searched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
