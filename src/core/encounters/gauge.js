/**
 * Encounter gauge and danger level.
 * Ports of StageMap.as StageSLVGetSetting (kikendo) and MapEEF (gauge, trigger).
 */
import { asInt, clamp } from '../util/num.js';

/** Danger level of an area for a player level: 4..-2 (hard mode forces 2). */
export function dangerLevel(areaLevel, playerLevel, hardMode = false) {
  if (hardMode) return 2;
  const T = areaLevel;
  const L = playerLevel;
  if (T >= L * 1.4 + 50) return 4;
  if (T >= L * 1.2 + 25) return 3;
  if (T >= L * 1.1 + 8) return 2;
  if (T >= L * 1.05 + 1) return 1;
  if (T <= L * 0.58 - 12) return -2;
  if (T <= L * 0.74 - 6) return -1;
  return 0;
}

const BASE_INCREMENT = { 4: 0.98, 3: 0.85, 2: 0.72, 1: 0.64, 0: 0.58, '-1': 0.4, '-2': 0.32 };

/** Gauge increment for one frame of attempted movement. */
export function gaugeIncrement(danger, encounterMultiplier = 1) {
  let inc = BASE_INCREMENT[danger] ?? 0.58;
  inc += encounterMultiplier - 1;
  inc *= encounterMultiplier;
  return clamp(inc, 0.15, 0.999);
}

/**
 * Advances the gauge by one moving frame and tells whether a battle triggers.
 * Returns { gauge, battle }.
 */
export function advanceGauge(gauge, danger, encounterMultiplier, rng) {
  const prev = gauge;
  let next = Math.min(100, gauge + gaugeIncrement(danger, encounterMultiplier));
  let battle = false;
  const pi = asInt(prev);
  const ni = asInt(next);
  if (pi < ni) {
    if ((ni % 5 === 0 && ni > 50) || ni % 10 === 0) {
      const p = next / 100;
      if (p >= 0.08 && 0.5 * p * p + 0.5 * p * p * p > rng.next() * 1.1) battle = true;
    }
  }
  if (next >= 100) battle = true;
  if (battle) next = 100;
  return { gauge: next, battle };
}

/** Chance that a checkpoint at gauge value g (0..100) triggers a battle. */
export function checkpointChance(g) {
  const p = g / 100;
  if (p < 0.08) return 0;
  return Math.min(1, (p * p + p * p * p) / 2.2);
}
