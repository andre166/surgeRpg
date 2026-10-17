/**
 * Derived stats: base stats + equipment + character ability.
 * Faithful port of Class/GData.as EqStUpdate.
 *
 * Inputs:
 *   base:      { hp, atk, def, speed, luck }   (stat-point allocated values)
 *   equipment: { weapon, armor, accessories[] } where
 *              weapon/armor: { plus, multi } | null   (multi is a percent)
 *              accessory:    { effect, value } | null  (effect from EFFECT)
 *   character: { index, abilityLevel, currentAbilityLevel }
 *   hardMode:  boolean
 *   playGem:   optional { gameOverCount:number, nullified:boolean } context of the gamble gem
 *              (GData_PlayHouseki.as: value 1/2/3 -> ATK&DEF += runs*3/17/40, AGI += runs*3/12/30;
 *               at battle start a 40% roll nullifies every play gem for that battle)
 *
 * Output: { total, bonus, bonusFlat, bonusPercent, modifiers, speedShare, luckShare }
 */
import { classTierDef } from '../progression/classes.js';
import { echoDef, applyEchoPassive } from '../echoes.js';
import { EFFECT } from './effects.js';
import { characterPowerWeights, characterPowerFactor } from './characterPower.js';
import { asInt } from '../util/num.js';

export const STAT_KEYS = ['hp', 'atk', 'def', 'speed', 'luck'];

export function defaultModifiers(hardMode) {
  return {
    expMultiplier: 1,
    extraStatPoints: 0, // 0,1,2 extra stat points per level
    critRatePlus: 0,
    critDamageMultiplier: 1,
    moveSpeed: 10,
    maxBattlePoints: hardMode ? 10 : 30,
    forcedCritHits: 0, // first N player hits are critical
    comboRatePlus: 0,
    drainSmall: false,
    drain: false,
    deathGuard: 0, // encoded as ones + tens*10, see battle/damage.js
    encounterMultiplier: 1,
    instantEncounter: false,
    abilityUpPercent: 0,
  };
}

/** Flat bonus of one play gem of value v (1..3) for the given profile context. */
export function playGemBonus(v, playGem) {
  if (!playGem || playGem.nullified) return { atkDef: 0, speed: 0 };
  let k1 = 40;
  let k2 = 30;
  if (v === 1) { k1 = 3; k2 = 3; } else if (v === 2) { k1 = 17; k2 = 12; } else if (v === 3) { k1 = 40; k2 = 30; }
  const runs = playGem.gameOverCount ?? 0;
  return { atkDef: runs * k1, speed: runs * k2 };
}

