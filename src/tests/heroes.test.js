import { describe, it, expect } from 'vitest';
import characterData from '../data/characters.json';
import { SKIN_ONLY_HEROES, isPlayableHero, playableHeroes, playableHeroOr } from '../core/progression/heroes.js';

const { characters } = characterData;

describe('playable heroes', () => {
  it('keeps all 16 heroes in the data, with 7 skin-only ones out of the hero select', () => {
    expect(characters).toHaveLength(16);
    const names = playableHeroes(characters).map((c) => c.name);
    expect(names).toEqual(['Rook', 'Marin', 'Tamsin', 'Odo', 'Wren', 'Bastian', 'Elka', 'Hollis', 'Yara']);
    for (const i of SKIN_ONLY_HEROES) expect(isPlayableHero(i)).toBe(false);
  });

  it('a save whose last hero is skin-only falls back to the first playable one', () => {
    expect(playableHeroOr(7, characters)).toBe(0); // Lior
    expect(playableHeroOr(3, characters)).toBe(3); // Marin
    expect(playableHeroOr(99, characters)).toBe(0);
  });
});
