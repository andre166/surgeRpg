/**
 * Automatic stat-point distribution: the player sets a percentage per stat (steps of 5,
 * adding up to 100%) and turns it on; after each battle every available point is split by
 * those percentages (used as weights by splitPoints).
 * Stored in the profile (profile.autoAlloc) so it carries over between runs.
 */
export const AUTO_STATS = ['hp', 'atk', 'def', 'speed', 'luck'];

export function createAutoAlloc() {
  return { on: false, weights: { hp: 0, atk: 0, def: 0, speed: 0, luck: 0 } };
}

/** Auto-distribution settings of a profile (defaults for older saves). */
export function autoAllocOf(profile) {
  const a = profile?.autoAlloc;
  const def = createAutoAlloc();
  if (!a) return def;
  const weights = {};
  for (const k of AUTO_STATS) weights[k] = cleanWeight(a.weights?.[k]);
  return { on: !!a.on, weights };
}

/** Weights are whole numbers >= 0 (anything else counts as 0). */
export function cleanWeight(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Splits `points` by `weights` into a staged allocation ({ hp, atk, ... }) that always sums
 * to exactly `points`: each stat gets its floored share, the leftovers go to the largest
 * remainders (ties: stat order). All weights zero (or no points) stages nothing.
 */
export function splitPoints(points, weights) {
  const staged = { hp: 0, atk: 0, def: 0, speed: 0, luck: 0 };
  const total = AUTO_STATS.reduce((a, k) => a + cleanWeight(weights?.[k]), 0);
  const p = Math.max(0, Math.floor(points));
  if (!total || !p) return staged;
  const rest = [];
  let given = 0;
  for (const k of AUTO_STATS) {
    const exact = (p * cleanWeight(weights?.[k])) / total;
    staged[k] = Math.floor(exact);
    given += staged[k];
    rest.push({ k, frac: exact - staged[k], w: cleanWeight(weights?.[k]) });
  }
  rest.filter((r) => r.w > 0).sort((a, b) => b.frac - a.frac).slice(0, p - given).forEach((r) => { staged[r.k] += 1; });
  return staged;
}

/** Percentages move in steps of 5. */
export const AUTO_STEP = 5;

/** A percentage snapped to the step and kept within 0..100. */
export function snapPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n / AUTO_STEP) * AUTO_STEP));
}

/** Sum of the percentages (settings can only be saved at exactly 100). */
export function percentTotal(weights) {
  return AUTO_STATS.reduce((a, k) => a + cleanWeight(weights?.[k]), 0);
}

/** Saved weights as step-5 percentages (older free-form weights are converted). */
export function toPercents(weights) {
  const out = {};
  const ok = percentTotal(weights) === 100 && AUTO_STATS.every((k) => cleanWeight(weights?.[k]) % AUTO_STEP === 0);
  const pcts = ok ? weights : weightPercents(weights);
  for (const k of AUTO_STATS) out[k] = snapPercent(pcts[k]);
  return out;
}

/** Percent of the points each stat gets (for the settings screen). */
export function weightPercents(weights) {
  const total = AUTO_STATS.reduce((a, k) => a + cleanWeight(weights?.[k]), 0);
  const out = {};
  for (const k of AUTO_STATS) out[k] = total ? (cleanWeight(weights?.[k]) * 100) / total : 0;
  return out;
}
