import { describe, it, expect } from 'vitest';
import { fmtShort } from '../ui/components/format.js';

describe('fmtShort (HUD gold: at most 5 digits and a letter)', () => {
  it('keeps numbers under 100,000 whole', () => {
    expect(fmtShort(0)).toBe('0');
    expect(fmtShort(84200)).toBe('84,200');
    expect(fmtShort(99999)).toBe('99,999');
  });

  it('uses the smallest suffix that keeps 5 digits', () => {
    expect(fmtShort(100000)).toBe('100K');
    expect(fmtShort(99999999)).toBe('99,999K');
    expect(fmtShort(100000000)).toBe('100M');
    expect(fmtShort(60290000000)).toBe('60,290M');
    expect(fmtShort(123456789012)).toBe('123B');
    expect(fmtShort(5e16)).toBe('50,000T');
    expect(fmtShort(5e19)).toBe('50,000Q');
  });

  it('never shows more than 5 digits', () => {
    for (let e = 0; e < 20; e += 1) {
      const out = fmtShort(7.77 * 10 ** e);
      expect(out.replace(/[^0-9]/g, '').length).toBeLessThanOrEqual(5);
    }
  });

  it('handles negatives, bad input and huge values', () => {
    expect(fmtShort(-250000)).toBe('-250K');
    expect(fmtShort(null)).toBe('-');
    expect(fmtShort(1e24)).toMatch(/e+/);
  });
});
