/**
 * Passive Shards (not in the original): abyssal-mode bosses drop shards that reroll a hero's passive
 * (characterPower.js heroPassive) into another one of the 16, picked at random, with a random value
 * (PASSIVE_ROLL_MIN..PASSIVE_ROLL_MAX). The roll is an offer: the player accepts it or keeps the current
 * passive (the shards are spent either way). Shards are account-wide.
 * Locked (no drops, no rerolls) until Limit Break opens: Caelith the Monarch beaten in abyssal mode.
 *
 * profile.passiveShards = { shards, heroes: { [characterIndex]: { id, pct } }, offers: { [characterIndex]: { id, pct } } }
 * (offers: a rolled passive waiting for accept / keep, saved so a reload does not lose what was paid)
 */
import { heroPassive } from '../attributes/characterPower.js';
import { lbUnlocked } from './limitBreak.js';

export const HERO_COUNT = 16;
/** Shards one reroll costs. */
export const PASSIVE_REROLL_COST = 3;
/** Shards an abyssal boss drops on its first win of the run (the last boss drops more). */
export const PASSIVE_SHARD_DROP = 1;
export const PASSIVE_SHARD_DROP_LAST = 3;
/** Value range of a rolled passive (fractions; steps of 0.1%). */
export const PASSIVE_ROLL_MIN = 0.007;
export const PASSIVE_ROLL_MAX = 0.015;
const ROLL_STEP = 0.001;

/** Every passive, the pool a reroll picks from. */
export const PASSIVE_POOL = Object.freeze(Array.from({ length: HERO_COUNT }, (_, i) => heroPassive(i)));

const byId = (id) => PASSIVE_POOL.find((p) => p.id === id) ?? null;

export function createPassiveShards() {
  return { shards: 0, heroes: {}, offers: {} };
}

/** A saved { id, pct } (or an old save's bare id, at the passive's base value), or null when invalid. */
function cleanRolled(x) {
  const id = typeof x === 'string' ? x : x?.id;
  const base = byId(id);
  if (!base) return null;
  const pct = typeof x === 'object' && Number.isFinite(x.pct) ? Math.min(PASSIVE_ROLL_MAX, Math.max(PASSIVE_ROLL_MIN, x.pct)) : base.pct;
  return { id, pct };
}

const cleanMap = (m) => {
  const out = {};
  for (const [idx, x] of Object.entries(m ?? {})) {
    const c = cleanRolled(x);
    if (c) out[idx] = c;
  }
  return out;
};

/** Cleans a saved passiveShards (missing in older saves). */
export function normalizePassiveShards(raw) {
  if (!raw || typeof raw !== 'object') return createPassiveShards();
  return { shards: Number.isFinite(raw.shards) ? Math.max(0, Math.floor(raw.shards)) : 0, heroes: cleanMap(raw.heroes), offers: cleanMap(raw.offers) };
}

export function passiveShardCount(profile) {
  return profile?.passiveShards?.shards ?? 0;
}

/** A rolled { id, pct } as a full passive ({ id, stat, pct }). */
const asPassive = (r) => (r ? { ...byId(r.id), pct: r.pct } : null);

/** The hero's current passive ({ id, stat, pct }): the rerolled one, or the hero's own. */
export function heroCurrentPassive(profile, characterIndex) {
  return asPassive(cleanRolled(profile?.passiveShards?.heroes?.[characterIndex])) ?? heroPassive(characterIndex);
}

/** The rolled passive waiting for accept / keep ({ id, stat, pct }), or null. */
export function passiveOffer(profile, characterIndex) {
  return asPassive(cleanRolled(profile?.passiveShards?.offers?.[characterIndex]));
}

/** The hero's current passive as stat percents ({ stat: fraction }), the input of computeStats heroPct. */
export function heroCurrentPassivePct(profile, characterIndex) {
  const p = heroCurrentPassive(profile, characterIndex);
  return p ? { [p.stat]: p.pct } : {};
}

