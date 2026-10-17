import { describe, it, expect } from 'vitest';
import enemyData from '../data/enemies.json';
import { monsterSvg, monsterGrid, monsterNames, monsterTypes, hasMonsterType, MONSTER_ORDER, MONSTER_SIZE } from '../ui/monsterArt.js';

// the first 40, drawn first (weakest first): the computed order must keep them
const FIRST_40 = [
  'ene1_0a', 'ene1_0b', 'ene1_0c', 'ene1_0d', 'ene1_0e', 'ene1_1a', 'ene1_1b', 'ene1_1c', 'ene1_1d', 'ene1_2a',
  'ene1_2b', 'ene1_2d', 'ene1_2c', 'ene2_0a', 'ene2_0b', 'ene2_0c', 'ene2_0d', 'ene2_1a', 'ene2_1b', 'ene2_1c',
  'ene2_1d', 'ene2_1e', 'ene1_3a', 'ene1_3e', 'ene1_3b', 'ene1_3c', 'ene1_3d', 'ene2_2e', 'ene3_0a', 'ene2_2a',
  'ene2_2c', 'ene2_2d', 'ene2_2b', 'ene3_0b', 'ene3_0c', 'ene3_0d', 'ene2_3b', 'ene2_3c', 'ene2_3e', 'ene2_3a',
];

describe('monster art', () => {
  it('ranks every enemy sprite, weakest first', () => {
    const sprites = new Set(Object.values(enemyData.pools).flat().map((e) => e.sprite));
    expect(MONSTER_ORDER).toHaveLength(sprites.size);
    expect(MONSTER_ORDER.slice(0, 40)).toEqual(FIRST_40);
  });

  it('has a drawing for every monster type', () => {
    for (const type of monsterTypes()) expect(hasMonsterType(type), type).toBe(true);
    expect(monsterNames().every(Boolean)).toBe(true);
  });

  it('draws every monster inside its 32x32 grid', () => {
    for (const s of MONSTER_ORDER) {
      const g = monsterGrid(s);
      expect(g, s).toHaveLength(MONSTER_SIZE);
      expect(g.every((row) => row.length === MONSTER_SIZE)).toBe(true);
      expect(monsterSvg(s)).toMatch(/^<svg [^>]*viewBox="0 0 32 32".*<rect /);
    }
  });

  it('gives the first 40 distinct sprites', () => {
    expect(new Set(FIRST_40.map((s) => monsterSvg(s))).size).toBe(40);
  });

  it('resolves battle keys and leaves bosses to the procedural art', () => {
    expect(monsterSvg('pool_1_0#0')).toBe(monsterSvg('ene1_0a'));
    expect(monsterSvg('pool_2_1#2')).toBe(monsterSvg('ene2_1c'));
    expect(monsterSvg('pool_13_0#0')).not.toBeNull();
    expect(monsterSvg('boss#1')).toBeNull();
  });
});
