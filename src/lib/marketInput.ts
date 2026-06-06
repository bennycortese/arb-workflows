export function normalizeMarketIdentifier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const withoutQuery = trimmed.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  const segments = withoutQuery.split('/').filter(Boolean);
  const identifier = segments.at(-1) ?? withoutQuery;

  try {
    return decodeURIComponent(identifier);
  } catch {
    return identifier;
  }
}
