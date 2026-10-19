import { describe, it, expect } from 'vitest';
import { heroPassive } from '../core/attributes/characterPower.js';
import { LB_UNLOCK_BOSS } from '../core/progression/limitBreak.js';
import { createProfile } from '../core/persistence/profile.js';
import { createWorld } from '../core/world/world.js';
import { startRun, startBattle, finishBattle, heroStats } from '../core/session/session.js';
import { createSeededRng } from '../core/rng/rng.js';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import {
  PASSIVE_REROLL_COST, PASSIVE_POOL, normalizePassiveShards, heroCurrentPassive, heroCurrentPassivePct,
  passiveRerolled, rerollPassive, rollPassiveShardDrop, cheatPassiveShards, passiveRerollUnlocked,
  passiveOffer, acceptPassiveOffer, keepPassive, canReroll, PASSIVE_ROLL_MIN, PASSIVE_ROLL_MAX,
} from '../core/progression/passiveShards.js';

const seq = (...xs) => { let i = 0; return { next: () => xs[i++ % xs.length] }; };
// rerolls and drops open with Limit Break: Caelith the Monarch (boss 13) beaten in abyssal mode (key + 100)
const OPEN = { bossWins: { [LB_UNLOCK_BOSS + 100]: 1 } };
const openProfile = () => ({ ...createProfile(), bossWins: { [LB_UNLOCK_BOSS + 100]: 1 } });

describe('passive shards', () => {
  it('only abyssal bosses drop shards, the last boss drops more', () => {
    expect(rollPassiveShardDrop(OPEN, { hardMode: false }).shards).toBe(0);
    const a = rollPassiveShardDrop(OPEN, { hardMode: true });
    expect(a.shards).toBe(1);
    expect(a.profile.passiveShards.shards).toBe(1);
    expect(rollPassiveShardDrop(a.profile, { hardMode: true, lastBoss: true }).profile.passiveShards.shards).toBe(4);
  });

  it('locked until Caelith the Monarch is beaten in abyssal mode: no drops, no rerolls', () => {
    const locked = cheatPassiveShards({ bossWins: { [LB_UNLOCK_BOSS]: 1 } }, 10); // normal-mode win only
    expect(passiveRerollUnlocked(locked)).toBe(false);
    expect(rollPassiveShardDrop(locked, { hardMode: true }).shards).toBe(0);
    expect(rerollPassive(locked, 0, seq(0)).passive).toBeNull();
    expect(passiveRerollUnlocked(OPEN)).toBe(true);
  });

  it('a hero keeps its own passive until rerolled', () => {
    expect(heroCurrentPassive({}, 0)).toEqual(heroPassive(0));
    expect(passiveRerolled({}, 0)).toBe(false);
  });

  it('a reroll costs shards and offers a different passive at a random value', () => {
    const poor = cheatPassiveShards(OPEN, PASSIVE_REROLL_COST - 1);
    expect(rerollPassive(poor, 0, seq(0)).passive).toBeNull();

    const p = cheatPassiveShards(OPEN, PASSIVE_REROLL_COST * 3);
    const r1 = rerollPassive(p, 0, seq(0, 0)); // lowest value
    expect(r1.passive.id).not.toBe(heroPassive(0).id);
    expect(r1.passive.pct).toBeCloseTo(PASSIVE_ROLL_MIN);
    expect(r1.profile.passiveShards.shards).toBe(PASSIVE_REROLL_COST * 2);
    // only an offer: the hero keeps its passive until it is accepted, and cannot roll again meanwhile
    expect(heroCurrentPassive(r1.profile, 0)).toEqual(heroPassive(0));
    expect(passiveOffer(r1.profile, 0)).toEqual(r1.passive);
    expect(canReroll(r1.profile, 0)).toBe(false);
    expect(rerollPassive(r1.profile, 0, seq(0)).passive).toBeNull();
    expect(rerollPassive(p, 0, seq(0, 0.999)).passive.pct).toBeCloseTo(PASSIVE_ROLL_MAX);
  });

  it('accept takes the offer, keep drops it (the shards stay spent)', () => {
    const p = cheatPassiveShards(OPEN, PASSIVE_REROLL_COST);
    const r = rerollPassive(p, 0, seq(0, 0.5));
    const acc = acceptPassiveOffer(r.profile, 0);
    expect(heroCurrentPassive(acc, 0)).toEqual(r.passive);
    expect(heroCurrentPassivePct(acc, 0)).toEqual({ [r.passive.stat]: r.passive.pct });
    expect(passiveRerolled(acc, 0)).toBe(true);
    expect(passiveOffer(acc, 0)).toBeNull();

    const kept = keepPassive(r.profile, 0);
    expect(heroCurrentPassive(kept, 0)).toEqual(heroPassive(0));
    expect(passiveOffer(kept, 0)).toBeNull();
    expect(kept.passiveShards.shards).toBe(0);
  });

  it('old or broken saves normalize', () => {
    expect(normalizePassiveShards(undefined)).toEqual({ shards: 0, heroes: {}, offers: {} });
    // old saves kept a bare passive id: it comes back at the passive's base value
    expect(normalizePassiveShards({ shards: 2.7, heroes: { 1: 'nope', 2: PASSIVE_POOL[5].id, 3: { id: PASSIVE_POOL[1].id, pct: 0.012 } } }))
      .toEqual({ shards: 2, heroes: { 2: { id: PASSIVE_POOL[5].id, pct: PASSIVE_POOL[5].pct }, 3: { id: PASSIVE_POOL[1].id, pct: 0.012 } }, offers: {} });
  });
});

describe('passive shards in a run', () => {
  const winBoss = (profile, bossId, hardMode) => {
    const world = createWorld(worldData);
    const map = world.maps.find((m) => (m.bosses ?? []).some((b) => b.id === bossId));
    const boss = map.bosses.find((b) => b.id === bossId);
    let run = { ...startRun({ profile, characterIndex: 0, hardMode, world, catalog }), base: { hp: 1e9, atk: 1e9, def: 1e9, speed: 1e6, luck: 1e6 } };
    run = { ...run, map: { ...run.map, id: map.id, x: boss.x, y: boss.y } };
    const rng = createSeededRng(9);
    const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, bossId, rng);
    return finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, drop: null, world, catalog }, rng);
  };

  it('an abyssal boss win drops a shard, a normal one does not', () => {
    expect(winBoss(openProfile(), 0, false).result.passiveShards).toBeUndefined();
    const fin = winBoss(openProfile(), 0, true);
    expect(fin.result.passiveShards).toBe(1);
    expect(fin.profile.passiveShards.shards).toBe(1);
  });

  it('the rerolled passive feeds the hero stats', () => {
    const world = createWorld(worldData);
    const r = rerollPassive(cheatPassiveShards(openProfile(), PASSIVE_REROLL_COST), 0, seq(0.5));
    const prof = acceptPassiveOffer(r.profile, 0);
    const run = startRun({ profile: prof, characterIndex: 0, hardMode: false, world, catalog });
    expect(heroStats(run, catalog, prof).bonusPercent[r.passive.stat]).toBeGreaterThanOrEqual(r.passive.pct - 1e-9);
    if (r.passive.stat !== 'speed') expect(heroStats(run, catalog, prof).bonusPercent.speed).toBe(0);
  });
});
