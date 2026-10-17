/**
 * Crafting (not in the original game). Three loot items (drop-only weapons, armor and
 * accessories) are consumed to forge a relic bound to the hero of the run. Each hero has
 * RELIC_SLOTS relic slots; forging into a filled slot replaces that relic. All relics of a
 * hero add permanent stat percents for that hero (computeStats `craftPct`).
 *
 * Ingredients are monster loot for now; dedicated crafting materials can later be added
 * as a new ingredient kind with their own `ingredientBonus`.
 */
import { ITEM_TYPE } from './equipment/items.js';
import { equippedCount, ownedCount } from './equipment/slots.js';
import { EFFECT } from './attributes/effects.js';
import { farmDef, itemCount } from './farm.js';
import { accountOwned } from './progression/unlocks.js';

export const CRAFT_SLOTS = 3;
/** Relic slots per hero. */
export const RELIC_SLOTS = 4;
export const STAT_KEYS = ['hp', 'atk', 'def', 'speed', 'luck'];
/** Three ingredients of the same kind (weapon/armor/accessory) multiply the bonuses. */
export const SET_BONUS = 1.25;
/** Relic quality by total percent: below 10% common, 18% rare, 26% epic, else legendary. */
export const QUALITY_THRESHOLDS = [0.1, 0.18, 0.26];
export const QUALITIES = ['common', 'rare', 'epic', 'legendary'];

const ACCESSORY_STAT = {
  [EFFECT.HP_PLUS]: 'hp',
  [EFFECT.ATK_PLUS]: 'atk',
  [EFFECT.DEF_PLUS]: 'def',
  [EFFECT.SPEED_PLUS]: 'speed',
  [EFFECT.LUCK_PLUS]: 'luck',
};

const listKey = (type) => (type === ITEM_TYPE.WEAPON ? 'weapons' : type === ITEM_TYPE.ARMOR ? 'armors' : 'accessories');

/** Ingredient kind for Farm materials (mine ores and crystals, src/core/farm.js). */
export const MATERIAL = 'material';

/** A Farm material as a crafting ingredient. */
export function materialIngredient(id) {
  return farmDef(id)?.forge ? { type: MATERIAL, id } : null;
}

/**
 * Loot = not sold in the shop. The starting weapon and armor (id 0) are never ingredients.
 * Farm materials are always craftable.
 */
export function isCraftable(item) {
  if (!item) return false;
  if (item.type === MATERIAL) return !!farmDef(item.id)?.forge;
  if (item.price !== 0) return false;
  if (item.type !== ITEM_TYPE.ACCESSORY && item.id === 0) return false;
  return true;
}

/** Copies of an item that can be used: owned minus equipped (materials: the Farm stock). */
export function spareCount(run, item, profile = null) {
  if (item.type === MATERIAL) return itemCount(profile?.farm, item.id);
  return Math.max(0, ownedCount(run.inventory, item.type, item.id) - equippedCount(run.slots, item.type, item.id));
}

/** Stat and percent one ingredient contributes. */
export function ingredientBonus(item) {
  if (item.type === MATERIAL) return { ...farmDef(item.id).forge };
  const hard = item.hard ? 1.5 : 1;
  if (item.type === ITEM_TYPE.WEAPON || item.type === ITEM_TYPE.ARMOR) {
    const score = 1 + Math.log10(1 + Math.max(0, item.flat ?? 0));
    return { stat: item.type === ITEM_TYPE.WEAPON ? 'atk' : 'def', pct: score * 0.015 * hard };
  }
  return { stat: ACCESSORY_STAT[item.effect] ?? 'luck', pct: ((item.rank ?? 0) + 1) * 0.02 * hard };
}

/**
 * Relic forged from the picked items (null until all slots are filled).
 * @returns {{ bonus: Record<string, number>, total: number, quality: string, main: string, setBonus: boolean } | null}
 */
export function craftPreview(items) {
  if (items.length !== CRAFT_SLOTS || items.some((i) => !i)) return null;
  const setBonus = items.every((i) => i.type === items[0].type);
  const bonus = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  for (const it of items) {
    const b = ingredientBonus(it);
    bonus[b.stat] += b.pct * (setBonus ? SET_BONUS : 1);
  }
  for (const k of STAT_KEYS) bonus[k] = Math.round(bonus[k] * 1000) / 1000;
  const total = STAT_KEYS.reduce((a, k) => a + bonus[k], 0);
  const main = STAT_KEYS.reduce((best, k) => (bonus[k] > bonus[best] ? k : best), STAT_KEYS[0]);
  const qi = QUALITY_THRESHOLDS.findIndex((t) => total < t);
  return { bonus, total, quality: QUALITIES[qi === -1 ? QUALITIES.length - 1 : qi], main, setBonus };
}

