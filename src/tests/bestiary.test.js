import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import { createWorld } from '../core/world/world.js';
import { createProfile } from '../core/persistence/profile.js';
import { buildBestiary, recordBestiary, revealBestiary, resetBestiary } from '../core/bestiary.js';

const world = createWorld(worldData);
const list = buildBestiary(world, enemyData.pools, bossData);

describe('bestiary', () => {
  it('lists every map boss and event boss once, with unique keys', () => {
    expect(new Set(list.map((e) => e.key)).size).toBe(list.length);
    expect(list.filter((e) => e.kind === 'boss').length).toBe(Object.keys(bossData.mapBosses).length);
    expect(list.filter((e) => e.kind === 'event').length).toBe(Object.keys(bossData.eventBosses).length);
  });
  it('area enemies carry where they live and are sorted by their lowest level', () => {
    const first = list.find((e) => e.key === 'pool_1_0#0');
    expect(first.maps).toContain(1);
    expect(first.levels[0]).toBe(1);
    const lows = list.filter((e) => e.kind === 'enemy').map((e) => e.levels[0]);
    expect(lows).toEqual([...lows].sort((a, b) => a - b));
  });
  it('the white / black room monsters (maps 13, 14, no area level) have their own rare tab', () => {
    const rares = list.filter((e) => e.kind === 'rare');
    expect(rares.length).toBeGreaterThan(0);
    expect(rares.every((e) => e.maps.every((m) => m === 13 || m === 14))).toBe(true);
    expect(list.filter((e) => e.kind === 'enemy').some((e) => e.maps.includes(13) || e.maps.includes(14))).toBe(false);
  });
  it('records encounters and wins per enemy', () => {
    let p = createProfile();
    p = recordBestiary(p, 'pool_1_0#0');
    p = recordBestiary(p, 'pool_1_0#0');
    p = recordBestiary(p, 'pool_1_0#0', true);
    expect(p.bestiary['pool_1_0#0']).toEqual({ seen: 2, defeated: 1 });
  });
  it('reveal cheat marks every entry seen and keeps recorded counts', () => {
    let p = createProfile();
    p = recordBestiary(p, 'pool_1_0#0');
    p = recordBestiary(p, 'pool_1_0#0');
    p = recordBestiary(p, 'pool_1_0#0', true);
    p = revealBestiary(p, list);
    expect(list.every((e) => p.bestiary[e.key]?.seen >= 1)).toBe(true);
    expect(p.bestiary['pool_1_0#0']).toEqual({ seen: 2, defeated: 1 });
    expect(p.bestiary['boss#1']).toEqual({ seen: 1, defeated: 0 });
  });
  it('reset cheat forgets every entry, the rest of the profile untouched', () => {
    let p = createProfile();
    p = revealBestiary(recordBestiary(p, 'pool_1_0#0', true), list);
    const r = resetBestiary(p);
    expect(r.bestiary).toEqual({});
    expect(list.some((e) => r.bestiary[e.key]?.seen > 0)).toBe(false);
    expect({ ...r, bestiary: null }).toEqual({ ...p, bestiary: null });
    expect(resetBestiary(null)).toBeNull();
  });
});

describe('bestiary drop reveal', () => {
  it('needs more wins for regular monsters than for bosses, slime kings and rare bosses', async () => {
    // 60 / 20 / 10 / 3
    const { DROP_REVEAL_KILLS, dropsRevealed } = await import('../core/bestiary.js');
    expect(DROP_REVEAL_KILLS.enemy).toBeGreaterThan(DROP_REVEAL_KILLS.boss);
    expect(DROP_REVEAL_KILLS.boss).toBeGreaterThan(DROP_REVEAL_KILLS.slime);
    const monster = { kind: 'enemy' };
    expect(dropsRevealed(monster, undefined)).toBe(false);
    expect(dropsRevealed(monster, { seen: 30, defeated: DROP_REVEAL_KILLS.enemy - 1 })).toBe(false);
    expect(dropsRevealed(monster, { seen: 30, defeated: DROP_REVEAL_KILLS.enemy })).toBe(true);
    expect(dropsRevealed({ kind: 'event' }, { seen: 3, defeated: DROP_REVEAL_KILLS.event - 1 })).toBe(false);
    expect(dropsRevealed({ kind: 'event' }, { seen: 3, defeated: DROP_REVEAL_KILLS.event })).toBe(true);
  });

  it('shows where a creature lives only after beating it once', async () => {
    const { whereRevealed } = await import('../core/bestiary.js');
    expect(whereRevealed(undefined)).toBe(false);
    expect(whereRevealed({ seen: 5, defeated: 0 })).toBe(false);
    expect(whereRevealed({ seen: 5, defeated: 1 })).toBe(true);
  });
});

describe('SK (different Slime Kings beaten)', () => {
  it('counts each Slime King once, however many times it is beaten', async () => {
    const { slimeKingWins, recordBestiary } = await import('../core/bestiary.js');
    const { recordSlimeKingWin, tpLevel } = await import('../core/progression/talents.js');
    let p = { bestiary: {}, slimeKingsBeaten: {} };
    for (let i = 0; i < 5; i += 1) p = recordSlimeKingWin(recordBestiary(p, 'slime#1', true), 1).profile;
    expect(slimeKingWins(p)).toBe(1); // five wins over the same one: 1 SK
    p = recordSlimeKingWin(p, 2).profile;
    expect(slimeKingWins(p)).toBe(2);
    expect(slimeKingWins(p)).toBe(tpLevel(p)); // the same number as the talents
  });
});
