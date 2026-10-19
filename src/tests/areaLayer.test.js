import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import { createWorld, areaAt, areaIndexAt } from '../core/world/world.js';
import { parseAreaLayer, areaLabels, areaRegionLabels, DEFAULT_AREA } from '../core/world/areaLayer.js';

const base = worldData.maps.find((m) => m.id === 1); // 1600x1600, 9x9 grid; 0:LV1 1:LV25 2:LV72 3:LV172 4:LV300 5:LV710
// 64x64 art cells over 1600x1600: 25px cells
const cell = (col, row) => row * 64 + col;
const centre = (col, row) => [col * 25 + 12.5, row * 25 + 12.5];
const art = (painted = {}, areas = undefined) => {
  const area = new Array(64 * 64).fill(-1);
  for (const [i, v] of Object.entries(painted)) area[i] = v;
  return { width: 64, height: 64, layerData: { area }, ...(areas && { areas }) };
};

describe('area layer', () => {
  it('reads the painted cells into a grid shaped like world.json', () => {
    const r = parseAreaLayer(art({ [cell(32, 32)]: 4 }), base);
    expect(r.grid.cols).toBe(64);
    expect(r.grid.rows).toBe(64);
    expect(r.grid.cells).toHaveLength(64);
    expect(r.grid.cells[0]).toHaveLength(64);
    expect(r.grid.cells[32][32]).toBe(4);
    expect(r.areas).toHaveLength(base.areas.length);
  });

  it('is null without the layer or without any painted cell', () => {
    expect(parseAreaLayer(art(), base)).toBeNull();
    expect(parseAreaLayer({ width: 64, height: 64, layerData: {} }, base)).toBeNull();
    expect(parseAreaLayer({ width: 64, height: 64, layerData: { area: [0, 1] } }, base)).toBeNull();
    expect(parseAreaLayer(null, base)).toBeNull();
  });

  it('areas come only from the editor: an unpainted cell (-1) is the default area, not the world.json grid', () => {
    const r = parseAreaLayer(art({ [cell(32, 32)]: 4 }), base);
    for (const [col, row] of [[0, 0], [63, 0], [0, 63], [31, 31], [40, 20]]) expect(r.grid.cells[row][col]).toBe(DEFAULT_AREA);
    // the world.json grid had other areas at some of those spots
    expect([[0, 0], [63, 0], [0, 63]].some(([col, row]) => areaIndexAt(base, ...centre(col, row)) !== DEFAULT_AREA)).toBe(true);
  });

  it('uses the default area where the id is not one of the map areas', () => {
    const r = parseAreaLayer(art({ [cell(32, 32)]: 99, [cell(33, 32)]: 2.5, [cell(34, 32)]: '3', [cell(35, 32)]: 1 }), base);
    expect(r.grid.cells[32][32]).toBe(0);
    expect(r.grid.cells[32][33]).toBe(0);
    expect(r.grid.cells[32][34]).toBe(0);
    expect(r.grid.cells[32][35]).toBe(1);
  });

  it('uses the editor level when given, else the world.json one', () => {
    const r = parseAreaLayer(art({ [cell(0, 0)]: 0 }, [{ id: 0, level: 7, name: 'Campina', color: '#7ec850' }, { id: 1 }, { id: 2, level: 'x' }, { id: 0, level: 9 }]), base);
    expect(r.areas[0].level).toBe(7);
    expect(r.areas[1].level).toBe(25);
    expect(r.areas[2].level).toBe(72);
    expect(r.areas[3].level).toBe(172);
    // the rest of the area data stays
    expect(r.areas[0]).toMatchObject({ id: 0, expScale: base.areas[0].expScale });
    expect(r.areas[0].name).toBeUndefined();
  });

  it('moves the level labels to where each area now is', () => {
    const labels = areaLabels([[1, 1, 1, 2], [1, 0, 1, 2], [1, 1, 1, 2], [0, 0, 0, 0]]);
    // area 0: the lone centre cell is smaller than the bottom row, which wins
    expect(labels.get(0)).toEqual([37.5, 87.5]);
    expect(labels.get(2)).toEqual([87.5, 37.5]);
    // the whole map painted with one area: the others have no label
    const painted = {};
    for (let i = 0; i < 64 * 64; i += 1) painted[i] = 2;
    const r = parseAreaLayer(art(painted), base);
    expect(r.areas[2].label[0]).toBeGreaterThan(40);
    expect(r.areas.filter((a) => a.id !== 2).every((a) => a.label[0] === -1)).toBe(true);
  });

  it('gives every separate region of an area its own label, but not the slivers', () => {
    // area 3 painted in two 8x8 blocks far apart, plus a lone cell
    const painted = {};
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        painted[cell(2 + c, 2 + r)] = 3;
        painted[cell(50 + c, 50 + r)] = 3;
      }
    }
    painted[cell(30, 10)] = 3;
    const r = parseAreaLayer(art(painted), base);
    const spots = r.areas[3].labels;
    expect(spots).toHaveLength(2);
    expect(spots[0][0]).toBeLessThan(20);
    expect(spots[1][0]).toBeGreaterThan(75);
    expect(r.areas[3].label).toEqual(spots[0]);
    expect(areaRegionLabels([[1, 0, 1]]).get(1)).toHaveLength(1);
  });
});

