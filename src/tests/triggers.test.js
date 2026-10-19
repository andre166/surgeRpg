import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { parseTriggers, spawnCell, triggerMapId, cellAt, cellCentre } from '../core/world/triggers.js';
import { createWorld } from '../core/world/world.js';
import worldData from '../data/world.json';
import namedMaps from '../data/namedMaps.json';

// shapes saved by the map editor (map1.json)
const art = {
  width: 64,
  height: 64,
  objectProps: [
    { index: 1694, type: 'spawn', name: '', data: '', pages: [{ command: '', note: '' }] },
    { index: 1752, type: 'trigger', name: 'teleport', data: '', pages: [{ command: '', note: '', transfer: { type: 'transfer', map: '', x: 30, y: 26, dir: '' } }] },
    { index: 1764, type: 'trigger', name: 'teleport', data: '{"map":"mapa2","dir":"left"}', pages: [{ command: '', note: '' }] },
    { index: 5, type: 'npc', name: 'teleport', data: '' },
    { index: 6, type: 'trigger', name: 'chest', data: '' },
  ],
};

describe('map triggers', () => {
  it('reads teleports from page transfers and from data JSON', () => {
    expect(parseTriggers(art)).toEqual([
      { cell: 1752, col: 24, row: 27, map: '', x: 30, y: 26, dir: null },
      { cell: 1764, col: 36, row: 27, map: 'mapa2', x: null, y: null, dir: 'left' },
    ]);
  });

  it('finds the spawn cell', () => {
    expect(spawnCell(art)).toEqual({ col: 30, row: 26 });
    expect(spawnCell({ width: 4, objectProps: [] })).toBeNull();
  });

  it('empty map = same map; names end in the map number', () => {
    const [same, other] = parseTriggers(art);
    expect(triggerMapId(same, 1)).toBe(1);
    expect(triggerMapId(other, 1)).toBe(2);
    expect(triggerMapId({ map: 'map12' }, 1)).toBe(12);
    expect(triggerMapId({ map: 'cave' }, 1)).toBeNull();
  });

  it('named maps (namedMaps.json) are reached by their editor file name', () => {
    const world = createWorld({ ...worldData, namedMaps: namedMaps.maps });
    const castle = namedMaps.maps.find((m) => m.art === 'entrada_castelo');
    expect(triggerMapId({ map: 'entrada_castelo' }, 1, world)).toBe(castle.id);
    expect(world.map(castle.id).areas).toHaveLength(1);
    expect(triggerMapId({ map: 'map2' }, 1, world)).toBe(2);
    // every trigger of the castle maps leads to a known map
    for (const m of namedMaps.maps) {
      const file = JSON.parse(fs.readFileSync(`public/assets/maps/${m.art}.json`, 'utf8'));
      for (const t of parseTriggers(file)) expect(world.map(triggerMapId(t, m.id, world))).not.toBeNull();
    }
  });

  it('cells are stretched over the map size', () => {
    // 64x64 cells over 1600x1600: 25px cells
    expect(cellAt(24 * 25 + 1, 27 * 25 + 24, 64, 64, 1600, 1600)).toBe(1752);
    expect(cellAt(-1, 0, 64, 64, 1600, 1600)).toBe(-1);
    expect(cellCentre(30, 26, 64, 64, 1600, 1600)).toEqual({ x: 762.5, y: 662.5 });
  });
});
