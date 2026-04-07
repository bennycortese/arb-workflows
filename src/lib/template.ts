export function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  );
}

export const PREVIEW_VARS: Record<string, string> = {
  market: 'Fed rate cut June',
  price: '72¢',
  threshold: '65¢',
  direction: 'above',
  platform: 'Polymarket',
  url: 'https://polymarket.com/event/fed-rate-cut-june',
};
