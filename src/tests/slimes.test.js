import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import { createWorld, bossHit } from '../core/world/world.js';
import { createProfile } from '../core/persistence/profile.js';
import { startRun, startBattle, finishBattle, bossTouch } from '../core/session/session.js';
import { mapSlimes, slimeDef, SLIME_BOSS_IDS } from '../core/encounters/slimeBosses.js';
import { buildBestiary } from '../core/bestiary.js';
import { heroTalents } from '../core/progression/talents.js';
import { createSeededRng } from '../core/rng/rng.js';

const world = createWorld(worldData);
const ctx = (profile, run) => ({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData });

describe('slime kings', () => {
  it('the first ten bosses each have a slime king next to them, inside the map and clear of the bosses', () => {
    expect(SLIME_BOSS_IDS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const withSlimes = world.maps.filter((m) => mapSlimes(m).length > 0).map((m) => m.id);
    expect(withSlimes).toEqual([1, 3, 5, 6, 9, 10, 11, 15, 35]);
    for (const m of world.maps) {
      const slimes = mapSlimes(m);
      for (const s of slimes) {
        const boss = m.bosses.find((b) => b.id === s.id);
        expect(s.y).toBe(boss.y);
        expect(s.x - s.w / 2 >= 0 && s.x + s.w / 2 <= m.w).toBe(true);
        // clear of every boss and every other slime of the map
        const overlaps = (a) => Math.abs(a.x - s.x) * 2 < a.w + s.w && Math.abs(a.y - s.y) * 2 < a.h + s.h;
        expect(m.bosses.some(overlaps), `slime ${s.id}`).toBe(false);
        expect(slimes.filter((o) => o.id !== s.id).some(overlaps)).toBe(false);
        expect(bossHit(boss, s.x, s.y)).toBe(false);
      }
    }
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
    expect(fin.result.talentPoints).toBe(sb.talentPoints);
    expect(heroTalents(fin.profile, run.characterIndex).points).toBe(sb.talentPoints);
    expect(heroTalents(fin.profile, run.characterIndex + 1).points).toBe(0); // other heroes get nothing
    expect(fin.run.slimesBeaten[0]).toBe(1);
    expect(fin.result.bpBonus).toBe(0);
    expect(fin.profile.bossWins).toEqual({}); // not a map boss
    expect(bossTouch(fin.run, world, s.x, s.y + s.h, s.x, s.y).slimeId).toBe(-1);
  });

  it('has its own bestiary tab entry', () => {
    const slimes = buildBestiary(world, enemyData.pools, bossData).filter((e) => e.kind === 'slime');
    expect(slimes.map((e) => e.key)).toEqual(SLIME_BOSS_IDS.map((id) => `slime#${id}`));
    expect(slimes[0].maps).toEqual([1]);
  });
});
