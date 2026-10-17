import { describe, it, expect } from 'vitest';
import { createProfile as newProfile } from '../core/persistence/profile.js';
import { cheatAccountOwned, ACCOUNT_UNLOCK_KINDS } from '../core/progression/unlocks.js';

// these tests work on an account with every echo rarity, talent tier, relic slot and class bought
const createProfile = () => ACCOUNT_UNLOCK_KINDS.reduce((p, k) => cheatAccountOwned(p, k, true), newProfile());
import { ECHOES, echoDef, addEcho, equipEcho, unequipEcho, heroEcho, echoHolders, ownsEcho, rollEchoDrop, masteryLevel, applyMastery, gainEchoXp, masteryInfo, heroEchoMastered, echoXp, MASTERY_MAX } from '../core/echoes.js';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import { createWorld } from '../core/world/world.js';
import { startRun, startBattle, finishBattle } from '../core/session/session.js';
import { computeStats } from '../core/attributes/stats.js';
import { createBattle, step, isOver } from '../core/battle/engine.js';
import { createSeededRng } from '../core/rng/rng.js';

const base = { hp: 100, atk: 100, def: 100, speed: 100, luck: 100 };

describe('ancestral echoes', () => {
  it('Spirit of Ruin matches the spec: legendary, fire, +15% crit damage, blast every 5 attacks, spirit resonance', () => {
    const e = echoDef('ruin_spirit');
    expect(e.rarity).toBe('legendary');
    expect(e.affinity).toBe('fire');
    expect(e.passive.mods.critDamageMultiplier).toBeCloseTo(0.15);
    expect(e.skill).toEqual({ every: 5, kind: 'burst', power: 2 });
    expect(e.resonance.kind).toBe('spirit');
  });
  it('account collection: one echo per hero, the same echo can be on several heroes', () => {
    let p = createProfile();
    expect(equipEcho(p, 0, 'ruin_spirit')).toBe(p); // not owned
    p = addEcho(p, 'ruin_spirit');
    expect(ownsEcho(p, 'ruin_spirit')).toBe(true);
    p = equipEcho(p, 0, 'ruin_spirit');
    expect(heroEcho(p, 0).id).toBe('ruin_spirit');
    p = equipEcho(p, 5, 'ruin_spirit'); // hero 0 keeps it
    expect(heroEcho(p, 0).id).toBe('ruin_spirit');
    expect(echoHolders(p, 'ruin_spirit')).toEqual([0, 5]);
    p = addEcho(p, 'tide_guardian');
    p = equipEcho(p, 0, 'tide_guardian'); // replaces hero 0's echo only
    expect(echoHolders(p, 'ruin_spirit')).toEqual([5]);
    p = unequipEcho(p, 5);
    expect(echoHolders(p, 'ruin_spirit')).toEqual([]);
  });
  it('passive feeds computeStats', () => {
    const s = computeStats({ base, equipment: null, character: { index: 0 }, echoId: 'ruin_spirit' });
    expect(s.modifiers.critDamageMultiplier).toBeCloseTo(1.15);
    const t = computeStats({ base, equipment: null, character: { index: 0 }, echoId: 'tide_guardian' });
    expect(t.total.hp).toBeCloseTo(110);
  });
  it('skill fires every N player hits', () => {
    const echo = echoDef('ruin_spirit');
    const mods = computeStats({ base, equipment: null, character: { index: 0 } }).modifiers;
    let s = createBattle({
      player: { hp: 1e9, maxHp: 1e9, atk: 10, def: 1e9, modifiers: mods, echo },
      enemy: { name: 'dummy', hp: 1e12, maxHp: 1e12, atk: 1, critRate: 0, comboRate: 0, point: 1, skills: [] },
    });
    const rng = createSeededRng(1);
    let hits = 0;
    let bursts = 0;
    while (hits < 10 && !isOver(s)) {
      const r = step(s, rng);
      s = r.state;
      hits += r.events.filter((e) => e.type === 'playerHit').length;
      bursts += r.events.filter((e) => e.type === 'echoSkill').length;
    }
    expect(bursts).toBe(2);
  });
  it('resonance triggers once when the hero drops below half HP', () => {
    const echo = echoDef('tide_guardian');
    const mods = computeStats({ base, equipment: null, character: { index: 0 } }).modifiers;
    let s = createBattle({
      player: { hp: 1000, maxHp: 1000, atk: 1, def: 1, modifiers: mods, echo },
      enemy: { name: 'dummy', hp: 1e12, maxHp: 1e12, atk: 300, critRate: 0, comboRate: 0, point: 1, skills: [] },
    });
    const rng = createSeededRng(2);
    let res = 0;
    for (let i = 0; i < 200 && !isOver(s); i += 1) {
      const r = step(s, rng);
      s = r.state;
      res += r.events.filter((e) => e.type === 'echoResonance').length;
    }
    expect(res).toBe(1);
  });
  it('drops only unowned echoes, and nothing once the collection is complete', () => {
    let p = createProfile();
    const always = { next: () => 0 };
    const id = rollEchoDrop(p, always);
    expect(echoDef(id)).toBeTruthy();
    for (const e of ECHOES) p = addEcho(p, e.id);
    expect(rollEchoDrop(p, always)).toBeNull();
  });
});

