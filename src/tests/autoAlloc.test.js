import { describe, it, expect } from 'vitest';
import { splitPoints, autoAllocOf, cleanWeight, weightPercents, snapPercent, percentTotal, toPercents } from '../core/progression/autoAlloc.js';

const sum = (s) => s.hp + s.atk + s.def + s.speed + s.luck;

describe('auto stat distribution', () => {
  it('splits points by weight', () => {
    expect(splitPoints(100, { hp: 1, atk: 1, def: 0, speed: 0, luck: 0 })).toEqual({ hp: 50, atk: 50, def: 0, speed: 0, luck: 0 });
    expect(splitPoints(10, { atk: 3, speed: 1 })).toEqual({ hp: 0, atk: 8, def: 0, speed: 2, luck: 0 });
  });

  it('always hands out exactly the available points', () => {
    for (const p of [1, 2, 7, 99, 1001, 9999999]) {
      const s = splitPoints(p, { hp: 3, atk: 5, def: 2, speed: 7, luck: 1 });
      expect(sum(s)).toBe(p);
    }
  });

  it('leftovers go only to stats with a weight', () => {
    const s = splitPoints(5, { hp: 1, atk: 1, def: 1 });
    expect(sum(s)).toBe(5);
    expect(s.speed + s.luck).toBe(0);
  });

  it('stages nothing without weights or points', () => {
    expect(sum(splitPoints(50, {}))).toBe(0);
    expect(sum(splitPoints(0, { hp: 1 }))).toBe(0);
  });

  it('cleans weights and defaults missing settings', () => {
    expect(cleanWeight('12')).toBe(12);
    expect(cleanWeight(-3)).toBe(0);
    expect(cleanWeight('abc')).toBe(0);
    expect(autoAllocOf({})).toEqual({ on: false, weights: { hp: 0, atk: 0, def: 0, speed: 0, luck: 0 } });
    expect(autoAllocOf({ autoAlloc: { on: true, weights: { atk: '4' } } }).weights.atk).toBe(4);
  });

  it('snaps percentages to steps of 5 within 0..100', () => {
    expect(snapPercent(12)).toBe(10);
    expect(snapPercent(13)).toBe(15);
    expect(snapPercent(-5)).toBe(0);
    expect(snapPercent(140)).toBe(100);
    expect(snapPercent('x')).toBe(0);
  });

  it('sums percentages and converts old weights', () => {
    expect(percentTotal({ hp: 25, atk: 75 })).toBe(100);
    expect(toPercents({ hp: 25, atk: 75 })).toEqual({ hp: 25, atk: 75, def: 0, speed: 0, luck: 0 });
    expect(toPercents({ hp: 1, atk: 3 })).toEqual({ hp: 25, atk: 75, def: 0, speed: 0, luck: 0 });
  });

  it('shows percents', () => {
    expect(weightPercents({ hp: 1, atk: 3 })).toMatchObject({ hp: 25, atk: 75, def: 0 });
  });
});
