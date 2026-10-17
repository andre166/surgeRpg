/**
 * Save/load of the profile through an injected storage bridge.
 * Validates and migrates versions so older saves survive game updates.
 */
import { autoAllocOf } from '../progression/autoAlloc.js';
import { createProfile, SAVE_VERSION } from './profile.js';
import { initialSlots, SLOT_COUNT } from '../equipment/slots.js';
import { normalizeSets } from '../equipment/sets.js';
import { normalizeMine, ownedFromOldSave, UNLOCK_KINDS } from '../farm.js';
import { accountOwnedFromOldSave, ACCOUNT_UNLOCK_KINDS } from '../progression/unlocks.js';
import { RARITIES, echoDef } from '../echoes.js';
import { TALENTS } from '../progression/talents.js';
import { CLASSES } from '../progression/classes.js';

export const PROFILE_SLOT = 'profile';

function isObj(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

function sanitizeCounts(list, cap) {
  if (!Array.isArray(list)) return [];
  return list.map((n) => {
    const v = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
    return v > cap ? cap : v;
  });
}

/** Brings any stored object up to the current version; unknown fields are dropped. */
export function migrateProfile(raw) {
  const fresh = createProfile();
  if (!isObj(raw)) return fresh;
  const p = { ...fresh, ...raw, version: SAVE_VERSION };
  p.inventory = {
    weapons: sanitizeCounts(raw.inventory?.weapons, 10),
    armors: sanitizeCounts(raw.inventory?.armors, 10),
    accessories: sanitizeCounts(raw.inventory?.accessories, 3),
  };
  if (!(p.inventory.weapons[0] >= 1)) p.inventory.weapons[0] = 1;
  if (!(p.inventory.armors[0] >= 1)) p.inventory.armors[0] = 1;
  p.slots = Array.isArray(raw.slots) && raw.slots.length === SLOT_COUNT ? raw.slots.map((v) => (Number.isInteger(v) ? v : -2)) : initialSlots();
  if (p.slots[0] < 0) p.slots[0] = 0;
  if (p.slots[1] < 0) p.slots[1] = 0;
  p.characterExp = Array.isArray(raw.characterExp) ? raw.characterExp.slice(0, 16).map((n) => (Number.isFinite(n) ? n : 0)) : fresh.characterExp;
  while (p.characterExp.length < 16) p.characterExp.push(0);
  p.bossWins = isObj(raw.bossWins) ? raw.bossWins : {};
  p.autoAlloc = autoAllocOf(raw);
  p.autoClass = isObj(raw.autoClass) ? raw.autoClass : {};
  p.bossesSeen = isObj(raw.bossesSeen) ? raw.bossesSeen : {};
  p.mapsSeen = isObj(raw.mapsSeen) ? raw.mapsSeen : {};
  p.bestiary = isObj(raw.bestiary) ? raw.bestiary : {};
  p.equipmentSets = normalizeSets(isObj(raw.equipmentSets) ? raw.equipmentSets : null, p.slots);
  p.crafted = isObj(raw.crafted) ? raw.crafted : {};
  if (isObj(raw.farm)) {
    const plots = Array.isArray(raw.farm.plots) ? raw.farm.plots.slice(0, 8) : [];
    while (plots.length < 8) plots.push(null);
    p.farm = {
      ...fresh.farm,
      ...raw.farm,
      plots: plots.map((x) => (isObj(x) && typeof x.crop === 'string' && Number.isFinite(x.plantedAt) ? x : null)),
      // plots are bought now (farm.js PLOT_PRICES); saves from before keep every plot up to the last one in use
      plotsOwned: Number.isFinite(raw.farm.plotsOwned)
        ? Math.max(0, Math.min(8, Math.floor(raw.farm.plotsOwned)))
        : plots.reduce((n, x, i) => (isObj(x) ? i + 1 : n), 0),
      mine: isObj(raw.farm.mine) ? normalizeMine(raw.farm.mine) : fresh.farm.mine,
      items: isObj(raw.farm.items) ? raw.farm.items : {},
      autoReplant: !!raw.farm.autoReplant,
      stable: Array.isArray(raw.farm.stable) ? raw.farm.stable.filter((x) => isObj(x) && typeof x.creature === 'string' && Number.isFinite(x.lastAt)).slice(0, 4) : [],
      lab: isObj(raw.farm.lab) ? raw.farm.lab : null,
    };
    // crops, veins, recipes and stalls are bought now (farm.js UNLOCK_PRICES); saves from before keep what they used
    const owned = isObj(raw.farm.owned) ? raw.farm.owned : ownedFromOldSave(p.farm);
    p.farm.owned = Object.fromEntries(UNLOCK_KINDS.map((k) => [k, Number.isFinite(owned[k]) ? Math.max(0, Math.floor(owned[k])) : 0]));
  } else {
    p.farm = fresh.farm;
  }
  p.echoes = isObj(raw.echoes)
    ? { owned: Array.isArray(raw.echoes.owned) ? raw.echoes.owned.filter((x) => typeof x === 'string') : [], equipped: isObj(raw.echoes.equipped) ? raw.echoes.equipped : {}, mastery: isObj(raw.echoes.mastery) ? raw.echoes.mastery : {} }
    : fresh.echoes;
  p.lastClass = typeof raw.lastClass === 'string' ? raw.lastClass : fresh.lastClass;
  p.heroTalents = isObj(raw.heroTalents) ? raw.heroTalents : {};
  // older saves had one account-wide tree: it goes to the last hero played
  if (isObj(raw.talents) && !isObj(raw.heroTalents)) {
    const hero = Number.isInteger(raw.lastCharacter) ? raw.lastCharacter : 0;
    p.heroTalents = { [hero]: { points: raw.talents.points ?? 0, earned: raw.talents.earned ?? 0, ranks: isObj(raw.talents.ranks) ? raw.talents.ranks : {} } };
  }
  delete p.talents;
  // echo rarities, talent tiers, relic slots and classes are bought now; saves from before keep what they used
  const unlocks = isObj(raw.unlocks) ? raw.unlocks : accountOwnedFromOldSave(raw, {
    rarityOf: (id) => RARITIES.indexOf(echoDef(id)?.rarity),
    tierOf: (id) => TALENTS.find((x) => x.id === id)?.tier ?? -1,
    classIndex: (id) => CLASSES.findIndex((c) => c.id === id),
  });
  p.unlocks = Object.fromEntries(ACCOUNT_UNLOCK_KINDS.map((k) => [k, Number.isFinite(unlocks[k]) ? Math.max(0, Math.floor(unlocks[k])) : 0]));
  p.highestRecord = isObj(raw.highestRecord) ? raw.highestRecord : null;
  p.options = { ...fresh.options, ...(isObj(raw.options) ? raw.options : {}) };
  p.run = isObj(raw.run) && raw.run.active ? raw.run : null;
  for (const k of ['gameOverCount', 'newGameCount', 'highestLevel', 'highestCombo', 'highestDamage', 'winBattles', 'loseBattles', 'gold']) {
    p[k] = Number.isFinite(p[k]) ? p[k] : 0;
  }
  return p;
}

export function createSaveStore(bridge, slot = PROFILE_SLOT) {
  return {
    async load() {
      const res = await bridge.save.load(slot);
      if (!res) return { profile: createProfile(), isNew: true, restoredFromBackup: false };
      return { profile: migrateProfile(res.data), isNew: false, restoredFromBackup: !!res.restoredFromBackup };
    },
    async save(profile) {
      return bridge.save.write(slot, { ...profile, version: SAVE_VERSION, savedAt: Date.now() });
    },
  };
}
