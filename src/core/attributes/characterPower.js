/**
 * Character ability ("power") affinities. Each of the 16 characters sits on a
 * 4x4 grid; row and column decide which stats the ability level boosts.
 * Port of Class/GData.as SBitLoad_KrakutaPower.
 *
 * Returns weights (0, 1 or 2) of the ability factor for hp/atk/def/speed/luck.
 */
export function characterPowerWeights(characterIndex) {
  const has = (list) => list.includes(characterIndex);
  const w = { hp: 0, atk: 0, def: 0, speed: 0, luck: 0 };
  if (has([5, 6, 9, 10])) w.hp += 2;
  if (has([1, 2, 7, 11, 14, 13, 8, 4])) w.hp += 1;
  if (has([0, 1, 2, 3])) w.atk += 2;
  if (has([4, 5, 6, 7])) w.atk += 1;
  if (has([12, 13, 14, 15])) w.def += 2;
  if (has([8, 9, 10, 11])) w.def += 1;
  if (has([0, 4, 8, 12])) w.speed += 2;
  if (has([1, 5, 9, 13])) w.speed += 1;
  if (has([3, 7, 11, 15])) w.luck += 2;
  if (has([2, 6, 10, 14])) w.luck += 1;
  return w;
}

/**
 * Ability factor used by the stat update (GData.as EqStUpdate):
 * f = ((abilityLv + currentAbilityLv) * 0.25 + 0.75) * (1 + abilityUpPercent / 100), or 0 when abilityLv == 0.
 */
export function characterPowerFactor(abilityLevel, currentAbilityLevel, abilityUpPercent) {
  if (!(abilityLevel > 0)) return 0;
  return ((abilityLevel + currentAbilityLevel) * 0.25 + 0.75) * (1 + abilityUpPercent / 100);
}
