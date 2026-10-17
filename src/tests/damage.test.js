import { describe, it, expect } from 'vitest';
import { rollPlayerDamage, rollEnemyDamage, deathGuardChance, drainAmount, comboChance, healCost } from '../core/battle/damage.js';
import { createSequenceRng } from '../core/rng/rng.js';

describe('rollPlayerDamage (Battle.as myGetDameSkNumFunc)', () => {
  it('non-critical hit: damage = atk minus derived enemy defense, x0.88, no spread when rng=0.5', () => {
    // rng sequence: crit roll (0.9 > critRate -> no crit), motion, def jitter, spread1, spread2
    const rng = createSequenceRng([0.9, 0, 0, 0.5, 0.5]);
    const r = rollPlayerDamage(
      { atk: 100, critRate: 0.1, hpRatio: 1, hitsDone: 0, forcedCritHits: 0, critDamageMultiplier: 1, enemyPoint: 50, enemyMaxHp: 500, hardMode: false },
      rng,
    );
    // def: 50 -> (50<=100 so no blend) -> int(50*0.3)=15 ; 15 < 32 ; def = int(15 + 0*1 + 1) = 16 ; 16 < 44
    // dmg = (100-16)*0.88 = 73.92 ; + 0.5*73.92*0.2 - 7.392 + 2 - 2 = 73.92 ; floor -> 73
    expect(r.critical).toBe(false);
    expect(r.damage).toBe(73);
  });

  it('critical hit uses (atk+1)*(1.75+tier/5)*critMul+4', () => {
    // crit roll 0 (<= critRate), tier roll 0 -> tier 0, def jitter 0, spread 0.5, 0.5
    const rng = createSequenceRng([0, 0, 0, 0.5, 0.5]);
    const r = rollPlayerDamage(
      { atk: 100, critRate: 0.1, hpRatio: 1, hitsDone: 0, forcedCritHits: 0, critDamageMultiplier: 1, enemyPoint: 0, enemyMaxHp: 500, hardMode: false },
      rng,
    );
    // base = 101*1.75+4 = 180.75 ; def = 0 ; *0.88 = 159.06 ; floor 159
    expect(r.critical).toBe(true);
    expect(r.motion).toBe(5);
    expect(r.damage).toBe(159);
  });

  it('forced critical hits apply to the first N player turns', () => {
    const rng = createSequenceRng([0.99, 0, 0, 0.5, 0.5]);
    const r = rollPlayerDamage(
      { atk: 10, critRate: 0.05, hpRatio: 1, hitsDone: 1, forcedCritHits: 2, critDamageMultiplier: 1, enemyPoint: 0, enemyMaxHp: 50, hardMode: false },
      rng,
    );
    expect(r.critical).toBe(true);
  });

  it('never deals 0 or negative damage', () => {
    const rng = createSequenceRng([0.9, 0, 0.99, 0, 0, 0.5]);
    const r = rollPlayerDamage(
      { atk: 1, critRate: 0.05, hpRatio: 1, hitsDone: 0, forcedCritHits: 0, critDamageMultiplier: 1, enemyPoint: 100000, enemyMaxHp: 50, hardMode: false },
      rng,
    );
    expect(r.damage).toBeGreaterThanOrEqual(1);
  });
});

describe('rollEnemyDamage (Battle.as eneGetDameSkNumFunc)', () => {
  it('base = (2a + 12(a - def/2)) / 14 when above the floors', () => {
    const rng = createSequenceRng([0.5, 0.5, 0]);
    const r = rollEnemyDamage({ enemyAtk: 100, def: 40, playerMaxHp: 1000 }, rng);
    // d = (200 + 12*80)/14 = 82.857 ; spread with 0.5 -> +0 ; + 0*2.25 + 0.25 = 83.107 -> 83
    expect(r.damage).toBe(83);
  });

  it('blends toward 50%/30%/20%/10% floors when defense is high', () => {
    const rng = createSequenceRng([0.5, 0.5, 0]);
    const r = rollEnemyDamage({ enemyAtk: 100, def: 1000, playerMaxHp: 1000 }, rng);
    // d = (200 + 12*(100-500))/14 = -328.57
    // <50 -> (50-328.57)/2 = -139.29 ; <30 -> (90-139.29)/4 = -12.32 ; <20 -> (100-12.32)/6 = 14.61 ; <10? no
    // + 0.25 = 14.86 -> 14
    expect(r.damage).toBe(14);
  });
});

describe('helpers', () => {
  it('deathGuardChance encodes ones + tens*10', () => {
    expect(deathGuardChance(0)).toBe(0);
    expect(deathGuardChance(1)).toBeCloseTo(0.45);
    expect(deathGuardChance(10)).toBeCloseTo(0.45 + 0.02);
    expect(deathGuardChance(11)).toBeCloseTo(0.62 + 0.02);
  });
  it('drain amounts', () => {
    expect(drainAmount(100, { drainSmall: true, drain: false })).toBe(Math.floor(100 * 0.0198 + 1));
    expect(drainAmount(100, { drainSmall: false, drain: true })).toBe(Math.floor(100 * 0.039 + 1));
    expect(drainAmount(100, { drainSmall: false, drain: false })).toBe(0);
  });
  it('combo chance low-HP bonus and cap', () => {
    expect(comboChance(0.3, 1)).toBe(0.3);
    expect(comboChance(0.3, 0.2)).toBeCloseTo(0.43);
    expect(comboChance(0.75, 0.2)).toBe(0.8);
  });
  it('heal cost = g/2 + maxHp/2 + 3000', () => {
    expect(healCost(10000, 500)).toBe(8250);
  });
});
