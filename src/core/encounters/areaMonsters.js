/**
 * Area content made in the game (src/content/areas/<map file>.json, edited by hand or with the
 * area tool, tools/areas.html): per map area, its level and the monsters met there.
 *
 *   { "map": 1, "areas": [ { "id": 6, "name": "Clareira", "level": 85,
 *       "monsters": [ { "sprite": "ene1_0a", "weight": 10 } ] } ] }
 *
 * A monster is picked by its sprite (the original's enemies reuse one sprite at several levels).
 * In an area of level L it plays as its original entry made for the level closest to L (its
 * stat proportions and drops), with HP, ATK and gold moved to L along the original's enemy
 * curve (enemyCurve.js). An area without monsters keeps the enemy pool of the original area it
 * takes (areaLayer.js), rescaled to its level the same way.
 */
import { enemyCurve, statScale } from './enemyCurve.js';
import { expForLevel } from '../progression/expTable.js';

const indexCache = new WeakMap(); // pools -> index

/**
 * Every enemy entry of the original world by sprite: Map<sprite, [{ key, entry, level, baseHp,
 * baseAtk, expScale, hard }]> (key "<pool>#<index>", like the encounters and the bestiary; level:
 * the lowest level of the areas using that pool).
 */
export function monsterIndex(maps, pools) {
  if (indexCache.has(pools)) return indexCache.get(pools);
  const byKey = new Map();
  for (const m of maps) {
    for (const area of m.areas) {
      if (!(area.level >= 1)) continue;
      for (const [poolKey, hard] of [[area.pool, false], [area.poolHard, true]]) {
        const pool = poolKey ? pools[poolKey] : null;
        if (!pool) continue;
        pool.forEach((entry, i) => {
          const key = `${poolKey}#${i}`;
          const prev = byKey.get(key);
          if (prev && prev.level <= area.level) return;
          byKey.set(key, { key, entry, level: area.level, baseHp: area.baseHp, baseAtk: area.baseAtk, expScale: area.expScale, hard });
        });
      }
    }
  }
  const index = new Map();
  for (const rec of byKey.values()) {
    if (!index.has(rec.entry.sprite)) index.set(rec.entry.sprite, []);
    index.get(rec.entry.sprite).push(rec);
  }
  for (const list of index.values()) list.sort((a, b) => a.level - b.level);
  indexCache.set(pools, index);
  return index;
}

/** The original entry of a sprite made for the level closest to `level` (log distance); hard-mode pools for hard mode when it has one. */
export function closestEntry(index, sprite, level, hard = false) {
  const all = index.get(sprite) ?? [];
  const list = all.filter((r) => r.hard === hard).length ? all.filter((r) => r.hard === hard) : all;
  let best = null;
  for (const r of list) if (!best || Math.abs(Math.log(r.level / level)) < Math.abs(Math.log(best.level / level))) best = r;
  return best;
}

/** expScale of the original area whose level is the closest to `level` (an area's EXP factor follows its level). */
export function expScaleNear(maps, level) {
  let best = null;
  for (const m of maps) {
    for (const a of m.areas) {
      if (!(a.level >= 1) || a.expScale == null) continue;
      if (!best || Math.abs(Math.log(a.level / level)) < Math.abs(Math.log(best.level / level))) best = a;
    }
  }
  return best?.expScale ?? -2;
}

/**
 * Monsters of an area resolved for its level: { normal, hard } lists of { key, entry, fromLevel,
 * baseHp, baseAtk, scale, weight } (unknown sprites and weights <= 0 are left out).
 */
export function resolveMonsters(maps, pools, monsters, level) {
  const index = monsterIndex(maps, pools);
  const curve = enemyCurve(maps, pools);
  const resolve = (hard) => (monsters ?? []).flatMap((m) => {
    const weight = Number(m?.weight);
    const rec = m?.sprite ? closestEntry(index, m.sprite, level, hard) : null;
    if (!rec || !(weight > 0)) return [];
    return [{ key: rec.key, entry: rec.entry, fromLevel: rec.level, baseHp: rec.baseHp, baseAtk: rec.baseAtk, scale: statScale(curve, rec.level, level), weight }];
  });
  return { normal: resolve(false), hard: resolve(true) };
}

/**
 * What a monster is like in an area of `level` (for the area tool): { key, fromLevel, hp, atk,
 * gold, exp, drops } with exp for an area of `expScale` (normal mode); null for an unknown sprite.
 */
export function describeMonster(maps, pools, sprite, level, expScale) {
  const rec = closestEntry(monsterIndex(maps, pools), sprite, level, false);
  return rec ? describeEntry(maps, pools, rec, level, expScale) : null;
}

/**
 * The same for one original entry (`rec`: { key, entry, level, baseHp, baseAtk }, `level`: the
 * level it was made for) played in an area of `level`: an area that keeps the original's enemies.
 */
export function describeEntry(maps, pools, rec, level, expScale) {
  const s = statScale(enemyCurve(maps, pools), rec.level, level) ?? { hp: 1, atk: 1, gold: 1 };
  const e = rec.entry;
  const hp = (e.hpMul != null ? rec.baseHp * e.hpMul : e.hp) * s.hp;
  const atk = (e.atkMul != null ? rec.baseAtk * e.atkMul : e.atk) * s.atk;
  const exp = expScale === -2 ? e.expParam : expForLevel(Math.round(level)) * expScale * (1 + e.expParam / 50);
  return { key: rec.key, name: e.name, fromLevel: rec.level, hp: Math.round(hp), atk: Math.round(atk), gold: Math.round(e.gold * s.gold), exp: Math.floor(exp), drops: (e.drops ?? []).filter(Boolean) };
}

/**
 * Lowest original area level where each item drops from a regular enemy:
 * Map<"<type>:<itemId>", level> (the area tool warns about drops far above the area's level).
 */
export function itemDropLevels(maps, pools) {
  const out = new Map();
  for (const rec of [...monsterIndex(maps, pools).values()].flat()) {
    for (const d of rec.entry.drops ?? []) {
      if (!d) continue;
      const k = `${d.type}:${d.itemId}`;
      if (!out.has(k) || rec.level < out.get(k)) out.set(k, rec.level);
    }
  }
  return out;
}

/**
 * Applies a map's area content to the map's current areas (world.map(mapId): world.json or the
 * editor's area layer): level, name and monsters of each area listed; ids past the map's areas
 * add areas (enemies of area 0 until they get monsters). Returns { grid, areas } for
 * world.setMapAreas.
 */
export function applyAreaContent(map, content, maps, pools) {
  const areas = map.areas.map((a) => ({ ...a }));
  const curve = enemyCurve(maps, pools);
  for (const c of content?.areas ?? []) {
    if (!Number.isInteger(c?.id) || c.id < 0) continue;
    while (areas.length <= c.id) areas.push({ ...map.areas[0], id: areas.length, label: [-1, -1], labels: [], poolLevel: map.areas[0].poolLevel ?? map.areas[0].level });
    const a = areas[c.id];
    const level = Number(c.level) > 0 ? Number(c.level) : a.level;
    const poolLevel = a.poolLevel ?? a.level;
    const next = { ...a, level, poolLevel, statScale: statScale(curve, poolLevel, level) };
    if (c.name) next.name = c.name;
    const monsters = resolveMonsters(maps, pools, c.monsters, level);
    if (monsters.normal.length) {
      next.monsters = monsters;
      next.expScale = expScaleNear(maps, level);
    }
    areas[c.id] = next;
  }
  return { grid: map.grid, areas };
}
