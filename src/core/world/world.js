/**
 * World model: maps, area lookup, neighbours and boss-win teleports.
 * Data comes from src/data/world.json (area grids and levels keep the original
 * progression geography; art and collision are our own).
 * Ports of StageMap.as StageSLVGetSetting and Include_GameData/WinBoss_MapCH.as.
 */
import { asInt, clamp } from '../util/num.js';

export function createWorld(worldData) {
  const byId = new Map();
  for (const m of worldData.maps) byId.set(m.id, m);
  // maps whose bosses come from the map editor (boss triggers): a copy with `bosses` replaced
  const overrides = new Map();
  return {
    start: worldData.start,
    maps: worldData.maps,
    map(id) {
      return overrides.get(id) ?? byId.get(id) ?? null;
    },
    /**
     * Bosses of a map placed by boss triggers (triggers.js parseBossTriggers). One or more
     * replace the world.json bosses of that map; an empty list restores them.
     */
    setMapBosses(id, bosses) {
      const m = byId.get(id);
      if (!m) return;
      if (bosses?.length) overrides.set(id, { ...m, bosses: bosses.map((b) => ({ ...b })) });
      else overrides.delete(id);
    },
  };
}

/** Area index of a map-local pixel position. */
export function areaIndexAt(map, x, y) {
  const { cols, rows, cells } = map.grid;
  const col = clamp(asInt((x / map.w) * cols), 0, cols - 1);
  const row = clamp(asInt((y / map.h) * rows), 0, rows - 1);
  return cells[row][col];
}

export function areaAt(map, x, y) {
  return map.areas[areaIndexAt(map, x, y)] ?? map.areas[0];
}

/** Which neighbour (if any) the player crosses into when leaving the map bounds. */
export function exitEdge(map, x, y) {
  if (x < 0 && map.neighbours.left > 0) return 'left';
  if (x >= map.w && map.neighbours.right > 0) return 'right';
  if (y < 0 && map.neighbours.up > 0) return 'up';
  if (y >= map.h && map.neighbours.down > 0) return 'down';
  return null;
}

/** Boss rectangle overlap test (map-local coordinates, rect centred on x,y). */
export function bossHit(boss, px, py) {
  const left = boss.x - boss.w / 2;
  const top = boss.y - boss.h / 2;
  return px >= left && px <= left + boss.w && py >= top && py <= top + boss.h;
}

/**
 * Destination after winning a boss (WinBoss_MapCH.as). Positions are expressed as
 * fractions of the destination map so they are independent of the art.
 * @returns {{ map:number, fx:number, fy:number, room?:'white'|'black' } | null}
 */
export function bossWinTeleport(bossId, rng) {
  switch (bossId) {
    case 3: return { map: 7, fx: 0.5, fy: 0.12 };
    case 8: {
      const dest = [17, 18, 28, 50][asInt(rng.next() * 4)];
      return { map: dest, fx: 0.5, fy: 0.5 };
    }
    case 9: return { map: 56, fx: 0.5, fy: 0.08 };
    case 12: return { map: 57, fx: 0.5, fy: 0.5 };
    case 90: return { map: 58, fx: 0.5, fy: 0.5 };
    case 13:
    case 19: return { map: 61, fx: 0.5, fy: 0.5 };
    case 25: return { map: 69, fx: 0.5, fy: 0.95 };
    case 60:
    case 62: return { map: 13, fx: 0.5, fy: 0.5, room: 'white' };
    case 66:
    case 68: return { map: 14, fx: 0.5, fy: 0.5, room: 'black' };
    case 26:
    case 27: return { map: 73, fx: 0.5, fy: 0.5 };
    default: return null;
  }
}

/** Bonus type stored for the white (14) / black (15) room counters: 1..5 battles. */
export function roomBonusValue(room, rng) {
  const charges = asInt(rng.next() * 4 + 1.5);
  return (room === 'white' ? 14 : 15) * 10 + charges;
}
