/**
 * Equipment slots, unlocking, buying and equipping rules.
 * Ports of Class_StMapMenu/StMapMenu_SoubiList.as, StMapMenu_soubi.as,
 * Class/GDataW.as GetEquipSumTimes_Item and Game.as slot costs
 * (docs/reverse/items.md sections 6-7).
 *
 * `slots` is an array of 16 ints: -2 locked, -1 empty, >=0 item id.
 *   0 weapon, 1 armor, 2..7 accessory, 8..9 mini (rank <= 1), 10..11 mini (rank 0), 12..15 unused.
 */
import { ITEM_TYPE } from './items.js';

export const SLOT = Object.freeze({ LOCKED: -2, EMPTY: -1 });
export const SLOT_COUNT = 16;
export const ACCESSORY_SLOTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const ACCESSORY_UNLOCK_COST = [0, 5000, 30000, 250000, 500000, 750000, 5000000, 5000000, 3500000, 3500000]; // index = slot - 2
export const EQUIPMENT_SET_COUNT = 5;
export const EQUIPMENT_SET_UNLOCK_COST = [300000, 1500000, 2100000, 4000000]; // sets 2..5
/**
 * Addition (not in the original): like the farm plots, slots and sets also need the shared base
 * level (progression/characters.js) to be bought. Index = slot - 2 (slot 2 starts open) / set - 2.
 */
export const ACCESSORY_UNLOCK_BASE = [0, 1, 2, 3, 4, 5, 7, 8, 6, 6];
export const EQUIPMENT_SET_UNLOCK_BASE = [2, 4, 6, 9];

export function initialSlots() {
  const s = new Array(SLOT_COUNT).fill(SLOT.LOCKED);
  s[0] = 0;
  s[1] = 0;
  s[2] = SLOT.EMPTY;
  return s;
}

export function maxRankForSlot(slot) {
  if (slot >= 2 && slot <= 7) return 3;
  if (slot === 8 || slot === 9) return 1;
  if (slot === 10 || slot === 11) return 0;
  return -1;
}

export function slotUnlockCost(slot) {
  if (slot < 2 || slot > 11) return Infinity;
  return ACCESSORY_UNLOCK_COST[slot - 2];
}

/** Base level a slot needs to be bought (0 for slots that need none). */
export function slotUnlockBase(slot) {
  if (slot < 2 || slot > 11) return 0;
  return ACCESSORY_UNLOCK_BASE[slot - 2];
}

/** Can a slot be bought? 'ok' | 'open' (not locked) | 'level' (base level too low) | 'gold'. */
export function slotUnlockStatus(slots, slot, gold, baseLevel = Infinity) {
  if (slots[slot] !== SLOT.LOCKED) return 'open';
  if (baseLevel < slotUnlockBase(slot)) return 'level';
  if (gold < slotUnlockCost(slot)) return 'gold';
  return 'ok';
}

export function canUnlockSlot(slots, slot, gold, baseLevel = Infinity) {
  return slotUnlockStatus(slots, slot, gold, baseLevel) === 'ok';
}

export function unlockSlot(slots, slot) {
  const next = slots.slice();
  next[slot] = SLOT.EMPTY;
  return next;
}

/** Number of equipped copies of an item (weapon/armor: 0 or 1; accessories: across slots 2..15). */
export function equippedCount(slots, type, itemId) {
  if (type === ITEM_TYPE.ACCESSORY) {
    let n = 0;
    for (let s = 2; s < slots.length; s += 1) if (slots[s] === itemId) n += 1;
    return n;
  }
  return slots[type] === itemId ? 1 : 0;
}

export function ownedCount(inventory, type, itemId) {
  const list = type === ITEM_TYPE.WEAPON ? inventory.weapons : type === ITEM_TYPE.ARMOR ? inventory.armors : inventory.accessories;
  return list[itemId] ?? 0;
}

/** @returns {'ok'|'not-for-sale'|'sold-out'|'no-gold'} */
export function buyStatus(item, owned, gold) {
  if (!item.price) return 'not-for-sale';
  const limit = item.type === ITEM_TYPE.ACCESSORY ? 3 : 1;
  if (owned >= limit) return 'sold-out';
  if (gold < item.price) return 'no-gold';
  return 'ok';
}

export function addItem(inventory, type, itemId) {
  const key = type === ITEM_TYPE.WEAPON ? 'weapons' : type === ITEM_TYPE.ARMOR ? 'armors' : 'accessories';
  const list = inventory[key].slice();
  list[itemId] = (list[itemId] ?? 0) + 1;
  return { ...inventory, [key]: list };
}

/** @returns {'ok'|'not-owned'|'already'|'rank'|'all-equipped'|'locked'} */
export function equipStatus({ item, slot, slots, inventory }) {
  const owned = ownedCount(inventory, item.type, item.id);
  if (owned < 1) return 'not-owned';
  if (item.type !== ITEM_TYPE.ACCESSORY) {
    if (slot !== item.type) return 'rank';
    if (slots[slot] === item.id) return 'already';
    return 'ok';
  }
  if (slot < 2 || slot > 11) return 'rank';
  if (slots[slot] === SLOT.LOCKED) return 'locked';
  if (slots[slot] === item.id) return 'already';
  if ((item.rank ?? 0) > maxRankForSlot(slot)) return 'rank';
  if (equippedCount(slots, item.type, item.id) >= owned) return 'all-equipped';
  return 'ok';
}

export function equipItem(slots, slot, itemId) {
  const next = slots.slice();
  next[slot] = itemId;
  return next;
}

/** Removes an accessory from a slot (quality-of-life addition; the original had no explicit unequip). */
export function unequipSlot(slots, slot) {
  if (slot < 2) return slots;
  const next = slots.slice();
  if (next[slot] >= 0) next[slot] = SLOT.EMPTY;
  return next;
}
