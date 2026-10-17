import { describe, it, expect } from 'vitest';
import {
  TALENTS, TALENT_BRANCHES, createTalents, talentCost, talentBuyStatus, buyTalent, resetTalents, talentPercents,
  earnTalentPoints, heroTalents, setHeroTalents,
} from '../core/progression/talents.js';
import { computeStats } from '../core/attributes/stats.js';
import { createProfile } from '../core/persistence/profile.js';
import { commitGameOver } from '../core/session/session.js';

const rich = () => earnTalentPoints(createTalents(), 100000);

describe('talent tree', () => {
  it('has 5 branches with 5 talents each', () => {
    expect(TALENT_BRANCHES).toEqual(['atk', 'def', 'speed', 'hp', 'luck']);
    for (const b of TALENT_BRANCHES) expect(TALENTS.filter((t) => t.branch === b).length).toBe(5);
  });
  it('costs grow per rank and stop at max rank', () => {
    expect(talentCost('atk1', 0)).toBe(1);
    expect(talentCost('atk1', 5)).toBe(Math.ceil(1.35 ** 5));
    expect(talentCost('atk5', 3)).toBeNull();
  });
  it('a talent unlocks when the one above reaches rank 3', () => {
    let t = rich();
    expect(talentBuyStatus(t, 'atk2')).toBe('locked');
    t = buyTalent(buyTalent(t, 'atk1'), 'atk1');
    expect(talentBuyStatus(t, 'atk2')).toBe('locked');
    t = buyTalent(t, 'atk1');
    expect(talentBuyStatus(t, 'atk2')).toBe('ok');
  });
  it('needs enough points, and reset refunds everything', () => {
    let t = earnTalentPoints(createTalents(), 3);
    t = buyTalent(t, 'def1'); // 1
    t = buyTalent(t, 'def1'); // 2 (ceil 1.35)
    expect(t.points).toBe(0);
    expect(talentBuyStatus(t, 'def1')).toBe('no-points');
    const back = resetTalents(t);
    expect(back.points).toBe(3);
    expect(back.ranks).toEqual({});
  });
  it('percent bonuses feed computeStats', () => {
    let t = rich();
    for (let i = 0; i < 10; i += 1) t = buyTalent(t, 'atk1');
    expect(talentPercents(t).atk).toBeCloseTo(0.2);
    const base = { hp: 100, atk: 100, def: 10, speed: 5, luck: 1 };
    const without = computeStats({ base, equipment: null, character: { index: 0 } });
    const withT = computeStats({ base, equipment: null, character: { index: 0 }, talentPct: talentPercents(t) });
    expect(withT.total.atk - without.total.atk).toBeCloseTo(20);
  });
  it('game over no longer grants TP (only slime kings do)', () => {
    const p = createProfile();
    const run = { level: 1000, inventory: p.inventory, slots: p.slots, characterIndex: 0, base: { hp: 1, atk: 1, def: 1, speed: 1, luck: 1 } };
    expect(heroTalents(commitGameOver(run, p), 0).points).toBe(0);
  });
  it('talents belong to a hero', () => {
    let p = createProfile();
    p = setHeroTalents(p, 3, buyTalent(earnTalentPoints(createTalents(), 5), 'atk1'));
    expect(heroTalents(p, 3).ranks.atk1).toBe(1);
    expect(heroTalents(p, 3).points).toBe(4);
    expect(heroTalents(p, 0)).toEqual(createTalents());
  });
});
