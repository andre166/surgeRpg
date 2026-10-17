import { describe, it, expect } from 'vitest';
import catalog from '../data/items.json';
import { weaponLook, weaponGrid, weaponRuns, MATERIALS, ART_SIZE } from '../ui/weaponArt.js';

describe('weapon sprites', () => {
  it('every catalog weapon has a known material and type', () => {
    const missing = catalog.weapons.filter((w) => {
      const l = weaponLook(w.name);
      return !l.material || !l.type;
    });
    expect(missing.map((w) => w.name)).toEqual([]);
  });

  it('every weapon gets its own picture', () => {
    const pictures = new Map();
    for (const w of catalog.weapons) {
      const key = JSON.stringify(weaponRuns(w.name));
      pictures.set(key, [...(pictures.get(key) ?? []), w.name]);
    }
    const shared = [...pictures.values()].filter((names) => names.length > 1);
    expect(shared).toEqual([]);
  });

  it('reads the modifiers', () => {
    expect(weaponLook('Silver Shiv + II')).toMatchObject({ material: 'Silver', type: 'Shiv', plus: true, second: true });
    expect(weaponLook('Copper Talon')).toMatchObject({ plus: false, second: false });
  });

  it('draws a 24x24 sprite with an outline and the material colours', () => {
    const grid = weaponGrid('Cobalt Sabre');
    expect(grid).toHaveLength(ART_SIZE);
    expect(grid.every((row) => row.length === ART_SIZE)).toBe(true);
    const colours = new Set(grid.flat().filter(Boolean));
    expect(colours.has('#14161f')).toBe(true);
    expect(MATERIALS.Cobalt.blade.some((c) => colours.has(c))).toBe(true);
  });

  it('is deterministic', () => {
    expect(weaponRuns('Omega Halberd +')).toEqual(weaponRuns('Omega Halberd +'));
  });
});
