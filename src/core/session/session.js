/**
 * Run session: pure functions that move a run through the game loop
 * (map -> encounter -> battle -> result -> map / game over).
 * No rendering here; the UI stores call these and render the returned state.
 */
import { computeStats } from '../attributes/stats.js';
import { heroCurrentPassivePct, rollPassiveShardDrop } from '../progression/passiveShards.js';
import { resolveEquipment } from '../equipment/items.js';
import { setupEnemy } from '../battle/enemySetup.js';
import { createBattle } from '../battle/engine.js';
import { rollDrop, forceDrop } from '../battle/drops.js';
import { CHEAT_TOGGLES } from './cheats.js';
import { applyExp } from '../progression/levels.js';
import { battlePointsLeft, onEncounterStart, onBattleWon, onBattleLost, bossBattlePointBonus } from '../progression/battlePoints.js';
import { allocateStatPoints, baseAbilityLevel, characterAbilityLevel, addCharacterExp, bossLevel } from '../progression/characters.js';
import { createRun } from '../persistence/profile.js';
import { areaAt, areaIndexAt, bossWinTeleport, roomBonusValue, bossHit } from '../world/world.js';
import { triggerMapId } from '../world/triggers.js';
import { classPathOf, classOwned, DEFAULT_CLASS, accountProgress } from '../progression/classes.js';
import { pickAreaEnemy, mapBossDef, eventBossDef } from '../encounters/enemyPick.js';
import { rollEventBoss } from '../encounters/eventBoss.js';
import { bonusType, decrementBonuses, spawnBonusesAfterWin, encodeBonus, fillMapBonuses, BONUS_TYPE } from '../encounters/bonus.js';
import { dangerLevel, advanceGauge } from '../encounters/gauge.js';
import { ownedCount } from '../equipment/slots.js';
import { ITEM_TYPE } from '../equipment/items.js';
import { isBossSetReady, equipBossSet, restoreAfterBoss, runSets, syncActiveSet } from '../equipment/sets.js';
import { talentPassive, tpLevel, recordSlimeKingWin } from '../progression/talents.js';
import { talentTiersOwned } from '../progression/unlocks.js';
import { relicPercents, rollRelicDrop } from '../crafting.js';
import { runBuffEffects, tickBuffs, rollCreatureDrop } from '../farm.js';
import { heroEcho, heroEchoMastered, gainEchoXp, masteryLevel, echoXp, ECHO_XP, rollBossEcho } from '../echoes.js';
import { mapSlimes, slimeDef } from '../encounters/slimeBosses.js';
import { slimeKingWins } from '../bestiary.js';
import { recordModeBattle, recordModeRunEnd } from '../progression/modeStats.js';
import { heroExtra, rollShardDrop } from '../progression/limitBreak.js';
import { rollEmblemDrop } from '../progression/classEmblems.js';

/**
 * Derived stats of the run's hero with current equipment.
 * `playGemNullified` is the per-battle 40% roll of the gamble gem (false outside battle).
 */
export function heroStats(run, catalog, profile, playGemNullified = false) {
  const equipment = resolveEquipment(catalog, run.inventory, run.slots);
  const abilityLevel = baseAbilityLevel(profile.bossWins);
  const currentAbilityLevel = characterAbilityLevel(profile.characterExp[run.characterIndex] ?? 0);
  return computeStats({
    base: run.base,
    equipment,
    character: { index: run.characterIndex, abilityLevel, currentAbilityLevel, extra: heroExtra(profile, run.characterIndex) },
    hardMode: run.hardMode,
    playGem: { gameOverCount: profile.gameOverCount, nullified: playGemNullified },
    talent: talentPassive(tpLevel(profile), talentTiersOwned(profile)),
    classId: run.classId,
    classTier: run.classTier ?? 0,
    classPath: classPathOf(run),
    craftPct: relicPercents(profile, run.characterIndex),
    heroPct: heroCurrentPassivePct(profile, run.characterIndex),
    echo: heroEchoMastered(profile, run.characterIndex),
    buff: runBuffEffects(run),
    account: accountProgress(profile, run),
  });
}

