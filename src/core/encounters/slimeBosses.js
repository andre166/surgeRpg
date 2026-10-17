/**
 * Slime bosses (not in the original game): the only source of talent points (TP).
 * A slime sits next to each map boss listed in SLIME_BOSS_IDS. It is weaker than its neighbour, fights like
 * a boss (touch to start), gives TP when defeated and is gone for the rest of the run;
 * it comes back on the next run.
 *
 * Slime ids match the id of the map boss they sit next to.
 */

/**
 * Map bosses that get a slime next to them: the first ten (maps 1 to 35), so each stretch of
 * the world has its own source of TP; add boss ids here to place more slimes.
 */
export const SLIME_BOSS_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const COLORS = [
  'Emerald', 'Azure', 'Crimson', 'Amber', 'Violet', 'Obsidian', 'Golden', 'Frost', 'Magma', 'Shadow',
  'Prism', 'Coral', 'Jade', 'Ivory', 'Storm', 'Rust', 'Lunar', 'Solar', 'Venom', 'Ember',
  'Tidal', 'Thorn', 'Ash', 'Crystal', 'Void', 'Rose', 'Iron', 'Spirit', 'Royal',
];

/** Fraction of the neighbouring map boss stats. */
const HP_RATIO = 0.35;
const ATK_RATIO = 0.5;
const GOLD_RATIO = 0.5;
const EXP_RATIO = 0.25;

/** Gap between the boss rectangle and the slime, and slime size relative to the boss. */
const GAP = 24;
const SIZE_RATIO = 0.6;

export function slimeName(id) {
  return `${COLORS[id % COLORS.length]} Slime King`;
}

/**
 * TP for defeating a slime: grows with the strength of its boss
 * (log2 of the boss HP in units of 10 000, at least 1).
 */
export function slimeTalentPoints(bossHp) {
  return Math.max(1, Math.floor(Math.log2(Math.max(1, bossHp / 10000))) + 1);
}

/** Slime rectangles of a map: right of each boss, or left when the right side is off the map. */
export function mapSlimes(map) {
  return (map.bosses ?? []).filter((b) => SLIME_BOSS_IDS.includes(b.id)).map((b) => {
    const w = Math.round(b.w * SIZE_RATIO);
    const h = Math.round(b.h * SIZE_RATIO);
    let x = b.x + b.w / 2 + GAP + w / 2;
    if (x + w / 2 > map.w - 8) x = b.x - b.w / 2 - GAP - w / 2;
    return { id: b.id, x, y: b.y, w, h };
  });
}

/** Battle definition (same shape as enemyPick.js mapBossDef). */
export function slimeDef(bossData, slimeId, areaLevel) {
  const b = SLIME_BOSS_IDS.includes(slimeId) ? bossData.mapBosses[slimeId] : null;
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
    talentPoints: slimeTalentPoints(b.hp),
  };
}
