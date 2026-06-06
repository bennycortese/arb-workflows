import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const TELEGRAM_API = 'https://api.telegram.org';

export function getTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  return token;
}

export function telegramWebhookSecret(): string {
  return createHash('sha256').update(getTelegramBotToken()).digest('hex');
}

export function createTelegramConnectToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, tokenHash: hashTelegramConnectToken(token) };
}

export function hashTelegramConnectToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function signTelegramChatId(chatId: string): string {
  return createHmac('sha256', getTelegramBotToken()).update(chatId).digest('hex');
}

export function assertTelegramChatSignature(chatId: string, signature: string): void {
  const expected = Buffer.from(signTelegramChatId(chatId), 'hex');
  const actual = Buffer.from(signature, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Telegram destination is not connected');
  }
}

export async function telegramApi<T>(
  method: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${TELEGRAM_API}/bot${getTelegramBotToken()}/${method}`, {
    method: payload ? 'POST' : 'GET',
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: 'no-store',
  });
  const data = await response.json() as { ok: boolean; result?: T; description?: string };
  if (!response.ok || !data.ok || data.result === undefined) {
    throw new Error(data.description ?? `Telegram API failed: ${response.status}`);
  }
  return data.result;
}

export async function ensureTelegramWebhook(origin: string): Promise<void> {
  await telegramApi<boolean>('setWebhook', {
    url: `${origin}/api/telegram/webhook`,
    secret_token: telegramWebhookSecret(),
    allowed_updates: ['message', 'my_chat_member'],
  });
}

export async function getTelegramBotUsername(): Promise<string> {
  const bot = await telegramApi<{ username?: string }>('getMe');
  if (!bot.username) throw new Error('Telegram bot has no username');
  return bot.username;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  await telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}