/** Whether any play gem is equipped (its 40% nullify roll only matters then). */
export function hasPlayGem(run, catalog) {
  for (let s = 2; s < 12; s += 1) {
    const id = run.slots[s];
    if (id >= 0 && catalog.accessories[id]?.effect === 35) return true;
  }
  return false;
}

/** Bonus tables keyed by map id (current and up to two previous maps are kept). */
function mapBonuses(run, mapId, areaCount) {
  const t = run.bonuses?.[mapId];
  if (t && t.length === areaCount) return t;
  return new Array(areaCount).fill(0);
}

export function startRun({ profile, characterIndex, hardMode, world, catalog, classId = null }) {
  // a class not bought yet (progression/unlocks.js) starts as the free one
  const cls = classId && !classOwned(profile, classId) ? DEFAULT_CLASS : classId;
  const run = createRun({ characterIndex, hardMode, profile, classId: cls });
  const map = world.map(world.start.map);
  // atStart: still on the original start position; the map scene moves the hero to the
  // map art's spawn point (when the start map has one) and clears it
  run.map = { id: map.id, x: world.start.x, y: world.start.y, gauge: 0, atStart: true };
  run.bonuses = { [map.id]: new Array(map.areas.length).fill(0) };
  run.bonuses[map.id][world.start.firstBonus.area] = world.start.firstBonus.value;
  const stats = heroStats(run, catalog, profile);
  run.maxBattlePoints = stats.modifiers.maxBattlePoints;
  return run;
}

/** Recomputes equipment-driven run values (max BP, move speed) after equipment changes. */
export function refreshRunFromEquipment(run, catalog, profile) {
  const stats = heroStats(run, catalog, profile);
  return { ...run, maxBattlePoints: stats.modifiers.maxBattlePoints };
}

export function currentArea(run, world) {
  const map = world.map(run.map.id);
  return areaAt(map, run.map.x, run.map.y);
}

/**
 * Poção da Fortuna (farm.js fortune_brew): every empty area of the current map that is really on it
 * (painted on its grid) gets a bonus, rolled like the original's bonus map consumable
 * (bonus.js fillMapBonuses); areas that already have one keep it.
 */
export function fillCurrentMapBonuses(run, world, profile, rng) {
  const map = world.map(run.map.id);
  const before = mapBonuses(run, map.id, map.areas.length);
  const used = new Set(map.grid.cells.flat());
  const filled = fillMapBonuses(
    {
      bonuses: before,
      currentIndex: areaIndexAt(map, run.map.x, run.map.y),
      areaLevels: map.areas.map((a) => a.level),
      gameOverCount: profile?.gameOverCount ?? 0,
      hardMode: run.hardMode,
      mapId: map.id,
    },
    rng,
  );
  const bonuses = filled.map((v, i) => (used.has(i) ? v : before[i]));
  return { ...run, bonuses: { ...run.bonuses, [map.id]: bonuses } };
}

export function currentDanger(run, world) {
  const area = currentArea(run, world);
  return dangerLevel(area.level, run.level, run.hardMode);
}

/**
 * One frame of attempted movement on the map. Returns { run, battle:boolean }.
 * The caller moves the sprite; this only drives the gauge.
 */
export function tickGauge(run, world, encounterMultiplier, rng) {
  if (battlePointsLeft(run) <= 0) return { run, battle: false };
  const danger = currentDanger(run, world);
  const r = advanceGauge(run.map.gauge, danger, encounterMultiplier, rng);
  return { run: { ...run, map: { ...run.map, gauge: r.gauge } }, battle: r.battle };
}

/** Boss node touched at the given map-local position (not beaten this run). */
export function bossAt(run, world, x, y) {
  const map = world.map(run.map.id);
  for (const b of map.bosses) {
    if (run.bossBeaten[b.id]) continue;
    if (bossHit(b, x, y)) return b.id;
  }
  return -1;
}

/**
 * Boss contact for one movement step from (px, py) to (nx, ny) (StageMap.as main loop).
 * When the step enters a boss rectangle, the original fights that boss but first puts
 * the hero back outside it: the previous position, else the step with only one axis
 * applied. That way, after a lost boss battle the hero stands next to the boss, and
 * walking away does not touch it again.
 *
 * Slime bosses (slimeBosses.js) block the hero the same way.
 *
 * Returns { bossId, slimeId, x, y }: -1 means no battle of that kind; x/y is where the hero stands.
 * A hero already inside a boss (saves from before this rule) is pushed out without a battle.
 */
