import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    const apiKey = request.headers.get('x-kalshi-api-key');

    const url = new URL('https://api.elections.kalshi.com/trade-api/v2/markets');
    url.searchParams.set('limit', '200');
    url.searchParams.set('status', 'open');

    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Kalshi API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const markets: any[] = data.markets || [];

    const filtered = q
      ? markets.filter(
          m =>
            m.title?.toLowerCase().includes(q.toLowerCase()) ||
            m.ticker?.toLowerCase().includes(q.toLowerCase()) ||
            m.event_ticker?.toLowerCase().includes(q.toLowerCase())
        )
      : markets;

    return NextResponse.json({ markets: filtered.slice(0, 15) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
