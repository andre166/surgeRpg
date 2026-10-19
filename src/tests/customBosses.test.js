import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossJson from '../data/bosses.json';
import catalog from '../data/items.json';
import { createWorld } from '../core/world/world.js';
import { createProfile } from '../core/persistence/profile.js';
import { startRun, startBattle, bossTouch } from '../core/session/session.js';
import { balancedStats, withCustomBosses, CUSTOM_MAP_BOSSES, isMapBossId } from '../core/encounters/customBosses.js';
import { mapBossDef } from '../core/encounters/enemyPick.js';
import { setupEnemy } from '../core/battle/enemySetup.js';
import { computeStats } from '../core/attributes/stats.js';
import { mapSlimes, slimeDef, SLIME_IDS, SLIME_SIZE } from '../core/encounters/slimeBosses.js';
import { parseSlimeTriggers, parseBossTriggers } from '../core/world/triggers.js';
import { bossBattlePointBonus } from '../core/progression/battlePoints.js';
import { buildBestiary } from '../core/bestiary.js';
import { createSeededRng } from '../core/rng/rng.js';

const bossData = withCustomBosses(bossJson);
const trigger = (index, data) => ({ index, type: 'trigger', name: 'boss', data, pages: [] });
const art = (...objectProps) => ({ width: 64, height: 64, objectProps });

describe('custom bosses', () => {
  it('balanced stats follow the original bosses at their levels and grow between them', () => {
    expect(balancedStats(bossJson.mapBosses, 710)).toEqual({ hp: 32000, atk: 1440, expParam: 250000, gold: 4000 });
    expect(balancedStats(bossJson.mapBosses, 5200)).toEqual({ hp: 700000, atk: 6800, expParam: 25000000, gold: 1000 });
    const lv1300 = balancedStats(bossJson.mapBosses, 1300);
    const lv4100 = balancedStats(bossJson.mapBosses, 4100);
    expect(lv1300.hp).toBeGreaterThan(32000);
    expect(lv1300.hp).toBeLessThan(lv4100.hp);
    expect(lv4100.hp).toBeLessThan(700000);
  });

  it('boss 29 (LV 900) joins the map bosses without touching the JSON, with its BP bonus', () => {
    const b = bossData.mapBosses[29];
    expect(CUSTOM_MAP_BOSSES[29].level).toBe(900);
    expect(b).toMatchObject({ id: 29, expScale: -2, ...balancedStats(bossJson.mapBosses, 900) });
    expect(bossJson.mapBosses[29]).toBeUndefined();
    expect(bossBattlePointBonus(29)).toBe(CUSTOM_MAP_BOSSES[29].bpBonus);
    expect(bossBattlePointBonus(0)).toBe(3);
  });

  it('below boss 0 (LV 710) the stats keep shrinking smoothly, and boss 31 (LV 380) drops the first gems', () => {
    const near = balancedStats(bossJson.mapBosses, 709);
    expect(near.hp).toBeGreaterThan(31000);
    expect(near.hp).toBeLessThan(32000);
    const b = bossData.mapBosses[31];
    expect(b).toMatchObject({ id: 31, ...balancedStats(bossJson.mapBosses, 380) });
    expect(b.hp).toBeLessThan(near.hp);
    expect(b.drops.map((d) => catalog.accessories.find((a) => a.id === d.itemId).name)).toEqual(['Vitality Gem', 'Might Gem', 'Guard Gem']);
  });

  it('boss 200 (LV 820, past the free ids under 32) counts as a map boss, hard-mode EXP x2 included', () => {
    const b = bossData.mapBosses[200];
    expect(b).toMatchObject({ id: 200, ...balancedStats(bossJson.mapBosses, 820) });
    expect([0, 28, 29, 31, 200].every(isMapBossId)).toBe(true);
    expect([-1, 32, 60, 90, 128, 199, 300].some(isMapBossId)).toBe(false);
    expect(bossBattlePointBonus(200)).toBe(CUSTOM_MAP_BOSSES[200].bpBonus);
    const def = mapBossDef(bossData, 200, 820);
    const player = computeStats({ base: { hp: 100, atk: 10, def: 10, speed: 5, luck: 1 }, equipment: null, character: { index: 0 } });
    const normal = setupEnemy({ enemy: def, areaLevel: 820, hardMode: false, bossId: 200, player });
    const hard = setupEnemy({ enemy: def, areaLevel: 820, hardMode: true, bossId: 200, player });
    expect(hard.exp).toBe(normal.exp * 24);
  });

  it('a boss trigger places boss 29 and a slime trigger the standalone slime king', () => {
    const map = { w: 1600, h: 1600 };
    const a = art(trigger(100, '{"boss":29}'), trigger(200, '{"boss":"slime#30"}'), trigger(300, '{"boss":"slime#99"}'));
    const ids = new Set(Object.keys(bossData.mapBosses).map(Number));
    expect(parseBossTriggers(a, map, [], { validIds: ids }).map((b) => b.id)).toEqual([29]);
    const slimes = parseSlimeTriggers(a, map, SLIME_SIZE, { validIds: new Set(SLIME_IDS) });
    expect(slimes).toEqual([{ id: 30, x: 212.5, y: 87.5, w: SLIME_SIZE.w, h: SLIME_SIZE.h }]);
  });

  it('the standalone slime king (LV 4100) is built from a boss balanced for its level and can be fought', () => {
    const s = slimeDef(bossData, 30, 4100);
    const ref = balancedStats(bossJson.mapBosses, 4100);
    expect(s.name).toBe('Prism Slime King');
    expect(s.hp).toBe(Math.round(ref.hp * 0.35));
    expect(s.talentPoints).toBeGreaterThan(slimeDef(bossData, 2, 1).talentPoints);

    const world = createWorld(worldData);
    world.setMapSlimes(1, [{ id: 30, x: 400, y: 400, w: 113, h: 67 }]);
    expect(mapSlimes(world.map(1)).map((x) => x.id)).toEqual([30]);
    const profile = createProfile();
    const run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
    const touch = bossTouch(run, world, 400, 480, 400, 400);
    expect(touch.slimeId).toBe(30);
    const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, -1, createSeededRng(1), { slimeId: 30 });
    expect(sb.enemy.id).toBe('slime#30');
  });

  it('both are in the bestiary', () => {
    const keys = buildBestiary(createWorld(worldData), enemyData.pools, bossData).map((e) => e.key);
    expect(keys).toContain('boss#29');
    expect(keys).toContain('slime#30');
  });
});

