import { describe, it, expect } from 'vitest';
import { scaledWeaponStats, copyBonus, resolveEquipment, ITEM_TYPE } from '../core/equipment/items.js';
import { initialSlots, buyStatus, equipStatus, equippedCount, canUnlockSlot, unlockSlot, slotUnlockCost, SLOT, unequipSlot, equipItem, STARTING_ITEM_ID } from '../core/equipment/slots.js';

describe('scaledWeaponStats (Item.as SetItemTimes)', () => {
  it('single copy keeps base values', () => {
    expect(scaledWeaponStats({ flat: 5, percent: 0 }, 1)).toEqual({ plus: 5, multi: 0 });
  });
  it('dagger x2 -> 25 / 2', () => {
    expect(scaledWeaponStats({ flat: 5, percent: 0 }, 2)).toEqual({ plus: 25, multi: 2 });
  });
  it('excalibur-like (10000, 230%) x3 -> 11590 / 239', () => {
    expect(scaledWeaponStats({ flat: 10000, percent: 230 }, 3)).toEqual({ plus: 11590, multi: 239 });
  });
  it('copyBonus: what the extra copies add (nothing below two)', () => {
    expect(copyBonus({ flat: 5, percent: 0 }, 1)).toEqual({ plus: 0, multi: 0 });
    expect(copyBonus({ flat: 5, percent: 0 }, 2)).toEqual({ plus: 20, multi: 2 });
    expect(copyBonus({ flat: 10000, percent: 230 }, 3)).toEqual({ plus: 1590, multi: 9 });
  });
});

describe('slots', () => {
  const catalog = {
    weapons: [{ id: 0, type: 0, flat: 5, percent: 0, price: 0 }, { id: 1, type: 0, flat: 30, percent: 10, price: 300 }],
    armors: [{ id: 0, type: 1, flat: 3, percent: 0, price: 0 }],
    accessories: [{ id: 0, type: 2, effect: 30, value: 400, rank: 0, price: 2000 }, { id: 1, type: 2, effect: 31, value: 10, rank: 2, price: 100 }],
  };
  const inv = { weapons: [1, 0], armors: [1], accessories: [2, 1] };

  it('initial slots: weapon 0, armor 0, one open accessory slot', () => {
    const s = initialSlots();
    expect(s.slice(0, 4)).toEqual([0, 0, SLOT.EMPTY, SLOT.LOCKED]);
  });
  it('resolveEquipment builds stats input', () => {
    const s = initialSlots();
    s[2] = 0;
    const eq = resolveEquipment(catalog, inv, s);
    expect(eq.weapon).toEqual({ plus: 5, multi: 0 });
    expect(eq.accessories).toEqual([{ effect: 30, value: 400, id: 0 }]);
  });
  it('buy rules', () => {
    expect(buyStatus(catalog.weapons[0], 1, 1e9)).toBe('not-for-sale');
    expect(buyStatus(catalog.weapons[1], 0, 100)).toBe('no-gold');
    expect(buyStatus(catalog.weapons[1], 0, 300)).toBe('ok');
    expect(buyStatus(catalog.weapons[1], 1, 1e9)).toBe('sold-out');
    expect(buyStatus(catalog.accessories[0], 2, 1e9)).toBe('ok');
    expect(buyStatus(catalog.accessories[0], 3, 1e9)).toBe('sold-out');
  });
  it('equip rules: ownership, duplicates across slots, mini-slot rank', () => {
    let s = initialSlots();
    s[3] = SLOT.EMPTY; s[8] = SLOT.EMPTY; s[10] = SLOT.EMPTY;
    expect(equipStatus({ item: catalog.accessories[0], slot: 2, slots: s, inventory: inv })).toBe('ok');
    s[2] = 0;
    expect(equipStatus({ item: catalog.accessories[0], slot: 2, slots: s, inventory: inv })).toBe('already');
    expect(equipStatus({ item: catalog.accessories[0], slot: 3, slots: s, inventory: inv })).toBe('ok'); // owned 2
    s[3] = 0;
    expect(equipStatus({ item: catalog.accessories[0], slot: 8, slots: s, inventory: inv })).toBe('all-equipped');
    expect(equippedCount(s, ITEM_TYPE.ACCESSORY, 0)).toBe(2);
    expect(equipStatus({ item: catalog.accessories[1], slot: 8, slots: s, inventory: inv })).toBe('rank'); // 3 stars in mini
    expect(equipStatus({ item: catalog.accessories[1], slot: 4, slots: s, inventory: inv })).toBe('locked');
    expect(equipStatus({ item: catalog.weapons[1], slot: 0, slots: s, inventory: inv })).toBe('not-owned');
  });
  it('slot unlock costs', () => {
    const s = initialSlots();
    expect(slotUnlockCost(3)).toBe(5000);
    expect(slotUnlockCost(11)).toBe(3500000);
    expect(canUnlockSlot(s, 3, 4999)).toBe(false);
    expect(canUnlockSlot(s, 3, 5000)).toBe(true);
    expect(unlockSlot(s, 3)[3]).toBe(SLOT.EMPTY);
  });
});

describe('unequip', () => {
  it('any slot can be emptied, the weapon and armor too (the starting ones included)', () => {
    const s = equipItem(equipItem(initialSlots(), 0, 5), 2, 7);
    expect(unequipSlot(s, 2)[2]).toBe(SLOT.EMPTY);
    expect(unequipSlot(s, 0)[0]).toBe(SLOT.EMPTY);
    expect(unequipSlot(initialSlots(), 1)[1]).toBe(SLOT.EMPTY); // the starting armor
    const empty = unequipSlot(s, 3);
    expect(unequipSlot(empty, 3)).toEqual(empty);
    expect(STARTING_ITEM_ID).toBe(0);
  });
  it('an unequipped weapon / armor stays unequipped across set switches and gives no stats', async () => {
    const { sanitizeSlots } = await import('../core/equipment/sets.js');
    const slots = unequipSlot(unequipSlot(initialSlots(), 0), 1);
    const inventory = { weapons: [1], armors: [1], accessories: [] };
    const out = sanitizeSlots(slots, inventory, slots);
    expect(out[0]).toBe(SLOT.EMPTY);
    expect(out[1]).toBe(SLOT.EMPTY);
    const eq = resolveEquipment({ weapons: [{ id: 0, flat: 5, percent: 0 }], armors: [{ id: 0, flat: 3, percent: 0 }], accessories: [] }, inventory, out);
    expect(eq.weapon).toBeNull();
    expect(eq.armor).toBeNull();
  });
});
