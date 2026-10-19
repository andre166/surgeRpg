import { describe, it, expect } from 'vitest';
import { createProfile } from '../core/persistence/profile.js';
import { createWorld } from '../core/world/world.js';
import { parseBossTriggers } from '../core/world/triggers.js';
import { startRun, startBattle, finishBattle } from '../core/session/session.js';
import worldData from '../data/world.json';
import namedMaps from '../data/namedMaps.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';

const never = { next: () => 0.999 };

/** A won battle against map boss `bossId` of map 4, the boss placed by `bosses`. */
function beatBoss(bosses, bossId = 2) {
  const world = createWorld({ ...worldData, namedMaps: namedMaps.maps });
  world.setMapBosses(4, bosses);
  const profile = createProfile();
  const run = {
    ...startRun({ profile, characterIndex: 0, hardMode: false, world, catalog }),
    base: { hp: 1e12, atk: 1e12, def: 1e12, speed: 1e6, luck: 1e6 },
    map: { id: 4, x: 400, y: 400, gauge: 0 },
  };
  const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, bossId, never);
  const fin = finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, drop: null, world, catalog }, never);
  return { world, fin };
}

describe('boss trigger "teleport"', () => {
  it('is read from the trigger data', () => {
    const art = { width: 4, height: 4, objectProps: [{ index: 5, type: 'trigger', name: 'boss', data: '{"boss": "boss#2", "teleport": "caverna_cristal"}' }] };
    const [b] = parseBossTriggers(art, { w: 400, h: 400 });
    expect(b).toMatchObject({ id: 2, teleport: 'caverna_cristal' });
    expect(parseBossTriggers({ ...art, objectProps: [{ ...art.objectProps[0], data: '{"boss":2}' }] }, { w: 400, h: 400 })[0].teleport).toBeUndefined();
  });

  it('beating that boss sends the hero to the named map, to be placed on its spawn', () => {
    const { world, fin } = beatBoss([{ id: 2, x: 400, y: 400, w: 50, h: 50, teleport: 'caverna_cristal' }]);
    const dest = world.mapIdByName('caverna_cristal');
    expect(fin.result.teleport).toMatchObject({ map: dest });
    expect(fin.run.map).toMatchObject({ id: dest, atSpawn: true });
  });

  it('without it (or with an unknown map) the hero stays', () => {
    expect(beatBoss([{ id: 2, x: 400, y: 400, w: 50, h: 50 }]).fin.run.map.id).toBe(4);
    expect(beatBoss([{ id: 2, x: 400, y: 400, w: 50, h: 50, teleport: 'nowhere' }]).fin.run.map.id).toBe(4);
  });
});
