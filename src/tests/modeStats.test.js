import { describe, it, expect } from 'vitest';
import { createModeStats, modeStatsFromSave, recordModeBattle, recordModeRunEnd, modeOf } from '../core/progression/modeStats.js';

describe('statistics per game mode', () => {
  it('battles and runs count in their own mode only', () => {
    let p = { modeStats: createModeStats() };
    p = recordModeBattle(p, false, { highestCombo: 4, highestDamage: 900 }, true);
    p = recordModeBattle(p, true, { highestCombo: 9, highestDamage: 50 }, false);
    expect(p.modeStats.normal).toMatchObject({ wins: 1, losses: 0, highestCombo: 4, highestDamage: 900 });
    expect(p.modeStats.abyss).toMatchObject({ wins: 0, losses: 1, highestCombo: 9, highestDamage: 50 });
    p = recordModeRunEnd(p, { hardMode: true, level: 300 }, { level: 300 });
    p = recordModeRunEnd(p, { hardMode: true, level: 120 }, { level: 120 });
    expect(p.modeStats.abyss).toMatchObject({ runs: 2, highestLevel: 300, highestRecord: { level: 300 } });
    expect(p.modeStats.normal.runs).toBe(0);
    expect(modeOf(true)).toBe('abyss');
  });
  it('saves from before the split keep their history in normal', () => {
    const ms = modeStatsFromSave({ gameOverCount: 7, winBattles: 40, loseBattles: 5, highestLevel: 999, highestCombo: 3, highestDamage: 10, highestRecord: { level: 999 } });
    expect(ms.normal).toMatchObject({ runs: 7, wins: 40, losses: 5, highestLevel: 999, highestRecord: { level: 999 } });
    expect(ms.abyss.runs).toBe(0);
    expect(modeStatsFromSave({ modeStats: { normal: { runs: 2 }, abyss: { runs: 'x' } } }).abyss.runs).toBe(0);
  });
});
