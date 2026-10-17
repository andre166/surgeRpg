import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import catalog from '../data/items.json';
import { createWorld } from '../core/world/world.js';
import { createProfile } from '../core/persistence/profile.js';
import { startRun, isGameOver } from '../core/session/session.js';
import { cheatGold, cheatLevels, cheatRestoreBp, cheatUnlockSlots, cheatAllItems, cheatToggle, cheatMaxStats, cheatDie, MAX_STAT, CHEAT_TOGGLES } from '../core/session/cheats.js';
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
