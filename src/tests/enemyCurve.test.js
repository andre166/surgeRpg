import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import { enemyCurve, curveAt, statScale } from '../core/encounters/enemyCurve.js';
import { applyEditorMap } from '../core/world/editorMap.js';
import { pickAreaEnemy } from '../core/encounters/enemyPick.js';
import { createWorld } from '../core/world/world.js';
import { createSeededRng } from '../core/rng/rng.js';

const curve = enemyCurve(worldData.maps, enemyData.pools);

describe('enemy curve', () => {
  it('grows with the level (HP and ATK never drop) and is flat past its ends', () => {
    for (let i = 1; i < curve.length; i += 1) {
      expect(curve[i].level).toBeGreaterThan(curve[i - 1].level);
      expect(curve[i].hp).toBeGreaterThanOrEqual(curve[i - 1].hp);
      expect(curve[i].atk).toBeGreaterThanOrEqual(curve[i - 1].atk);
    }
    expect(curveAt(curve, 0.5)).toBe(curve[0]);
    expect(curveAt(curve, 1e12)).toBe(curve[curve.length - 1]);
  });

  it('moves enemies made for one level to another: weaker below, stronger above, none when equal', () => {
    const down = statScale(curve, 220, 90);
    expect(down.hp).toBeLessThan(0.5);
    expect(down.atk).toBeLessThan(0.7);
    expect(statScale(curve, 300, 380).hp).toBeGreaterThan(1);
    expect(statScale(curve, 220, 220)).toBeNull();
  });

  it('an editor area set to another level than its enemies plays at the editor level', () => {
    const world = createWorld(worldData);
    const map = worldData.maps.find((m) => m.id === 3);
    // the whole map painted as area 0 (enemies of LV 220), set to LV 90 in the editor
    const art = { width: 4, height: 4, layerData: { area: new Array(16).fill(0) }, areas: [{ id: 0, level: 90 }], objectProps: [] };
    applyEditorMap(world, 3, art, bossData, enemyData.pools);
    const area = world.map(3).areas[0];
    expect(area).toMatchObject({ level: 90, poolLevel: map.areas[0].level });
    const rng = () => createSeededRng(4);
    const scaled = pickAreaEnemy({ area, pools: enemyData.pools, hardMode: false }, rng());
    const plain = pickAreaEnemy({ area: map.areas[0], pools: enemyData.pools, hardMode: false }, rng());
    expect(scaled.id).toBe(plain.id);
    expect(scaled.hp).toBe(Math.round(plain.hp * area.statScale.hp));
    expect(scaled.atk).toBeLessThan(plain.atk);
    // same level as its enemies: untouched
    applyEditorMap(world, 3, { ...art, areas: [{ id: 0, level: map.areas[0].level }] }, bossData, enemyData.pools);
    expect(world.map(3).areas[0].statScale).toBeNull();
  });
});
