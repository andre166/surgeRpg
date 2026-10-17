/**
 * Weapons are drawn procedurally instead (src/ui/weaponArt.js, one sprite per weapon); the
 * weapon icons below are kept as a fallback reference.
 *
 * Item icons (weapons cut from the sheets in art/items by scripts/cut-icon-sheet.cjs, armors
 * drawn by scripts/build-armor-icons.mjs; both into
 * public/assets/items/<kind>/<icon>.png) and the rules that attach them to catalog items
 * by name, since the game data only has names.
 *
 * Weapons: a themed material picks its themed icon (Sunforged -> holy sword, ...);
 * otherwise the weapon type does (Shiv -> stiletto, Halberd -> halberd, ...). Types with
 * several icons alternate between them along the catalog so neighbours look different.
 */
import { ITEM_TYPE } from '../core/equipment/items.js';
import catalog from '../data/items.json';

/** Material word -> themed icon. */
const WEAPON_THEMES = {
  Sunforged: 'holy_sword',
  Voidglass: 'shadow_sword',
  Dragonbone: 'bone_spear',
  Moonlit: 'frost_blade',
  Primal: 'venom_blade',
  Omega: 'flame_sword',
};

/** Weapon type word -> icons (alternated along the catalog). */
const WEAPON_TYPES = {
  Zweihander: ['greatsword'],
  Greatsword: ['greatsword'],
  Warblade: ['greatsword'],
  Claymore: ['longsword'],
  Blade: ['longsword'],
  Edge: ['longsword'],
  Sword: ['short_sword'],
  Talon: ['scimitar'],
  Falchion: ['scimitar'],
  Sabre: ['scimitar'],
  Fang: ['twin_daggers'],
  Shiv: ['stiletto'],
  Knife: ['stiletto'],
  Cleaver: ['hand_axe', 'cleaver', 'battle_axe'],
  Halberd: ['halberd'],
  Glaive: ['spear'],
};

/** Icons in the sheet without a matching weapon type yet (kept for future weapons). */
export const UNUSED_WEAPON_ICONS = ['warhammer', 'mace', 'flail', 'spiked_club', 'bow', 'crossbow', 'wooden_staff', 'arcane_staff', 'necro_staff', 'scythe', 'pickaxe', 'fire_torch', 'morning_star'];

const url = (kind, icon) => `${import.meta.env.BASE_URL}assets/items/${kind}/${icon}.png`;

function weaponIconName(item) {
  const words = item.name.replace(/[+]/g, ' ').split(/\s+/).filter(Boolean);
  const theme = words.find((w) => WEAPON_THEMES[w]);
  if (theme) return WEAPON_THEMES[theme];
  const type = words.find((w) => WEAPON_TYPES[w]);
  if (!type) return null;
  const list = WEAPON_TYPES[type];
  if (list.length === 1) return list[0];
  // alternate along the catalog (by id) among the weapons of this type
  const sameType = catalog.weapons.filter((w) => w.name.split(/\s+/).includes(type)).sort((a, b) => a.id - b.id);
  return list[Math.max(0, sameType.findIndex((w) => w.id === item.id)) % list.length];
}

/**
 * Armors: every name is "<Material> <Type>" (plus "+" / "II" marks), and
 * scripts/build-armor-icons.mjs draws one icon per material + type, named "<material>_<type>".
 */
export function armorIconName(item) {
  const [material, type] = item.name.replace(/[+]/g, ' ').split(/\s+/).filter(Boolean);
  return material && type ? `${material}_${type}`.toLowerCase() : null;
}

/** Icon URL of a catalog item, or null when it has no icon yet. */
export function itemIconUrl(item) {
  if (!item) return null;
  if (item.type === ITEM_TYPE.WEAPON) {
    const name = weaponIconName(item);
    return name ? url('weapons', name) : null;
  }
  if (item.type === ITEM_TYPE.ARMOR) {
    const name = armorIconName(item);
    return name ? url('armors', name) : null;
  }
  return null;
}
