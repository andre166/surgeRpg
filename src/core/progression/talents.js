/**
 * Talent tree (not in the original game): permanent passive percent bonuses bought
 * with talent points (TP), incremental-game style. TP only come from slime bosses
 * (src/core/encounters/slimeBosses.js).
 *
 * Talents belong to a hero: every hero has its own TP and its own tree
 * (profile.heroTalents[heroIndex]); TP from a slime go to the hero of that run.
 *
 * Five branches (one per stat), five talents each. Inside a branch, a talent unlocks
 * once the previous one reaches UNLOCK_RANK (or its max rank if lower). Each rank costs
 * ceil(baseCost * COST_GROWTH^rank) TP. Bonuses add to the stat percent bonus of
 * computeStats (applied to base + flat, like equipment percents).
 */

export const COST_GROWTH = 1.35;
export const UNLOCK_RANK = 3;

/** Talent tiers shared by every branch: max rank, percent per rank, base cost, and which stat it boosts. */
const TIERS = [
  { maxRank: 10, perRank: 0.02, baseCost: 1 },
  { maxRank: 10, perRank: 0.04, baseCost: 2 },
  { maxRank: 5, perRank: 0.03, baseCost: 4, cross: true },
  { maxRank: 5, perRank: 0.08, baseCost: 8 },
  { maxRank: 3, perRank: 0.15, baseCost: 20 },
];

/** Branch stat and the stat its third (cross) talent boosts. */
const BRANCHES = [
  { id: 'atk', cross: 'speed' },
  { id: 'def', cross: 'hp' },
  { id: 'speed', cross: 'atk' },
  { id: 'hp', cross: 'def' },
  { id: 'luck', cross: 'atk' },
];

/** Flat list of talents: { id: 'atk1'..'luck5', branch, tier (0-4), stat, maxRank, perRank, baseCost }. */
export const TALENTS = BRANCHES.flatMap((b) => TIERS.map((t, i) => ({
  id: `${b.id}${i + 1}`,
  branch: b.id,
  tier: i,
  stat: t.cross ? b.cross : b.id,
  maxRank: t.maxRank,
  perRank: t.perRank,
  baseCost: t.baseCost,
})));

export const TALENT_BRANCHES = BRANCHES.map((b) => b.id);
const BY_ID = Object.fromEntries(TALENTS.map((t) => [t.id, t]));

export function createTalents() {
  return { points: 0, earned: 0, ranks: {} };
}

/** A hero's talent tree ({ points, earned, ranks }); empty for heroes without any. */
export function heroTalents(profile, characterIndex) {
  const t = profile?.heroTalents?.[characterIndex];
  return t ? { ...createTalents(), ...t, ranks: { ...(t.ranks ?? {}) } } : createTalents();
}

export function setHeroTalents(profile, characterIndex, talents) {
  return { ...profile, heroTalents: { ...(profile.heroTalents ?? {}), [characterIndex]: talents } };
}

export function talentRank(talents, id) {
  return talents?.ranks?.[id] ?? 0;
}

/** TP cost of the next rank (null when maxed). */
export function talentCost(id, rank) {
  const t = BY_ID[id];
  if (!t || rank >= t.maxRank) return null;
  return Math.ceil(t.baseCost * COST_GROWTH ** rank);
}

export function isTalentUnlocked(talents, id) {
  const t = BY_ID[id];
  if (!t) return false;
  if (t.tier === 0) return true;
  const prev = TALENTS.find((x) => x.branch === t.branch && x.tier === t.tier - 1);
  return talentRank(talents, prev.id) >= Math.min(UNLOCK_RANK, prev.maxRank);
}

/**
 * 'ok' | 'tier' (its tier is not bought, progression/unlocks.js talentTiers) | 'locked' | 'max' | 'no-points'.
 * `tiers`: how many tiers the account bought.
 */
export function talentBuyStatus(talents, id, tiers = Infinity) {
  if (BY_ID[id] && BY_ID[id].tier >= tiers) return 'tier';
  if (!isTalentUnlocked(talents, id)) return 'locked';
  const cost = talentCost(id, talentRank(talents, id));
  if (cost == null) return 'max';
  if ((talents?.points ?? 0) < cost) return 'no-points';
  return 'ok';
}

export function buyTalent(talents, id, tiers = Infinity) {
  if (talentBuyStatus(talents, id, tiers) !== 'ok') return talents;
  const rank = talentRank(talents, id);
  const cost = talentCost(id, rank);
  return { ...talents, points: talents.points - cost, ranks: { ...talents.ranks, [id]: rank + 1 } };
}

/** Respec: refunds every point spent. */
export function resetTalents(talents) {
  let refund = 0;
  for (const [id, rank] of Object.entries(talents?.ranks ?? {})) {
    for (let r = 0; r < rank; r += 1) refund += talentCost(id, r) ?? 0;
  }
  return { ...talents, points: (talents?.points ?? 0) + refund, ranks: {} };
}

/** Percent bonus per stat as fractions ({ atk: 0.12, ... }). */
export function talentPercents(talents) {
  const pct = { hp: 0, atk: 0, def: 0, speed: 0, luck: 0 };
  for (const t of TALENTS) pct[t.stat] += talentRank(talents, t.id) * t.perRank;
  return pct;
}

export function earnTalentPoints(talents, amount) {
  const base = talents ?? createTalents();
  return { ...base, points: base.points + amount, earned: base.earned + amount };
}
