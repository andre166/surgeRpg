import { describe, it, expect } from 'vitest';
import { baseAbilityLevel, maxBaseAbilityWins, ABILITY_BOSSES } from '../core/progression/characters.js';

describe('maxBaseAbilityWins cheat', () => {
  it('raises the base level to its max and keeps other wins', () => {
    const wins = maxBaseAbilityWins({ 5: 1 });
    expect(baseAbilityLevel(wins)).toBe(ABILITY_BOSSES.length * 2);
    expect(wins[5]).toBe(1);
  });
});
