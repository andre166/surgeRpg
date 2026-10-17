import { describe, it, expect } from 'vitest';
import catalog from '../data/items.json';
import { accessoryLook, accessoryGrid, accessoryRuns, ACC_SIZE } from '../ui/accessoryArt.js';

describe('accessory sprites', () => {
  it('every catalog accessory has a known shape and colour theme', () => {
    const missing = catalog.accessories.filter((a) => {
      const l = accessoryLook(a.name);
      return !l.shape || !l.theme;
    });
    expect(missing.map((a) => a.name)).toEqual([]);
  });

  it('every accessory gets its own picture', () => {
    const pictures = new Map();
    for (const a of catalog.accessories) {
      const key = JSON.stringify(accessoryRuns(a.name));
      pictures.set(key, [...(pictures.get(key) ?? []), a.name]);
    }
    expect([...pictures.values()].filter((names) => names.length > 1)).toEqual([]);
  });

  it('reads family, tier and glow', () => {
    expect(accessoryLook('Vitality Gem VI')).toMatchObject({ shape: 'gem', theme: 'Vitality', tier: 6, plus: false });
    expect(accessoryLook('Leech Pendant+')).toMatchObject({ shape: 'pendant', theme: 'Leech', plus: true });
    expect(accessoryLook('Quiet Step Charm')).toMatchObject({ shape: 'feather' });
    expect(accessoryLook('Opening Ring III (H)')).toMatchObject({ shape: 'ring', tier: 3 });
  });

  it('draws 16x16 sprites', () => {
    for (const a of catalog.accessories) {
      const grid = accessoryGrid(a.name);
      expect(grid).toHaveLength(ACC_SIZE);
      expect(grid.every((row) => row.length === ACC_SIZE)).toBe(true);
    }
  });
});
