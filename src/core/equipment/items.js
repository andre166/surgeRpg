/**
 * Item model and duplicate-copy scaling.
 * Port of Class/Item.as SetItemTimes (docs/reverse/items.md section 3).
 *
 * Item definition (data/items):
 *   weapon/armor: { id, type: 0|1, name, price, flat, percent, hard, rank: 0 }
 *   accessory:    { id, type: 2, name, price, effect, value, rank (0..3 => 1..4 stars), hard, description }
 * price 0 means "not for sale" (drop only).
 */
import { asInt } from '../util/num.js';

export const ITEM_TYPE = Object.freeze({ WEAPON: 0, ARMOR: 1, ACCESSORY: 2 });

/** Effective flat / percent bonus of a weapon or armor owned `copies` times. */
export function scaledWeaponStats(item, copies) {
  if (copies < 2) return { plus: item.flat, multi: item.percent };
  let lvMulti = asInt(item.percent * 0.01 + 0.9);
  if (lvMulti < 1) lvMulti = 1;
  let lvPlus = asInt(item.flat * 0.05 + lvMulti * 10);
  if (lvPlus < 10) lvPlus = 10;
  lvPlus -= lvPlus % 10;
  lvPlus *= copies;
  lvMulti *= copies;
  return { plus: item.flat + lvPlus, multi: item.percent + lvMulti };
}

/**
 * What the extra copies add to a weapon or armor (scaledWeaponStats minus the base item):
 * { plus, multi } (multi in percent), both 0 below two copies. Shown like the original's
 * plusStr / multiStr ("5 +20", "100% +2%").
 */
export function copyBonus(item, copies) {
  const s = scaledWeaponStats(item, copies);
  return { plus: s.plus - item.flat, multi: s.multi - item.percent };
}

/** Builds the equipment input of computeStats() from the catalog, inventory and equipped slots. */
export function resolveEquipment(catalog, inventory, slots) {
  const weaponId = slots[0];
  const armorId = slots[1];
  const weaponDef = weaponId >= 0 ? catalog.weapons[weaponId] : null;
  const armorDef = armorId >= 0 ? catalog.armors[armorId] : null;
  const weapon = weaponDef ? scaledWeaponStats(weaponDef, inventory.weapons[weaponId] ?? 0) : null;
  const armor = armorDef ? scaledWeaponStats(armorDef, inventory.armors[armorId] ?? 0) : null;
  const accessories = [];
  for (let s = 2; s < 12; s += 1) {
    const id = slots[s];
    if (id >= 0) {
      const def = catalog.accessories[id];
      if (def) accessories.push({ effect: def.effect, value: def.value, id });
    }
  }
  return { weapon, armor, accessories };
}
