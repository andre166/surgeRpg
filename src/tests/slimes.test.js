import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import { createWorld } from '../core/world/world.js';
import { createProfile } from '../core/persistence/profile.js';
import { startRun, startBattle, finishBattle, bossTouch } from '../core/session/session.js';
import { mapSlimes, slimeDef, SLIME_BOSS_IDS, SLIME_IDS } from '../core/encounters/slimeBosses.js';
import { buildBestiary } from '../core/bestiary.js';
import { tpLevel } from '../core/progression/talents.js';
import { createSeededRng } from '../core/rng/rng.js';

const world = createWorld(worldData);
// slime kings appear only where boss triggers place them: one on map 1 for these tests
world.setMapSlimes(1, [{ id: 0, x: 400, y: 400, w: 113, h: 67 }]);
const ctx = (profile, run) => ({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData });

describe('slime kings', () => {
  it('no slime king spawns by itself next to a boss: only the ones the triggers place', () => {
    expect(SLIME_BOSS_IDS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const fresh = createWorld(worldData);
    expect(fresh.maps.filter((m) => mapSlimes(m).length > 0)).toEqual([]);
    expect(mapSlimes(world.map(1)).map((s) => s.id)).toEqual([0]);
    // a trigger with an unknown slime id places nothing
    fresh.setMapSlimes(2, [{ id: 10, x: 1, y: 1, w: 1, h: 1 }]);
    expect(mapSlimes(fresh.map(2))).toEqual([]);
    expect(slimeDef(bossData, 10, 1)).toBeNull();
  });

  it('later slime kings give more TP, and each has its own name', () => {
    const defs = SLIME_BOSS_IDS.map((id) => slimeDef(bossData, id, 1));
    expect(new Set(defs.map((d) => d.name)).size).toBe(defs.length);
    expect(defs.every((d) => d.talentPoints >= 1)).toBe(true);
    expect(defs[9].talentPoints).toBeGreaterThan(defs[0].talentPoints);
  });

  it('touching the slime starts a slime battle; winning grants TP and removes it for the run', () => {
    let profile = createProfile();
    let run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
    const [s] = mapSlimes(world.map(1));
    const touch = bossTouch(run, world, s.x, s.y + s.h, s.x, s.y);
    expect(touch.slimeId).toBe(0);
    expect(touch.bossId).toBe(-1);

    run = { ...run, base: { hp: 1e9, atk: 1e9, def: 1e9, speed: 1e6, luck: 1e6 } };
    const rng = createSeededRng(3);
    const sb = startBattle(ctx(profile, run), -1, rng, { slimeId: 0 });
    expect(sb.enemy.id).toBe('slime#0');
    expect(sb.talentPoints).toBeGreaterThan(0);
    const fin = finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, slime: { id: 0, talentPoints: sb.talentPoints }, drop: null, world, catalog }, rng);
    // a new Slime King: the account's TP level goes up by one (talents.js)
    expect(fin.result.talentPoints).toBe(1);
    expect(fin.result.tpLevel).toBe(1);
    expect(tpLevel(fin.profile)).toBe(1);
    expect(fin.profile.slimeKingsBeaten[0]).toBe(1);
    expect(fin.run.slimesBeaten[0]).toBe(1);
    expect(fin.result.bpBonus).toBe(0);
    expect(fin.profile.bossWins).toEqual({}); // not a map boss
    expect(bossTouch(fin.run, world, s.x, s.y + s.h, s.x, s.y).slimeId).toBe(-1);
  });

  it('has its own bestiary tab entry', () => {
    const slimes = buildBestiary(world, enemyData.pools, bossData).filter((e) => e.kind === 'slime');
    expect(slimes.map((e) => e.key)).toEqual(SLIME_IDS.map((id) => `slime#${id}`));
  });
});