describe('echo mastery', () => {
  it('levels from XP, capped at 10', () => {
    expect(masteryLevel(0)).toBe(1);
    expect(masteryLevel(9)).toBe(1);
    expect(masteryLevel(10)).toBe(2);
    expect(masteryLevel(70)).toBe(5);
    expect(masteryLevel(99999)).toBe(MASTERY_MAX);
  });
  it('each level scales the numbers; levels 5 and 10 trigger the skill sooner', () => {
    const e = echoDef('ruin_spirit');
    expect(applyMastery(e, 1).skill).toEqual(e.skill);
    const m5 = applyMastery(e, 5);
    expect(m5.passive.mods.critDamageMultiplier).toBeCloseTo(0.15 * 1.24);
    expect(m5.skill.every).toBe(4);
    expect(m5.resonance.power).toBeCloseTo(3 * 1.24);
    expect(applyMastery(e, 10).skill.every).toBe(3);
  });
  it('XP is per echo on the account and only for owned echoes', () => {
    let p = createProfile();
    expect(gainEchoXp(p, 'ruin_spirit', 5).profile).toBe(p);
    p = addEcho(p, 'ruin_spirit');
    const g = gainEchoXp(p, 'ruin_spirit', 12);
    expect(g.levelUp).toBe(true);
    expect(masteryInfo(g.profile, 'ruin_spirit')).toEqual({ level: 2, xp: 12, current: 10, next: 25 });
  });
  it('the equipped echo gains XP when the hero wins, and battles use the mastered numbers', () => {
    let profile = addEcho(createProfile(), 'ruin_spirit');
    profile = equipEcho(profile, 0, 'ruin_spirit');
    profile = { ...profile, echoes: { ...profile.echoes, mastery: { ruin_spirit: 70 } } };
    expect(heroEchoMastered(profile, 0).skill.every).toBe(4);
    const world = createWorld(worldData);
    const run = { ...startRun({ profile, characterIndex: 0, hardMode: false, world, catalog }), base: { hp: 1e9, atk: 1e9, def: 1e9, speed: 1e6, luck: 1e6 } };
    const rng = createSeededRng(4);
    const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, -1, rng);
    expect(sb.battle.echo.skill.every).toBe(4);
    const fin = finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, drop: null, world, catalog }, rng);
    expect(fin.result.echoXp).toMatchObject({ id: 'ruin_spirit', amount: 1, level: 5 });
    expect(echoXp(fin.profile, 'ruin_spirit')).toBe(71);
  });
});
