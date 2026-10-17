import { describe, it, expect } from 'vitest';
import { enemyPoint, rateDivisor, battleRates } from '../core/battle/rates.js';

describe('enemyPoint (BattleVar.as enePointGet)', () => {
  it('truncates to int at each step', () => {
    // hp 150 atk 20 exp 0 gold 100 -> 10 + 10 + 0 + 2 = 22 ; (44 + 3*10)/5 = 14.8 -> 14
    expect(enemyPoint({ hp: 150, atk: 20, exp: 0, gold: 100 }, 10)).toBe(14);
  });
  it('adds drop-tier bonuses then multiplies', () => {
    // base 14 ; +5 +10 = 29 ; *1.05 = 30.45 -> 30 ; *1.075 = 32.25 -> 32
    expect(enemyPoint({ hp: 150, atk: 20, exp: 0, gold: 100 }, 10, [true, true, false])).toBe(32);
  });
});

describe('rateDivisor', () => {
  it('uses the piecewise formula', () => {
    expect(rateDivisor(100)).toBe(Math.trunc((400 + 1000) / 6));
    expect(rateDivisor(800)).toBe(Math.trunc((3200 + 2000) / 6));
    expect(rateDivisor(1500)).toBe(Math.trunc((6000 + 4000) / 6));
    expect(rateDivisor(5000)).toBe(Math.trunc((15000 + 4000) / 5));
  });
});

describe('battleRates (BattleVar.as KakurituBairituGet)', () => {
  it('starting character vs a weak enemy', () => {
    // speed 5, luck 1, shares ~ from base stats 100/10/10/5/1 -> parts 20,3,3,2,1 sum 29
    const r = battleRates({ speed: 5, luck: 1, speedShare: 2 / 29, luckShare: 1 / 29 }, 14);
    const d = rateDivisor(14); // (56+1000)/6 = 176
    let combo = (5 / d) * 0.52 + 0.06 + (5 / 1500000) * 0.14 + (1 / 1000000) * 0.02 + (2 / 29) * 0.24;
    combo += (2 / 29) * 0.24;
    expect(r.comboRate).toBe(Math.trunc(combo * 100) / 100);
    let crit = (5 / d) * 0.07 + (1 / d) * 0.22 + 0.06 + (5 / 1500000) * 0.1 + (1 / 1000000) * 0.02 + (2 / 29) * 0.11 + (1 / 29) * 0.14;
    crit += (2 / 29) * 0.11 + (1 / 29) * 0.14;
    expect(r.critRate).toBe(Math.trunc(crit * 100) / 100);
    expect(r.goldMultiplier).toBe(1); // tiny luck -> rounded down to 1
  });

  it('caps: combo <= 0.5 before the second share bonus, crit <= 0.35, gold <= 4, item <= 3.5', () => {
    const r = battleRates({ speed: 1e9, luck: 1e9, speedShare: 0.5, luckShare: 0.5 }, 10);
    expect(r.comboRate).toBe(Math.trunc((0.5 + 0.5 * 0.24) * 100) / 100);
    expect(r.critRate).toBe(Math.trunc((0.35 + 0.5 * 0.11 + 0.5 * 0.14) * 100) / 100);
    expect(r.goldMultiplier).toBe(4);
    expect(r.itemRate).toBe(3.5);
  });
});
