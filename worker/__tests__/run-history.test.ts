import { describe, expect, it } from 'vitest';
import { summarizeRun } from '../../src/lib/runHistory';

describe('run history summaries', () => {
  it('shows the actual error instead of an unrelated successful source result', () => {
    expect(summarizeRun('error', [
      { status: 'skip', message: 'Kalshi threshold not met' },
      { status: 'error', message: 'Polymarket market is no longer available' },
      { status: 'skip', message: 'Discord skipped' },
    ])).toBe('Polymarket market is no longer available');
  });

  it('summarizes successful results and falls back to the first detail', () => {
    expect(summarizeRun('success', [
      { status: 'ok', message: 'Telegram sent' },
      { status: 'ok', message: 'Email sent' },
    ])).toBe('Telegram sent · Email sent');

    expect(summarizeRun('success', [
      { status: 'skip', message: 'Threshold not met' },
    ])).toBe('Threshold not met');
  });
});
