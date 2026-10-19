import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import { monsterIndex, closestEntry, resolveMonsters, describeMonster, applyAreaContent, expScaleNear } from '../core/encounters/areaMonsters.js';
import { applyEditorMap } from '../core/world/editorMap.js';
import { pickAreaEnemy } from '../core/encounters/enemyPick.js';
import { createWorld } from '../core/world/world.js';
import { createSeededRng } from '../core/rng/rng.js';
import { cleanAreaContent } from '../../scripts/areaToolServer.js';

const maps = worldData.maps;
const pools = enemyData.pools;
const index = monsterIndex(maps, pools);
// a sprite the original uses at several levels
const [multiSprite, multiRecs] = [...index.entries()].find(([, recs]) => new Set(recs.map((r) => r.level)).size >= 3);

describe('area monsters', () => {
  it('a monster plays as its original entry made for the closest level', () => {
    const levels = [...new Set(multiRecs.map((r) => r.level))];
    const target = levels[1];
    expect(closestEntry(index, multiSprite, target).level).toBe(target);
    expect(closestEntry(index, multiSprite, 1).level).toBe(levels[0]);
    expect(closestEntry(index, 'nope', 10)).toBeNull();
  });

  it('resolves weights and skips unknown sprites and zero weights', () => {
    const r = resolveMonsters(maps, pools, [{ sprite: multiSprite, weight: 10 }, { sprite: 'nope', weight: 5 }, { sprite: multiSprite, weight: 0 }], 85);
    expect(r.normal).toHaveLength(1);
    expect(r.normal[0]).toMatchObject({ weight: 10, key: closestEntry(index, multiSprite, 85).key });
  });

  it('an area with its own monsters picks among them, at the area level', () => {
    const map = maps.find((m) => m.id === 1);
    const content = { map: 1, areas: [{ id: 2, level: 85, monsters: [{ sprite: multiSprite, weight: 1 }] }, { id: 9, name: 'Nova', level: 40 }] };
    const { areas } = applyAreaContent(map, content, maps, pools);
    expect(areas[2]).toMatchObject({ level: 85, expScale: expScaleNear(maps, 85) });
    expect(areas[9]).toMatchObject({ id: 9, name: 'Nova', level: 40 });
    const e = pickAreaEnemy({ area: areas[2], pools, hardMode: false }, createSeededRng(1));
    const d = describeMonster(maps, pools, multiSprite, 85, areas[2].expScale);
    expect(e.id).toBe(d.key);
    expect(e.hp).toBe(d.hp);
    expect(e.atk).toBe(d.atk);
    // areas not listed keep their pool
    expect(areas[0].monsters).toBeUndefined();
  });

  it('applyEditorMap applies the content after the editor layer, also on maps without art', () => {
    const world = createWorld(worldData);
    applyEditorMap(world, 2, null, bossData, pools, { map: 2, areas: [{ id: 0, level: 77 }] });
    expect(world.map(2).areas[0].level).toBe(77);
    expect(world.map(2).areas[0].statScale).not.toBeNull();
    applyEditorMap(world, 2, null, bossData, pools, null);
    expect(world.map(2).areas[0].level).toBe(maps.find((m) => m.id === 2).areas[0].level);
  });

  it('the tool endpoint keeps only clean data', () => {
    expect(cleanAreaContent(1, { map: 2, areas: [] }).error).toBeTruthy();
    expect(cleanAreaContent(1, { map: 1, areas: [{ id: 1 }, { id: 1 }] }).error).toBeTruthy();
    expect(cleanAreaContent(1, { map: 1, areas: [{ id: 3, level: 0 }] }).error).toBeTruthy();
    expect(cleanAreaContent(1, { map: 1, areas: [{ id: 3, monsters: [{ sprite: '../x', weight: 1 }] }] }).error).toBeTruthy();
    const ok = cleanAreaContent(1, { map: 1, areas: [{ id: 5, name: ' A ', level: '85.4', monsters: [{ sprite: 'ene1_0a', weight: '7' }] }, { id: 2 }] });
    expect(ok.content).toEqual({ map: 1, areas: [{ id: 5, name: 'A', level: 85, monsters: [{ sprite: 'ene1_0a', weight: 7 }] }] });
  });
});
