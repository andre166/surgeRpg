import { describe, it, expect } from 'vitest';
import { expForLevel } from '../core/progression/expTable.js';

// Hand-derived from Game.as GameDataVar (see docs/reverse-engineering-mapping.md).
describe('expForLevel (Game.as OneExpTable)', () => {
  it('matches the seeded first ten entries', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(expForLevel)).toEqual([3, 3, 4, 4, 6, 6, 6, 8, 8, 8]);
  });

  it('applies the divisibility bumps incrementally', () => {
    expect(expForLevel(10)).toBe(8); // no bump
    expect(expForLevel(12)).toBe(8); // %3 -> int(12*0.02)=0
    expect(expForLevel(13)).toBe(12); // %13 -> +4
    expect(expForLevel(14)).toBe(14); // %7 -> +2
    expect(expForLevel(15)).toBe(15); // %3 -> 0, %15 -> +1
    expect(expForLevel(21)).toBe(expForLevel(20) + 6); // %21 -> +6 (before %7/%3)
    expect(expForLevel(50)).toBe(expForLevel(49) + 20 + 0); // %50 -> +20 (50%3!=0, 50%7!=0, 50%13!=0...)
    expect(expForLevel(100)).toBe(expForLevel(99) + 20 + 150); // %50 and %100
    expect(expForLevel(200)).toBe(expForLevel(199) + 20 + 300); // %50 and %200
    expect(expForLevel(3000)).toBe(expForLevel(2999) + 60 + 400 + 200 + 20 + 300 + 1); // %3, %3000, %500, %50, %200, %15
  });

  it('is monotonic non-decreasing across the whole table', () => {
    let prev = 0;
    for (let i = 0; i < 125100; i += 1) {
      const v = expForLevel(i);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('uses the closed form at and beyond 125000', () => {
    const l = 130000;
    expect(expForLevel(l)).toBe(Math.floor(l * (l * 0.0022385 + 6.35)));
  });
});
