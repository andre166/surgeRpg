/**
 * Weighted pick with the original rounding bias:
 *   r = int(sum * rand + 0.5); first index whose cumulative weight >= r.
 * (EneData.as kakuritu / BounasuKakurituData.as kakuritu)
 */
import { asInt } from '../util/num.js';

export function weightedPick(weights, rng, fallbackLast = true) {
  let sum = 0;
  for (const w of weights) sum += w;
  const r = asInt(sum * rng.next() + 0.5);
  let acc = 0;
  for (let i = 0; i < weights.length; i += 1) {
    acc += weights[i];
    if (acc >= r) return i;
  }
  return fallbackLast ? weights.length - 1 : 0;
}
