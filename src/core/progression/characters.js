/**
 * Character progression that persists across runs.
 * Ports of Include_GameData/WinBoss_UpKyrakutaPowerLv.as and
 * Class/GameSaveData.as (kyaraExpTable / getkyaraLv / okKyaraLvUp).
 */

export const CHARACTER_COUNT = 16;

/** Starting base stats are identical for every character (GData.as NewGame). */
export const STARTING_STATS = Object.freeze({ hp: 100, atk: 10, def: 10, speed: 5, luck: 1 });

/** Stat gained per allocated stat point (StMapMenu_sutetasu.as). */
export const STAT_POINT_GAIN = Object.freeze({ hp: 5, atk: 3, def: 3, speed: 2, luck: 1 });

/** Bosses whose first defeat raises the shared base ability level (max 18 with hard mode). */
export const ABILITY_BOSSES = [0, 1, 2, 8, 9, 12, 13, 19, 28];

/**
 * Shared base ability level = number of ability bosses beaten (normal + hard).
 * @param {object} bossWins { [bossKey]: 1 } where bossKey = id (normal) or id + 100 (hard)
 */
export function baseAbilityLevel(bossWins) {
  let n = 0;
  for (const id of ABILITY_BOSSES) {
    if (bossWins[id]) n += 1;
    if (bossWins[id + 100]) n += 1;
  }
  return n;
}

/** Cheat: marks every ability boss beaten on normal and hard, i.e. the max base ability level. */
export function maxBaseAbilityWins(bossWins) {
  const next = { ...bossWins };
  for (const id of ABILITY_BOSSES) {
    next[id] = 1;
    next[id + 100] = 1;
  }
  return next;
}

export const CHARACTER_EXP_TABLE = [
  10000, 100000, 700000, 1800000, 3600000, 6000000, 10000000, 14000000, 18000000, 22000000,
  28000000, 34000000, 40000000, 50000000, 65000000, 80000000, 100000000, 120000000, 140000000,
  170000000, 200000000, 240000000, 280000000,
];
export const CHARACTER_LEVEL_CAP = 20;

/** Per-character ability level from accumulated exp (sum of final run levels). */
export function characterAbilityLevel(exp) {
  let lv = 0;
  for (let i = 0; i < CHARACTER_EXP_TABLE.length; i += 1) {
    if (exp >= CHARACTER_EXP_TABLE[i]) lv = i + 1;
  }
  return lv;
}

/** Exp is only added while below the cap threshold (GameSaveData.as okKyaraLvUp). */
export function canGainCharacterExp(exp) {
  return exp < CHARACTER_EXP_TABLE[CHARACTER_LEVEL_CAP - 1];
}

/** Applies the end-of-run exp gain (final level) when the base ability level is unlocked. */
export function addCharacterExp(exp, finalLevel, baseAbility) {
  if (baseAbility <= 0) return exp;
  if (!canGainCharacterExp(exp)) return exp;
  return exp + finalLevel;
}

/** Applies staged stat points (StMapMenu_sutetasu.as Confirm). */
export function allocateStatPoints(base, staged) {
  const total = (staged.hp ?? 0) + (staged.atk ?? 0) + (staged.def ?? 0) + (staged.speed ?? 0) + (staged.luck ?? 0);
  return {
    base: {
      hp: base.hp + (staged.hp ?? 0) * STAT_POINT_GAIN.hp,
      atk: base.atk + (staged.atk ?? 0) * STAT_POINT_GAIN.atk,
      def: base.def + (staged.def ?? 0) * STAT_POINT_GAIN.def,
      speed: base.speed + (staged.speed ?? 0) * STAT_POINT_GAIN.speed,
      luck: base.luck + (staged.luck ?? 0) * STAT_POINT_GAIN.luck,
    },
    spent: total,
  };
}