export function bossTouch(run, world, px, py, nx, ny) {
  const map = world.map(run.map.id);
  const targets = [
    ...map.bosses.filter((b) => !run.bossBeaten[b.id]).map((b) => ({ rect: b, bossId: b.id, slimeId: -1 })),
    ...mapSlimes(map).filter((s) => !run.slimesBeaten?.[s.id]).map((s) => ({ rect: s, bossId: -1, slimeId: s.id })),
  ];
  for (const { rect: b, bossId, slimeId } of targets) {
    if (!bossHit(b, nx, ny)) continue;
    if (bossHit(b, px, py)) {
      const out = pushOutOfBoss(b, px, py, map);
      return { bossId: -1, slimeId: -1, x: out.x, y: out.y };
    }
    const dx = nx - px;
    const dy = ny - py;
    const candidates = [[px, py], [nx, ny - dy], [nx - dx, ny], [px, py - dy], [px - dx, py]];
    const spot = candidates.find(([cx, cy]) => !bossHit(b, cx, cy)) ?? [px, py];
    return { bossId, slimeId, x: spot[0], y: spot[1] };
  }
  return { bossId: -1, slimeId: -1, x: nx, y: ny };
}

function pushOutOfBoss(b, x, y, map) {
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  const exits = [
    { d: x - left, x: left - 1, y },
    { d: left + b.w - x, x: left + b.w + 1, y },
    { d: y - top, x, y: top - 1 },
    { d: top + b.h - y, x, y: top + b.h + 1 },
  ];
  // nearest side that stays inside the walkable map (the scene clamps to 8px from the edges)
  const inside = (e) => e.x >= 8 && e.x <= map.w - 8 && e.y >= 8 && e.y <= map.h - 8;
  const best = exits.filter(inside).sort((a, c) => a.d - c.d)[0] ?? exits.sort((a, c) => a.d - c.d)[0];
  return { x: best.x, y: best.y };
}

/**
 * Starts a battle. `bossId` >= 0 for a touched map boss, -1 for a gauge encounter.
 * `opts.slimeId` >= 0 starts a slime boss battle instead (bossId must be -1).
 * Returns { run, battle, enemy, bossId, slimeId, talentPoints, ... }.
 */
