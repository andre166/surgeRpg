import { describe, it, expect } from 'vitest';
import { gaugeIncrement, advanceGauge, checkpointChance } from '../core/encounters/gauge.js';
import { weightedPick } from '../core/encounters/weighted.js';
import { encodeBonus, bonusType, bonusCharges, decrementBonuses, spawnBonusesAfterWin } from '../core/encounters/bonus.js';
import { rollEventBoss, scaledBossGold } from '../core/encounters/eventBoss.js';
import { createSequenceRng, createSeededRng } from '../core/rng/rng.js';
import { bossWinTeleport } from '../core/world/world.js';

describe('gauge', () => {
  it('base increment by danger level with equipment multiplier and clamp', () => {
    expect(gaugeIncrement(4)).toBeCloseTo(0.98);
    expect(gaugeIncrement(0)).toBeCloseTo(0.58);
    expect(gaugeIncrement(-2)).toBeCloseTo(0.32);
    // multiplier 0.85 (one "quiet step" charm): (0.58 - 0.15) * 0.85
    expect(gaugeIncrement(0, 0.85)).toBeCloseTo((0.58 - 0.15) * 0.85);
    expect(gaugeIncrement(-2, 0.4)).toBe(0.15);
    expect(gaugeIncrement(4, 1.4)).toBe(0.999);
  });
  it('checkpoint chances follow (p^2 + p^3) / 2.2', () => {
    expect(checkpointChance(50)).toBeCloseTo(0.1705, 3);
    expect(checkpointChance(90)).toBeCloseTo((0.81 + 0.729) / 2.2, 6);
    expect(checkpointChance(5)).toBe(0);
  });
  it('a battle is forced at 100 and only rolled on checkpoints', () => {
    const r1 = advanceGauge(99.5, 4, 1, createSequenceRng([0.99]));
    expect(r1.battle).toBe(true);
    const r2 = advanceGauge(9.5, 4, 1, createSequenceRng([0.0])); // crosses 10 -> chance 0.5% ; rng 0 -> 0 < 0.0055 ... 0.5*0.01+0.5*0.001 = 0.0055 > 0*1.1 -> battle
    expect(r2.battle).toBe(true);
    const r3 = advanceGauge(9.5, 4, 1, createSequenceRng([0.9]));
    expect(r3.battle).toBe(false);
    const r4 = advanceGauge(10.5, 4, 1, createSequenceRng([0.0])); // 11 is not a checkpoint
    expect(r4.battle).toBe(false);
  });
});

describe('weightedPick', () => {
  it('uses int(sum*rand+0.5) with cumulative comparison', () => {
    const w = [10, 10, 10];
    expect(weightedPick(w, createSequenceRng([0]))).toBe(0); // r = 0 -> first
    expect(weightedPick(w, createSequenceRng([0.34]))).toBe(0); // r = int(10.2+0.5) = 10 -> acc 10 >= 10 -> idx 0
    expect(weightedPick(w, createSequenceRng([0.4]))).toBe(1); // r = int(12.5) = 12 -> idx 1
    expect(weightedPick(w, createSequenceRng([0.99]))).toBe(2);
  });
  it('edge: exactly at a boundary picks the lower bucket', () => {
    expect(weightedPick([10, 10], createSequenceRng([0.5]))).toBe(0); // r = int(10.5) = 10 -> acc 10 >= 10 -> 0
    expect(weightedPick([10, 10], createSequenceRng([0.51]))).toBe(0); // r = int(10.7) = 10
    expect(weightedPick([10, 10], createSequenceRng([0.56]))).toBe(1); // r = int(11.7) = 11
  });
});

describe('bonus encoding', () => {
  it('type*10 + charges', () => {
    expect(encodeBonus(2, 5)).toBe(25);
    expect(bonusType(25)).toBe(2);
    expect(bonusCharges(25)).toBe(5);
    expect(bonusType(0)).toBe(-1);
  });
  it('decrement clears at zero', () => {
    expect(decrementBonuses([[25, 31, 0]])).toEqual([[24, 0, 0]]);
  });
  it('spawn never overwrites an existing bonus', () => {
    const rng = createSeededRng(4);
    for (let i = 0; i < 100; i += 1) {
      const out = spawnBonusesAfterWin({ bonuses: [25, 0, 0, 0, 0, 0], currentIndex: 0, areaLevels: [1, 25, 72, 172, 300, 710], battlesUsed: 1, gameOverCount: 0, hardMode: false, mapId: 1 }, rng);
      expect(out[0]).toBe(25);
      for (const v of out) if (v) expect(bonusCharges(v)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('event bosses', () => {
  it('type 9 gives 32..35 with 40% chance', () => {
    expect(rollEventBoss({ bonusType: 9, areaLevel: 1000, hardMode: false, bossesSeen: {} }, createSequenceRng([0.1, 0.99]))).toBe(35);
    expect(rollEventBoss({ bonusType: 9, areaLevel: 1000, hardMode: false, bossesSeen: {} }, createSequenceRng([0.5]))).toBe(-1);
  });
  it('white room decoy unless the real boss was seen or enough weapons are owned', () => {
    const base = { bonusType: 12, areaLevel: 5000, hardMode: false, weaponKindsOwned: 0, armorKindsOwned: 0, weaponKindsInMode: 57, armorKindsInMode: 23 };
    expect(rollEventBoss({ ...base, bossesSeen: {} }, createSequenceRng([0]))).toBe(61);
    expect(rollEventBoss({ ...base, bossesSeen: { 60: 1 } }, createSequenceRng([0]))).toBe(60);
    expect(rollEventBoss({ ...base, bossesSeen: {}, weaponKindsOwned: 40 }, createSequenceRng([0]))).toBe(60);
  });
  it('bosses 40..42 have level-scaled gold', () => {
    expect(scaledBossGold(40, 1000, false)).toBe(15000 + 1000 * 5);
    // L: 20000 -> (60000+15000)/5 = 15000 -> (15000+40000)/5 = 11000 -> not > 15000
    expect(scaledBossGold(42, 20000, false)).toBe(77777 + 11000 * 10);
  });
  it('boss 8 teleports to one of four maps', () => {
    const dests = new Set();
    const rng = createSeededRng(2);
    for (let i = 0; i < 50; i += 1) dests.add(bossWinTeleport(8, rng).map);
    expect([...dests].sort()).toEqual([17, 18, 28, 50]);
    expect(bossWinTeleport(60, rng).room).toBe('white');
    expect(bossWinTeleport(1, rng)).toBeNull();
  });
});
