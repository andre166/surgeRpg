import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import { worldRegions, regionOf, regionSeen, mapAreasInUse, mapSummary } from '../core/world/worldMap.js';

const regions = worldRegions(worldData.maps);

describe('world map', () => {
  it('lays every map out once, on a grid with no two rooms on the same cell', () => {
    const ids = regions.flatMap((r) => r.maps.map((m) => m.id)).sort((a, b) => a - b);
    expect(ids).toEqual(worldData.maps.map((m) => m.id).sort((a, b) => a - b));
    for (const r of regions) {
      const cells = r.maps.map((m) => `${m.x},${m.y}`);
      expect(new Set(cells).size).toBe(cells.length);
    }
  });
  it('neighbours sit next to each other on their edge (map 1: 5 above, 3 right, 2 below, 4 left)', () => {
    const r = regionOf(regions, 1);
    const at = (id) => r.maps.find((m) => m.id === id);
    const one = at(1);
    expect([at(5).x - one.x, at(5).y - one.y]).toEqual([0, -1]);
    expect([at(3).x - one.x, at(3).y - one.y]).toEqual([1, 0]);
    expect([at(2).x - one.x, at(2).y - one.y]).toEqual([0, 1]);
    expect([at(4).x - one.x, at(4).y - one.y]).toEqual([-1, 0]);
    expect(r.links).toContainEqual([1, 5]);
  });
  it('only the maps entered (and the current one) show', () => {
    const r = regionOf(regions, 1);
    const shown = regionSeen(r, { 2: 1 }, 1);
    expect(shown[1]).toBe(true);
    expect(shown[2]).toBe(true);
    expect(shown[3]).toBe(false);
  });
  it('a map: levels of its areas in use, bosses and slime kings; every item that can drop there', () => {
    const map1 = worldData.maps.find((m) => m.id === 1);
    expect(mapAreasInUse(map1).length).toBe(map1.areas.length);
    const sum = mapSummary(map1, { pools: enemyData.pools, bossData, slimes: [{ id: 0, level: 5000 }], areaLevelAt: () => 710 });
    expect(sum.range).toEqual([1, 5000]); // the slime king raises the top
    const pool = enemyData.pools[map1.areas[0].pool];
    for (const d of pool[0].drops.filter(Boolean)) expect(sum.drops).toContainEqual({ type: d.type, itemId: d.itemId });
    for (const d of bossData.mapBosses[0].drops.filter(Boolean)) expect(sum.drops).toContainEqual({ type: d.type, itemId: d.itemId });
    expect(new Set(sum.drops.map((d) => `${d.type}:${d.itemId}`)).size).toBe(sum.drops.length); // once each
    // an area listed but not painted on the grid does not count
    const painted = { ...map1, grid: { ...map1.grid, cells: map1.grid.cells.map((row) => row.map(() => 0)) } };
    expect(mapSummary(painted, { pools: enemyData.pools, bossData }).range).toEqual([1, 1]);
  });
});
