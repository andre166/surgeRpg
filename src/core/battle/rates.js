/**
 * Battle rates derived from the player's stats and the enemy threat score.
 * Faithful port of BattleVar.as enePointGet / KakurituBairituGet.
 * All rates are truncated to 2 decimals like the original (`int(x*100)/100`).
 */
import { asInt, trunc2 } from '../util/num.js';

/**
 * Enemy threat score ("enemy point"). Integer arithmetic at every assignment.
 * @param {object} e { hp, atk, exp, gold }
 * @param {number} areaLevel level of the area the enemy belongs to
 * @param {boolean[]} dropTiers [tier1, tier2, tier3] presence of drop tables
 */
export function enemyPoint(e, areaLevel, dropTiers = [false, false, false]) {
  let p = asInt(e.hp / 15 + e.atk / 2 + e.exp / 475000 + e.gold / 50);
  p = asInt((p * 2 + areaLevel * 3) / 5);
  if (areaLevel >= 20000) p = asInt(p * 1.05);
  if (dropTiers[0]) p += 5;
  if (dropTiers[1]) p += 10;
  if (dropTiers[2]) p += 15;
  if (dropTiers[0]) p = asInt(p * 1.05);
  if (dropTiers[1]) p = asInt(p * 1.075);
  if (dropTiers[2]) p = asInt(p * 1.1);
  return p;
}

/** Normalisation divisor used by every rate. */
export function rateDivisor(enemyPt) {
  if (enemyPt <= 500) return asInt((enemyPt * 4 + 1000) / 6);
  if (enemyPt <= 1000) return asInt((enemyPt * 4 + 2000) / 6);
  if (enemyPt <= 2000) return asInt((enemyPt * 4 + 4000) / 6);
  return asInt((enemyPt * 3 + 4000) / 5);
}

/**
 * @param {object} p { speed, luck, speedShare, luckShare } player totals
 * @param {number} enemyPt
 * @returns {{ comboRate, critRate, itemRate, goldMultiplier }}
 */
export function battleRates(p, enemyPt) {
  const d = rateDivisor(enemyPt);
  const spd = p.speed;
  const luk = p.luck;

  let combo = (spd / d) * 0.52 + 0.06;
  combo += spd < 1500000 ? (spd / 1500000) * 0.14 : 0.14;
  combo += luk < 1000000 ? (luk / 1000000) * 0.02 : 0.02;
  combo += p.speedShare * 0.24;
  if (combo > 0.5) combo = 0.5;
  combo += p.speedShare * 0.24;
  combo = trunc2(combo);

  let crit = (spd / d) * 0.07 + (luk / d) * 0.22 + 0.06;
  crit += spd < 1500000 ? (spd / 1500000) * 0.1 : 0.1;
  crit += luk < 1000000 ? (luk / 1000000) * 0.02 : 0.02;
  crit += p.speedShare * 0.11;
  crit += p.luckShare * 0.14;
  if (crit > 0.35) crit = 0.35;
  crit += p.speedShare * 0.11;
  crit += p.luckShare * 0.14;
  crit = trunc2(crit);

  let item = (luk / d) * 0.65 + 0.3;
  item += luk < 2000 ? (luk / 2000) * 0.15 : 0.16;
  item += luk < 25000 ? (luk / 25000) * 0.15 : 0.16;
  item += luk < 300000 ? (luk / 300000) * 0.3 : 0.31;
  item += luk < 500000 ? (luk / 500000) * 0.35 : 0.36;
  item += luk < 1000000 ? (luk / 1000000) * 0.15 : 0.16;
  if (item > 1) item = (item * 1 + 1.7) / 2.7;
  if (item > 2) item = (item * 1 + 3.5) / 2.75;
  if (item > 3.5) item = 3.5;
  item = trunc2(item);

  let gold = (luk / d) * 0.77 + 1;
  gold += luk < 10000 ? (luk / 10000) * 0.55 : 0.55;
  gold += luk < 50000 ? (luk / 50000) * 0.55 : 0.55;
  gold += luk < 200000 ? (luk / 200000) * 1.1 : 1.1;
  if (gold > 2) gold = (gold + 2) / 2;
  if (gold > 2.5) gold = (gold + 2.5) / 2;
  if (gold > 3) gold = (gold + 6) / 3;
  if (gold > 3.5) gold = (gold + 10.5) / 4;
  if (gold > 4) gold = 4;
  gold = trunc2(gold);
  if (gold < 1.2) gold = gold >= 1.05 ? 1.1 : 1;

  return { comboRate: combo, critRate: crit, itemRate: item, goldMultiplier: gold };
}
