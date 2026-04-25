export interface ThresholdResult {
  shouldNotify: boolean;  // price just crossed into zone — notify
  shouldReset: boolean;   // price just left zone — re-arm for next crossing
}

export function checkThreshold(
  price: number,
  config: { priceThreshold: string; direction: string },
  state: { threshold_triggered: boolean } | null
): ThresholdResult {
  const threshold = parseFloat(config.priceThreshold ?? '0.5');
  const direction = config.direction ?? 'any';
  const alreadyTriggered = state?.threshold_triggered ?? false;

  const inZone =
    direction === 'any' ||
    (direction === 'above' && price >= threshold) ||
    (direction === 'below' && price <= threshold);

  return {
    shouldNotify: inZone && !alreadyTriggered,
    shouldReset:  !inZone && alreadyTriggered,
  };
}
