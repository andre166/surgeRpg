/**
 * Talent tree (not in the original game): permanent passive bonuses that grow with the account's
 * TP level.
 *
 * The TP level works like the base level (progression/characters.js bossLevel), but for Slime
 * Kings: +1 for every different Slime King beaten (src/core/encounters/slimeBosses.js), in either
 * mode, shared by every hero (profile.slimeKingsBeaten). Nothing is spent: every talent of a bought
 * tier (progression/unlocks.js talentTierKind) has rank = TP level, up to its max rank. At TP levels
 * TALENT_MILESTONES each active talent (rank > 0) also gains MILESTONE_BONUS more.
 *
 * Four branches, three talents each. A talent boosts a stat percent (pct, applied to base + flat
 * like equipment percents) or a battle / map modifier (mods, as the echo passives:
 * echoes.applyEchoPassive).
 */

import { SLIME_IDS } from '../encounters/slimeBosses.js';

/** TP levels that give every active talent MILESTONE_BONUS more. */
export const TALENT_MILESTONES = [3, 6, 9, 12];
export const MILESTONE_BONUS = 0.003;
/** One TP level per Slime King. */
export const TP_MAX = SLIME_IDS.length;
export const TALENT_MAX_RANK = 10;

/**
 * What a talent boosts: `kind` 'pct' (a stat of computeStats) or 'mods' (a modifier of
 * stats.defaultModifiers; moveSpeedPct is a share of the base walking speed).
 */
export const TALENT_EFFECTS = {
  hp: { kind: 'pct', key: 'hp' },
  atk: { kind: 'pct', key: 'atk' },
  def: { kind: 'pct', key: 'def' },
  speed: { kind: 'pct', key: 'speed' },
  luck: { kind: 'pct', key: 'luck' },
  gold: { kind: 'mods', key: 'goldBonus' },
  exp: { kind: 'mods', key: 'expMultiplier' },
  move: { kind: 'mods', key: 'moveSpeedPct' },
  critDmg: { kind: 'mods', key: 'critDamageMultiplier' },
  critRate: { kind: 'mods', key: 'critRatePlus' },
};

/** Branches and their three talents, in tier order: [effect, bonus per rank]. */
const BRANCHES = [
  { id: 'atk', talents: [['atk', 0.008], ['critRate', 0.006], ['hp', 0.007]] },
  { id: 'def', talents: [['def', 0.009], ['hp', 0.005], ['luck', 0.008]] },
  { id: 'speed', talents: [['move', 0.005], ['speed', 0.009], ['critDmg', 0.006]] },
  { id: 'luck', talents: [['luck', 0.009], ['gold', 0.008], ['exp', 0.011]] },
];

/** Flat list of talents: { id: 'atk1'..'luck3', branch, tier (0-2), effect, maxRank, perRank }. */
export const TALENTS = BRANCHES.flatMap((b) => b.talents.map(([effect, perRank], i) => ({
  id: `${b.id}${i + 1}`,
  branch: b.id,
  tier: i,
  effect,
  maxRank: TALENT_MAX_RANK,
  perRank,
})));

export const TALENT_BRANCHES = BRANCHES.map((b) => b.id);
const BY_ID = Object.fromEntries(TALENTS.map((t) => [t.id, t]));
export const talentDef = (id) => BY_ID[id];

/** Slime King ids beaten by the account (either mode). */
export function slimeKingsBeaten(profile) {
  const beaten = profile?.slimeKingsBeaten ?? {};
  return SLIME_IDS.filter((id) => beaten[id]);
}

/** Saves from before profile.slimeKingsBeaten: the Slime Kings the bestiary saw defeated. */
export function slimeKingsFromBestiary(bestiary) {
  const out = {};
  for (const [key, e] of Object.entries(bestiary ?? {})) {
    if (key.startsWith('slime#') && (e?.defeated ?? 0) > 0) out[Number(key.slice(6))] = 1;
  }
  return out;
}

/** The account's TP level: how many different Slime Kings it has beaten (0..TP_MAX). */
export function tpLevel(profile) {
  return slimeKingsBeaten(profile).length;
}

/** How many of TALENT_MILESTONES the TP level has reached. */
export function milestonesReached(tp) {
  return TALENT_MILESTONES.filter((m) => tp >= m).length;
}

/** Rank of a talent at a TP level, with `tiers` tiers of its branch bought (0 when its tier is not). */
export function talentRank(id, tp, tiers = Infinity) {
  const t = BY_ID[id];
  if (!t || t.tier >= tiers) return 0;
  return Math.max(0, Math.min(t.maxRank, tp));
}

/** Bonus (fraction) a talent gives at a TP level: its ranks plus the milestone bonuses. */
export function talentBonus(id, tp, tiers = Infinity) {
  const rank = talentRank(id, tp, tiers);
  if (rank <= 0) return 0;
  return rank * BY_ID[id].perRank + milestonesReached(tp) * MILESTONE_BONUS;
}

/** Total bonus per effect ({ atk: 0.04, gold: 0.08, ... }; every TALENT_EFFECTS key). */
export function talentTotals(tp, tiersByBranch = {}) {
  const out = Object.fromEntries(Object.keys(TALENT_EFFECTS).map((k) => [k, 0]));
  for (const t of TALENTS) out[t.effect] += talentBonus(t.id, tp, tiersByBranch[t.branch] ?? Infinity);
  return out;
}

/**
 * The tree as a passive for computeStats ({ pct, mods }, like an echo's) at a TP level;
 * `tiersByBranch[branch]`: how many tiers of each branch are bought (missing = all).
 */
export function talentPassive(tp, tiersByBranch = {}) {
  const pct = {};
  const mods = {};
  for (const [effect, v] of Object.entries(talentTotals(tp, tiersByBranch))) {
    if (!v) continue;
    const { kind, key } = TALENT_EFFECTS[effect];
    const into = kind === 'pct' ? pct : mods;
    into[key] = (into[key] ?? 0) + v;
  }
  return { pct, mods };
}

/** Records a Slime King win; `levelUp` when it was a new one (the TP level went up). */
export function recordSlimeKingWin(profile, slimeId) {
  const before = tpLevel(profile);
  const next = { ...profile, slimeKingsBeaten: { ...(profile.slimeKingsBeaten ?? {}), [slimeId]: 1 } };
  return { profile: next, levelUp: tpLevel(next) > before };
}
