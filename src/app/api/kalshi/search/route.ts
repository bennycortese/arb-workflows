import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    const apiKey = request.headers.get('x-kalshi-api-key');

    const url = new URL('https://api.elections.kalshi.com/trade-api/v2/markets');
    url.searchParams.set('limit', '25');
    url.searchParams.set('status', 'open');
    if (q) url.searchParams.set('search', q);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
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

    return NextResponse.json({ markets: markets.slice(0, 6) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
