import { describe, it, expect } from 'vitest';
import { fillTemplate } from '../template';

describe('fillTemplate', () => {
  it('substitutes a single variable', () => {
    expect(fillTemplate('Hello {{name}}', { name: 'world' })).toBe('Hello world');
  });

  it('substitutes multiple different variables', () => {
    const result = fillTemplate('{{market}} hit {{price}} (threshold: {{threshold}})', {
      market: 'TICKER-A',
      price: '50¢',
      threshold: '45¢',
    });
    expect(result).toBe('TICKER-A hit 50¢ (threshold: 45¢)');
  });

  it('substitutes all occurrences of the same variable', () => {
    const result = fillTemplate('{{market}} is {{market}}', { market: 'TICKER' });
    expect(result).toBe('TICKER is TICKER');
  });

  it('leaves unknown variables untouched', () => {
    const result = fillTemplate('{{market}} {{unknown}}', { market: 'TICKER' });
    expect(result).toBe('TICKER {{unknown}}');
  });

  it('returns the template unchanged when vars is empty', () => {
    expect(fillTemplate('{{market}} hit {{price}}', {})).toBe('{{market}} hit {{price}}');
  });

  it('handles the full set of notification variables', () => {
    const vars = {
      platform: 'Kalshi',
      market: 'TICKER-A',
      price: '50¢',
      threshold: '45¢',
      direction: 'above',
      url: 'https://kalshi.com/markets/TICKER-A',
    };
    const template = '{{platform}}: {{market}} at {{price}} (above {{threshold}})\n{{url}}';
    const result = fillTemplate(template, vars);
    expect(result).toBe(
      'Kalshi: TICKER-A at 50¢ (above 45¢)\nhttps://kalshi.com/markets/TICKER-A'
    );
  });
});
