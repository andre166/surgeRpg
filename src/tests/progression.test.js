import { describe, it, expect } from 'vitest';
import { applyExp } from '../core/progression/levels.js';
import { expForLevel } from '../core/progression/expTable.js';
import { battlePointsLeft, onEncounterStart, onBattleWon, onBattleLost, bossBattlePointBonus } from '../core/progression/battlePoints.js';

describe('applyExp', () => {
  it('levels up repeatedly and carries the remainder, 4 stat points per level', () => {
    const run = { level: 1, exp: 0, statPoints: 0, hardMode: false };
    const need1 = expForLevel(1); // 3
    const need2 = expForLevel(2); // 4
    const r = applyExp(run, need1 + need2 + 1);
    expect(r.level).toBe(3);
    expect(r.exp).toBe(1);
    expect(r.levelsGained).toBe(2);
    expect(r.statPoints).toBe(8);
  });
  it('extra stat points from accessories', () => {
    const r = applyExp({ level: 1, exp: 0, statPoints: 0, hardMode: false }, expForLevel(1), 2);
    expect(r.statPoints).toBe(6);
  });
  it('zero gain changes nothing', () => {
    const r = applyExp({ level: 5, exp: 2, statPoints: 3, hardMode: false }, 0);
    expect(r).toMatchObject({ level: 5, exp: 2, statPoints: 3, levelsGained: 0 });
  });
});

describe('battle points', () => {
  const start = { maxBattlePoints: 30, battlesUsed: 0, deaths: 0, hardMode: false };
  it('starts at 30', () => {
    expect(battlePointsLeft(start)).toBe(30);
  });
  it('a won battle costs 1', () => {
    const s = onBattleWon(onEncounterStart(start));
    expect(battlePointsLeft(s)).toBe(29);
    expect(s.deaths).toBe(0);
  });
  it('a lost battle costs 3 and counts a death', () => {
    const s = onBattleLost(onEncounterStart(start));
    expect(battlePointsLeft(s)).toBe(27);
    expect(s.deaths).toBe(1);
  });
  it('a boss win refunds its bonus', () => {
    const s = onBattleWon(onEncounterStart(start), bossBattlePointBonus(1));
    expect(battlePointsLeft(s)).toBe(29 + 7);
  });
  it('hard mode penalty is 5 on a loss', () => {
    const hard = { ...start, maxBattlePoints: 10, hardMode: true };
    expect(battlePointsLeft(onBattleLost(onEncounterStart(hard)))).toBe(5);
  });
  it('never displays below 0', () => {
    const s = { ...start, battlesUsed: 40 };
    expect(battlePointsLeft(s)).toBe(0);
  });
});
