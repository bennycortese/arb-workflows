import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const url = `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}&limit=1`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Polymarket API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data: any[] = await response.json();
    return NextResponse.json(data[0] ?? null);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
