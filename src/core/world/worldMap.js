/**
 * World map (not in the original game): the maps laid out as rooms on a grid, one board per
 * region. Two maps are neighbours when each lists the other on opposite edges (map.neighbours);
 * the few one-way edges of the original (secret exits) are left out. Every connected group of
 * maps is a region, laid out from its lowest map id by walking the edges (up = one row higher);
 * the original's maps fit such a grid with no overlap.
 *
 * Only the maps entered (profile.mapsSeen) are shown; the others stay hidden.
 */

const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Two-way edges of a map: [{ dir, to }]. */
function edges(map, byId) {
  return Object.entries(map.neighbours ?? {})
    .filter(([dir, to]) => to > 0 && byId[to]?.neighbours?.[OPPOSITE[dir]] === map.id)
    .map(([dir, to]) => ({ dir, to }));
}

/**
 * Regions of the world, lowest map id first: { id (its lowest map id), maps: [{ id, x, y }]
 * (x, y from 0), w, h, links: [[a, b]] (each neighbour pair once) }.
 */
export function worldRegions(maps) {
  const byId = Object.fromEntries(maps.map((m) => [m.id, m]));
  const placed = new Set();
  const regions = [];
  for (const start of [...maps].sort((a, b) => a.id - b.id)) {
    if (placed.has(start.id)) continue;
    const pos = { [start.id]: [0, 0] };
    const taken = new Set(['0,0']);
    const links = [];
    const queue = [start.id];
    placed.add(start.id);
    while (queue.length) {
      const id = queue.shift();
      for (const { dir, to } of edges(byId[id], byId)) {
        if (id < to) links.push([id, to]);
        if (pos[to]) continue;
        const [x, y] = pos[id];
        const p = [x + STEP[dir][0], y + STEP[dir][1]];
        // an edge that would land on a taken cell is left out of the layout (the link stays)
        if (taken.has(p.join())) continue;
        pos[to] = p;
        taken.add(p.join());
        placed.add(to);
        queue.push(to);
      }
    }
    const cells = Object.entries(pos).map(([id, [x, y]]) => ({ id: Number(id), x, y }));
    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    for (const c of cells) { c.x -= minX; c.y -= minY; }
    regions.push({
      id: start.id,
      maps: cells.sort((a, b) => a.id - b.id),
      w: Math.max(...cells.map((c) => c.x)) + 1,
      h: Math.max(...cells.map((c) => c.y)) + 1,
      links: links.filter(([a, b]) => pos[a] && pos[b]),
    });
  }
  return regions;
}

/** The region holding a map, or null. */
export function regionOf(regions, mapId) {
  return regions.find((r) => r.maps.some((m) => m.id === mapId)) ?? null;
}

/** Which maps of a region show: the ones entered (profile.mapsSeen) and the current one. */
export function regionSeen(region, seen, currentId) {
  return Object.fromEntries(region.maps.map((m) => [m.id, m.id === currentId || !!seen?.[m.id]]));
}

/** Areas that really are on a map: the ones its grid uses (an area listed but not painted is left out). */
export function mapAreasInUse(map) {
  const used = new Set((map?.grid?.cells ?? []).flat());
  const areas = map?.areas ?? [];
  return used.size ? areas.filter((a, i) => used.has(i)) : areas;
}

/**
 * What a map holds, for the world map: { range: [min, max] (the levels of its areas in use, its
 * bosses' and its Slime Kings'; [0, 0] without any), drops: [{ type, itemId }] (every item its
 * monsters and bosses can drop in this mode, once each, by type then id) }.
 * `slimes`: [{ id, level }] of the map; `areaLevelAt(x, y)`: the level of the area at a point.
 */
export function mapSummary(map, { pools, bossData, hardMode = false, slimes = [], areaLevelAt = () => 0 }) {
  const levels = [];
  const drops = new Map();
  const addDrops = (list) => {
    for (const d of list ?? []) if (d) drops.set(`${d.type}:${d.itemId}`, { type: d.type, itemId: d.itemId });
  };
  for (const a of mapAreasInUse(map)) {
    if (a.level > 0) levels.push(a.level);
    // the monsters placed in the area (areaMonsters.js), else the original area's pool
    const own = a.monsters ? (hardMode && a.monsters.hard.length ? a.monsters.hard : a.monsters.normal) : null;
    const entries = own?.length ? own.map((m) => m.entry) : (pools[hardMode && a.poolHard ? a.poolHard : a.pool] ?? []);
    for (const e of entries) addDrops(hardMode && e.hardDrops ? e.hardDrops : e.drops);
  }
  for (const b of map?.bosses ?? []) {
    const lv = areaLevelAt(b.x, b.y);
    if (lv > 0) levels.push(lv);
    const def = bossData?.mapBosses?.[b.id];
    if (def) addDrops(hardMode && def.hardDrops ? def.hardDrops : def.drops);
  }
  for (const s of slimes) if (s.level > 0) levels.push(s.level);
  const list = [...drops.values()].sort((x, y) => x.type - y.type || x.itemId - y.itemId);
  return { range: levels.length ? [Math.min(...levels), Math.max(...levels)] : [0, 0], drops: list };
}
