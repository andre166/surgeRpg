/**
 * Item drop roll at the start of a battle (the result is only granted on a win).
 * Faithful port of BattlePackage/BattleItemMana.as EneDropItemInit.
 *
 * @param {object} args {
 *   drops: [tier1|null, tier2|null, tier3|null]  each { type, itemId, chance }
 *   itemRate: number (from battle rates)
 *   ownedCount: (type, itemId) => number   how many copies the player already has
 *   highestLevel: number (best level ever reached, permanent)
 * }
 * @returns {{ type, itemId } | null}
 */
import { asInt } from '../util/num.js';

export const ITEM_TYPE = Object.freeze({ WEAPON: 0, ARMOR: 1, ACCESSORY: 2 });

export function rollDrop(args, rng) {
  const drops = args.drops ?? [null, null, null];
  let n = 0;
  if (drops[2]) n = 3;
  else if (drops[1]) n = 2;
  else if (drops[0]) n = 1;
  if (n === 0) return null;

  let tier = asInt(rng.next() * n * 0.85 * ((args.itemRate + 1) / 2) + 1);
  if (tier > n) tier = n;
  if (tier < 0) tier = 0;
  const entry = drops[tier - 1];
  if (!entry) return null;

  const { type, itemId } = entry;
  const owned = args.ownedCount(type, itemId);
  let chance = entry.chance * args.itemRate;

  if (type === ITEM_TYPE.ACCESSORY) {
    if (owned >= 3) chance = -1;
  } else if (owned >= 10) {
    chance = -1;
  } else if (owned >= 1) {
    if (chance >= 0.15) chance = chance * 0.1 + 0.135;
    if (args.highestLevel < 2000) chance *= 0.1;
    if (owned >= 1) chance *= 0.55;
    if (owned >= 2) chance *= 0.55;
    if (owned >= 3) chance *= 0.6;
    if (owned >= 4) chance *= 0.65;
    for (let k = 4; k < owned; k += 1) chance *= 0.75;
    if (owned >= 7) chance *= 0.5;
    if (chance > 0.15) chance = 0.15;
    if (chance < 0.001) chance = 0.00025 + chance * 0.75;
    if (chance < 0.0001) chance = 0.000075 + chance * 0.25;
  }

  if (rng.next() <= chance) return { type, itemId };
  return null;
}

/** Sandbox cheat (always drop): one of the enemy's drop entries at random, ignoring chances and caps. */
export function forceDrop(drops, rng) {
  const list = (drops ?? []).filter(Boolean);
  if (!list.length) return null;
  const { type, itemId } = list[Math.min(list.length - 1, Math.floor(rng.next() * list.length))];
  return { type, itemId };
}