export function startBattle({ run, profile, world, catalog, enemyPools, bossData }, bossId, rng, opts = {}) {
  const slimeId = opts.slimeId ?? -1;
  if (battlePointsLeft(run) <= 0) return null;
  const map = world.map(run.map.id);
  const areaIdx = areaIndexAt(map, run.map.x, run.map.y);
  const area = map.areas[areaIdx];
  const bonuses = mapBonuses(run, map.id, map.areas.length);
  const bType = bonusType(bonuses[areaIdx]);

  // every bonus of the kept maps loses a charge
  const nextBonuses = { ...run.bonuses };
  for (const k of Object.keys(nextBonuses)) nextBonuses[k] = decrementBonuses([nextBonuses[k]])[0];

  let next = {
    ...run,
    bonuses: nextBonuses,
    battles: run.battles + 1,
    map: { ...run.map, gauge: 0 },
  };
  next = onEncounterStart(next);

  let playGemNullified = hasPlayGem(next, catalog) ? rng.next() < 0.4 : false;
  let stats = heroStats(next, catalog, profile, playGemNullified);
  let enemyDef = null;
  let eventBossId = -1;
  let effectiveBossId = bossId;
  if (slimeId >= 0) {
    enemyDef = slimeDef(bossData, slimeId, area.level);
  } else if (bossId >= 0) {
    enemyDef = mapBossDef(bossData, bossId, area.level);
  } else {
    if (bType >= 9) {
      eventBossId = rollEventBoss(
        {
          bonusType: bType,
          areaLevel: area.level,
          hardMode: run.hardMode,
          bossesSeen: profile.bossesSeen,
          weaponKindsOwned: run.inventory.weapons.filter((n) => n > 0).length,
          armorKindsOwned: run.inventory.armors.filter((n) => n > 0).length,
          weaponKindsInMode: catalog.weapons.filter((w) => (run.hardMode ? true : !w.hard)).length,
          armorKindsInMode: catalog.armors.filter((a) => (run.hardMode ? true : !a.hard)).length,
        },
        rng,
      );
    }
    if (eventBossId >= 0) {
      enemyDef = eventBossDef(bossData, eventBossId, area.level, run.hardMode);
      effectiveBossId = eventBossId;
    } else {
      enemyDef = pickAreaEnemy({ area, pools: enemyPools, hardMode: run.hardMode }, rng);
    }
  }
  if (!enemyDef) return null;

  // boss set: equipped automatically against map bosses, event bosses and slime kings
  if ((effectiveBossId >= 0 || slimeId >= 0) && isBossSetReady(next)) {
    const swapped = equipBossSet(next);
    if (swapped.slotsBeforeBoss) {
      next = swapped;
      playGemNullified = hasPlayGem(next, catalog) ? rng.next() < 0.4 : false;
      stats = heroStats(next, catalog, profile, playGemNullified);
    }
  }

  const bossAlreadyWon = effectiveBossId >= 0 && (run.bossWinCount[effectiveBossId] ?? 0) >= 1;
  const bonusKind = bType >= 0 && bType <= 8 ? bType : -1;
  // map bosses and slime kings fight at their own level (enemyDef.level), wherever they are placed;
  // area enemies and event bosses at the area's
  const enemy = setupEnemy({
    enemy: enemyDef,
    areaLevel: enemyDef.level ?? area.level,
    player: stats,
    hardMode: run.hardMode,
    bonus: bonusKind,
    bossId: effectiveBossId,
    bossAlreadyWon,
  });
  // drop is decided at battle start (granted on win)
  const drop = bossAlreadyWon
    ? null
    : run.cheats?.[CHEAT_TOGGLES.ALWAYS_DROP]
      ? forceDrop(enemy.drops, rng)
      : rollDrop(
        {
          drops: enemy.drops,
          itemRate: enemy.itemRate,
          ownedCount: (type, id) => ownedCount(next.inventory, type, id),
          highestLevel: profile.highestLevel,
        },
        rng,
      );

  const battle = createBattle({
    player: { hp: stats.total.hp, maxHp: stats.total.hp, atk: stats.total.atk, def: stats.total.def, modifiers: stats.modifiers, echo: heroEchoMastered(profile, run.characterIndex) },
    enemy,
    hardMode: run.hardMode,
    gold: next.gold,
    boss: effectiveBossId >= 0 || slimeId >= 0,
  });
  if (effectiveBossId >= 0) profile.bossesSeen[effectiveBossId + (run.hardMode ? 100 : 0)] = 1;

  return { run: next, battle, enemy, enemyDef, bossId: effectiveBossId, slimeId, talentPoints: enemyDef.talentPoints ?? 0, drop, areaIdx, area, stats, playGemNullified };
}

/**
 * Applies the outcome of a finished battle to the run (and permanent flags on the profile).
 * Returns { run, profile, result } where result summarises rewards for the UI.
 */
