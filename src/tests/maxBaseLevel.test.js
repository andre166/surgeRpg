import { describe, it, expect } from 'vitest';
import { baseAbilityLevel, maxBaseAbilityWins, resetBaseAbilityWins, ABILITY_BOSSES, abyssUnlocked, ABYSS_UNLOCK_BASE, bossLevel, MAP_BOSS_COUNT, BASE_LEVEL_BOSSES, BASE_LEVEL_MAX } from '../core/progression/characters.js';
import { CUSTOM_MAP_BOSSES } from '../core/encounters/customBosses.js';

describe('maxBaseAbilityWins cheat', () => {
  it('raises the base level to its max and keeps other wins', () => {
    const wins = maxBaseAbilityWins({ 40: 1 });
    expect(baseAbilityLevel(wins)).toBe(ABILITY_BOSSES.length * 2);
    expect(wins[40]).toBe(1); // an event boss
  });
});

describe('resetBaseAbilityWins cheat', () => {
  it('drops the base level to 0 and keeps other wins', () => {
    const wins = resetBaseAbilityWins(maxBaseAbilityWins({ 40: 1 }));
    expect(baseAbilityLevel(wins)).toBe(0);
    expect(wins[40]).toBe(1); // an event boss
  });
});

describe('abyssal mode unlock (also unlocks the abyssal Battle button in Options)', () => {
  it('opens at base level ABYSS_UNLOCK_BASE', () => {
    expect(abyssUnlocked({})).toBe(false);
    const wins = Object.fromEntries(Array.from({ length: ABYSS_UNLOCK_BASE }, (_, id) => [id, 1]));
    expect(bossLevel(wins)).toBe(ABYSS_UNLOCK_BASE);
    expect(abyssUnlocked(wins)).toBe(true);
    expect(abyssUnlocked({ ...wins, 0: 0 })).toBe(false);
  });
});

describe('base level (BP): distinct map bosses beaten, up to ${MAP_BOSS_COUNT}', () => {
  it('counts each map boss once (normal or abyssal), ignores event bosses, tops out at BASE_LEVEL_MAX', () => {
    expect(MAP_BOSS_COUNT).toBe(29);
    expect(bossLevel({ 0: 1, 100: 1, 3: 1, 103: 1, 140: 1, 40: 1 })).toBe(2);
    expect(bossLevel(maxBaseAbilityWins({}))).toBe(BASE_LEVEL_MAX);
    expect(baseAbilityLevel(maxBaseAbilityWins({}))).toBe(ABILITY_BOSSES.length * 2); // the original ability level keeps its 18
  });

  it('Surge bosses marked baseLevel count too (the boss of map 3), the others do not', () => {
    expect(CUSTOM_MAP_BOSSES[31].baseLevel).toBe(true);
    expect(BASE_LEVEL_BOSSES).toContain(31);
    expect(BASE_LEVEL_MAX).toBe(29 + Object.values(CUSTOM_MAP_BOSSES).filter((b) => b.baseLevel).length);
    expect(bossLevel({ 31: 1 })).toBe(1);
    expect(bossLevel({ 131: 1 })).toBe(1); // abyssal win
    expect(bossLevel({ 29: 1, 200: 1 })).toBe(0);
  });
});
