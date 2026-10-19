import { describe, it, expect } from 'vitest';
import { computeStats } from '../core/attributes/stats.js';
import { heroPassive, heroPassivePct, characterPowerWeights } from '../core/attributes/characterPower.js';
import { EFFECT } from '../core/attributes/effects.js';

const base = { hp: 100, atk: 10, def: 10, speed: 5, luck: 1 };

describe('computeStats (GData.as EqStUpdate)', () => {
  it('no equipment, no ability: totals equal base and shares use int parts', () => {
    const s = computeStats({ base, equipment: null, character: { index: 0, abilityLevel: 0, currentAbilityLevel: 0 } });
    expect(s.total).toEqual(base);
    // parts: 100/5=20, 10/3=3, 10/3=3, 5/2=2, 1 -> 29
    expect(s.speedShare).toBeCloseTo(2 / 29);
    expect(s.luckShare).toBeCloseTo(1 / 29);
    expect(s.modifiers.maxBattlePoints).toBe(30);
  });

  it('weapon plus/multi: eatk = plus + (plus + atk) * multi%', () => {
    const s = computeStats({ base, equipment: { weapon: { plus: 5, multi: 20 }, armor: null, accessories: [] }, character: { index: 0 } });
    expect(s.total.atk).toBeCloseTo(10 + 5 + 15 * 0.2);
  });

  it('accessory effects accumulate and set modifiers', () => {
    const s = computeStats({
      base,
      equipment: {
        weapon: null,
        armor: null,
        accessories: [
          { effect: EFFECT.HP_PLUS, value: 50 },
          { effect: EFFECT.ALL_PLUS, value: 2 },
          { effect: EFFECT.EXP_PERCENT, value: 25 },
          { effect: EFFECT.STAT_POINT_PLUS_1 },
          { effect: EFFECT.STAT_POINT_PLUS_2 },
          { effect: EFFECT.CRIT_RATE_PLUS },
          { effect: EFFECT.FIRST_HITS_CRIT_1 },
          { effect: EFFECT.FIRST_HITS_CRIT_3 },
          { effect: EFFECT.MAX_BATTLE_POINTS_PLUS, value: 5 },
          { effect: EFFECT.DEATH_GUARD_1 },
          { effect: EFFECT.DEATH_GUARD_10 },
        ],
      },
      character: { index: 0 },
    });
    expect(s.total.hp).toBe(152);
    expect(s.total.atk).toBe(12);
    expect(s.modifiers.expMultiplier).toBeCloseTo(1.25);
    expect(s.modifiers.extraStatPoints).toBe(2);
    expect(s.modifiers.critRatePlus).toBeCloseTo(0.08);
    expect(s.modifiers.forcedCritHits).toBe(3);
    expect(s.modifiers.maxBattlePoints).toBe(35);
    expect(s.modifiers.deathGuard).toBe(11);
  });

  it('character ability multiplies by row/column weights', () => {
    // character 0: atk 2, speed 2 ; abilityLevel 1, current 0 -> f = (1*0.25+0.75) = 1
    const s = computeStats({ base, equipment: null, character: { index: 0, abilityLevel: 1, currentAbilityLevel: 0 } });
    expect(s.total.atk).toBeCloseTo(10 + 10 * 2 * 0.07);
    expect(s.total.speed).toBeCloseTo(5 + 5 * 2 * 0.075);
    expect(s.total.hp).toBe(100);
  });

  it('play gem scales with finished runs and can be nullified for a battle', () => {
    const eq = { weapon: null, armor: null, accessories: [{ effect: EFFECT.PLAY_GEM, value: 2 }] };
    const on = computeStats({ base, equipment: eq, character: { index: 0 }, playGem: { gameOverCount: 5, nullified: false } });
    expect(on.total.atk).toBe(10 + 5 * 17);
    expect(on.total.def).toBe(10 + 5 * 17);
    expect(on.total.speed).toBe(5 + 5 * 12);
    const off = computeStats({ base, equipment: eq, character: { index: 0 }, playGem: { gameOverCount: 5, nullified: true } });
    expect(off.total.atk).toBe(10);
    const v3 = computeStats({ base, equipment: eq.accessories && { ...eq, accessories: [{ effect: EFFECT.PLAY_GEM, value: 3 }] }, character: { index: 0 }, playGem: { gameOverCount: 2 } });
    expect(v3.total.atk).toBe(10 + 80);
    expect(v3.total.speed).toBe(5 + 60);
  });

  it('hard mode lowers max battle points to 10', () => {
    const s = computeStats({ base, equipment: null, character: { index: 0 }, hardMode: true });
    expect(s.modifiers.maxBattlePoints).toBe(10);
  });
});

describe('hero passives', () => {
  it('every hero has one distinct named passive on one of its affinity stats', () => {
    const ids = new Set();
    for (let i = 0; i < 16; i += 1) {
      const p = heroPassive(i);
      expect(characterPowerWeights(i)[p.stat], `hero ${i}`).toBeGreaterThan(0);
      expect(p.pct).toBeCloseTo(0.01);
      expect(heroPassivePct(i)).toEqual({ [p.stat]: p.pct });
      ids.add(p.id);
    }
    expect(ids.size).toBe(16);
  });

  it('heroPct adds to the stat percents', () => {
    const s = computeStats({ base, equipment: null, character: { index: 0, abilityLevel: 0, currentAbilityLevel: 0 }, heroPct: heroPassivePct(0) });
    expect(s.bonusPercent.atk).toBe(0);
    expect(s.bonusPercent.speed).toBeCloseTo(0.01);
  });
});
