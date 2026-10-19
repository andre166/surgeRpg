/**
 * Builds the runtime enemy for a battle from its definition, the area level,
 * the player's derived stats and an optional encounter bonus.
 * Faithful port of BattleVar.as eneLoad (+ enePointGet / KakurituBairituGet).
 *
 * Enemy definition shape (see data/enemies):
 *   { id, name, hp, atk, gold, expParam, expMode: 'scaled'|'raw', expScale,
 *     skills: number[], drops: [tier1|null, tier2|null, tier3|null],
 *     hardDrops?: [..] }
 *   drop tier: { type: 0|1|2, itemId: number, chance: number }
 *
 * Encounter bonus kinds (BounasSyu):
 *   0 enemy HP halved, 1 enemy ATK halved, 2 combo/crit up, 3..6 gold x2/x3/x4/x7,
 *   7 exp x1.5 (x2 hard), 8 exp x2 (x3 hard), -1/undefined none.
 */
import { expForLevel } from '../progression/expTable.js';
import { enemyPoint, battleRates } from './rates.js';
import { trunc2 } from '../util/num.js';
import { balancedComboRate, COMBO_BONUS_CAP } from './combo.js';
import { isMapBossId } from '../encounters/customBosses.js';

export const BONUS = Object.freeze({
  NONE: -1,
  HALF_HP: 0,
  HALF_ATK: 1,
  COMBO_CRIT_UP: 2,
  GOLD_X2: 3,
  GOLD_X3: 4,
  GOLD_X4: 5,
  GOLD_X7: 6,
  EXP_X1_5: 7,
  EXP_X2: 8,
});

/**
 * @param {object} args {
 *   enemy, areaLevel, player: { total:{...}, speedShare, luckShare, modifiers },
 *   hardMode, bonus, bossId (>=0 for a boss, -1 otherwise), bossAlreadyWon }
 */
export function setupEnemy(args) {
  const { enemy, areaLevel, player, hardMode = false, bonus = BONUS.NONE } = args;
  const bossId = args.bossId ?? -1;
  const mods = player.modifiers;

  let hp = enemy.hp;
  let atk = enemy.atk;
  let gold = enemy.gold;
  if (hardMode) {
    hp *= 10;
    atk *= 8.5;
    gold *= 5;
  }

  let exp;
  if (enemy.expMode === 'raw') {
    exp = enemy.expParam;
  } else {
    exp = expForLevel(areaLevel) * enemy.expScale * (1 + enemy.expParam / 50);
  }

  let drops = enemy.drops ?? [null, null, null];
  if (hardMode) {
    exp *= 12;
    if (bossId < 0 || isMapBossId(bossId)) exp *= 2;
    if (enemy.hardDrops) drops = enemy.hardDrops;
  }

  const tiers = [!!drops[0], !!drops[1], !!drops[2]];
  const point = enemyPoint({ hp, atk, exp, gold }, areaLevel, tiers);
  const rates = battleRates(
    { speed: player.total.speed, luck: player.total.luck, speedShare: player.speedShare, luckShare: player.luckShare },
    point,
  );

  exp *= mods.expMultiplier;
  gold *= rates.goldMultiplier;
  gold *= 1 + (mods.goldBonus ?? 0); // echo bonus (not in the original)

  let comboRate = rates.comboRate + mods.comboRingPlus;
  if (comboRate > 0.7) comboRate = 0.7;
  comboRate = trunc2(comboRate);
  // Surge balance (battle/combo.js): class / echo combo with diminishing returns, soft cap 0.65
  comboRate = trunc2(balancedComboRate(comboRate, mods.comboRatePlus));
  let critRate = rates.critRate + mods.critRatePlus;
  if (critRate > 0.6) critRate = 0.6;
  // (the original truncates comboRate a second time here, not critRate)
  comboRate = trunc2(comboRate);

  switch (bonus) {
    case BONUS.HALF_HP: hp = hp * 0.5 + 0.5; break;
    case BONUS.HALF_ATK: atk = atk * 0.5 + 0.5; break;
    case BONUS.COMBO_CRIT_UP:
      comboRate *= 1.1;
      comboRate += 0.075;
      if (comboRate <= 0.45) comboRate = 0.45;
      if (comboRate > COMBO_BONUS_CAP) comboRate = COMBO_BONUS_CAP; // original 0.72 (battle/combo.js)
      comboRate = trunc2(comboRate);
      critRate *= 1.05;
      critRate += 0.075;
      if (critRate <= 0.2) critRate = 0.2;
      if (critRate > 0.6) critRate = 0.6;
      critRate = trunc2(critRate);
      break;
    case BONUS.GOLD_X2: gold *= 2; break;
    case BONUS.GOLD_X3: gold *= 3; break;
    case BONUS.GOLD_X4: gold *= 4; break;
    case BONUS.GOLD_X7: gold *= 7; break;
    case BONUS.EXP_X1_5: exp *= hardMode ? 2 : 1.5; break;
    case BONUS.EXP_X2: exp *= hardMode ? 3 : 2; break;
    default: break;
  }
  exp = Math.floor(exp);

  return {
    id: enemy.id,
    name: enemy.name,
    bossId,
    hp,
    maxHp: hp,
    atk,
    gold,
    exp,
    point,
    skills: enemy.skills ?? [],
    drops: args.bossAlreadyWon ? [null, null, null] : drops,
    comboRate,
    critRate,
    itemRate: rates.itemRate,
    goldMultiplier: rates.goldMultiplier,
  };
}
