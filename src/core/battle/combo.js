/**
 * Combo balance (not in the original). Surge RPG has more ways to raise AGI and combo than
 * Inflation RPG (classes, talents, echoes, elixirs), so the original rate (rates.js + the ring,
 * capped at 0.7) is tamed here:
 *   1. combo from classes / echoes adds with diminishing returns: extra x (1 - rate / 0.7);
 *   2. soft cap: above COMBO_SOFT_START every point counts COMBO_SOFT_FACTOR, up to COMBO_CAP.
 * Every combo of a turn rolls the same chance, like the original.
 * The area combo/crit bonus and the low-HP bonus keep their original rules with lower caps.
 */
export const COMBO_ORIGINAL_CAP = 0.7;
export const COMBO_SOFT_START = 0.5;
export const COMBO_SOFT_FACTOR = 0.75;
export const COMBO_CAP = 0.65;
export const COMBO_BONUS_CAP = 0.67; // area combo/crit bonus (original 0.72)
export const COMBO_LOW_HP_CAP = 0.75; // HP <= 25% (original 0.8)

/** Battle combo rate from the original rate (rates + ring, capped at 0.7) and the clone extras. */
export function balancedComboRate(originalRate, extra = 0) {
  let c = originalRate + Math.max(0, extra) * Math.max(0, 1 - originalRate / COMBO_ORIGINAL_CAP);
  if (c > COMBO_SOFT_START) c = COMBO_SOFT_START + (c - COMBO_SOFT_START) * COMBO_SOFT_FACTOR;
  return Math.min(COMBO_CAP, c);
}