/** 'ok' | 'incomplete' | 'not-loot' | 'not-enough' */
export function craftStatus(run, items, profile = null) {
  if (items.length !== CRAFT_SLOTS || items.some((i) => !i)) return 'incomplete';
  if (!items.every(isCraftable)) return 'not-loot';
  const need = new Map();
  for (const it of items) {
    const key = `${it.type}:${it.id}`;
    need.set(key, { item: it, n: (need.get(key)?.n ?? 0) + 1 });
  }
  for (const { item, n } of need.values()) if (spareCount(run, item, profile) < n) return 'not-enough';
  return 'ok';
}

/** The hero's relic slots (always RELIC_SLOTS long, null = empty). */
export function heroRelics(profile, characterIndex) {
  const list = profile?.crafted?.[characterIndex];
  const out = new Array(RELIC_SLOTS).fill(null);
  if (Array.isArray(list)) list.slice(0, RELIC_SLOTS).forEach((r, i) => { out[i] = r ?? null; });
  return out;
}

/** Relic slots the account bought (progression/unlocks.js relicSlots); forging needs one. */
export const relicSlotsOwned = (profile) => Math.min(RELIC_SLOTS, accountOwned(profile, 'relicSlots'));

/** First empty bought relic slot of a hero, or -1 when all are filled (or none is bought). */
export function firstFreeRelicSlot(profile, characterIndex) {
  return heroRelics(profile, characterIndex).slice(0, relicSlotsOwned(profile)).findIndex((r) => !r);
}

/**
 * Consumes the items from the run inventory and binds the relic to the run's hero,
 * in relic slot `slot` (default: first empty one; a filled slot is replaced).
 */
export function craft(run, profile, items, slot = firstFreeRelicSlot(profile, run.characterIndex)) {
  if (craftStatus(run, items, profile) !== 'ok' || slot < 0 || slot >= relicSlotsOwned(profile)) return { run, profile, relic: null };
  // Farm materials come out of the Farm stock
  const farmItems = { ...(profile.farm?.items ?? {}) };
  for (const it of items) if (it.type === MATERIAL) farmItems[it.id] -= 1;
  const loot = items.filter((it) => it.type !== MATERIAL);
  const inventory = { ...run.inventory };
  // The relic goes to the profile right away, so the ingredients also leave the profile's
  // permanent inventory: otherwise discarding the run (new run without game over) would
  // give the items back and keep the relic.
  const profInv = { ...profile.inventory };
  for (const it of loot) {
    const key = listKey(it.type);
    const list = inventory[key].slice();
    list[it.id] -= 1;
    inventory[key] = list;
    const plist = (profInv[key] ?? []).slice();
    if ((plist[it.id] ?? 0) > 0) plist[it.id] -= 1;
    profInv[key] = plist;
  }
  // profile equipment must not point at copies that no longer exist
  const profSlots = (profile.slots ?? []).slice();
  for (let s = 0; s < profSlots.length; s += 1) {
    const id = profSlots[s];
    if (id < 0 || s > 11) continue;
    const type = s === 0 ? ITEM_TYPE.WEAPON : s === 1 ? ITEM_TYPE.ARMOR : ITEM_TYPE.ACCESSORY;
    if (equippedCount(profSlots, type, id) > ownedCount(profInv, type, id)) profSlots[s] = s < 2 ? 0 : -1;
  }
  const p = craftPreview(items);
  const relic = {
    bonus: p.bonus,
    quality: p.quality,
    main: p.main,
    setBonus: p.setBonus,
    ingredients: items.map((i) => ({ type: i.type, id: i.id })),
    createdAt: Date.now(),
  };
  return {
    run: { ...run, inventory },
    profile: {
      ...profile,
      inventory: profInv,
      farm: profile.farm ? { ...profile.farm, items: farmItems } : profile.farm,
      slots: profSlots,
      crafted: { ...profile.crafted, [run.characterIndex]: heroRelics(profile, run.characterIndex).map((r, i) => (i === slot ? relic : r)) },
    },
    relic,
  };
}

/** Sum of the stat percents of every relic bound to a hero (null when none). */
export function relicPercents(profile, characterIndex) {
  const relics = heroRelics(profile, characterIndex).filter(Boolean);
  if (!relics.length) return null;
  const sum = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  for (const r of relics) for (const k of STAT_KEYS) sum[k] += r.bonus?.[k] ?? 0;
  return sum;
}
