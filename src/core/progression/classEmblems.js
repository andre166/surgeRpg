/**
 * Class Emblems (not in the original): the rare monsters (white / black rooms) drop them, apart from
 * their item drop (both can fall), and they buy the base classes
 * (unlocks.js ACCOUNT_UNLOCK_PRICES.classes, priced in `emblems` instead of gold). Account-wide,
 * dropping from the first run so a player reaching the class base levels has some saved up.
 *
 * profile.classEmblems = how many the account holds
 */

/** Chance that a rare monster drops an emblem when beaten (one, in either mode). */
export const EMBLEM_DROP_CHANCE = 0.04;

export function emblemCount(profile) {
  const n = profile?.classEmblems;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Cleans a saved count (missing in older saves). */
export function normalizeEmblems(raw) {
  return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

/** Adds (or, negative, spends) emblems, never below 0. */
export function addEmblems(profile, n) {
  return { ...profile, classEmblems: Math.max(0, emblemCount(profile) + n) };
}

/**
 * Emblem drop for a rare monster beaten. Returns { profile, emblems } (emblems = how many
 * dropped, 0 for none).
 */
export function rollEmblemDrop(profile, rng) {
  if (rng.next() >= EMBLEM_DROP_CHANCE) return { profile, emblems: 0 };
  const emblems = 1;
  return { profile: addEmblems(profile, emblems), emblems };
}
