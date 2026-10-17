/**
 * Hidden ("mystery") bosses rolled from the bonus type of the current area
 * when a regular encounter starts. Port of StageMap.as BattleStertFunc 1650-1877.
 *
 * @param {object} a {
 *   bonusType, areaLevel, hardMode,
 *   bossesSeen: { [id]: 1 },
 *   weaponKindsOwned, armorKindsOwned, weaponKindsInMode, armorKindsInMode }
 * @returns boss id or -1
 */
import { weightedPick } from './weighted.js';
import { asInt } from '../util/num.js';

export function rollEventBoss(a, rng) {
  const t = a.bonusType;
  if (t === 9) {
    if (rng.next() < 0.4) return 32 + asInt(rng.next() * 4);
    return -1;
  }
  if (t === 10) {
    if (rng.next() >= 0.44) return -1;
    const L = a.areaLevel;
    let k = 0;
    if (L <= 1000) k = 0;
    else if (L < 1600) k = weightedPick([12, 6, 0], rng);
    else if (L < 2000) k = weightedPick([10, 11, 2], rng);
    else if (L < 3600) k = weightedPick([7, 11, 3], rng);
    else if (L < 5000) k = weightedPick([6, 11, 4], rng);
    else k = weightedPick([4, 10, 4], rng);
    return 40 + k;
  }
  if (t === 11) {
    if (rng.next() >= 0.35) return -1;
    const L = a.areaLevel;
    let k;
    if (L < 3000) k = weightedPick([10, 10, 10], rng);
    else if (L < 8000) k = weightedPick([12, 12, 12, 9, 7, 7], rng);
    else k = weightedPick([10, 10, 10, 9, 7, 7], rng);
    return 48 + k;
  }
  if (t === 12) {
    if (rng.next() >= 0.24) return -1;
    const real = a.hardMode ? 62 : 60;
    if (a.bossesSeen[real]) return real;
    const threshold = (a.weaponKindsInMode - 4) * (a.hardMode ? 0.85 : 0.7);
    if (a.weaponKindsOwned >= threshold) return real;
    return 61;
  }
  if (t === 13) {
    if (rng.next() >= 0.26) return -1;
    const real = a.hardMode ? 68 : 66;
    if (a.bossesSeen[real]) return real;
    const wT = (a.weaponKindsInMode - 8) * (a.hardMode ? 0.7 : 0.4);
    const aT = (a.armorKindsInMode - 3) * (a.hardMode ? 0.8 : 0.6);
    if (a.weaponKindsOwned >= wT || a.armorKindsOwned >= aT) return real;
    return 67;
  }
  if (t === 16) {
    if (rng.next() < 0.26) return 90;
    return -1;
  }
  return -1;
}

/** Level-scaled gold of bosses 40..42 (EneData_Boss.as 73-112). */
export function scaledBossGold(bossId, areaLevel, hardMode) {
  let L = areaLevel;
  if (L > 7500) L = asInt((L * 3 + 15000) / 5);
  if (L > 10000) L = asInt((L + 40000) / 5);
  if (L > 15000) L = asInt((L + 60000) / 5);
  const k = bossId - 40;
  if (hardMode) return [50000 + L * 8, 100000 + L * 11, 200000 + L * 14][k];
  return [15000 + L * 5, 30000 + L * 7.5, 77777 + L * 10][k];
}
