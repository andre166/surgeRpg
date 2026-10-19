import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import { createWorld } from '../core/world/world.js';
import { createProfile } from '../core/persistence/profile.js';
import { startRun, startBattle, finishBattle, commitGameOver } from '../core/session/session.js';
import {
  runSets, syncActiveSet, switchSet, unlockNextSet, nextSetCost, unlockSlotInAllSets, sanitizeSlots, isBossSetReady, BOSS_SET,
} from '../core/equipment/sets.js';
import { equipItem, unlockSlot, SLOT } from '../core/equipment/slots.js';
import { createSeededRng } from '../core/rng/rng.js';

const world = createWorld(worldData);
const newRun = (profile = createProfile()) => startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });

describe('equipment sets (GData_ItemEquipSet.as)', () => {
  it('5 sets: set 1 open, the rest unlock in order for 130k, 1M, 1.46M and 2.2M', () => {
    let run = { ...newRun(), gold: 10_000_000 };
    expect(runSets(run).unlocked).toBe(1);
    const costs = [];
    for (let i = 0; i < 4; i += 1) { costs.push(nextSetCost(run)); run = unlockNextSet(run); }
    expect(costs).toEqual([130000, 1000000, 1460000, 2200000]);
    expect(runSets(run).unlocked).toBe(5);
    expect(nextSetCost(run)).toBeNull();
    expect(run.gold).toBe(10_000_000 - 4_790_000);
    expect(unlockNextSet({ ...newRun(), gold: 0 }).equipSets.unlocked).toBe(1);
  });
  it('equipping writes into the active set; switching loads another set', () => {
    let run = { ...newRun(), gold: 1e7 };
    run.inventory.weapons[3] = 1;
    run = unlockNextSet(run);
    run = syncActiveSet({ ...run, slots: equipItem(run.slots, 0, 3) });
    expect(runSets(run).sets[0][0]).toBe(3);
    run = switchSet(run, 1);
    expect(run.slots[0]).toBe(0); // set 2 kept the old weapon
    run = switchSet(run, 0);
    expect(run.slots[0]).toBe(3);
    expect(switchSet(run, 4)).toBe(run); // locked
  });
  it('unlocking an accessory slot unlocks it in every set', () => {
    let run = { ...newRun(), gold: 1e7 };
    run = unlockNextSet(run);
    run = unlockSlotInAllSets({ ...run, slots: unlockSlot(run.slots, 3) }, 3);
    expect(runSets(run).sets.every((s) => s[3] === SLOT.EMPTY)).toBe(true);
  });
  it('sets drop items the inventory no longer has', () => {
    const run = newRun();
    const s = run.slots.slice();
    s[0] = 50;
    s[2] = 7;
    const clean = sanitizeSlots(s, run.inventory, run.slots);
    expect(clean[0]).toBe(0);
    expect(clean[2]).toBe(SLOT.EMPTY);
  });
  it('the boss set is equipped against bosses and the normal set comes back after', () => {
    const profile = createProfile();
    let run = { ...newRun(profile), gold: 1e7, base: { hp: 1e9, atk: 1e9, def: 1e9, speed: 1e6, luck: 1e6 } };
    run.inventory.weapons[3] = 1;
    for (let i = 0; i < 4; i += 1) run = unlockNextSet(run);
    expect(isBossSetReady(run)).toBe(true);
    run = switchSet(run, BOSS_SET);
    run = syncActiveSet({ ...run, slots: equipItem(run.slots, 0, 3) }); // boss set: weapon 3
    run = switchSet(run, 0); // normal set: weapon 0
    const rng = createSeededRng(5);
    const ctx = { run, profile, world, catalog, enemyPools: enemyData.pools, bossData };
    const sb = startBattle(ctx, 0, rng);
    expect(sb.run.slots[0]).toBe(3);
    const fin = finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, drop: null, world, catalog }, rng);
    expect(fin.run.slots[0]).toBe(0);
    expect(fin.run.slotsBeforeBoss).toBeUndefined();
    // regular battles keep the normal set
    const sb2 = startBattle({ ...ctx, run: { ...fin.run, map: { ...fin.run.map, id: 1 } } }, -1, rng);
    expect(sb2.run.slots[0]).toBe(0);
  });
  it('sets belong to the account: game over saves them and the next run loads them', () => {
    let run = { ...newRun(), gold: 1e7 };
    run = unlockNextSet(run);
    const p = commitGameOver({ ...run, level: 10 }, createProfile());
    expect(p.equipmentSets.unlocked).toBe(2);
    expect(runSets(newRun(p)).unlocked).toBe(2);
  });
});

describe('sets and slots need the shared base level', () => {
  it('slots and the next set are refused below their base level; the cheat opens or closes them', async () => {
    const { slotUnlockStatus, EQUIPMENT_SET_UNLOCK_NEED } = await import('../core/equipment/slots.js');
    const { setUnlockStatus } = await import('../core/equipment/sets.js');
    const { cheatSets, cheatLockSlots, cheatUnlockSlots } = await import('../core/session/cheats.js');
    const run = { ...newRun(), gold: 1e12 };
    expect(slotUnlockStatus(run.slots, 3, 1e12, 2, 0)).toBe('level');
    expect(slotUnlockStatus(run.slots, 3, 1e12, 3, 0)).toBe('ok');
    expect(slotUnlockStatus(run.slots, 8, 1e12, 6, 0)).toBe('level');
    expect(slotUnlockStatus(run.slots, 8, 1e12, 7, 0)).toBe('ok');
    // slots 10 and 11 need both: base level 6 and 3 Slime Kings
    expect(slotUnlockStatus(run.slots, 10, 1e12, 99, 2)).toBe('level');
    expect(slotUnlockStatus(run.slots, 10, 1e12, 5, 3)).toBe('level');
    expect(slotUnlockStatus(run.slots, 11, 1e12, 6, 3)).toBe('ok');
    const first = EQUIPMENT_SET_UNLOCK_NEED[0].baseLevel;
    expect(setUnlockStatus(run, first - 1, 0)).toBe('level');
    expect(unlockNextSet(run, first - 1, 0)).toBe(run);
    expect(unlockNextSet(run, first, 0).equipSets.unlocked).toBe(2);
    expect(EQUIPMENT_SET_UNLOCK_NEED.at(-1)).toEqual({ slimeKings: 2 });
    const all = cheatSets(run, true);
    expect(all.equipSets.unlocked).toBe(5);
    const none = cheatSets(switchSet(all, 2), false);
    expect(none.equipSets).toMatchObject({ unlocked: 1, active: 0 });
    const locked = cheatLockSlots(cheatUnlockSlots(run));
    expect(locked.slots.slice(3, 12).every((v) => v === -2)).toBe(true);
    expect(locked.slots[2]).not.toBe(-2);
  });
});