export function computeStats({ base, equipment, character, hardMode = false, playGem = null, talentPct = null, classId = null, classTier = 0, classPath = null, craftPct = null, echoId = null, echo = null, buff = null }) {
  const flat = { hp: 0, atk: 0, def: 0, speed: 0, luck: 0 };
  const pct = { hp: 0, atk: 0, def: 0, speed: 0, luck: 0 };
  const mods = defaultModifiers(hardMode);

  const weapon = equipment?.weapon ?? null;
  if (weapon) {
    flat.atk = weapon.plus;
    pct.atk = weapon.multi * 0.01;
  }
  const armor = equipment?.armor ?? null;
  if (armor) {
    flat.def = armor.plus;
    pct.def = armor.multi * 0.01;
  }

  for (const acc of equipment?.accessories ?? []) {
    if (!acc) continue;
    const v = acc.value ?? 0;
    switch (acc.effect) {
      case EFFECT.HP_PLUS: flat.hp += v; break;
      case EFFECT.ATK_PLUS: flat.atk += v; break;
      case EFFECT.DEF_PLUS: flat.def += v; break;
      case EFFECT.SPEED_PLUS: flat.speed += v; break;
      case EFFECT.LUCK_PLUS: flat.luck += v; break;
      case EFFECT.PLAY_GEM: {
        const g = playGemBonus(v, playGem);
        flat.atk += g.atkDef;
        flat.def += g.atkDef;
        flat.speed += g.speed;
        break;
      }
      case EFFECT.ALL_PLUS:
        flat.hp += v; flat.atk += v; flat.def += v; flat.speed += v; flat.luck += v; break;
      case EFFECT.ATK_DEF_SPEED_PLUS:
        flat.atk += v; flat.def += v; flat.speed += v; break;
      case EFFECT.HP_ATK_DEF_SPEED_PLUS:
        flat.hp += v; flat.atk += v; flat.def += v; flat.speed += v; break;
      case EFFECT.EXP_PERCENT: mods.expMultiplier += v / 100; break;
      case EFFECT.STAT_POINT_PLUS_2: mods.extraStatPoints = 2; break;
      case EFFECT.STAT_POINT_PLUS_1: if (mods.extraStatPoints === 0) mods.extraStatPoints = 1; break;
      case EFFECT.CRIT_RATE_PLUS: mods.critRatePlus += 0.08; break;
      case EFFECT.CRIT_DAMAGE_PLUS: mods.critDamageMultiplier += 0.2; break;
      case EFFECT.FIRST_HITS_CRIT_3: mods.forcedCritHits = 3; break;
      case EFFECT.FIRST_HITS_CRIT_2: if (mods.forcedCritHits <= 1) mods.forcedCritHits = 2; break;
      case EFFECT.FIRST_HITS_CRIT_1: if (mods.forcedCritHits === 0) mods.forcedCritHits = 1; break;
      case EFFECT.COMBO_RATE_PLUS: mods.comboRatePlus = 0.09; break;
      case EFFECT.DRAIN_SMALL: mods.drainSmall = true; break;
      case EFFECT.DRAIN: mods.drain = true; break;
      case EFFECT.DEATH_GUARD_1: mods.deathGuard += 1; break;
      case EFFECT.DEATH_GUARD_10: mods.deathGuard += 10; break;
      case EFFECT.ENCOUNTER_RATE_DOWN: mods.encounterMultiplier -= 0.15; break;
      case EFFECT.ENCOUNTER_RATE_UP: mods.encounterMultiplier += 0.2; break;
      case EFFECT.INSTANT_ENCOUNTER: mods.instantEncounter = true; break;
      case EFFECT.MOVE_SPEED_PERCENT: mods.moveSpeed += v / 100; break;
      case EFFECT.MAX_BATTLE_POINTS_PLUS: mods.maxBattlePoints += v; break;
      case EFFECT.CHARACTER_POWER_PERCENT: mods.abilityUpPercent += v; break;
      default: break;
    }
  }

  // Character ability bonus (percent of base+flat).
  const w = characterPowerWeights(character?.index ?? 0);
  const f = characterPowerFactor(
    character?.abilityLevel ?? 0,
    character?.currentAbilityLevel ?? 0,
    mods.abilityUpPercent,
  );
  pct.hp += w.hp * f * 0.06;
  pct.atk += w.atk * f * 0.07;
  pct.def += w.def * f * 0.07;
  pct.speed += w.speed * f * 0.075;
  pct.luck += w.luck * f * 0.08;

  // Talent tree percents (src/core/progression/talents.js; not in the original).
  if (talentPct) for (const k of STAT_KEYS) pct[k] += talentPct[k] ?? 0;
  // Crafted relic bound to the hero (src/core/crafting.js; not in the original).
  if (craftPct) for (const k of STAT_KEYS) pct[k] += craftPct[k] ?? 0;
  // Ancestral Echo passive (src/core/echoes.js; not in the original).
  applyEchoPassive(echo ?? echoDef(echoId), pct, mods);
  // Farm elixir buffs on the run (src/core/farm.js; not in the original).
  if (buff) applyEchoPassive({ passive: buff }, pct, mods);

  // Hero class (src/core/progression/classes.js; not in the original): stat percents + passive.
  const cls = classTierDef(classId, classPath ? classPath.length : classTier, classPath);
  if (cls) {
    for (const k of STAT_KEYS) pct[k] += cls.pct[k] ?? 0;
    cls.applyModifiers(mods);
  }

  // e<stat> = flat + (flat + base) * pct   (GData.as)
  const bonus = {};
  const total = {};
  for (const k of STAT_KEYS) {
    bonus[k] = flat[k] + (flat[k] + base[k]) * pct[k];
    total[k] = base[k] + bonus[k];
  }

  // Share of speed / luck in the weighted stat total (int-truncated parts).
  const pHp = asInt(total.hp / 5);
  const pAtk = asInt(total.atk / 3);
  const pDef = asInt(total.def / 3);
  const pSpd = asInt(total.speed / 2);
  const pLuk = asInt(total.luck / 1);
  const sum = pHp + pAtk + pDef + pSpd + pLuk;
  const speedShare = sum > 0 ? pSpd / sum : 0;
  const luckShare = sum > 0 ? pLuk / sum : 0;

  return { total, bonus, bonusFlat: flat, bonusPercent: pct, modifiers: mods, speedShare, luckShare };
}