export function finishBattle({ run, profile, battle, enemy, bossId, drop, world, catalog, slime = null }, rng) {
  const won = battle.phase === 'won';
  const map = world.map(run.map.id);
  const areaIdx = areaIndexAt(map, run.map.x, run.map.y);
  // the boss set only lasts for the boss battle
  let next = { ...restoreAfterBoss(run), gold: battle.gold, highestCombo: Math.max(run.highestCombo, battle.highestCombo), highestDamage: Math.max(run.highestDamage, battle.highestDamage) };
  let prof = { ...profile, highestCombo: Math.max(profile.highestCombo, battle.highestCombo), highestDamage: Math.max(profile.highestDamage, battle.highestDamage) };
  // the same, per game mode (Statistics: normal / abyssal tabs)
  prof = recordModeBattle(prof, run.hardMode, battle, won);
  const result = { won, exp: 0, gold: 0, levelsGained: 0, statPointsGained: 0, drop: null, bossId, bpBonus: 0, teleport: null, abilityLevelUp: false, lastBoss: false, talentPoints: 0, echoXp: null, echo: null, baseLevelUp: null };

  next = tickBuffs(next); // elixir buffs last a number of battles, won or lost

  if (!won) {
    next = onBattleLost(next);
    prof.loseBattles += 1;
    next.map = { ...next.map, gauge: 0 };
    return { run: next, profile: prof, result };
  }

  const stats = heroStats(next, catalog, profile);
  const lv = applyExp({ level: next.level, exp: next.exp, statPoints: next.statPoints, hardMode: next.hardMode }, enemy.exp, stats.modifiers.extraStatPoints);
  next.level = lv.level;
  next.exp = lv.exp;
  next.statPoints = lv.statPoints;
  result.exp = enemy.exp;
  result.levelsGained = lv.levelsGained;
  result.statPointsGained = lv.statPointsGained;

  const gold = Math.floor(enemy.gold);
  next.gold += gold;
  next.totalGold += gold;
  result.gold = gold;

  const bpBonus = bossId >= 0 ? bossBattlePointBonus(bossId) : 0;
  next = onBattleWon(next, bpBonus);
  result.bpBonus = bpBonus;
  prof.winBattles += 1;

  if (drop) {
    const key = drop.type === ITEM_TYPE.WEAPON ? 'weapons' : drop.type === ITEM_TYPE.ARMOR ? 'armors' : 'accessories';
    const list = next.inventory[key].slice();
    const before = list[drop.itemId] ?? 0;
    list[drop.itemId] = before + 1;
    next.inventory = { ...next.inventory, [key]: list };
    // isNew / count: the result screen celebrates a first copy ("NEW!") or shows how many are owned
    result.drop = { ...drop, isNew: before === 0, count: before + 1 };
  }

  // slime boss: gone until the next run; a new one raises the account's TP level (talents.js)
  if (slime && slime.id >= 0) {
    next.slimesBeaten = { ...next.slimesBeaten, [slime.id]: 1 };
    const rec = recordSlimeKingWin(prof, slime.id);
    prof = rec.profile;
    if (rec.levelUp) result.talentPoints = 1;
    result.tpLevel = tpLevel(prof);
  }

  // echo mastery: the hero's equipped echo gains XP for the win
  const equippedEcho = heroEcho(prof, next.characterIndex);
  if (equippedEcho) {
    const amount = bossId >= 0 ? ECHO_XP.boss : slime && slime.id >= 0 ? ECHO_XP.slime : ECHO_XP.enemy;
    const g = gainEchoXp(prof, equippedEcho.id, amount);
    prof = g.profile;
    result.echoXp = { id: equippedEcho.id, amount, level: masteryLevel(echoXp(prof, equippedEcho.id)), levelUp: g.levelUp };
  }

  if (bossId >= 0) {
    next.bossWinCount = { ...next.bossWinCount, [bossId]: (next.bossWinCount[bossId] ?? 0) + 1 };
    next.bossBeaten = { ...next.bossBeaten, [bossId]: 1 };
    const key = bossId + (next.hardMode ? 100 : 0);
    const before = baseAbilityLevel(prof.bossWins);
    const baseBefore = bossLevel(prof.bossWins);
    prof.bossWins = { ...prof.bossWins, [key]: 1 };
    const after = baseAbilityLevel(prof.bossWins);
    result.abilityLevelUp = after > before;
    // the account's base level (unlocks): { from, to } when this win raised it
    const baseAfter = bossLevel(prof.bossWins);
    if (baseAfter > baseBefore) result.baseLevelUp = { from: baseBefore, to: baseAfter };
    if (bossId === 28) result.lastBoss = true;

    // stable creatures: the first win of the run over a map boss may drop its creature
    if (enemy.id === `boss#${bossId}` && (run.bossWinCount[bossId] ?? 0) === 0 && prof.farm) {
      const cd = rollCreatureDrop(prof.farm, bossId, rng);
      prof.farm = cd.farm;
      result.creature = cd.creature;
    }
    // echoes some map bosses drop (echoes.js BOSS_ECHO_DROPS): revealed, then bought on the Echoes screen
    if (enemy.id === `boss#${bossId}`) {
      const echoDrop = rollBossEcho(prof, bossId, rng, baseAfter, slimeKingWins(prof));
      prof = echoDrop.profile;
      result.echo = echoDrop.echo;
    }
    // relics some map bosses drop (crafting.js RELIC_DROPS), apart from the item drop: once per account
    if (enemy.id === `boss#${bossId}`) {
      const relicDrop = rollRelicDrop(prof, bossId, rng);
      prof = relicDrop.profile;
      result.relic = relicDrop.relic;
    }

    // a boss placed by a trigger with "teleport" (triggers.js parseBossTriggers) sends the hero to
    // that map's spawn point (atSpawn: the map scene places it, it knows the map art)
    const triggerTp = map.bosses?.find((b) => b.id === bossId)?.teleport;
    const triggerDest = triggerTp ? world.map(triggerMapId({ map: triggerTp }, map.id, world)) : null;
    const tp = triggerDest ? null : bossWinTeleport(bossId, rng);
    if (triggerDest) {
      next.map = { id: triggerDest.id, x: triggerDest.w / 2, y: triggerDest.h / 2, gauge: 0, atSpawn: true };
      result.teleport = { map: triggerDest.id, room: null };
    }
    if (tp) {
      const dest = world.map(tp.map);
      if (dest) {
        if (tp.room) {
          next.returnTo = { id: next.map.id, x: next.map.x, y: next.map.y };
          next.roomPotionUsed = false; // a new visit: one threshold potion allowed (farm.js useRoomPotion)
          const roomBonuses = new Array(dest.areas.length).fill(0);
          roomBonuses[0] = roomBonusValue(tp.room, rng);
          next.bonuses = { ...next.bonuses, [dest.id]: roomBonuses };
        }
        next.map = { id: dest.id, x: dest.w * tp.fx, y: dest.h * tp.fy, gauge: 0 };
        result.teleport = { map: dest.id, room: tp.room ?? null };
      }
    }
  }

  // leaving the white/black room when its counter is spent; threshold potions (farm.js ROOM_POTIONS)
  // first give their extra battles, one at a time
  if (inSecretRoom(next)) {
    const roomTable = next.bonuses[next.map.id] ?? [0];
    if (roomTable[0] === 0 && (next.roomExtra ?? 0) > 0) {
      const type = next.map.id === 13 ? BONUS_TYPE.IN_WHITE_ROOM : BONUS_TYPE.IN_BLACK_ROOM;
      next.bonuses = { ...next.bonuses, [next.map.id]: [encodeBonus(type, 1), ...roomTable.slice(1)] };
      next.roomExtra -= 1;
    } else if (roomTable[0] === 0) {
      const back = world.map(next.returnTo.id);
      next.map = { id: back.id, x: next.returnTo.x, y: next.returnTo.y, gauge: 0 };
      next.returnTo = null;
      result.teleport = { map: back.id, room: null, returned: true };
    }
  }

  // bonus spawning on the (possibly new) current map
  if (!result.teleport) {
    const bonuses = mapBonuses(next, map.id, map.areas.length);
    next.bonuses = {
      ...next.bonuses,
      [map.id]: spawnBonusesAfterWin(
        {
          bonuses,
          currentIndex: areaIdx,
          areaLevels: map.areas.map((a) => a.level),
          battlesUsed: next.battlesUsed,
          gameOverCount: prof.gameOverCount,
          hardMode: next.hardMode,
          mapId: map.id,
        },
        rng,
      ),
    };
  }
  // Limit Break shards (progression/limitBreak.js): a map boss's first win of the run may drop some;
  // rolled last so the teleport and bonus rolls above keep their order
  if (bossId >= 0 && enemy.id === `boss#${bossId}` && (run.bossWinCount[bossId] ?? 0) === 0) {
    const sd = rollShardDrop(prof, rng, { hardMode: next.hardMode, abilityLevel: baseAbilityLevel(prof.bossWins) });
    prof = sd.profile;
    if (sd.shards) result.shards = sd.shards;
    // Passive Shards (progression/passiveShards.js): abyssal mode only, no roll
    const pd = rollPassiveShardDrop(prof, { hardMode: next.hardMode, lastBoss: result.lastBoss });
    prof = pd.profile;
    if (pd.shards) result.passiveShards = pd.shards;
  }
  // Class Emblems (progression/classEmblems.js), they buy the classes: the rare monsters (white / black
  // rooms, area level 0, like the bestiary's 'rare') may drop some, rolled apart from the item drop
  const enemyKey = String(enemy.id ?? '');
  if (bossId < 0 && !enemyKey.startsWith('event#') && !enemyKey.startsWith('slime#') && map.areas[areaIdx]?.level === 0) {
    const ed = rollEmblemDrop(prof, rng);
    prof = ed.profile;
    if (ed.emblems) result.emblems = ed.emblems;
  }
  next.map = { ...next.map, gauge: 0 };
  return { run: next, profile: prof, result };
}

