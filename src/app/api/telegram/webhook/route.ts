import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import {
  hashTelegramConnectToken,
  sendTelegramMessage,
  telegramWebhookSecret,
} from '../../../../lib/telegram';

interface TelegramMessage {
  text?: string;
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}

function chatLabel(chat: TelegramMessage['chat']): string {
  if (chat.title) return chat.title;
  const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ').trim();
  return name || (chat.username ? `@${chat.username}` : `Telegram ${chat.type}`);
}

export async function POST(request: NextRequest) {
  if (request.headers.get('x-telegram-bot-api-secret-token') !== telegramWebhookSecret()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await request.json() as { message?: TelegramMessage };
  const message = update.message;
  const startMatch = message?.text?.match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]+)$/);
  if (!message || !startMatch) return NextResponse.json({ ok: true });

  const token = startMatch[1];
  const tokenHash = hashTelegramConnectToken(token);
  const supabase = getSupabaseAdmin();
  const { data: connectionToken } = await supabase
    .from('telegram_connect_tokens')
    .select('user_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!connectionToken || new Date(connectionToken.expires_at).getTime() < Date.now()) {
    await sendTelegramMessage(String(message.chat.id), 'This MarketPing connection link has expired. Return to MarketPing and generate a new one.');
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const { error } = await supabase.from('telegram_connections').upsert({
    user_id: connectionToken.user_id,
    chat_id: chatId,
    chat_type: message.chat.type,
    label: chatLabel(message.chat),
    username: message.chat.username ?? null,
  }, { onConflict: 'chat_id' });

  if (!error) {
    await supabase.from('telegram_connect_tokens').delete().eq('token_hash', tokenHash);
    await sendTelegramMessage(chatId, 'MarketPing is connected. You can now select this chat in a Telegram action node.');
  } else {
    console.error('[telegram/webhook] connection upsert failed:', error);
    await sendTelegramMessage(chatId, 'MarketPing could not save this connection. Please try again.');
  }

  return NextResponse.json({ ok: true });
}
