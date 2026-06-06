import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import {
  createTelegramConnectToken,
  ensureTelegramWebhook,
  getTelegramBotUsername,
} from '../../../../lib/telegram';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const requestOrigin = new URL(request.url).origin;
    const origin = process.env.TELEGRAM_WEBHOOK_ORIGIN ??
      (process.env.NODE_ENV === 'production' ? 'https://www.marketping.ai' : requestOrigin);
    await ensureTelegramWebhook(origin);
    const username = await getTelegramBotUsername();
    const { token, tokenHash } = createTelegramConnectToken();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error } = await getSupabaseAdmin().from('telegram_connect_tokens').insert({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt,
    });
    if (error) throw error;

    return NextResponse.json({
      url: `https://t.me/${username}?start=${token}`,
      groupUrl: `https://t.me/${username}?startgroup=${token}`,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create Telegram connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