/** Is the hero in a secret room (white 13 / black 14), sent there by its event boss? */
export function inSecretRoom(run) {
  return (run?.map?.id === 13 || run?.map?.id === 14) && !!run.returnTo;
}

/** Battles left in the secret room: its counter plus the threshold potions drunk (0 outside one). */
export function roomBattlesLeft(run) {
  if (!inSecretRoom(run)) return 0;
  return (run.bonuses?.[run.map.id]?.[0] ?? 0) % 10 + (run.roomExtra ?? 0);
}

export function isGameOver(run) {
  return battlePointsLeft(run) <= 0;
}

/** Confirms a staged stat-point allocation. */
export function confirmStatPoints(run, staged) {
  const { base, spent } = allocateStatPoints(run.base, staged);
  if (spent > run.statPoints || spent < 0) return run;
  return { ...run, base, statPoints: run.statPoints - spent, statPointsSpent: run.statPointsSpent + spent };
}

/**
 * Commits the finished run into the profile (GameOver.as endf): equipment, inventory,
 * records and character exp persist; gold, level and stats are lost.
 * `stats` (heroStats of the final hero) feeds the best-level snapshot shown in Statistics.
 */
export function commitGameOver(run, profile, stats = null) {
  const record = stats ? highestRecord(run, stats) : null;
  // per game mode first (Statistics: normal / abyssal tabs), then the global records
  const p = recordModeRunEnd({ ...profile }, run, record);
  if (record && (run.level > p.highestLevel || p.highestLevel === 0)) p.highestRecord = record;
  p.gameOverCount += 1;
  p.inventory = { weapons: run.inventory.weapons.slice(), armors: run.inventory.armors.slice(), accessories: run.inventory.accessories.slice() };
  p.slots = run.slots.slice();
  p.equipmentSets = runSets(syncActiveSet(run)); // sets belong to the account (EndGame)
  p.highestLevel = Math.max(p.highestLevel, run.level);
  p.lastCharacter = run.characterIndex;
  const ability = baseAbilityLevel(p.bossWins);
  const exp = p.characterExp.slice();
  exp[run.characterIndex] = addCharacterExp(exp[run.characterIndex] ?? 0, run.level, ability);
  p.characterExp = exp;
  p.run = null;
  return p;
}

