/**
 * Numeric helpers that reproduce ActionScript 3 semantics used by the
 * original engine. `int(x)` in AS3 truncates toward zero (NaN -> 0).
 */

export function asInt(x) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return x < 0 ? Math.ceil(x) : Math.floor(x);
}

/** `int(x * 100) / 100` : truncate to two decimals (used for every battle rate). */
export function trunc2(x) {
  return asInt(x * 100) / 100;
}

export function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}
