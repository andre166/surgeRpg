/**
 * Rules a map editor file (public/assets/maps/*.json) gives its map, applied to the world: the
 * bosses and slime kings of its boss triggers, and the area grid and levels of its area layer.
 * An area whose level differs from the one its enemies were made for gets their strength moved
 * to its level along the original's enemy curve (enemyCurve.js statScale): the editor's level
 * is what the area plays like.
 * Used by the map scene when it loads a map's art and by the balance simulator
 * (scripts/simulate.mjs) for every map at once, so both play the same world.
 */
import { parseBossTriggers, parseSlimeTriggers, isBossTrigger } from './triggers.js';
import { parseAreaLayer } from './areaLayer.js';
import { SLIME_IDS, SLIME_SIZE } from '../encounters/slimeBosses.js';
import { enemyCurve, statScale } from '../encounters/enemyCurve.js';
import { applyAreaContent } from '../encounters/areaMonsters.js';

/**
 * Applies `art` (or null: a map without editor art) to map `mapId` of `world` (`enemyPools`:
 * enemies.json pools, for the enemy curve), then the map's area content (`content`:
 * src/content/areas, areaMonsters.js; levels, names and monsters of its areas). A map with art
 * has only the bosses its triggers place (none = no boss; world.json's are for maps without
 * art). Returns { bosses, slimes, ignored } (ignored: boss triggers with an invalid or repeated id).
 */
export function applyEditorMap(world, mapId, art, bossData, enemyPools, content = null) {
  const map = world.maps.find((m) => m.id === mapId);
  if (!map) return { bosses: null, slimes: [], ignored: 0 };
  const bosses = art
    ? parseBossTriggers(art, map, world.maps.flatMap((m) => m.bosses ?? []), { validIds: new Set(Object.keys(bossData.mapBosses).map(Number)) })
    : null;
  const slimes = art ? parseSlimeTriggers(art, map, SLIME_SIZE, { validIds: new Set(SLIME_IDS) }) : [];
  world.setMapBosses(mapId, bosses);
  world.setMapSlimes(mapId, slimes);
  const layer = art ? parseAreaLayer(art, map, world.maps) : null;
  if (layer && enemyPools) {
    const curve = enemyCurve(world.maps, enemyPools);
    layer.areas = layer.areas.map((a) => ({ ...a, statScale: statScale(curve, a.poolLevel, a.level) }));
  }
  world.setMapAreas(mapId, layer);
  if (content && enemyPools) world.setMapAreas(mapId, applyAreaContent(world.map(mapId), content, world.maps, enemyPools));
  const triggerCount = (art?.objectProps ?? []).filter(isBossTrigger).length;
  return { bosses, slimes, ignored: Math.max(0, triggerCount - (bosses?.length ?? 0) - slimes.length) };
}
