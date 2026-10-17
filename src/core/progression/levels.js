/**
 * Level / EXP / stat point rules. Ports of Class/GData.as lvupFunc, lvUpdata
 * and the EXP application loop of Battle.as EEFWinResultFunc.
 *
 * Run state fields used here: { level, exp, statPoints, hardMode }.
 * `exp` is the EXP accumulated inside the current level (resets on level up).
 */
import { expForLevel } from './expTable.js';

export const BASE_STAT_POINTS_PER_LEVEL = 4;
export const LEVEL_CAP_NORMAL = 10000000;
export const LEVEL_CAP_HARD = 30000000;

export function expToNext(level) {
  return expForLevel(level);
}

export function canLevelUp(level, hardMode) {
  return level <= (hardMode ? LEVEL_CAP_HARD : LEVEL_CAP_NORMAL);
}

/**
 * Applies `gained` EXP to the run, levelling up as many times as needed.
 * Returns { level, exp, statPoints, levelsGained, statPointsGained }.
 * Mirrors the original loop: while the carried total reaches the next-level
 * threshold, subtract it and level up (each level grants 4 + extra points).
 */
export function applyExp(run, gained, extraStatPoints = 0) {
  let level = run.level;
  let statPoints = run.statPoints;
  let remaining = run.exp + gained;
  let levelsGained = 0;
  let statPointsGained = 0;

  if (gained !== 0) {
    // Safety bound equal to the original's hard cap on level-ups per battle.
    for (let i = 0; i < 11111 * 1000; i += 1) {
      const need = expForLevel(level);
      if (remaining < need) break;
      if (!canLevelUp(level, run.hardMode)) break;
      remaining -= need;
      const pts = BASE_STAT_POINTS_PER_LEVEL + extraStatPoints;
      statPoints += pts;
      statPointsGained += pts;
      level += 1;
      levelsGained += 1;
    }
  }
  return { level, exp: remaining, statPoints, levelsGained, statPointsGained };
}