describe('world.setMapAreas', () => {
  it('replaces the grid and areas of world.map(id); null restores them', () => {
    const world = createWorld(worldData);
    const r = parseAreaLayer(art({ [cell(32, 32)]: 4 }, [{ id: 4, level: 333 }]), base);
    world.setMapAreas(1, r);
    expect(world.map(1).grid).toBe(r.grid);
    expect(world.map(1).areas).toBe(r.areas);
    expect(world.map(1).bosses).toBe(base.bosses);
    expect(world.map(2)).toBe(worldData.maps.find((m) => m.id === 2));
    world.setMapAreas(1, null);
    expect(world.map(1)).toBe(base);
  });

  it('keeps the world.json map when the art has no area layer', () => {
    const world = createWorld(worldData);
    world.setMapAreas(1, parseAreaLayer(art(), base));
    expect(world.map(1)).toBe(base);
  });

  it('lives together with the boss override', () => {
    const world = createWorld(worldData);
    const bosses = [{ id: 0, x: 100, y: 100, w: 50, h: 50, scale: 1 }];
    const r = parseAreaLayer(art({ [cell(32, 32)]: 4 }), base);
    world.setMapBosses(1, bosses);
    world.setMapAreas(1, r);
    expect(world.map(1).bosses).toEqual(bosses);
    expect(world.map(1).grid).toBe(r.grid);
    world.setMapBosses(1, null);
    expect(world.map(1).bosses).toBe(base.bosses);
    expect(world.map(1).grid).toBe(r.grid);
    world.setMapAreas(1, null);
    expect(world.map(1)).toBe(base);
  });

  it('areaAt follows the painted grid', () => {
    const world = createWorld(worldData);
    const [x, y] = centre(32, 32);
    expect(areaAt(world.map(1), x, y).level).toBe(1);
    world.setMapAreas(1, parseAreaLayer(art({ [cell(32, 32)]: 4 }, [{ id: 4, level: 300 }]), base));
    expect(areaAt(world.map(1), x, y)).toMatchObject({ id: 4, level: 300 });
    // the next cell was not painted: still the world.json area
    expect(areaAt(world.map(1), x + 25, y).level).toBe(1);
  });
});

describe('area refs ("map:area")', () => {
  const map7 = worldData.maps.find((m) => m.id === 7);

  it('plays like the referenced area of another map, with the editor level', () => {
    const r = parseAreaLayer(art({ [cell(32, 32)]: 2 }, [{ id: 2, ref: '7:6', level: 999 }]), base, worldData.maps);
    expect(r.areas[2]).toMatchObject({ id: 2, level: 999, source: '7:6', pool: map7.areas[6].pool, expScale: map7.areas[6].expScale });
    // other ids keep this map's areas
    expect(r.areas[1]).toMatchObject({ id: 1, level: 25, pool: base.areas[1].pool });
    expect(r.areas).toHaveLength(base.areas.length);
  });

  it('takes the referenced level when the editor gives none', () => {
    const r = parseAreaLayer(art({ [cell(0, 0)]: 0 }, [{ id: 0, ref: '2:1' }]), base, worldData.maps);
    expect(r.areas[0].level).toBe(132);
  });

  it('lets two ids share a ref with different levels', () => {
    const r = parseAreaLayer(art({ [cell(0, 0)]: 0, [cell(1, 0)]: 1 }, [{ id: 0, ref: '1:0', level: 1 }, { id: 1, ref: '1:0', level: 50 }]), base, worldData.maps);
    expect(r.areas[0]).toMatchObject({ source: '1:0', level: 1, pool: base.areas[0].pool });
    expect(r.areas[1]).toMatchObject({ source: '1:0', level: 50, pool: base.areas[0].pool });
  });

  it('adds areas for ids past the map areas', () => {
    const r = parseAreaLayer(art({ [cell(5, 5)]: 8 }, [{ id: 8, ref: '7:9' }]), base, worldData.maps);
    expect(r.areas).toHaveLength(9);
    expect(r.grid.cells[5][5]).toBe(8);
    expect(r.areas[8]).toMatchObject({ id: 8, level: 5200, source: '7:9' });
    expect(r.areas[7]).toMatchObject({ id: 7, level: base.areas[DEFAULT_AREA].level });
  });

  it('ignores a ref to a missing area (this map area with the same id)', () => {
    const r = parseAreaLayer(art({ [cell(0, 0)]: 3 }, [{ id: 3, ref: '1:40' }, { id: 4, ref: 'x' }]), base, worldData.maps);
    expect(r.areas[3]).toMatchObject({ id: 3, level: 172 });
    expect(r.areas[3].source).toBeUndefined();
    expect(r.areas[4].source).toBeUndefined();
  });
});
