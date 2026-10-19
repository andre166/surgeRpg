/**
 * Playable heroes (not in the original, which has all 16). Some heroes are kept out of the hero select:
 * their sprites, animations, stories and passives stay (src/data/characters.json keeps every index, so
 * saves, affinities and per-hero data keep their meaning), to come back later as skins.
 */
export const SKIN_ONLY_HEROES = Object.freeze([
  1, // Sable
  2, // Ivo
  7, // Lior
  9, // Nell
  10, // Corvin
  13, // Petra
  14, // Dax
]);

export function isPlayableHero(characterIndex) {
  return Number.isInteger(characterIndex) && characterIndex >= 0 && !SKIN_ONLY_HEROES.includes(characterIndex);
}

/** The heroes of the hero select, in their original order. */
export function playableHeroes(characters) {
  return characters.filter((c) => isPlayableHero(c.id));
}

/** `characterIndex` when it is playable, otherwise the first playable hero (e.g. a save's last hero). */
export function playableHeroOr(characterIndex, characters) {
  return isPlayableHero(characterIndex) && characters.some((c) => c.id === characterIndex) ? characterIndex : playableHeroes(characters)[0]?.id ?? 0;
}