/** Whether the hero carries a passive other than its own (another one, or its own at another value). */
export function passiveRerolled(profile, characterIndex) {
  const cur = heroCurrentPassive(profile, characterIndex);
  const own = heroPassive(characterIndex);
  return cur?.id !== own?.id || Math.abs((cur?.pct ?? 0) - (own?.pct ?? 0)) > 1e-9;
}

/** Rerolls open together with Limit Break (Caelith the Monarch beaten in abyssal mode, limitBreak.js lbUnlocked). */
export function passiveRerollUnlocked(profile) {
  return lbUnlocked(profile);
}

export function canReroll(profile, characterIndex = null) {
  if (characterIndex != null && passiveOffer(profile, characterIndex)) return false; // answer the offer first
  return passiveRerollUnlocked(profile) && passiveShardCount(profile) >= PASSIVE_REROLL_COST;
}

/**
 * Spends PASSIVE_REROLL_COST shards and rolls an offer for the hero: a random passive other than its
 * current one, at a random value. Returns { profile, passive } (unchanged profile and passive null when
 * not allowed). acceptPassiveOffer / keepPassive answer it.
 */
export function rerollPassive(profile, characterIndex, rng) {
  if (!canReroll(profile, characterIndex)) return { profile, passive: null };
  const current = heroCurrentPassive(profile, characterIndex);
  const options = PASSIVE_POOL.filter((p) => p.id !== current?.id);
  const pick = options[Math.min(options.length - 1, Math.floor(rng.next() * options.length))];
  const steps = Math.round((PASSIVE_ROLL_MAX - PASSIVE_ROLL_MIN) / ROLL_STEP) + 1;
  const pct = Math.round((PASSIVE_ROLL_MIN + Math.min(steps - 1, Math.floor(rng.next() * steps)) * ROLL_STEP) * 1000) / 1000;
  const ps = normalizePassiveShards(profile.passiveShards);
  const offers = { ...ps.offers, [characterIndex]: { id: pick.id, pct } };
  return { profile: { ...profile, passiveShards: { ...ps, shards: ps.shards - PASSIVE_REROLL_COST, offers } }, passive: asPassive(offers[characterIndex]) };
}

/** Takes the hero's offer as its passive (its own passive at its base value clears the override). */
export function acceptPassiveOffer(profile, characterIndex) {
  const offer = cleanRolled(profile?.passiveShards?.offers?.[characterIndex]);
  if (!offer) return profile;
  const ps = normalizePassiveShards(profile.passiveShards);
  const offers = { ...ps.offers };
  delete offers[characterIndex];
  const heroes = { ...ps.heroes };
  const own = heroPassive(characterIndex);
  if (offer.id === own?.id && Math.abs(offer.pct - own.pct) < 1e-9) delete heroes[characterIndex];
  else heroes[characterIndex] = offer;
  return { ...profile, passiveShards: { ...ps, heroes, offers } };
}

/** Drops the hero's offer and keeps its current passive (the shards stay spent). */
export function keepPassive(profile, characterIndex) {
  if (!profile?.passiveShards?.offers?.[characterIndex]) return profile;
  const ps = normalizePassiveShards(profile.passiveShards);
  const offers = { ...ps.offers };
  delete offers[characterIndex];
  return { ...profile, passiveShards: { ...ps, offers } };
}

/**
 * Shard drop for a boss's first win of the run, in abyssal mode only, once rerolls are unlocked.
 * Returns { profile, shards } (shards = how many dropped, 0 for none).
 */
export function rollPassiveShardDrop(profile, { hardMode = false, lastBoss = false } = {}) {
  if (!hardMode || !passiveRerollUnlocked(profile)) return { profile, shards: 0 };
  const shards = lastBoss ? PASSIVE_SHARD_DROP_LAST : PASSIVE_SHARD_DROP;
  const ps = normalizePassiveShards(profile.passiveShards);
  return { profile: { ...profile, passiveShards: { ...ps, shards: ps.shards + shards } }, shards };
}

/** Cheat: adds shards (negative takes them away, never below 0). */
export function cheatPassiveShards(profile, n) {
  const ps = normalizePassiveShards(profile.passiveShards);
  return { ...profile, passiveShards: { ...ps, shards: Math.max(0, ps.shards + n) } };
}
