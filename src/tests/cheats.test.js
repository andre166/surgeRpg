import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import catalog from '../data/items.json';
import { createWorld } from '../core/world/world.js';
import { createProfile } from '../core/persistence/profile.js';
import { startRun, isGameOver } from '../core/session/session.js';
import { cheatGold, cheatLevels, cheatRestoreBp, cheatUnlockSlots, cheatAllItems, cheatToggle, cheatMaxStats, cheatDie, cheatRespawnBosses, cheatRemoveItems, MAX_STAT, CHEAT_TOGGLES } from '../core/session/cheats.js';
import { battlePointsLeft } from '../core/progression/battlePoints.js';

const world = createWorld(worldData);
const newRun = () => startRun({ profile: createProfile(), characterIndex: 0, hardMode: false, world, catalog });

describe('cheats', () => {
  it('flags the run and applies each effect', () => {
    const run = newRun();
    expect(cheatGold(run, 500).gold).toBe(500);
    expect(cheatGold(run, 500).cheated).toBe(true);
    const lv = cheatLevels(run, 10);
    expect(lv.level).toBe(11);
    expect(lv.statPoints).toBe(40);
    expect(lv.exp).toBe(0);
    expect(battlePointsLeft(cheatRestoreBp({ ...run, battlesUsed: 25 }))).toBe(run.maxBattlePoints);
    expect(cheatUnlockSlots(run).slots.slice(2, 12).every((id) => id === -1)).toBe(true);
    const all = cheatAllItems(run, catalog);
    expect(all.inventory.accessories.filter((n) => n >= 1).length).toBe(catalog.accessories.length);
    const t = cheatToggle(run, CHEAT_TOGGLES.INFINITE_BP);
    expect(t.cheats.infiniteBp).toBe(true);
    expect(cheatToggle(t, CHEAT_TOGGLES.INFINITE_BP).cheats.infiniteBp).toBe(false);
    expect(Object.values(cheatMaxStats(run).base).every((v) => v === MAX_STAT)).toBe(true);
    const dead = cheatDie(t);
    expect(isGameOver(dead)).toBe(true);
    expect(dead.cheats.infiniteBp).toBe(false);
  });
});

describe('cheat: respawn the bosses of the current map', () => {
  it('clears the beaten map bosses of this map only (and their win count for the run)', () => {
    const map1 = world.map(1);
    const id = map1.bosses[0].id;
    const run = { ...newRun(), bossBeaten: { [id]: 1, 999: 1 }, bossWinCount: { [id]: 2, 999: 1 } };
    const next = cheatRespawnBosses(run, map1);
    expect(next.bossBeaten[id]).toBeUndefined();
    expect(next.bossWinCount[id]).toBeUndefined();
    expect(next.bossBeaten[999]).toBe(1); // other maps untouched
    expect(next.cheated).toBe(true);
  });
});

describe('cheat: remove the equipment dropped', () => {
  it('keeps only the starting weapon and armor; slots and sets drop the rest', () => {
    const full = cheatAllItems(newRun(), catalog);
    const geared = { ...full, slots: full.slots.map((v, i) => (i === 0 ? 5 : i === 1 ? 3 : i === 2 ? 1 : v)) };
    const next = cheatRemoveItems(geared);
    expect(next.inventory).toEqual({ weapons: [1], armors: [1], accessories: [] });
    expect(next.slots[0]).toBe(0);
    expect(next.slots[1]).toBe(0);
    expect(next.slots[2]).toBe(-1);
    for (const s of next.equipSets.sets) expect(s.slice(2).every((v) => v < 0)).toBe(true);
    expect(next.cheated).toBe(true);
  });
});
