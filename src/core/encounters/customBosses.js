/**
 * Surge-only map bosses (not in the original game), merged into data/bosses.json by
 * withCustomBosses. Each is made for an area level: HP, ATK, EXP and gold are interpolated
 * between the original map bosses that stand at the nearest levels below and above it
 * (balancedStats), so it fits the original curve. Place them with a boss trigger in the map
 * editor ({"boss": 29}); they have no position in world.json.
 */
import { expForLevel } from '../progression/expTable.js';
import { areaAt } from '../world/world.js';

/**
 * Original map bosses used as balance anchors: [boss ids, level of the area each stands in
 * (world.json)]. Bosses standing at about the same level are merged (geometric mean): one of
 * them is all HP and the other all ATK, and a mix of both is what the curve should follow.
 */
const ANCHORS = [
  [[0], [710]],
  [[1, 2], [2222, 2000]],
  [[3], [5200]],
  [[4, 5, 6, 7], [10840, 12000, 12400, 13111]],
  [[8], [20000]],
];

/**
 * Below the first anchor (boss 0, LV 710) there is no boss to interpolate with: the stats follow
 * the original's regular enemies down from that boss (log-log slopes of their average HP, ATK
 * and gold over the areas of LV 100..710, enemies.json), and EXP the one-level EXP table, which
 * is what regular enemy EXP scales with.
 */
const LOW_SLOPES = { hp: 1.26, atk: 0.891, gold: 0.258 };

const STATS = ['hp', 'atk', 'expParam', 'gold'];
const geoMean = (values) => Math.exp(values.reduce((s, v) => s + Math.log(v), 0) / values.length);

/**
 * { hp, atk, expParam, gold } of a map boss standing at `level`: log-log interpolation between
 * the two anchors around it (past the last one, the last segment is extended; below the first,
 * see LOW_SLOPES).
 */
export function balancedStats(mapBosses, level) {
  const points = ANCHORS.map(([ids, levels]) => {
    const p = { level: geoMean(levels) };
    for (const k of STATS) p[k] = geoMean(ids.map((id) => mapBosses[id][k]));
    return p;
  });
  if (level < points[0].level) {
    const [a, r] = [points[0], level / points[0].level];
    return {
      hp: Math.round(a.hp * r ** LOW_SLOPES.hp),
      atk: Math.round(a.atk * r ** LOW_SLOPES.atk),
      expParam: Math.round((a.expParam * expForLevel(Math.round(level))) / expForLevel(Math.round(a.level))),
      gold: Math.round(a.gold * r ** LOW_SLOPES.gold),
    };
  }
  let i = points.findIndex((p) => p.level >= level);
  if (i <= 0) i = i === 0 ? 1 : points.length - 1;
  const [a, b] = [points[i - 1], points[i]];
  const t = Math.log(level / a.level) / Math.log(b.level / a.level);
  const out = {};
  for (const k of STATS) out[k] = Math.round(Math.exp(Math.log(a[k]) + t * (Math.log(b[k]) - Math.log(a[k]))));
  return out;
}

/**
 * Custom map bosses by id: 29..31 (free between the original map bosses 0..28 and the event
 * bosses 32..90), then 200..299 (ids 100..199 are taken: hard-mode wins are saved as id + 100).
 * The name ("<Name> the <Title>") picks its pixel art (ui/bossArt.js).
 * Drops: { type: 0 weapon | 1 armor | 2 accessory, itemId, chance }, picked from the items
 * the enemies and bosses around that level drop. `baseLevel: true`: beating it raises the
 * base level like the original map bosses (progression/characters.js BASE_LEVEL_BOSSES).
 */
export const CUSTOM_MAP_BOSSES = {
  29: {
    level: 900,
    sprite: 'surge_b29',
    name: 'Pyreth the Arbiter',
    scale: 1,
    drops: [
      { type: 0, itemId: 11, chance: 0.1 }, // Obsidian Greatsword
      { type: 2, itemId: 2, chance: 0.08 }, // Vitality Gem III
      { type: 2, itemId: 10, chance: 0.08 }, // Guard Gem III
    ],
    hardDrops: null,
    bpBonus: 4,
  },
  31: {
    level: 380,
    sprite: 'surge_b31',
    name: 'Branith the Keeper',
    scale: 1,
    drops: [
      { type: 2, itemId: 0, chance: 0.25 }, // Vitality Gem
      { type: 2, itemId: 4, chance: 0.25 }, // Might Gem
      { type: 2, itemId: 8, chance: 0.25 }, // Guard Gem
    ],
    hardDrops: null,
    bpBonus: 3,
    baseLevel: true, // the boss of map 3
  },
  200: {
    level: 820,
    sprite: 'surge_b200',
    name: 'Thalor the Herald',
    scale: 1,
    drops: [
      { type: 2, itemId: 5, chance: 0.1 }, // Might Gem II
      { type: 2, itemId: 17, chance: 0.1 }, // Fortune Gem II
      { type: 0, itemId: 6, chance: 0.1 }, // Iron Falchion (the best weapon the LV 300..810 enemies drop)
    ],
    hardDrops: null,
    bpBonus: 4,
  },
};

/** Map boss id (original 0..28 or custom), as opposed to event bosses (32..90). */
export const isMapBossId = (id) => (id >= 0 && id < 32) || Object.hasOwn(CUSTOM_MAP_BOSSES, id);

/**
 * bosses.json with the custom map bosses added (a new object; the JSON is left untouched). Every
 * map boss gets its own `level`: a custom one the level it is made for; an original one, when
 * `maps` (world.json maps) is given, the level of the area it stands in on the original map.
 * Battles use it (not the level of the area where the editor puts the boss): its numbers and the
 * level shown stay the boss's own.
 */
export function withCustomBosses(bossData, maps = null) {
  const mapBosses = { ...bossData.mapBosses };
  for (const m of maps ?? []) {
    for (const b of m.bosses ?? []) {
      const level = areaAt(m, b.x, b.y)?.level;
      if (mapBosses[b.id] && level >= 1) mapBosses[b.id] = { ...mapBosses[b.id], level };
    }
  }
  for (const [id, c] of Object.entries(CUSTOM_MAP_BOSSES)) {
    mapBosses[id] = { id: Number(id), ...c, ...balancedStats(bossData.mapBosses, c.level), expScale: -2, goldScaled: false, custom: true };
  }
  return { ...bossData, mapBosses };
}
