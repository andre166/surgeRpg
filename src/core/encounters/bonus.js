/**
 * Area bonuses ("stage bonuses"): a type and a number of remaining battles,
 * stored per area as type*10 + charges.
 * Ports of Include_GameData/BounasuKakurituData.as getBonasuSyu and the
 * placement / decrement logic of StageMap.as (BattleStertFunc, RestartToBattleFunc).
 */
import { weightedPick } from './weighted.js';
import { asInt } from '../util/num.js';

export const BONUS_TYPE = Object.freeze({
  HALF_HP: 0,
  HALF_ATK: 1,
  COMBO_CRIT_UP: 2,
  GOLD_X2: 3,
  GOLD_X3: 4,
  GOLD_X4: 5,
  GOLD_X7: 6,
  EXP_X1_5: 7,
  EXP_X2: 8,
  MYSTERY_A: 9, // hidden bosses 32..35
  MYSTERY_B: 10, // hidden bosses 40..42
  MYSTERY_C: 11, // hidden bosses 48..53
  WHITE_ROOM: 12,
  BLACK_ROOM: 13,
  IN_WHITE_ROOM: 14,
  IN_BLACK_ROOM: 15,
  SPECIAL: 16, // map 57 only, boss 90
});

export function encodeBonus(type, charges) {
  return type * 10 + charges;
}
export function bonusType(value) {
  return value > 0 ? asInt(value / 10) : -1;
}
export function bonusCharges(value) {
  return value > 0 ? value % 10 : 0;
}

const BASE_LOW = [10, 10, 22, 18, 10, 0, 0, 10, 10];

/**
 * Picks a bonus type for an area.
 * @param {object} a { areaLevel, targetIndex, currentIndex, gameOverCount, hardMode }
 */
export function rollBonusType(a, rng) {
  const { areaLevel: L } = a;
  let r = -1;
  if (L >= 600 && rng.next() <= 0.06) r = weightedPick([4, 4, 20, 10, 12, 14, 20, 8, 30, 12, 13, 5, 5, 5], rng);
  if (L >= 1000 && rng.next() <= 0.07) r = weightedPick([4, 4, 16, 7, 12, 12, 12, 4, 16, 12, 13, 3, 3, 3], rng);
  if (L >= 2500 && rng.next() <= 0.07) r = weightedPick([4, 4, 16, 5, 10, 12, 12, 3, 18, 15, 16, 12, 8, 8], rng);
  if (L >= 10000 && rng.next() <= 0.08) r = weightedPick([4, 4, 16, 5, 5, 12, 12, 3, 18, 15, 16, 12, 8, 8], rng);
  if (L >= 20000 && rng.next() <= 0.1) r = asInt(rng.next() * 14);
  if (r === -1) {
    if (a.targetIndex === a.currentIndex) r = weightedPick([8, 8, 26, 15, 17, 13, 8, 22, 18, 6, 6, 5, 4, 3], rng);
    else if (a.targetIndex < a.currentIndex) r = weightedPick([7, 4, 25, 14, 20, 16, 8, 16, 32, 4, 4, 3, 3, 3], rng);
    else r = weightedPick([26, 26, 36, 2, 16, 16, 5, 22, 14, 6, 6, 5, 4, 4], rng);
  }
  if (r === 9 && L <= 800) r = 10;
  if (r === 11 && L <= 2300) r = 10;
  if (r === 10 && ((L <= 500 && rng.next() < 0.3) || L <= 350)) r = weightedPick([20, 20, 30, 2, 2, 20, 12, 8, 18], rng);
  if (r === 6 && a.gameOverCount <= 5) r = 5;
  if (r === 5 && a.gameOverCount <= 3) {
    r = weightedPick([10, 10, 22, 18, 10, 0, 0, 15, 22, 4, 4], rng);
    if (r === 9 && L <= 800) r = weightedPick([10, 10, 22, 18, 10, 0, 0, 15, 22], rng);
    if (r === 11 && L <= 2300) r = weightedPick([10, 10, 22, 18, 10, 0, 0, 15, 22], rng);
  }
  if (r === 11 && L >= 47000) r = weightedPick(BASE_LOW, rng);
  if (a.hardMode) {
    if (L < 10000 && r === 13) r = weightedPick(BASE_LOW, rng);
    if (L < 15000 && r === 12) r = weightedPick(BASE_LOW, rng);
    if (r === 11 || (r > 8 && rng.next() <= 0.15)) r = weightedPick(BASE_LOW, rng);
  }
  return r;
}

/**
 * Decrements every bonus of the given tables by one charge (called when a battle starts).
 * Tables are arrays of encoded values; cleared when charges reach 0.
 */
export function decrementBonuses(tables) {
  return tables.map((t) =>
    t.map((v) => {
      if (v <= 0) return 0;
      const c = bonusCharges(v) - 1;
      return c <= 0 ? 0 : encodeBonus(bonusType(v), c);
    }),
  );
}

/**
 * Bonus spawning after a won battle (StageMap.as RestartToBattleFunc).
 * @param {object} a { bonuses: number[], currentIndex, areaLevels: number[], battlesUsed, gameOverCount, hardMode, mapId }
 * @returns new bonuses array
 */
export function spawnBonusesAfterWin(a, rng) {
  const bonuses = a.bonuses.slice();
  const n = bonuses.length;
  const roll = (target, charges) => {
    if (target < 0 || target >= n || bonuses[target] !== 0) return;
    const type = rollBonusType(
      { areaLevel: a.areaLevels[target], targetIndex: target, currentIndex: a.currentIndex, gameOverCount: a.gameOverCount, hardMode: a.hardMode },
      rng,
    );
    if (type >= 0) bonuses[target] = encodeBonus(type, charges);
  };

  if (rng.next() < 0.5 || a.battlesUsed % 5 === 0) {
    let t = a.currentIndex + asInt(rng.next() * 5 - 2.5);
    if (t === a.currentIndex) t = a.currentIndex + asInt(rng.next() * 4 - 2);
    t = Math.max(0, Math.min(n - 1, t));
    roll(t, asInt(rng.next() * 3.5 + 1.5));
  }
  if (rng.next() < 0.3) roll(asInt(rng.next() * n), asInt(rng.next() * 3 + 1));
  if (rng.next() < 0.05) roll(asInt(rng.next() * n), asInt(rng.next() * 2 + 1));
  if (a.mapId === 57 && rng.next() < 0.35) {
    const t = asInt(rng.next() * n);
    if (bonuses[t] === 0) bonuses[t] = encodeBonus(BONUS_TYPE.SPECIAL, asInt(rng.next() * 2.5 + 1));
  }
  return bonuses;
}

/** One-shot "bonus map" consumable: fills every empty area with a bonus of 2..6 charges. */
export function fillMapBonuses(a, rng) {
  const bonuses = a.bonuses.slice();
  for (let t = 0; t < bonuses.length; t += 1) {
    if (bonuses[t] !== 0) continue;
    if (a.mapId === 57 && rng.next() < 0.42) {
      bonuses[t] = encodeBonus(BONUS_TYPE.SPECIAL, asInt(rng.next() * 3 + 3));
      continue;
    }
    const type = rollBonusType(
      { areaLevel: a.areaLevels[t], targetIndex: t, currentIndex: a.currentIndex, gameOverCount: a.gameOverCount, hardMode: a.hardMode },
      rng,
    );
    if (type >= 0) bonuses[t] = encodeBonus(type, asInt(rng.next() * 4 + 2.5));
  }
  return bonuses;
}
