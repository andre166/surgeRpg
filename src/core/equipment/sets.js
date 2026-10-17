/**
 * Equipment sets. Port of Class/GData_ItemEquipSet.as, Class/GameSaveData_ItemEquipSet.as and
 * Class_StMapMenu/StMapMenu_soubiSet.as:
 *   - 5 sets of 16 slots; set 1 is open, the others unlock in order for run gold
 *     (EQUIPMENT_SET_UNLOCK_COST: 300k, 1.5M, 2.1M, 4M);
 *   - switching loads the set into the equipped slots; equipping writes into the active set;
 *   - unlocking an accessory slot unlocks it in every set (SlotLockKaizyo);
 *   - sets and the unlock count belong to the account: the run carries a copy and the game
 *     over writes it back (EndGame), like the inventory.
 *
 * Addition (not in the original): the 5th set is the BOSS set. Against a boss (map boss,
 * event boss or slime king) it is equipped automatically for that battle and the previous
 * equipment comes back afterwards.
 */
import { SLOT, SLOT_COUNT, EQUIPMENT_SET_COUNT, EQUIPMENT_SET_UNLOCK_COST, EQUIPMENT_SET_UNLOCK_BASE, equippedCount, ownedCount, initialSlots } from './slots.js';
import { ITEM_TYPE } from './items.js';

export const NORMAL_SETS = 4;
export const BOSS_SET = 4; // index of the boss set

/** Normalises stored sets: 5 arrays of 16 slots; missing sets copy `fallback` (NewGame_FirstInit). */
export function normalizeSets(raw, fallback = initialSlots()) {
  const base = Array.isArray(fallback) && fallback.length === SLOT_COUNT ? fallback : initialSlots();
  const sets = [];
  for (let i = 0; i < EQUIPMENT_SET_COUNT; i += 1) {
    const s = raw?.sets?.[i];
    sets.push(Array.isArray(s) && s.length === SLOT_COUNT ? s.map((v) => (Number.isInteger(v) ? v : SLOT.LOCKED)) : base.slice());
  }
  const unlocked = Math.max(1, Math.min(EQUIPMENT_SET_COUNT, Number.isInteger(raw?.unlocked) ? raw.unlocked : 1));
  const active = Math.max(0, Math.min(unlocked - 1, Number.isInteger(raw?.active) ? raw.active : 0));
  return { unlocked, active, sets };
}

/**
 * Keeps a set valid for an inventory: weapon/armor not owned fall back to the starting item;
 * accessories beyond the owned copies are removed; slot locks follow `locks` (the run slots).
 */
export function sanitizeSlots(slots, inventory, locks) {
  const out = slots.slice();
  for (let s = 0; s < SLOT_COUNT; s += 1) {
    if (s >= 2 && locks) {
      if (locks[s] === SLOT.LOCKED) { out[s] = SLOT.LOCKED; continue; }
      if (out[s] === SLOT.LOCKED) out[s] = SLOT.EMPTY;
    }
  }
  if (!(out[0] >= 0 && ownedCount(inventory, ITEM_TYPE.WEAPON, out[0]) >= 1)) out[0] = 0;
  if (!(out[1] >= 0 && ownedCount(inventory, ITEM_TYPE.ARMOR, out[1]) >= 1)) out[1] = 0;
  for (let s = 2; s < SLOT_COUNT; s += 1) {
    const id = out[s];
    if (id < 0) continue;
    if (equippedCount(out.slice(0, s + 1), ITEM_TYPE.ACCESSORY, id) > ownedCount(inventory, ITEM_TYPE.ACCESSORY, id)) out[s] = SLOT.EMPTY;
  }
  return out;
}

/** The run's sets, creating them from its slots for runs started before sets existed. */
export function runSets(run) {
  return run.equipSets ? run.equipSets : normalizeSets({ unlocked: 1, active: 0 }, run.slots);
}