/**
 * Best-level snapshot (GameOver.as: shp/satk/... as base "(+bonus)", HighItemEquip, HighItemKazu).
 * Slots keep the -2 locked / -1 empty convention; copies is the owned count of each equipped item.
 */
function highestRecord(run, stats) {
  const base = {};
  const bonus = {};
  for (const k of Object.keys(run.base)) {
    base[k] = Math.floor(run.base[k]);
    bonus[k] = Math.floor(stats.bonus[k] ?? 0);
  }
  const slots = run.slots.slice(0, 12);
  const copies = slots.map((id, s) => {
    if (id < 0) return 0;
    const type = s === 0 ? ITEM_TYPE.WEAPON : s === 1 ? ITEM_TYPE.ARMOR : ITEM_TYPE.ACCESSORY;
    return ownedCount(run.inventory, type, id);
  });
  return { level: run.level, base, bonus, slots, copies };
}

/** Marks a map as discovered (StageMap.as HakkenmapV); returns the same profile when already known. */
export function markMapSeen(profile, mapId) {
  if (!profile || profile.mapsSeen?.[mapId]) return profile;
  return { ...profile, mapsSeen: { ...profile.mapsSeen, [mapId]: 1 } };
}

/** Snapshot the run into the profile for "continue". */
export function snapshotRun(profile, run) {
  return { ...profile, run: run && run.active ? run : null };
}

export { encodeBonus };
