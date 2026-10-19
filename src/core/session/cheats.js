/**
 * Debug / fun cheats applied to the run. Not part of the original game.
 * Every cheat flags the run as `cheated` so records sent to Steam can skip it.
 */
import { expForLevel } from '../progression/expTable.js';
import { applyExp } from '../progression/levels.js';
import { SLOT } from '../equipment/slots.js';
import { runSets, setUnlockedSets, sanitizeSlots } from '../equipment/sets.js';
import { mapSlimes } from '../encounters/slimeBosses.js';

/** Toggles kept on the run: checked by the store on every battle / step. */
export const CHEAT_TOGGLES = Object.freeze({
  INFINITE_BP: 'infiniteBp',
  NO_ENCOUNTERS: 'noEncounters',
  ALWAYS_DROP: 'alwaysDrop', // every enemy with a drop table drops an item (to test the loot reveal)
});

function flag(run) {
  return { ...run, cheated: true };
}

export function cheatGold(run, amount) {
  return flag({ ...run, gold: run.gold + amount, totalGold: (run.totalGold ?? 0) + amount });
}

/** Gains exactly enough EXP for `levels` level-ups (stops at the level cap). */
export function cheatLevels(run, levels, extraStatPoints = 0) {
  let need = -run.exp;
  for (let i = 0; i < levels; i += 1) need += expForLevel(run.level + i);
  const lv = applyExp({ level: run.level, exp: run.exp, statPoints: run.statPoints, hardMode: run.hardMode }, Math.max(0, need), extraStatPoints);
  return flag({ ...run, level: lv.level, exp: lv.exp, statPoints: lv.statPoints });
}

export function cheatStatPoints(run, amount) {
  return flag({ ...run, statPoints: run.statPoints + amount });
}

export function cheatRestoreBp(run) {
  return flag({ ...run, battlesUsed: 0 });
}

/** Unlocks every accessory slot (locked -> empty). */
export function cheatUnlockSlots(run) {
  return flag({ ...run, slots: run.slots.map((id, s) => (s >= 2 && s < 12 && id === SLOT.LOCKED ? SLOT.EMPTY : id)) });
}

/** Locks every accessory slot again except the first (what was equipped there is unequipped), in every set. */
export function cheatLockSlots(run) {
  const lock = (slots) => slots.map((id, s) => (s >= 3 && s < 12 ? SLOT.LOCKED : id));
  const es = runSets(run);
  return flag({ ...run, slots: lock(run.slots), equipSets: { ...es, sets: es.sets.map(lock) } });
}

/** Every equipment set open (true) or only the first (false). */
export function cheatSets(run, all) {
  return flag(setUnlockedSets(run, all));
}

/** Grants one copy of every item not owned yet. */
export function cheatAllItems(run, catalog) {
  const fill = (list, defs) => {
    const out = list.slice();
    for (const it of defs) if (!(out[it.id] >= 1)) out[it.id] = 1;
    return out;
  };
  return flag({
    ...run,
    inventory: {
      weapons: fill(run.inventory.weapons, catalog.weapons),
      armors: fill(run.inventory.armors, catalog.armors),
      accessories: fill(run.inventory.accessories, catalog.accessories),
    },
  });
}

/**
 * Removes every item dropped / bought: only the starting weapon and armor stay. The equipped slots
 * and every set drop what is gone (weapon / armor back to the starting ones, accessories emptied).
 */
export function cheatRemoveItems(run) {
  const inventory = { weapons: [1], armors: [1], accessories: [] };
  const slots = sanitizeSlots(run.slots, inventory, run.slots);
  const es = runSets(run);
  const equipSets = { ...es, sets: es.sets.map((s) => sanitizeSlots(s, inventory, run.slots)) };
  const next = { ...run, inventory, slots, equipSets };
  if (run.slotsBeforeBoss) next.slotsBeforeBoss = sanitizeSlots(run.slotsBeforeBoss, inventory, run.slotsBeforeBoss);
  return flag(next);
}

export function cheatToggle(run, key) {
  const cheats = { ...(run.cheats ?? {}), [key]: !run.cheats?.[key] };
  return flag({ ...run, cheats });
}

export const MAX_STAT = 99999999;

/** Sets every base stat to MAX_STAT (equipment bonuses still apply on top). */
export function cheatMaxStats(run) {
  const base = {};
  for (const k of Object.keys(run.base)) base[k] = Math.max(run.base[k], MAX_STAT);
  return flag({ ...run, base });
}

/** Ends the run: spends every BP and turns Infinite BP off so the game over sticks. */
export function cheatDie(run) {
  return flag({ ...run, battlesUsed: run.maxBattlePoints, cheats: { ...(run.cheats ?? {}), [CHEAT_TOGGLES.INFINITE_BP]: false } });
}

/**
 * Brings back the map bosses and slime kings of `map` beaten this run: they stand on the map again
 * and drop items again (their win count for the run is cleared too). Account progress (base level,
 * bestiary, Slime King victories) is kept.
 */
export function cheatRespawnBosses(run, map) {
  const bossBeaten = { ...run.bossBeaten };
  const bossWinCount = { ...run.bossWinCount };
  for (const b of map.bosses ?? []) {
    delete bossBeaten[b.id];
    delete bossWinCount[b.id];
  }
  const slimesBeaten = { ...(run.slimesBeaten ?? {}) };
  for (const s of mapSlimes(map)) delete slimesBeaten[s.id];
  return flag({ ...run, bossBeaten, bossWinCount, slimesBeaten });
}
