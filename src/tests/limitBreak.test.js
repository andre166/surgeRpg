import { describe, it, expect } from 'vitest';
import { createProfile } from '../core/persistence/profile.js';
import { migrateProfile } from '../core/persistence/saveStore.js';
import { characterPowerWeights, characterPowerBonus } from '../core/attributes/characterPower.js';
import {
  addArrow, resetHero, heroWeights, heroExtraUsed, lbAddStatus, lbNextCost, rollShardDrop, cheatShards,
  LB_COSTS, LB_MAX_EXTRA, LB_UNLOCK_BOSS, lbUnlocked,
} from '../core/progression/limitBreak.js';

// Limit Break opens after Caelith the Monarch (LB_UNLOCK_BOSS) in abyssal mode (bossWins key + 100)
const unlocked = () => ({ ...createProfile(), bossWins: { [LB_UNLOCK_BOSS + 100]: 1 } });
const withShards = (n) => cheatShards(unlocked(), n);
const rng = (v) => ({ next: () => v });

describe('limit break', () => {
  it('adds arrows for shards, with growing costs', () => {
    // hero 0: atk 2, speed 2, nothing else
    let p = withShards(100);
    p = addArrow(p, 0, 'hp');
    expect(p.limitBreak.shards).toBe(100 - LB_COSTS[0]);
    expect(heroWeights(p, 0).hp).toBe(1);
    expect(lbAddStatus(p, 0, 'hp')).toBe('statMax'); // one extra arrow per stat
    p = addArrow(p, 0, 'def');
    expect(heroWeights(p, 0).def).toBe(1);
    expect(p.limitBreak.shards).toBe(100 - LB_COSTS[0] - LB_COSTS[1]);
  });

  it('caps a stat at 2 arrows, natural ones included', () => {
    const p = withShards(100);
    expect(characterPowerWeights(0).atk).toBe(2);
    expect(lbAddStatus(p, 0, 'atk')).toBe('statMax');
    expect(addArrow(p, 0, 'atk')).toBe(p);
    // hero 5: hp 2, atk 1, speed 1 -> atk can take one more
    const q = addArrow(p, 5, 'atk');
    expect(heroWeights(q, 5).atk).toBe(2);
    expect(lbAddStatus(q, 5, 'atk')).toBe('statMax');
  });

  it('caps a hero at 2 extra arrows', () => {
    let p = withShards(1000);
    p = addArrow(addArrow(p, 0, 'hp'), 0, 'def');
    expect(heroExtraUsed(p, 0)).toBe(LB_MAX_EXTRA);
    expect(lbNextCost(p, 0)).toBeNull();
    expect(lbAddStatus(p, 0, 'luck')).toBe('heroMax');
    // other heroes are not affected
    expect(lbAddStatus(p, 1, 'def')).toBe('ok');
  });

  it('needs enough shards', () => {
    const p = withShards(LB_COSTS[0] - 1);
    expect(lbAddStatus(p, 0, 'hp')).toBe('shards');
  });

  it('reset refunds every shard', () => {
    let p = withShards(100);
    p = addArrow(addArrow(p, 0, 'hp'), 0, 'def');
    p = resetHero(p, 0);
    expect(p.limitBreak.shards).toBe(100);
    expect(heroExtraUsed(p, 0)).toBe(0);
  });

  it('extra arrows raise the character power bonus', () => {
    const plain = characterPowerBonus(0, 9, 5);
    const lb = characterPowerBonus(0, 9, 5, 0, { def: 1 });
    expect(plain.def).toBe(0);
    expect(lb.def).toBeGreaterThan(0);
    expect(lb.atk).toBe(plain.atk);
  });

  it('shards drop only in abyssal mode, once the base ability is open', () => {
    const p = unlocked();
    expect(rollShardDrop(p, rng(0), { abilityLevel: 0, hardMode: true }).shards).toBe(0);
    expect(rollShardDrop(p, rng(0), { abilityLevel: 1 }).shards).toBe(0); // normal mode: never
    expect(rollShardDrop(p, rng(0), { abilityLevel: 1, hardMode: true }).profile.limitBreak.shards).toBe(2);
    expect(rollShardDrop(p, rng(0.99), { abilityLevel: 1, hardMode: true }).shards).toBe(0);
  });

  it('stays locked until Caelith the Monarch is beaten in abyssal mode', () => {
    const p = cheatShards(createProfile(), 100);
    expect(lbUnlocked(p)).toBe(false);
    expect(lbAddStatus(p, 0, 'hp')).toBe('locked');
    expect(addArrow(p, 0, 'hp')).toBe(p);
    expect(rollShardDrop(p, rng(0), { abilityLevel: 1, hardMode: true }).shards).toBe(0);
    expect(lbUnlocked({ bossWins: { [LB_UNLOCK_BOSS]: 1 } })).toBe(false); // normal mode is not enough
    expect(lbUnlocked({ bossWins: { [LB_UNLOCK_BOSS + 100]: 1 } })).toBe(true);
    expect(lbAddStatus(withShards(100), 0, 'hp')).toBe('ok');
  });

  it('old saves get an empty limit break; bad data is cleaned', () => {
    expect(migrateProfile({}).limitBreak).toEqual({ shards: 0, heroes: {} });
    const m = migrateProfile({ limitBreak: { shards: -3, heroes: { 0: { hp: 9, foo: 1 }, 1: 'x' } } });
    expect(m.limitBreak).toEqual({ shards: 0, heroes: { 0: { hp: 1 } } });
  });
});

describe('boss win cheat', () => {
  it('marks and clears one boss win per mode; Caelith on abyssal opens Limit Break', async () => {
    const { setBossWin } = await import('../core/progression/characters.js');
    let w = setBossWin({}, LB_UNLOCK_BOSS, false, true);
    expect(w).toEqual({ [LB_UNLOCK_BOSS]: 1 });
    expect(lbUnlocked({ bossWins: w })).toBe(false);
    w = setBossWin(w, LB_UNLOCK_BOSS, true, true);
    expect(lbUnlocked({ bossWins: w })).toBe(true);
    w = setBossWin(w, LB_UNLOCK_BOSS, true, false);
    expect(w).toEqual({ [LB_UNLOCK_BOSS]: 1 });
    expect(lbUnlocked({ bossWins: w })).toBe(false);
  });
});