/** Writes the equipped slots into the active set (EqStUpdate). Call after any equipment change. */
export function syncActiveSet(run) {
  const es = runSets(run);
  const sets = es.sets.slice();
  sets[es.active] = run.slots.slice();
  return { ...run, equipSets: { ...es, sets } };
}

/** Switches to an unlocked set (SetNum): the current slots are kept in the old set first. */
export function switchSet(run, index) {
  const es = runSets(syncActiveSet(run));
  if (index < 0 || index >= es.unlocked || index === es.active) return run;
  const slots = sanitizeSlots(es.sets[index], run.inventory, run.slots);
  const sets = es.sets.slice();
  sets[index] = slots;
  return { ...run, slots, equipSets: { ...es, active: index, sets } };
}

export function nextSetCost(run) {
  const es = runSets(run);
  return es.unlocked >= EQUIPMENT_SET_COUNT ? null : EQUIPMENT_SET_UNLOCK_COST[es.unlocked - 1];
}

/** Base level the next set needs (EQUIPMENT_SET_UNLOCK_BASE), or null when all are open. */
export function nextSetBase(run) {
  const es = runSets(run);
  return es.unlocked >= EQUIPMENT_SET_COUNT ? null : EQUIPMENT_SET_UNLOCK_BASE[es.unlocked - 1];
}

/** Can the next set be bought? 'ok' | 'max' | 'level' (base level too low) | 'gold'. */
export function setUnlockStatus(run, baseLevel = Infinity) {
  const cost = nextSetCost(run);
  if (cost == null) return 'max';
  if (baseLevel < nextSetBase(run)) return 'level';
  if (run.gold < cost) return 'gold';
  return 'ok';
}

/** Unlocks the next set for run gold (SetLockKaizyo); it starts as a copy of the current equipment. */
export function unlockNextSet(run, baseLevel = Infinity) {
  const cost = nextSetCost(run);
  if (setUnlockStatus(run, baseLevel) !== 'ok') return run;
  const es = runSets(syncActiveSet(run));
  const sets = es.sets.slice();
  sets[es.unlocked] = run.slots.slice();
  return { ...run, gold: run.gold - cost, equipSets: { ...es, unlocked: es.unlocked + 1, sets } };
}

/** An accessory slot unlocked on the run is unlocked in every set (SlotLockKaizyo). */
export function unlockSlotInAllSets(run, slot) {
  const es = runSets(run);
  const sets = es.sets.map((s) => {
    const n = s.slice();
    if (n[slot] === SLOT.LOCKED) n[slot] = SLOT.EMPTY;
    return n;
  });
  return { ...run, equipSets: { ...es, sets } };
}

/**
 * Cheat: opens every set (copies of the current equipment) or closes all but the first (the first
 * set is equipped again).
 */
export function setUnlockedSets(run, all) {
  if (all) {
    const es = runSets(syncActiveSet(run));
    const sets = es.sets.map((s, i) => (i >= es.unlocked ? run.slots.slice() : s));
    return { ...run, equipSets: { ...es, unlocked: EQUIPMENT_SET_COUNT, sets } };
  }
  const first = switchSet(run, 0);
  const es = runSets(syncActiveSet(first));
  return { ...first, equipSets: { ...es, unlocked: 1, active: 0 } };
}

export function isBossSetReady(run) {
  return runSets(run).unlocked > BOSS_SET;
}

/** Equips the boss set for a boss battle, remembering the slots to restore afterwards. */
export function equipBossSet(run) {
  const synced = syncActiveSet(run);
  const es = runSets(synced);
  if (!isBossSetReady(synced) || es.active === BOSS_SET) return synced;
  const slots = sanitizeSlots(es.sets[BOSS_SET], run.inventory, run.slots);
  return { ...synced, slots, slotsBeforeBoss: run.slots.slice() };
}

/** After the battle: the previous equipment comes back. */
export function restoreAfterBoss(run) {
  if (!run.slotsBeforeBoss) return run;
  const { slotsBeforeBoss, ...rest } = run;
  return { ...rest, slots: slotsBeforeBoss };
}
