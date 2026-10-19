import { describe, it, expect } from 'vitest';
import { createProfile } from '../core/persistence/profile.js';
import { createWorld } from '../core/world/world.js';
import { startRun, startBattle, finishBattle } from '../core/session/session.js';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import { emblemCount } from '../core/progression/classEmblems.js';

// rng that always rolls 0: every chance hits, the emblem's included
const lucky = { next: () => 0 };

/** Wins one regular battle on `mapId` (its first area). */
function winOn(mapId) {
  const world = createWorld(worldData);
  const profile = createProfile();
  const map = world.map(mapId);
  const area = map.areas[0];
  let run = { ...startRun({ profile, characterIndex: 0, hardMode: false, world, catalog }), base: { hp: 1e9, atk: 1e9, def: 1e9, speed: 1e6, luck: 1e6 } };
  run = { ...run, map: { ...run.map, id: map.id, x: area.x + 1, y: area.y + 1 } };
  const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, -1, lucky);
  return finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, drop: sb.drop ?? null, world, catalog }, lucky);
}

describe('class emblems from rare monsters', () => {
  it('a rare monster (white room) drops emblems', () => {
    const fin = winOn(13);
    expect(fin.result.emblems).toBe(1);
    expect(emblemCount(fin.profile)).toBe(1);
  });

  it('a regular monster does not', () => {
    const fin = winOn(1);
    expect(fin.result.emblems).toBeUndefined();
    expect(emblemCount(fin.profile)).toBe(0);
  });
});
