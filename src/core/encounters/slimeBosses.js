/**
 * Slime bosses (not in the original game): the only source of talent points (TP).
 * The map editor places them with a boss trigger ({"boss": "slime#30"}). A slime fights like a
 * boss (touch to start), gives TP when defeated and is gone for the rest of the run; it comes
 * back on the next run.
 *
 * Its stats are a fraction of a map boss: for SLIME_BOSS_IDS, the map boss of the same id; for
 * STANDALONE_SLIMES, a map boss balanced for their level (customBosses.js balancedStats).
 */
import { balancedStats } from './customBosses.js';

/** Slimes made from the map boss of the same id: the first ten (maps 1 to 35). */
export const SLIME_BOSS_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Slimes made for a level, by id (30 and up, clear of SLIME_BOSS_IDS; slime ids are their own `slime#` keys): the level and their colour. */
export const STANDALONE_SLIMES = {
  30: { level: 4100, color: 'Prism' },
  31: { level: 7500, color: 'Storm' },
};

/** Every slime id. */
export const SLIME_IDS = [...SLIME_BOSS_IDS, ...Object.keys(STANDALONE_SLIMES).map(Number)];

const COLORS = [
  'Emerald', 'Azure', 'Crimson', 'Amber', 'Violet', 'Obsidian', 'Golden', 'Frost', 'Magma', 'Shadow',
  'Prism', 'Coral', 'Jade', 'Ivory', 'Storm', 'Rust', 'Lunar', 'Solar', 'Venom', 'Ember',
  'Tidal', 'Thorn', 'Ash', 'Crystal', 'Void', 'Rose', 'Iron', 'Spirit', 'Royal',
];

/** Fraction of the stats of the map boss the slime is made from. */
const HP_RATIO = 0.35;
const ATK_RATIO = 0.5;
const GOLD_RATIO = 0.5;
const EXP_RATIO = 0.25;

export function slimeName(id) {
  return `${STANDALONE_SLIMES[id]?.color ?? COLORS[id % COLORS.length]} Slime King`;
}

/**
 * TP for defeating a slime: grows with the strength of its boss
 * (log2 of the boss HP in units of 10 000, at least 1).
 */
export function slimeTalentPoints(bossHp) {
  return Math.max(1, Math.floor(Math.log2(Math.max(1, bossHp / 10000))) + 1);
}

/** Slime rectangles of a map: the ones its boss triggers place (map.slimes, world.setMapSlimes). */
export function mapSlimes(map) {
  return (map.slimes ?? []).filter((s) => SLIME_IDS.includes(s.id));
}

/** Size of a slime when its trigger gives none (0.6 of the default boss rectangle, triggers.js DEFAULT_BOSS_SIZE). */
export const SLIME_SIZE = Object.freeze({ w: 56, h: 34 });

/** The map boss a slime is made from: the one of the same id, or one balanced for the slime's level. */
function slimeSource(bossData, slimeId) {
  if (SLIME_BOSS_IDS.includes(slimeId)) return bossData.mapBosses[slimeId] ?? null;
  const s = STANDALONE_SLIMES[slimeId];
  return s ? { ...balancedStats(bossData.mapBosses, s.level), scale: 1, expScale: -2, level: s.level } : null;
}

/** Battle definition (same shape as enemyPick.js mapBossDef). */
export function slimeDef(bossData, slimeId, areaLevel) {
  const b = slimeSource(bossData, slimeId);
  if (!b) return null;
  const raw = b.expScale === -2;
  return {
    id: `slime#${slimeId}`,
    name: slimeName(slimeId),
    sprite: `slime${slimeId}`,
    scale: b.scale,
    hp: Math.round(b.hp * HP_RATIO),
    atk: Math.round(b.atk * ATK_RATIO),
    gold: Math.round(b.gold * GOLD_RATIO),
    expParam: raw ? Math.round(b.expParam * EXP_RATIO) : b.expParam,
    expMode: raw ? 'raw' : 'scaled',
    expScale: raw ? b.expScale : b.expScale * EXP_RATIO,
    skills: [0],
    drops: [null, null, null],
    hardDrops: null,
    bpBonus: 0,
    areaLevel,
    level: b.level ?? areaLevel, // the level of the boss it is made from, or its own
    talentPoints: slimeTalentPoints(b.hp),
  };
}
