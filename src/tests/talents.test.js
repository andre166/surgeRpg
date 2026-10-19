import { describe, it, expect } from 'vitest';
import {
  TALENTS, TALENT_BRANCHES, TALENT_MILESTONES, MILESTONE_BONUS, TP_MAX, talentRank, talentBonus, talentTotals, talentPassive,
  tpLevel, recordSlimeKingWin, slimeKingsFromBestiary,
} from '../core/progression/talents.js';
import { SLIME_IDS } from '../core/encounters/slimeBosses.js';
import { computeStats } from '../core/attributes/stats.js';
import { createProfile } from '../core/persistence/profile.js';

describe('talent tree', () => {
  it('has 4 branches (no vitality) with 3 talents each', () => {
    expect(TALENT_BRANCHES).toEqual(['atk', 'def', 'speed', 'luck']);
    for (const b of TALENT_BRANCHES) expect(TALENTS.filter((t) => t.branch === b).length).toBe(3);
    const per = Object.fromEntries(TALENTS.map((t) => [t.id, [t.effect, t.perRank]]));
    expect(per).toEqual({
      atk1: ['atk', 0.008], atk2: ['critRate', 0.006], atk3: ['hp', 0.007],
      def1: ['def', 0.009], def2: ['hp', 0.005], def3: ['luck', 0.008],
      speed1: ['move', 0.005], speed2: ['speed', 0.009], speed3: ['critDmg', 0.006],
      luck1: ['luck', 0.009], luck2: ['gold', 0.008], luck3: ['exp', 0.011],
    });
  });
  it('the TP level is the number of different Slime Kings beaten, shared by the account', () => {
    expect(TP_MAX).toBe(SLIME_IDS.length);
    let p = createProfile();
    expect(tpLevel(p)).toBe(0);
    let r = recordSlimeKingWin(p, 0);
    expect(r.levelUp).toBe(true);
    p = r.profile;
    r = recordSlimeKingWin(p, 0); // the same one again: no new level
    expect(r.levelUp).toBe(false);
    p = recordSlimeKingWin(r.profile, 3).profile;
    expect(tpLevel(p)).toBe(2);
    // older saves: from the bestiary
    expect(slimeKingsFromBestiary({ 'slime#2': { seen: 1, defeated: 1 }, 'slime#4': { seen: 1, defeated: 0 }, 'boss#0': { defeated: 1 } })).toEqual({ 2: 1 });
  });
  it('every talent of a bought tier has rank = TP level, up to its max rank', () => {
    expect(talentRank('atk1', 4)).toBe(4);
    expect(talentRank('atk3', 12)).toBe(10); // max rank 10
    expect(talentRank('atk4', 12)).toBe(0); // no fourth talent
    expect(talentRank('atk1', 4, 0)).toBe(0); // tier not bought
    expect(talentRank('atk2', 4, 1)).toBe(0);
    expect(talentRank('atk2', 4, 2)).toBe(4);
  });
  it('at TP 3, 6, 9 and 12 every active talent gains 0.3% more', () => {
    expect(TALENT_MILESTONES).toEqual([3, 6, 9, 12]);
    expect(MILESTONE_BONUS).toBe(0.003);
    expect(talentBonus('atk1', 2)).toBeCloseTo(0.016);
    expect(talentBonus('atk1', 3)).toBeCloseTo(0.024 + 0.003);
    expect(talentBonus('atk1', 6)).toBeCloseTo(0.048 + 0.006);
    expect(talentBonus('atk1', 10)).toBeCloseTo(0.08 + 0.009);
    expect(talentBonus('atk1', 12)).toBeCloseTo(0.08 + 0.012); // rank stays at 10, the last milestone still counts
    expect(talentBonus('atk1', 10, 0)).toBe(0); // locked tiers get no milestone bonus
  });
  it('stat percents and modifiers feed computeStats', () => {
    // only the first atk tier bought: atk1 at TP 5 = +4% ATK (+0.3% from the TP 3 milestone)
    const only = talentPassive(5, { atk: 1, def: 0, speed: 0, luck: 0 });
    expect(only.pct.atk).toBeCloseTo(0.043);
    expect(Object.keys(only.pct)).toEqual(['atk']);
    expect(only.mods).toEqual({});
    const base = { hp: 100, atk: 100, def: 10, speed: 5, luck: 1 };
    const without = computeStats({ base, equipment: null, character: { index: 0 } });
    const withT = computeStats({ base, equipment: null, character: { index: 0 }, talent: only });
    expect(withT.total.atk - without.total.atk).toBeCloseTo(4.3);
    // everything at TP 2: hp from two talents, the luck ones add up, modifiers on top
    const all = talentTotals(2);
    expect(all.hp).toBeCloseTo(0.024);
    expect(all.luck).toBeCloseTo(0.034);
    const full = computeStats({ base, equipment: null, character: { index: 0 }, talent: talentPassive(2) });
    expect(full.modifiers.critRatePlus - without.modifiers.critRatePlus).toBeCloseTo(0.012);
    expect(full.modifiers.critDamageMultiplier - without.modifiers.critDamageMultiplier).toBeCloseTo(0.012);
    expect(full.modifiers.goldBonus - without.modifiers.goldBonus).toBeCloseTo(0.016);
    expect(full.modifiers.expMultiplier - without.modifiers.expMultiplier).toBeCloseTo(0.022);
    expect(full.modifiers.moveSpeed / without.modifiers.moveSpeed).toBeCloseTo(1.01);
  });
});
