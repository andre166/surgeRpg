/**
 * Limit Break (not in the original): Break Shards that map bosses drop buy extra affinity arrows
 * (characterPower.js characterPowerWeights) for a hero. A stat holds at most LB_MAX_PER_STAT arrows
 * (natural + extra), Limit Break adds at most LB_MAX_EXTRA_PER_STAT to a stat and a hero takes at
 * most LB_MAX_EXTRA extra ones, so a full build on one hero leaves room to try others. Shards are account-wide; resetting a hero refunds what it cost.
 *
 * profile.limitBreak = { shards, heroes: { [characterIndex]: { [stat]: extra arrows } } }
 */
import { characterPowerWeights } from '../attributes/characterPower.js';

export const LB_STATS = Object.freeze(['hp', 'atk', 'def', 'speed', 'luck']);
export const LB_MAX_PER_STAT = 2;
export const LB_MAX_EXTRA = 2;
/** Extra arrows a stat can take from Limit Break. */
export const LB_MAX_EXTRA_PER_STAT = 1;
/** Shards for a hero's 1st and 2nd extra arrow. */
export const LB_COSTS = Object.freeze([5, 10]);
/** Chance that a map boss drops a shard on its first win of the run (abyssal mode drops 2). */
export const LB_DROP_CHANCE = 0.35;
/** Limit Break opens once this map boss (Caelith the Monarch, map 57) is beaten in abyssal mode. */
export const LB_UNLOCK_BOSS = 13;

/** Whether Limit Break is open: LB_UNLOCK_BOSS beaten in abyssal mode (profile.bossWins key + 100). */
export function lbUnlocked(profile) {
  const wins = profile?.bossWins ?? {};
  return !!wins[LB_UNLOCK_BOSS + 100];
}

export function createLimitBreak() {
  return { shards: 0, heroes: {} };
}

/** Cleans a saved limitBreak (missing in older saves). */
export function normalizeLimitBreak(raw) {
  if (!raw || typeof raw !== 'object') return createLimitBreak();
  const heroes = {};
  for (const [idx, h] of Object.entries(raw.heroes ?? {})) {
    if (!h || typeof h !== 'object') continue;
    const clean = {};
    for (const k of LB_STATS) if (Number.isInteger(h[k]) && h[k] > 0) clean[k] = Math.min(h[k], LB_MAX_EXTRA_PER_STAT);
    if (Object.keys(clean).length) heroes[idx] = clean;
  }
  return { shards: Number.isFinite(raw.shards) ? Math.max(0, Math.floor(raw.shards)) : 0, heroes };
}

/** Extra arrows bought for a hero ({ stat: n }). */
export function heroExtra(profile, characterIndex) {
  return profile?.limitBreak?.heroes?.[characterIndex] ?? {};
}

/** How many extra arrows a hero has (0..LB_MAX_EXTRA). */
export function heroExtraUsed(profile, characterIndex) {
  return Object.values(heroExtra(profile, characterIndex)).reduce((a, n) => a + n, 0);
}

/** Natural affinity weights plus the bought arrows. */
export function heroWeights(profile, characterIndex) {
  const w = characterPowerWeights(characterIndex);
  const extra = heroExtra(profile, characterIndex);
  for (const k of LB_STATS) w[k] += extra[k] ?? 0;
  return w;
}

/** Shards the hero's next arrow costs, or null when it has every extra arrow. */
export function lbNextCost(profile, characterIndex) {
  return LB_COSTS[heroExtraUsed(profile, characterIndex)] ?? null;
}

/** 'ok' | 'locked' (lbUnlocked) | 'statMax' (2 arrows, or its extra one, already) | 'heroMax' (every extra already) | 'shards' (not enough). */
export function lbAddStatus(profile, characterIndex, stat) {
  if (!lbUnlocked(profile)) return 'locked';
  if (!LB_STATS.includes(stat)) return 'statMax';
  if (heroWeights(profile, characterIndex)[stat] >= LB_MAX_PER_STAT) return 'statMax';
  if ((heroExtra(profile, characterIndex)[stat] ?? 0) >= LB_MAX_EXTRA_PER_STAT) return 'statMax';
  const cost = lbNextCost(profile, characterIndex);
  if (cost == null) return 'heroMax';
  if ((profile.limitBreak?.shards ?? 0) < cost) return 'shards';
  return 'ok';
}

/** Buys one extra arrow on `stat` for the hero (unchanged profile when not allowed). */
export function addArrow(profile, characterIndex, stat) {
  if (lbAddStatus(profile, characterIndex, stat) !== 'ok') return profile;
  const lb = normalizeLimitBreak(profile.limitBreak);
  const cost = lbNextCost(profile, characterIndex);
  const hero = { ...heroExtra(profile, characterIndex) };
  hero[stat] = (hero[stat] ?? 0) + 1;
  return { ...profile, limitBreak: { shards: lb.shards - cost, heroes: { ...lb.heroes, [characterIndex]: hero } } };
}

/** Removes the hero's extra arrows and refunds every shard they cost. */
export function resetHero(profile, characterIndex) {
  const used = heroExtraUsed(profile, characterIndex);
  if (!used) return profile;
  const lb = normalizeLimitBreak(profile.limitBreak);
  const refund = LB_COSTS.slice(0, used).reduce((a, n) => a + n, 0);
  const heroes = { ...lb.heroes };
  delete heroes[characterIndex];
  return { ...profile, limitBreak: { shards: lb.shards + refund, heroes } };
}

/**
 * Shard drop for a map boss's first win of the run, in abyssal mode only, once Limit Break and the
 * base ability are open (the arrows do nothing before). Returns { profile, shards } (0 for none).
 */
export function rollShardDrop(profile, rng, { hardMode = false, abilityLevel = 0 } = {}) {
  if (!hardMode || !lbUnlocked(profile) || !(abilityLevel > 0) || rng.next() >= LB_DROP_CHANCE) return { profile, shards: 0 };
  const shards = 2;
  const lb = normalizeLimitBreak(profile.limitBreak);
  return { profile: { ...profile, limitBreak: { ...lb, shards: lb.shards + shards } }, shards };
}

/** Cheat: adds shards (negative takes them away, never below 0). */
export function cheatShards(profile, n) {
  const lb = normalizeLimitBreak(profile.limitBreak);
  return { ...profile, limitBreak: { ...lb, shards: Math.max(0, lb.shards + n) } };
}
