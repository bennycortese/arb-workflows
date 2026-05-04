import { describe, it, expect } from 'vitest';
import { checkThreshold } from '../threshold';

describe('checkThreshold', () => {
  describe('direction: above', () => {
    const config = { priceThreshold: '0.45', direction: 'above' };

    it('does not notify when price is below threshold and no prior state', () => {
      const result = checkThreshold(0.40, config, null);
      expect(result).toEqual({ shouldNotify: false, shouldReset: false });
    });

    it('notifies on first crossing above threshold', () => {
      const result = checkThreshold(0.50, config, null);
      expect(result).toEqual({ shouldNotify: true, shouldReset: false });
    });

    it('treats price at exactly the threshold as in-zone (>=)', () => {
      const result = checkThreshold(0.45, config, null);
      expect(result).toEqual({ shouldNotify: true, shouldReset: false });
    });

    it('does not re-notify when price stays above threshold (anti-spam)', () => {
      const result = checkThreshold(0.50, config, { threshold_triggered: true });
      expect(result).toEqual({ shouldNotify: false, shouldReset: false });
    });

    it('does not re-notify even when price rises further above threshold', () => {
      const result = checkThreshold(0.75, config, { threshold_triggered: true });
      expect(result).toEqual({ shouldNotify: false, shouldReset: false });
    });

    it('resets when price drops back below threshold after being triggered', () => {
      const result = checkThreshold(0.40, config, { threshold_triggered: true });
      expect(result).toEqual({ shouldNotify: false, shouldReset: true });
    });

    it('notifies again after reset (re-arm works)', () => {
      const result = checkThreshold(0.50, config, { threshold_triggered: false });
      expect(result).toEqual({ shouldNotify: true, shouldReset: false });
    });

    it('does not reset when price is still below and was never triggered', () => {
      const result = checkThreshold(0.40, config, { threshold_triggered: false });
      expect(result).toEqual({ shouldNotify: false, shouldReset: false });
    });
  });

  describe('direction: below', () => {
    const config = { priceThreshold: '0.45', direction: 'below' };

    it('does not notify when price is above threshold', () => {
      const result = checkThreshold(0.50, config, null);
      expect(result).toEqual({ shouldNotify: false, shouldReset: false });
    });

    it('notifies on first crossing below threshold', () => {
      const result = checkThreshold(0.40, config, null);
      expect(result).toEqual({ shouldNotify: true, shouldReset: false });
    });

    it('does not re-notify when price stays below threshold', () => {
      const result = checkThreshold(0.40, config, { threshold_triggered: true });
      expect(result).toEqual({ shouldNotify: false, shouldReset: false });
    });

    it('resets when price rises back above threshold', () => {
      const result = checkThreshold(0.50, config, { threshold_triggered: true });
      expect(result).toEqual({ shouldNotify: false, shouldReset: true });
    });
  });

  describe('direction: any', () => {
    const config = { priceThreshold: '0.45', direction: 'any' };

    it('always notifies when not yet triggered, regardless of price', () => {
      expect(checkThreshold(0.10, config, null).shouldNotify).toBe(true);
      expect(checkThreshold(0.90, config, null).shouldNotify).toBe(true);
    });

    it('does not re-notify when already triggered', () => {
      const result = checkThreshold(0.50, config, { threshold_triggered: true });
      expect(result).toEqual({ shouldNotify: false, shouldReset: false });
    });
  });

  describe('user scenario: price moves 40¢ → 50¢, threshold 45¢', () => {
    // Simulates the exact anti-spam case the user described.
    // The system should notify once when crossing 45¢, not on every poll.
    const config = { priceThreshold: '0.45', direction: 'above' };

    it('full state machine sequence', () => {
      // Step 1: Price at 40¢ — below threshold, quiet
      const s1 = checkThreshold(0.40, config, null);
      expect(s1.shouldNotify).toBe(false);
      expect(s1.shouldReset).toBe(false);
      let state = { threshold_triggered: false };

      // Step 2: Price rises to 50¢ — crosses above 45¢, NOTIFY
      const s2 = checkThreshold(0.50, config, state);
      expect(s2.shouldNotify).toBe(true);
      expect(s2.shouldReset).toBe(false);
      state = { threshold_triggered: true };

      // Step 3: Price stays at 50¢ — still above threshold, NO spam
      const s3 = checkThreshold(0.50, config, state);
      expect(s3.shouldNotify).toBe(false);
      expect(s3.shouldReset).toBe(false);

      // Step 4: Price climbs to 55¢ — still above, NO spam
      const s4 = checkThreshold(0.55, config, state);
      expect(s4.shouldNotify).toBe(false);
      expect(s4.shouldReset).toBe(false);

      // Step 5: Price drops to 40¢ — exits zone, RESET (re-arms for next crossing)
      const s5 = checkThreshold(0.40, config, state);
      expect(s5.shouldNotify).toBe(false);
      expect(s5.shouldReset).toBe(true);
      state = { threshold_triggered: false };

      // Step 6: Price rises to 50¢ again — crosses above 45¢, NOTIFY AGAIN
      const s6 = checkThreshold(0.50, config, state);
      expect(s6.shouldNotify).toBe(true);
      expect(s6.shouldReset).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles null state as never triggered', () => {
      const result = checkThreshold(0.50, { priceThreshold: '0.45', direction: 'above' }, null);
      expect(result.shouldNotify).toBe(true);
    });

    it('direction defaults to any only for null/undefined — empty string is not in-zone', () => {
      // ?? only catches null/undefined, not ''. An empty direction string
      // matches none of the 'any'/'above'/'below' branches → never in-zone.
      const result = checkThreshold(0.50, { priceThreshold: '0.45', direction: '' }, null);
      expect(result.shouldNotify).toBe(false);
    });

    it('priceThreshold defaults to 0.5 only for null/undefined — empty string yields NaN', () => {
      // ?? only catches null/undefined, not ''. parseFloat('') === NaN,
      // so comparisons like price >= NaN are always false → never in-zone.
      const result = checkThreshold(0.60, { priceThreshold: '', direction: 'above' }, null);
      expect(result.shouldNotify).toBe(false);
    });
  });
});
