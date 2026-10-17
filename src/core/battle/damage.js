/**
 * Damage formulas. Faithful ports of Battle.as myGetDameSkNumFunc (player)
 * and eneGetDameSkNumFunc (enemy). `rng.next()` returns [0,1).
 */
import { asInt } from '../util/num.js';

/**
 * Player attack roll.
 * @param {object} a {
 *   atk, critRate, hpRatio, hitsDone (player turns already finished),
 *   forcedCritHits, critDamageMultiplier, enemyPoint, enemyMaxHp, hardMode }
 * @returns {{ damage:number, critical:boolean, motion:number }}
 */
export function rollPlayerDamage(a, rng) {
  let chance = a.critRate;
  if (a.hpRatio <= 0.25) {
    // The original tests <=0.5 first, which is always true here, so the bonus is +0.05.
    chance += 0.05;
    if (chance >= 0.7) chance = 0.7;
  }
  let critical = rng.next() <= chance;
  if (a.hitsDone < a.forcedCritHits) critical = true;

  let dmg;
  let motion;
  if (!critical) {
    dmg = a.atk;
    motion = asInt(rng.next() * 4);
  } else {
    const spread = a.critRate * 3 + 0.2;
    let tier = asInt(rng.next() * 6 * spread);
    if (tier >= 6) tier = 5;
    motion = tier + 5;
    dmg = (a.atk + 1) * (1.75 + tier / 5) * a.critDamageMultiplier + 4;
  }

  // Enemy "defense" derived from its threat score (integer at each step).
  let def = asInt(a.enemyPoint);
  if (a.hardMode) def = asInt(def * 1.1);
  if (def > dmg) def = asInt((def * 3 + dmg * 2) / 5);
  def = asInt(def * 0.3);
  if (def >= dmg * 0.32) def = asInt((def + dmg * 0.32 * 99) / 100);
  def = asInt(def + rng.next() * a.enemyPoint * 0.02 + a.enemyPoint * 0.02);
  if (def >= dmg * 0.44) def = asInt((def + dmg * 0.44 * 199) / 200);

  dmg -= def;
  dmg *= 0.88;
  dmg = dmg + rng.next() * dmg * 0.2 - dmg * 0.1 + rng.next() * 4 - 2;
  if (dmg <= 0) {
    dmg = a.enemyMaxHp < 100 ? rng.next() * a.enemyMaxHp * 0.09 + 1 : rng.next() * 10 + 1;
  }
  return { damage: Math.floor(dmg), critical, motion };
}

/**
 * Enemy attack roll.
 * @param {object} a { enemyAtk, def, playerMaxHp }
 */
export function rollEnemyDamage(a, rng) {
  const atk = a.enemyAtk;
  let d = (atk * 2 + (atk - a.def * 0.5) * 12) / 14;
  let floor = atk * 0.5;
  if (d < floor) d = (floor + d) / 2;
  floor = atk * 0.3;
  if (d < floor) d = (floor * 3 + d) / 4;
  floor = atk * 0.2;
  if (d < floor) d = (floor * 5 + d) / 6;
  floor = atk * 0.1;
  if (d < floor) d = (floor * 7 + d) / 8;

  let dmg = d;
  dmg = dmg + rng.next() * dmg * 0.2 - dmg * 0.1 + rng.next() * 4 - 2;
  dmg = dmg + rng.next() * atk * 0.0225 + atk * 0.0025;
  if (dmg <= 0) {
    dmg = a.playerMaxHp < 100 ? rng.next() * a.playerMaxHp * 0.09 + 1 : rng.next() * 10 + 1;
  }
  return { damage: Math.floor(dmg) };
}

/**
 * Death guard ("instant death avoidance"): chance to survive at 1 HP when a
 * hit would reduce HP to 0, unless HP was already exactly 1.
 * `deathGuard` is encoded as ones + tens*10 (two accessory kinds stack).
 */
export function deathGuardChance(deathGuard) {
  if (deathGuard < 1) return 0;
  const ones = deathGuard % 10;
  const tens = asInt(deathGuard / 10);
  const base = [0, 0.45, 0.62, 0.74, 0.745, 0.75, 0.755];
  const extra = [0, 0.02, 0.03, 0.04];
  const b = base[Math.min(ones + tens, base.length - 1)] ?? 0;
  const e = extra[Math.min(tens, extra.length - 1)] ?? 0;
  return b + e;
}

/** HP drained back to the player on a hit (DamegeKaihukuOn0 / DamegeKaihukuOn). */
export function drainAmount(damage, mods) {
  if (mods.drainSmall) return Math.floor(damage * 0.0198 + 1);
  if (mods.drain) return Math.floor(damage * 0.039 + 1);
  return 0;
}

/** Combo chance for the next player action, with the low-HP bonus. */
export function comboChance(comboRate, hpRatio) {
  let c = comboRate;
  if (hpRatio <= 0.25) {
    // Original chain tests <=0.5 first (always true here): +0.13.
    c += 0.13;
    if (c >= 0.8) c = 0.8;
  }
  return c;
}

/** Full-heal price offered on the pause screen (DataMana_WinOrLose.GetKaihukuCost). */
export function healCost(gold, playerMaxHp) {
  return asInt(gold * 0.5 + playerMaxHp * 0.5 + 3000);
}
