import { describe, it, expect } from 'vitest';
import bossData from '../data/bosses.json';
import { bossGrid, bossKeys, hasBossArt, BOSS_SIZE } from '../ui/bossArt.js';
import { SLIME_BOSS_IDS } from '../core/encounters/slimeBosses.js';

const sig = (g) => g.map((row) => row.map((c) => c ?? '.').join(',')).join('|');

describe('boss art', () => {
  it('draws every map boss, event boss and slime king at 48x48', () => {
    const keys = [
      ...Object.keys(bossData.mapBosses).map((id) => `boss#${id}`),
      ...Object.keys(bossData.eventBosses).map((id) => `event#${id}`),
      ...SLIME_BOSS_IDS.map((id) => `slime#${id}`),
    ];
    for (const key of keys) {
      expect(hasBossArt(key), key).toBe(true);
      const g = bossGrid(key);
      expect(g.length).toBe(BOSS_SIZE);
      expect(g.every((row) => row.length === BOSS_SIZE)).toBe(true);
      expect(g.flat().filter(Boolean).length, key).toBeGreaterThan(300);
    }
  });

  it('gives bosses with different names different sprites', () => {
    const byName = new Map();
    for (const key of bossKeys()) {
      const id = key.split('#');
      const name = id[0] === 'boss' ? bossData.mapBosses[id[1]]?.name : id[0] === 'event' ? bossData.eventBosses[id[1]]?.normal?.name : key;
      byName.set(name, sig(bossGrid(key)));
    }
    expect(new Set(byName.values()).size).toBe(byName.size);
  });

  it('leaves regular monsters to monsterArt', () => {
    expect(hasBossArt('pool_1_0#0')).toBe(false);
    expect(hasBossArt('ene1_0a')).toBe(false);
  });
});
