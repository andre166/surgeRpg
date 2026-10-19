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
 * Hero passive (not in the original): one named stat percent that always applies, from the first run,
 * on one of the hero's affinity stats (characterPowerWeights). Name: i18n `hero.passive.<id>`.
 */
const HERO_PASSIVES = [
  { id: 'quickDraw', stat: 'speed', pct: 0.01 }, // Rook
  { id: 'sureStrike', stat: 'atk', pct: 0.01 }, // Sable
  { id: 'blessedBlade', stat: 'atk', pct: 0.01 }, // Ivo
  { id: 'loadedDice', stat: 'luck', pct: 0.01 }, // Marin
  { id: 'messengerStride', stat: 'speed', pct: 0.01 }, // Tamsin
  { id: 'oakBark', stat: 'hp', pct: 0.01 }, // Odo
  { id: 'stubbornOptimism', stat: 'hp', pct: 0.01 }, // Wren
  { id: 'fourLeafClover', stat: 'luck', pct: 0.01 }, // Lior
  { id: 'gateWatch', stat: 'speed', pct: 0.01 }, // Bastian
  { id: 'healerHands', stat: 'hp', pct: 0.01 }, // Nell
  { id: 'survivor', stat: 'hp', pct: 0.01 }, // Corvin
  { id: 'shieldCard', stat: 'luck', pct: 0.01 }, // Elka
  { id: 'heavyPlate', stat: 'def', pct: 0.01 }, // Hollis
  { id: 'mountainWarden', stat: 'def', pct: 0.01 }, // Petra
  { id: 'tavernDoor', stat: 'def', pct: 0.01 }, // Dax
  { id: 'untouchable', stat: 'def', pct: 0.01 }, // Yara
];

/** The hero's passive ({ id, stat, pct }), or null for an unknown index. */
export function heroPassive(characterIndex) {
  return HERO_PASSIVES[characterIndex] ?? null;
}

/** The hero's passive as stat percents ({ stat: fraction }); empty for an unknown index. */
export function heroPassivePct(characterIndex) {
  const p = heroPassive(characterIndex);
  return p ? { [p.stat]: p.pct } : {};
}

/**
 * Ability factor used by the stat update (GData.as EqStUpdate):
 * f = ((abilityLv + currentAbilityLv) * 0.25 + 0.75) * (1 + abilityUpPercent / 100), or 0 when abilityLv == 0.
 */
export function characterPowerFactor(abilityLevel, currentAbilityLevel, abilityUpPercent) {
  if (!(abilityLevel > 0)) return 0;
  return ((abilityLevel + currentAbilityLevel) * 0.25 + 0.75) * (1 + abilityUpPercent / 100);
}

/** Stat percent (as a fraction) per weight point per unit of ability factor (GData.as EqStUpdate). */
export const CHARACTER_POWER_PCT = Object.freeze({ hp: 0.06, atk: 0.07, def: 0.07, speed: 0.075, luck: 0.08 });

/**
 * The character's stat percent bonuses (fractions) for hp/atk/def/speed/luck.
 * `extra`: Limit Break arrows added to the weights ({ stat: n }, core/progression/limitBreak.js).
 */
export function characterPowerBonus(characterIndex, abilityLevel, currentAbilityLevel, abilityUpPercent = 0, extra = null) {
  const w = characterPowerWeights(characterIndex);
  if (extra) for (const k of Object.keys(w)) w[k] += extra[k] ?? 0;
  const f = characterPowerFactor(abilityLevel, currentAbilityLevel, abilityUpPercent);
  const out = {};
  for (const k of Object.keys(w)) out[k] = w[k] * f * CHARACTER_POWER_PCT[k];
  return out;
}
