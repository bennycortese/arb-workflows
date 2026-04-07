import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const ticker = request.nextUrl.searchParams.get('ticker');
    const apiKey = request.headers.get('x-kalshi-api-key');

    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

    const url = `https://api.elections.kalshi.com/trade-api/v2/markets/${ticker.toUpperCase()}`;
    const response = await fetch(url, {
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
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
