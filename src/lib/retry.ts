const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit = {},
  attempts = 3,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, {
        ...init,
        signal: init.signal?.aborted
          ? AbortSignal.timeout(10_000)
          : (init.signal ?? AbortSignal.timeout(10_000)),
      });
      if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts - 1) {
        return response;
      }

      const retryAfter = Number(response.headers.get('retry-after'));
      await delay(Number.isFinite(retryAfter) ? retryAfter * 1000 : 300 * 2 ** attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
      await delay(300 * 2 ** attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.min(ms, 5000)));
}
