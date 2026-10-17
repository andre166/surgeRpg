import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import { createWorld, bossHit } from '../core/world/world.js';
import { parseBossTriggers, parseTriggers, isBossTrigger, bossSprites, DEFAULT_BOSS_SIZE } from '../core/world/triggers.js';
import { createProfile } from '../core/persistence/profile.js';
import { startRun, bossTouch } from '../core/session/session.js';
import { mapSlimes } from '../core/encounters/slimeBosses.js';

const allBosses = createWorld(worldData).maps.flatMap((m) => m.bosses ?? []);
const validIds = new Set(Object.keys(bossData.mapBosses).map(Number));
const map1 = { w: 1600, h: 1600 };
// 64x64 cells over 1600x1600: 25px cells
const cell = (col, row) => row * 64 + col;
const trigger = (index, data, name = 'boss') => ({ index, type: 'trigger', name, data, pages: [{ command: '', note: '' }] });
const art = (...objectProps) => ({ width: 64, height: 64, objectProps });

describe('boss triggers', () => {
  it('places the boss at the centre of the trigger cell, sized like world.json', () => {
    const bosses = parseBossTriggers(art(trigger(cell(10, 40), '{"boss":0}')), map1, allBosses);
    expect(bosses).toEqual([{ id: 0, x: 262.5, y: 1012.5, w: 188, h: 112, scale: 2.5 }]);
  });

  it('accepts the bestiary id ("boss#0") and numeric strings', () => {
    for (const data of ['{"boss":"boss#0"}', '{"boss":"BOSS # 0"}', '{"boss":"0"}']) {
      expect(parseBossTriggers(art(trigger(cell(10, 40), data)), map1, allBosses).map((b) => b.id)).toEqual([0]);
    }
    expect(parseBossTriggers(art(trigger(cell(10, 40), '{"boss":"slime#0"}')), map1, allBosses)).toEqual([]);
  });

  it('uses the w/h of the trigger when given', () => {
    const [b] = parseBossTriggers(art(trigger(cell(10, 40), '{"boss":0,"w":100,"h":60}')), map1, allBosses);
    expect(b).toMatchObject({ id: 0, w: 100, h: 60 });
  });

  it('falls back to the default size for a boss missing from world.json', () => {
    const [b] = parseBossTriggers(art(trigger(cell(0, 0), '{"boss":5}')), map1, []);
    expect(b).toEqual({ id: 5, x: 12.5, y: 12.5, ...DEFAULT_BOSS_SIZE, scale: 1 });
  });

  it('skips invalid and repeated ids', () => {
    const bosses = parseBossTriggers(
      art(
        trigger(1, '{"boss":-1}'),
        trigger(2, '{"boss":"abc"}'),
        trigger(3, '{"boss":1.5}'),
        trigger(4, ''),
        trigger(5, '{"boss":99999}'),
        trigger(6, '{"boss":2}'),
        trigger(7, '{"boss":2}'),
        { index: 8, type: 'npc', name: 'boss', data: '{"boss":3}' },
      ),
      map1,
      allBosses,
      { validIds },
    );
    expect(bosses.map((b) => [b.id, b.x])).toEqual([[2, 6 * 25 + 12.5]]);
  });

  it('boss triggers are not "enter the cell" triggers', () => {
    const a = art(trigger(cell(10, 40), '{"boss":0}'), trigger(cell(11, 40), '{"map":"","x":3,"y":4}', 'teleport'));
    expect(isBossTrigger(a.objectProps[0])).toBe(true);
    expect(parseTriggers(a).map((t) => t.cell)).toEqual([cell(11, 40)]);
  });
});

describe('world boss override', () => {
  it('boss triggers replace the world.json bosses of that map; none keeps them', () => {
    const world = createWorld(worldData);
    const original = world.map(1).bosses;
    const placed = parseBossTriggers(art(trigger(cell(10, 40), '{"boss":0}')), world.map(1), allBosses);
    world.setMapBosses(1, placed);
    expect(world.map(1).bosses).toEqual(placed);
    expect(world.map(1).areas).toBe(worldData.maps.find((m) => m.id === 1).areas);
    expect(world.maps.find((m) => m.id === 1).bosses).toBe(original);
    expect(world.map(2).bosses).toEqual(worldData.maps.find((m) => m.id === 2).bosses);
    world.setMapBosses(1, []);
    expect(world.map(1).bosses).toBe(original);
  });

  it('touch and slime use the trigger position', () => {
    const world = createWorld(worldData);
    world.setMapBosses(1, parseBossTriggers(art(trigger(cell(10, 40), '{"boss":0}')), world.map(1), allBosses));
    const boss = world.map(1).bosses[0];
    const run = startRun({ profile: createProfile(), characterIndex: 0, hardMode: false, world, catalog });

    // walking into the new rectangle starts the fight, the hero stops next to it
    const below = boss.y + boss.h / 2 + 20;
    const hit = bossTouch(run, world, boss.x, below, boss.x, below - 30);
    expect(hit.bossId).toBe(0);
    expect(bossHit(boss, hit.x, hit.y)).toBe(false);
    // the old place (800, 200) is empty now
    expect(bossTouch(run, world, 800, 270, 800, 250)).toEqual({ bossId: -1, slimeId: -1, x: 800, y: 250 });

    // slime: right of the boss, same row, outside its rectangle
    const [s] = mapSlimes(world.map(1));
    expect(s.y).toBe(boss.y);
    expect(s.x).toBeGreaterThan(boss.x + boss.w / 2);
    expect(bossHit(boss, s.x, s.y)).toBe(false);
    expect(bossTouch(run, world, s.x, s.y + s.h, s.x, s.y).slimeId).toBe(0);
  });
});

describe('boss sprites', () => {
  it('sprites standing on a boss trigger (same cell or the one below) belong to that boss', () => {
    const a = {
      ...art(trigger(cell(17, 27), '{"boss":"boss#0"}'), trigger(cell(2, 31), '{"map":"map2"}', '')),
      sprites: [
        { assetId: 'tree', x: 17, y: 26 }, // above the trigger: scenery
        { assetId: 'orc', x: 17, y: 28 }, // feet just below the trigger cell: the boss
        { assetId: 'rock', x: 18, y: 27 }, // next column: scenery
        { assetId: 'bush', x: 2, y: 31 }, // on a teleport trigger: scenery
      ],
    };
    expect([...bossSprites(a)]).toEqual([[1, 0]]);
  });
});
