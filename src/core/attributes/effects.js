/**
 * Accessory effect codes. The numeric values mirror the original data
 * (Class/GData.as EqStUpdate) so extracted tables can be used directly;
 * new content should use the symbolic names.
 */
export const EFFECT = Object.freeze({
  HP_PLUS: 30,
  ATK_PLUS: 31,
  DEF_PLUS: 32,
  SPEED_PLUS: 33,
  LUCK_PLUS: 34,
  PLAY_GEM: 35, // gamble gem: ATK/DEF/SPEED bonus that may fail to activate
  ALL_PLUS: 40,
  ATK_DEF_SPEED_PLUS: 41,
  HP_ATK_DEF_SPEED_PLUS: 42,
  EXP_PERCENT: 60,
  STAT_POINT_PLUS_1: 700,
  STAT_POINT_PLUS_2: 701,
  CRIT_RATE_PLUS: 200,
  CRIT_DAMAGE_PLUS: 210,
  FIRST_HITS_CRIT_1: 310,
  FIRST_HITS_CRIT_2: 311,
  FIRST_HITS_CRIT_3: 312,
  COMBO_RATE_PLUS: 250,
  DRAIN_SMALL: 1201,
  DRAIN: 1200,
  DEATH_GUARD_1: 1210,
  DEATH_GUARD_10: 1211,
  ENCOUNTER_RATE_DOWN: 10,
  ENCOUNTER_RATE_UP: 12,
  INSTANT_ENCOUNTER: 14,
  MOVE_SPEED_PERCENT: 100,
  MAX_BATTLE_POINTS_PLUS: 500,
  CHARACTER_POWER_PERCENT: 820,
});
