import { describe, it, expect } from 'vitest';
import { CREATURES } from '../core/farm.js';
import { stableGrid, stableKeys, hasStableArt, STABLE_SIZE } from '../ui/stableArt.js';

const sig = (g) => g.map((row) => row.map((c) => c ?? '.').join(',')).join('|');

describe('stable creature art', () => {
  it('draws every stable creature at 32x32, each different', () => {
    const keys = CREATURES.map((c) => `stable:${c.id}`);
    expect(stableKeys().sort()).toEqual([...keys].sort());
    for (const key of keys) {
      expect(hasStableArt(key), key).toBe(true);
      const g = stableGrid(key);
      expect(g.length).toBe(STABLE_SIZE);
      expect(g.every((row) => row.length === STABLE_SIZE)).toBe(true);
      expect(g.flat().filter(Boolean).length, key).toBeGreaterThan(150);
    }
    expect(new Set(keys.map((k) => sig(stableGrid(k)))).size).toBe(keys.length);
  });

  it('has no art for unknown keys', () => {
    expect(hasStableArt('stable:nope')).toBe(false);
    expect(hasStableArt('pool_1_0#0')).toBe(false);
    expect(stableGrid('stable:nope')).toBeNull();
  });
});