describe('boss level', () => {
  const withLevels = withCustomBosses(bossJson, worldData.maps);
  it('every map boss has its own level: the original area it stands in, or the custom one', () => {
    expect(withLevels.mapBosses[0].level).toBe(710);
    expect(withLevels.mapBosses[2].level).toBe(2000);
    expect(withLevels.mapBosses[29].level).toBe(CUSTOM_MAP_BOSSES[29].level);
    expect(slimeDef(withLevels, 2, 50).level).toBe(2000);
    expect(slimeDef(withLevels, 30, 50).level).toBe(4100);
  });

  it('a boss fights at its own level wherever it is placed: same numbers, same EXP, its level shown', () => {
    const fight = (areaLevel) => {
      const world = createWorld(worldData);
      // boss 26 (EXP scaled by level) moved onto map 1, whose areas are far lower
      world.setMapBosses(1, [{ id: 26, x: 800, y: 800, w: 100, h: 100, scale: 1 }]);
      world.setMapAreas(1, { grid: { cols: 1, rows: 1, cells: [[0]] }, areas: [{ ...worldData.maps[0].areas[0], level: areaLevel }] });
      const profile = createProfile();
      let run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
      run = { ...run, map: { ...run.map, id: 1, x: 800, y: 800 } };
      return startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData: withLevels }, 26, createSeededRng(2));
    };
    const low = fight(5);
    const high = fight(90000);
    expect(low.enemyDef.level).toBe(withLevels.mapBosses[26].level);
    expect(low.enemy.hp).toBe(high.enemy.hp);
    expect(low.enemy.exp).toBe(high.enemy.exp);
  });
});

describe('base level on the result screen', () => {
  it('beating the boss of map 3 (boss 31) reports the base level going up, once', async () => {
    const { finishBattle } = await import('../core/session/session.js');
    const win = (profile) => {
      const world = createWorld(worldData);
      world.setMapBosses(1, [{ id: 31, x: 800, y: 800, w: 100, h: 100, scale: 1 }]);
      let run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
      run = { ...run, map: { ...run.map, id: 1, x: 800, y: 800 } };
      const rng = createSeededRng(3);
      const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, 31, rng);
      return finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: 31, drop: null, world, catalog }, rng);
    };
    const first = win(createProfile());
    expect(first.result.baseLevelUp).toEqual({ from: 0, to: 1 });
    expect(win(first.profile).result.baseLevelUp).toBeNull();
  });
});
