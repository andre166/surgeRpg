/**
 * Battle Points (BP). The original stores `used` battles (nokoriBattleTimes)
 * and derives BP = max - used (Class/GDataW.as GetBattlePoint).
 *
 * Flow (BattleVar/DataMana_WinOrLose/StageMap):
 *   - an encounter starts:   used += 1 (the battle itself) and a provisional
 *                            loss penalty used += 2 (4 in hard mode) is booked;
 *   - the player wins:       the provisional penalty is refunded, and a boss
 *                            win refunds its bonus (used -= bossBonus);
 *   - the player loses:      the penalty stays (net cost 3 BP, 5 in hard mode).
 * BP never displays below 0; the run ends when BP reaches 0 after a battle.
 */
import { CUSTOM_MAP_BOSSES } from '../encounters/customBosses.js';

export function battlePointsLeft(state) {
  const left = state.maxBattlePoints - state.battlesUsed;
  return left < 0 ? 0 : left;
}

export function lossPenalty(hardMode) {
  return hardMode ? 4 : 2;
}

/** Called when the enemy appears (before the battle starts). */
export function onEncounterStart(state) {
  return {
    ...state,
    battlesUsed: state.battlesUsed + 1 + lossPenalty(state.hardMode),
    deaths: state.deaths + 1,
  };
}

/** Called when the battle is won. `bossBonus` is the BP refund for that boss (0 if none). */
export function onBattleWon(state, bossBonus = 0) {
  return {
    ...state,
    battlesUsed: state.battlesUsed - lossPenalty(state.hardMode) - bossBonus,
    deaths: state.deaths - 1,
  };
}

/** Called when the battle is lost: nothing to refund. */
export function onBattleLost(state) {
  return { ...state };
}

/** Boss BP refund table (Include_GameData/WinBoss_PlusNokoriBattleTimes.as). */
export const BOSS_BP_BONUS = [3, 7, 4, 3, 3, 3, 4, 4, 4, 4, 3, 3, 5, 3, 2, 2, 2, 2, 2, 4, 6, 4, 5, 4, 4, 4, 4, 4, 5];

/** Extra battles for winning a map boss (Surge-only bosses carry their own, customBosses.js). */
export function bossBattlePointBonus(bossId) {
  if (bossId < 0) return 0;
  return BOSS_BP_BONUS[bossId] ?? CUSTOM_MAP_BOSSES[bossId]?.bpBonus ?? 0;
}
