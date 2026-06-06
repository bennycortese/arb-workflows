import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { signTelegramChatId } from '../../../../lib/telegram';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('telegram_connections')
    .select('id, chat_id, chat_type, label, username')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    connections: (data ?? []).map(row => ({
      id: row.id,
      chatId: row.chat_id,
      chatType: row.chat_type,
      label: row.label,
      username: row.username,
      signature: signTelegramChatId(row.chat_id),
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { chatId } = await request.json() as { chatId?: string };
  if (!chatId) return NextResponse.json({ error: 'Missing chat ID' }, { status: 400 });

  const { error } = await getSupabaseAdmin()
    .from('telegram_connections')
    .delete()
    .eq('user_id', userId)
    .eq('chat_id', chatId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
