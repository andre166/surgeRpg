/**
 * The world the simulator plays: the game data with the map editor files applied to every map
 * the game links (src/game/mapArt.js) and the area content (src/content/areas), exactly like
 * the map scene does when it loads a map (core/world/editorMap.js). `original: true` keeps the original world (world.json only).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createWorld, areaIndexAt } from '../../src/core/world/world.js';
import { applyEditorMap } from '../../src/core/world/editorMap.js';
import { parseTriggers, triggerMapId, cellCentre } from '../../src/core/world/triggers.js';
import { withCustomBosses } from '../../src/core/encounters/customBosses.js';

const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

/** Map id -> editor file name, read from src/game/mapArt.js (MAP_ART) without importing it (it uses import.meta.env). */
function linkedMapFiles(root) {
  const src = fs.readFileSync(path.join(root, 'src/game/mapArt.js'), 'utf8');
  const block = /const MAP_ART = \{([\s\S]*?)\};/.exec(src)?.[1] ?? '';
  const files = new Map([...block.matchAll(/(\d+):\s*'([^']+)'/g)].map((m) => [Number(m[1]), m[2]]));
  for (const m of readJson(root, 'src/data/namedMaps.json').maps) files.set(m.id, m.art);
  return files;
}

/** Area content by map id (src/content/areas/*.json, like src/game/areaContent.js). */
export function areaContents(root) {
  const dir = path.join(root, 'src/content/areas');
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (Number.isInteger(c?.map)) out.set(c.map, c);
  }
  return out;
}

export function loadGame(root, { original = false } = {}) {
  const worldData = readJson(root, 'src/data/world.json');
  const data = {
    catalog: readJson(root, 'src/data/items.json'),
    enemyPools: readJson(root, 'src/data/enemies.json').pools,
    bossData: withCustomBosses(readJson(root, 'src/data/bosses.json'), worldData.maps),
  };
  const world = createWorld({ ...worldData, namedMaps: readJson(root, 'src/data/namedMaps.json').maps });
  const exits = new Map(); // map id -> Set of map ids reachable through teleport triggers
  const edited = [];
  if (!original) {
    const contents = areaContents(root);
    const files = linkedMapFiles(root);
    for (const id of new Set([...files.keys(), ...contents.keys()])) {
      const art = files.has(id) ? readJson(root, `public/assets/maps/${files.get(id)}.json`) : null;
      applyEditorMap(world, id, art, data.bossData, data.enemyPools, contents.get(id) ?? null);
      if (art) exits.set(id, new Set(parseTriggers(art).map((t) => triggerMapId(t, id, world)).filter((m) => m != null && m !== id)));
      edited.push(id);
    }
    edited.sort((a, b) => a - b);
  }
  return { world, data, exits, edited };
}

/** Maps reachable from `from` by walking (edges to neighbours, teleport triggers): ids in BFS order. */
export function reachableMaps(world, exits, from) {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift();
    const map = world.map(id);
    if (!map) continue;
    const next = [...Object.values(map.neighbours ?? {}).filter((n) => n > 0), ...(exits.get(id) ?? [])];
    for (const n of next) {
      if (seen.has(n) || !world.map(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return [...seen];
}

/** One spot per area painted on a map: { [areaIdx]: { x, y } } (the centre of the area's middle cell). */
export function areaSpots(map) {
  const { cols, rows, cells } = map.grid;
  const byArea = new Map();
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const a = cells[r][c];
      if (!byArea.has(a)) byArea.set(a, []);
      byArea.get(a).push([c, r]);
    }
  }
  const spots = {};
  for (const [a, list] of byArea) {
    const [c, r] = list[Math.floor(list.length / 2)];
    const p = cellCentre(c, r, cols, rows, map.w, map.h);
    // the grid cell centre lies in that area by construction; checked for safety
    if (areaIndexAt(map, p.x, p.y) === a) spots[a] = p;
  }
  return spots;
}
