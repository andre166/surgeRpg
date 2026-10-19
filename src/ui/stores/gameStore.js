/**
 * Zustand store: the only place where UI, Phaser and the core meet.
 * Core rules stay in src/core; this store wires state transitions and persistence.
 */
import { create } from 'zustand';
import worldData from '../../data/world.json';
import namedMaps from '../../data/namedMaps.json';
import enemyData from '../../data/enemies.json';
import bossJson from '../../data/bosses.json';
import catalog from '../../data/items.json';
import characterData from '../../data/characters.json';
import { createWorld } from '../../core/world/world.js';
import { withCustomBosses } from '../../core/encounters/customBosses.js';
import { createMathRng } from '../../core/rng/rng.js';
import { createSaveStore, migrateProfile, resetAccountProfile } from '../../core/persistence/saveStore.js';
import { bridge } from '../../platform/desktop/bridge.js';
import {
  startRun, startBattle, finishBattle, tickGauge, isGameOver, confirmStatPoints, commitGameOver, snapshotRun, heroStats, markMapSeen, bossTouch, currentArea, currentDanger, refreshRunFromEquipment, fillCurrentMapBonuses, inSecretRoom,
} from '../../core/session/session.js';
import { step as battleStep, requestHeal as battleRequestHeal, canRequestHeal, isOver, canQueueFreeHeal, queueFreeHeal, forfeit as battleForfeit } from '../../core/battle/engine.js';
import { battlePointsLeft } from '../../core/progression/battlePoints.js';
import { buyStatus, equipStatus, equipItem, unequipSlot, addItem, canUnlockSlot, unlockSlot, slotUnlockCost, ownedCount } from '../../core/equipment/slots.js';
import { steam } from '../../platform/steam/steam.js';
import { PROFILE_SAVE_SLOT } from '../../config/sandbox.js';
import { CHEAT_TOGGLES } from '../../core/session/cheats.js';
import { autoAllocOf, splitPoints } from '../../core/progression/autoAlloc.js';
import { buildBestiary, recordBestiary, revealBestiary, resetBestiary, slimeKingWins } from '../../core/bestiary.js';
import { canPromoteClass, promoteClass, autoPromoteClass, autoClassBranch, runClassNode, AUTO_CLASS_MIN_BASE, resetClass, classResetStatus } from '../../core/progression/classes.js';
import { translate } from '../i18n/index.js';
import { bossLevel, maxBaseAbilityWins, resetBaseAbilityWins, setBossWin } from '../../core/progression/characters.js';
import { upgradeRelic, rerollRelic, cheatRelics } from '../../core/crafting.js';
import { syncActiveSet, switchSet, unlockNextSet, unlockSlotInAllSets, restoreAfterBoss } from '../../core/equipment/sets.js';
import { echoDef, echoBuyStatus, buyEcho as buyEchoIn, equipEcho, unequipEcho, cheatEchoesOwned, cheatEchoMastery } from '../../core/echoes.js';
import { addEmblems } from '../../core/progression/classEmblems.js';
import { addArrow, resetHero, cheatShards } from '../../core/progression/limitBreak.js';
import { rerollPassive, acceptPassiveOffer, keepPassive, cheatPassiveShards } from '../../core/progression/passiveShards.js';
import { playableHeroOr } from '../../core/progression/heroes.js';
import { accountOwned, accountBuyStatus, accountNextPrice, accountBuy, cheatAccountOwned, paidInEmblems } from '../../core/progression/unlocks.js';
import * as farm from '../../core/farm.js';
import { SLIME_IDS } from '../../core/encounters/slimeBosses.js';

export const world = createWorld({ ...worldData, namedMaps: namedMaps.maps });
const bossData = withCustomBosses(bossJson, worldData.maps);
export const data = { catalog, enemyPools: enemyData.pools, bossData, characters: characterData.characters };
export const bestiary = buildBestiary(world, enemyData.pools, bossData);
const rng = createMathRng();
const saveStore = createSaveStore(bridge, PROFILE_SAVE_SLOT);

export const SCREEN = Object.freeze({
  BOOT: 'boot',
  TITLE: 'title',
  CHARACTER: 'character',
  MAP: 'map',
  BATTLE: 'battle',
  RESULT: 'result',
  STATS: 'stats',
  EQUIPMENT: 'equipment',
  GAME_OVER: 'gameover',
  OPTIONS: 'options',
  BESTIARY: 'bestiary',
  TALENTS: 'talents',
  CRAFTING: 'crafting',
  ECHOES: 'echoes',
  FARM: 'farm',
  STATISTICS: 'statistics',
});

let saveTimer = null;

export const useGame = create((set, get) => ({
  screen: SCREEN.BOOT,
  profile: null,
  run: null,
  battle: null, // { state, enemy, enemyDef, bossId, drop, area, stats, log }
  result: null,
  toast: null,
  wageDebit: null, // last stable wage payment: { amount, reason (i18n map.debit.<reason>), id } (HUD debit animation)
  restoredFromBackup: false,
  mapReturnScreen: null,

  /* ---------------- boot / persistence ---------------- */
  async boot() {
    let loaded;
    try {
      loaded = await saveStore.load();
    } catch (err) {
      console.error('save load failed, starting fresh', err);
      loaded = { profile: migrateProfile(null), restoredFromBackup: false };
    }
    const { profile } = loaded;
    set({ profile, restoredFromBackup: loaded.restoredFromBackup, screen: SCREEN.TITLE });
    steam.init(bridge).catch(() => {});
  },
  async persist(immediate = false) {
    const { profile, run } = get();
    if (!profile) return;
    // no run loaded (title, hero select...): the saved run stays; runs end through commitGameOver,
    // which clears profile.run itself
    const snap = run ? snapshotRun(profile, run) : profile;
    set({ profile: snap });
    const doSave = () => saveStore.save(get().profile);
    if (immediate) {
      await doSave();
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 300);
  },
  /**
   * Cheat: resets the whole account, as a brand-new save (the run, bosses, bestiary, equipment, shards,
   * farm, echoes, unlocks...); only the options (volumes, language, fullscreen) are kept. Back to the title.
   */
  async cheatResetAccount() {
    set({ profile: resetAccountProfile(get().profile), run: null, battle: null, result: null, screen: SCREEN.TITLE });
    await get().persist(true);
  },
  setOptions(patch) {
    const { profile } = get();
    set({ profile: { ...profile, options: { ...profile.options, ...patch } } });
    get().persist();
  },
  /**
   * Short message at the top of the screen. `opts` (optional): { kind: 'promo', icon, title, detail }
   * shows a richer banner (class promotion: icon, title, the message, a detail line).
   */
  showToast(text, ms = 2500, opts = null) {
    set({ toast: { text, id: Date.now(), ...(opts ?? {}) } });
    setTimeout(() => {
      if (get().toast && get().toast.text === text) set({ toast: null });
    }, ms);
  },

  /* ---------------- navigation ---------------- */
  go(screen) {
    // plain navigation (title menus): screens opened this way return to the title, not the map
    set({ screen, mapReturnScreen: null });
  },
  openFromMap(screen) {
    set({ screen, mapReturnScreen: SCREEN.MAP });
  },
  backToMap() {
    const { run } = get();
    if (!run) {
      set({ screen: SCREEN.TITLE });
      return;
    }
    set({ screen: isGameOver(run) ? SCREEN.GAME_OVER : SCREEN.MAP });
  },

  /* ---------------- run lifecycle ---------------- */
  newRun(characterIndex, hardMode = false, classId = undefined) {
    const { profile } = get();
    // skin-only heroes cannot start a run (core/progression/heroes.js): fall back to a playable one
    characterIndex = playableHeroOr(characterIndex, data.characters);
    const run = startRun({ profile, characterIndex, hardMode, world, catalog, classId });
    // stable wages count from the start of the run (first one WAGE_PERIOD later)
    const prof = { ...profile, newGameCount: profile.newGameCount + 1, lastCharacter: characterIndex, lastClass: run.classId, farm: profile.farm ? farm.startRunWages(profile.farm, Date.now()) : profile.farm };
    set({ run, profile: prof, screen: SCREEN.MAP, battle: null, result: null });
    get().persist(true);
  },
  continueRun() {
    const { profile } = get();
    if (!profile?.run) return false;
    // a run saved in the middle of a boss battle gets its normal equipment back
    const run = refreshRunFromEquipment(restoreAfterBoss(profile.run), catalog, profile);
    set({ run, screen: isGameOver(run) ? SCREEN.GAME_OVER : SCREEN.MAP });
    return true;
  },
  abandonRun() {
    const { run, profile } = get();
    if (!run) return;
    const prof = commitGameOver(run, profile, heroStats(run, catalog, profile));
    set({ run: null, profile: prof, screen: SCREEN.TITLE, battle: null, result: null });
    get().persist(true);
  },

  /* ---------------- map ---------------- */
  heroStats() {
    const { run, profile } = get();
    return run ? heroStats(run, catalog, profile) : null;
  },
  currentArea() {
    const { run } = get();
    return run ? currentArea(run, world) : null;
  },
  currentDanger() {
    const { run } = get();
    return run ? currentDanger(run, world) : 0;
  },
  battlePoints() {
    const { run } = get();
    return run ? battlePointsLeft(run) : 0;
  },
  /** Called by the map scene after the player moved; returns true when a battle starts. */
  movedTo(x, y, mapId, encounterMultiplier) {
    const { run } = get();
    if (!run || get().screen !== SCREEN.MAP) return false;
    const sameMap = run.map.id === mapId;
    const touch = bossTouch({ ...run, map: { ...run.map, id: mapId } }, world, sameMap ? run.map.x : x, sameMap ? run.map.y : y, x, y);
    let next = { ...run, map: { ...run.map, x: touch.x, y: touch.y, id: mapId } };
    if (touch.bossId >= 0) {
      set({ run: next });
      return get().beginBattle(touch.bossId);
    }
    if (touch.slimeId >= 0) {
      set({ run: next });
      return get().beginBattle(-1, { slimeId: touch.slimeId });
    }
    if (next.cheats?.[CHEAT_TOGGLES.NO_ENCOUNTERS]) {
      set({ run: next });
      return false;
    }
    const r = tickGauge(next, world, encounterMultiplier, rng);
    set({ run: r.run });
    if (r.battle) return get().beginBattle(-1);
    return false;
  },
  setPosition(x, y, mapId) {
    const { run } = get();
    if (!run) return;
    // any placement ends the run's start position (see startRun atStart) and a pending spawn (atSpawn)
    const { atStart, atSpawn, ...map } = run.map;
    set({ run: { ...run, map: { ...map, x, y, id: mapId } } });
    get().persist();
  },
  /** Starts a random encounter right away (map HUD button). Always available, not only with the instant-encounter accessory. */
  forceEncounter() {
    if (get().screen !== SCREEN.MAP) return false;
    return get().beginBattle(-1);
  },
  beginBattle(bossId, opts = {}) {
    const { run, profile } = get();
    const sb = startBattle({ run, profile, world, catalog, enemyPools: data.enemyPools, bossData }, bossId, rng, opts);
    if (!sb) return false;
    set({ run: sb.run, profile: recordBestiary({ ...profile }, sb.enemy.id), battle: { state: sb.battle, enemy: sb.enemy, enemyDef: sb.enemyDef, bossId: sb.bossId, slime: sb.slimeId >= 0 ? { id: sb.slimeId, talentPoints: sb.talentPoints } : null, drop: sb.drop, area: sb.area, stats: sb.stats, playGemNullified: sb.playGemNullified, log: [] }, screen: SCREEN.BATTLE });
    get().persist();
    return true;
  },

  /* ---------------- battle ---------------- */
  battleAdvance() {
    const { battle } = get();
    if (!battle || isOver(battle.state)) return [];
    const r = battleStep(battle.state, rng);
    const log = battle.log.concat(r.events).slice(-60);
    set({ battle: { ...battle, state: r.state, log } });
    return r.events;
  },
  battleCanHeal() {
    const { battle } = get();
    return battle ? canRequestHeal(battle.state) : false;
  },
  battleHeal() {
    const { battle } = get();
    if (!battle) return;
    set({ battle: { ...battle, state: battleRequestHeal(battle.state) } });
  },
  /** Pause menu: gives up the battle; it ends as a defeat (same outcome as losing it) and goes to the result. */
  battleForfeit() {
    const { battle } = get();
    if (!battle || isOver(battle.state)) return;
    set({ battle: { ...battle, state: battleForfeit(battle.state) } });
    get().endBattle();
  },
  endBattle() {
    const { battle, run, profile } = get();
    if (!battle || !isOver(battle.state)) return;
    const fin = finishBattle({ run, profile, battle: battle.state, enemy: battle.enemy, bossId: battle.bossId, slime: battle.slime, drop: battle.drop, world, catalog }, rng);
    if (fin.run.cheats?.[CHEAT_TOGGLES.INFINITE_BP]) fin.run = { ...fin.run, battlesUsed: 0 };
    // auto distribution on: every available stat point is split by the player's weights
    const auto = autoAllocOf(fin.profile);
    if (auto.on && fin.run.statPoints > 0) fin.run = confirmStatPoints(fin.run, splitPoints(fin.run.statPoints, auto.weights));
    // auto class promotion along the branch saved for this class, once the level allows
    const before = runClassNode(fin.run)?.id;
    const autoOk = bossLevel(fin.profile.bossWins) >= AUTO_CLASS_MIN_BASE;
    const promoted = autoOk ? autoPromoteClass(fin.run, autoClassBranch(fin.profile, fin.run.classId), fin.profile) : fin.run;
    if (promoted !== fin.run) fin.run = refreshRunFromEquipment(promoted, catalog, fin.profile);
    const after = runClassNode(fin.run)?.id;
    if (fin.result.won) fin.profile = recordBestiary(fin.profile, battle.enemy.id, true);
    set({ run: fin.run, profile: fin.profile, result: { ...fin.result, enemy: battle.enemy, battleState: battle.state }, screen: SCREEN.RESULT });
    get().persist(true);
    if (!fin.run.cheated) steam.onBattleEnd(fin.result, fin.run, fin.profile);
    if (after && after !== before) {
      const lang = fin.profile.options?.language;
      get().showToast(translate(lang, 'class.promoted', { name: translate(lang, `class.${after}`) }));
    }
  },
  /** Pays gold to put the run's class back to its base (a new branch can then be chosen). */
  resetClass() {
    const { run, profile } = get();
    if (!run || classResetStatus(run) !== 'ok') return false;
    set({ run: refreshRunFromEquipment(resetClass(run), catalog, profile) });
    get().persist();
    return true;
  },
  /** Saves the subclass branch auto promotion follows for a class (null turns it off); applies it right away. */
  setAutoClass(classId, branch) {
    const { profile, run } = get();
    if (!profile) return;
    const nextProfile = { ...profile, autoClass: { ...(profile.autoClass ?? {}), [classId]: branch ?? null } };
    let nextRun = run;
    if (run && run.classId === classId && bossLevel(profile.bossWins) >= AUTO_CLASS_MIN_BASE) {
      const promoted = autoPromoteClass(run, autoClassBranch(nextProfile, classId), nextProfile);
      if (promoted !== run) nextRun = refreshRunFromEquipment(promoted, catalog, nextProfile);
    }
    set({ profile: nextProfile, run: nextRun });
    get().persist();
  },
  leaveResult() {
    const { run, profile, result } = get();
    const over = isGameOver(run);
    let screen = over ? SCREEN.GAME_OVER : SCREEN.MAP;
    if (!over && result?.won && profile.options.afterBattle === 2 && run.statPoints > 0) screen = SCREEN.STATS;
    set({ screen, battle: null, mapReturnScreen: SCREEN.MAP });
  },

  /* ---------------- farm ---------------- */
  /** Runs a farm action (garden/mine/lab) on the profile's farm at the current time. */
  farmDo(action, ...args) {
    const { profile, run } = get();
    const now = Date.now();
    // planting, auto replant and mine hauls are paid with the run's gold (none without a run)
    let gold = run?.gold ?? 0;
    // seed and elixir prices grow with the base level and Slime King victories (farm.scaledGoldPrice)
    const ctx = { baseLevel: bossLevel(profile.bossWins), slimeWins: slimeKingWins(profile) };
    const fns = {
      tick: (f) => f,
      adopt: (f) => farm.adoptCreature(f, args[0], now, bossLevel(profile.bossWins), slimeKingWins(profile)),
      release: (f) => farm.releaseCreature(f, args[0]),
      plant: (f) => farm.plant(f, args[0], args[1], now, gold, ctx),
      harvest: (f) => farm.harvest(f, args[0], now, gold, ctx),
      harvestAll: (f) => (farm.harvestAllUnlocked(bossLevel(profile.bossWins)) ? farm.harvestAll(f, now, gold, ctx) : f),
      removePlant: (f) => farm.removePlant(f, args[0]),
      setAutoReplant: (f) => farm.setAutoReplant(f, args[0], bossLevel(profile.bossWins)),
      collectMine: (f) => farm.collectMine(f, now, gold, args[0] ?? null),
      upgradeMine: (f) => farm.upgradeMine(f, now),
      brewPotion: (f) => farm.brewPotion(f, args[0], now),
      startElixir: (f) => farm.startElixir(f, args[0], now, gold, ctx),
      collectElixir: (f) => farm.collectElixir(f, now, args[0] ?? null),
    };
    if (!fns[action]) return;
    // auto replant stays off below its base level (older saves may have it on)
    let start = profile.farm;
    if (start.autoReplant && !farm.autoReplantUnlocked(bossLevel(profile.bossWins))) start = { ...start, autoReplant: false };
    // stable creatures catch up first (harvests and brews due until now)
    const before = farm.tickStable(start, now, gold, ctx);
    gold -= before.seedSpent ?? 0;
    const after = fns[action](before);
    if (after === profile.farm) return;
    const settled = farm.settleSeeds(after);
    set({
      profile: { ...profile, farm: settled.farm },
      ...(settled.spent && run ? { run: { ...run, gold: run.gold - settled.spent } } : {}),
      // the HUD shows each stable wage payment as a gold debit (MapScreen WageStat)
      ...(settled.wages > 0 && run ? { wageDebit: { amount: settled.wages, reason: 'wage', id: now } } : {}),
    });
    get().persist();
  },
  /** Debug (sandbox): charges one more wage of every stable creature now, to test the payment and its HUD animation. */
  debugPayWages() {
    const { profile, run } = get();
    if (!run || !profile?.farm?.stable?.length) return false;
    set({ profile: { ...profile, farm: farm.debugWageDue(profile.farm, Date.now()) } });
    get().farmDo('tick');
    return true;
  },
  /**
   * Buys the next garden plot with the run's gold (needs the base level or Slime King victories of farm.PLOT_PRICES).
   * Returns farm.plotBuyStatus: 'ok', or why it could not ('max' | 'level' | 'gold'), or 'norun'.
   */
  buyFarmPlot() {
    const { run, profile } = get();
    if (!run) return 'norun';
    const st = farm.plotBuyStatus(profile.farm, run.gold, bossLevel(profile.bossWins), slimeKingWins(profile));
    if (st !== 'ok') return st;
    const price = farm.nextPlotPrice(profile.farm);
    set({ run: { ...run, gold: run.gold - price.gold }, profile: { ...profile, farm: farm.buyPlot(profile.farm) } });
    get().persist();
    return 'ok';
  },
  /**
   * Buys the next crop / vein / recipe / stall (`kind` of farm.UNLOCK_PRICES) with the run's gold.
   * Returns farm.unlockBuyStatus: 'ok', or why it could not ('max' | 'level' | 'gold'), or 'norun'.
   */
  buyFarmUnlock(kind) {
    const { run, profile } = get();
    if (!run) return 'norun';
    const st = farm.unlockBuyStatus(profile.farm, kind, run.gold, bossLevel(profile.bossWins), slimeKingWins(profile));
    if (st !== 'ok') return st;
    const price = farm.nextUnlockPrice(profile.farm, kind);
    set({ run: { ...run, gold: run.gold - price.gold }, profile: { ...profile, farm: farm.buyUnlock(profile.farm, kind, Date.now()) } });
    get().persist();
    return 'ok';
  },
  /** Uses a BP potion, the fortune brew (a bonus in every area of the current map) or drinks an elixir on the current run. */
  useFarmItem(id) {
    const { profile, run } = get();
    if (!run) return;
    const def = farm.farmDef(id);
    if (def?.effect?.kind === 'roomBattles') {
      const res = farm.useRoomPotion(profile.farm, run, id, inSecretRoom(run));
      if (res.run === run) return;
      set({ profile: { ...profile, farm: res.farm }, run: res.run });
      get().persist();
      return;
    }
    if (def?.effect?.kind === 'mapBonus') {
      const f = farm.spendItem(profile.farm, id);
      if (!f) return;
      set({ profile: { ...profile, farm: f }, run: fillCurrentMapBonuses(run, world, profile, rng) });
      get().persist();
      return;
    }
    const res = def?.buff ? farm.drinkElixir(profile.farm, run, id) : farm.useBpPotion(profile.farm, run, id);
    set({ profile: { ...profile, farm: res.farm }, run: refreshRunFromEquipment(res.run, catalog, profile) });
    get().persist();
  },
  /** Battle pause: a healing potion queues a free full heal. */
  battleUsePotion() {
    const { battle, profile } = get();
    if (!battle || !canQueueFreeHeal(battle.state)) return false;
    const f = farm.spendHealingPotion(profile.farm);
    if (!f) return false;
    set({ battle: { ...battle, state: queueFreeHeal(battle.state) }, profile: { ...profile, farm: f } });
    return true;
  },
  /** Cheat: finish farm timers and add farm resources. */
  cheatFarm() {
    const { profile, run } = get();
    set({ profile: { ...profile, farm: farm.cheatFarm(profile.farm, Date.now()) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: a good stock (CHEAT_ORE_GIFT) more of every mine material, the mine untouched. */
  cheatAddOres() {
    const { profile, run } = get();
    set({ profile: { ...profile, farm: farm.cheatAddOres(profile.farm) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: max mine level, full veins and a max stock of every ore. */
  cheatMaxOres() {
    const { profile, run } = get();
    set({ profile: { ...profile, farm: farm.cheatMaxOres(profile.farm, Date.now()) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: every garden plot owned (true) or none (false). */
  cheatPlots(all) {
    const { profile, run } = get();
    set({ profile: { ...profile, farm: farm.cheatSetPlotsOwned(profile.farm, all ? farm.PLOT_COUNT : 0) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: every one (true) or none (false) of these farm unlock kinds bought (farm.UNLOCK_PRICES). */
  cheatFarmUnlocks(kinds, all) {
    const { profile, run } = get();
    set({ profile: { ...profile, farm: farm.cheatSetOwned(profile.farm, kinds, all, Date.now()) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: every stable creature adopted (true, as many as the stalls hold) or all released (false). */
  cheatCreatures(all) {
    const { profile, run } = get();
    set({ profile: { ...profile, farm: farm.cheatAdoptAll(profile.farm, all, Date.now()) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /**
   * Buys the next echo rarity / talent tier / relic slot / class (`kind` of unlocks.js) with run
   * gold: the current run's, or the saved run's when buying from outside a run (hero select).
   * Returns accountBuyStatus: 'ok', or why it could not ('max' | 'level' | 'gold'), or 'norun'.
   */
  buyAccountUnlock(kind) {
    const { run, profile } = get();
    // Class Emblem prices (the classes) are the account's: no run needed, the run is untouched
    if (paidInEmblems(accountNextPrice(profile, kind))) {
      const st = accountBuyStatus(profile, kind, 0, bossLevel(profile.bossWins), slimeKingWins(profile));
      if (st !== 'ok') return st;
      set({ profile: accountBuy(profile, kind) });
      get().persist();
      return 'ok';
    }
    const r = run ?? profile.run;
    if (!r) return 'norun';
    const st = accountBuyStatus(profile, kind, r.gold, bossLevel(profile.bossWins), slimeKingWins(profile));
    if (st !== 'ok') return st;
    const paid = { ...r, gold: r.gold - accountNextPrice(profile, kind).gold };
    const prof = accountBuy(profile, kind);
    if (run) {
      set({ run: paid, profile: prof });
      get().persist();
    } else {
      // no run loaded: keep the saved run (persist() would drop it) and save right away
      set({ profile: { ...prof, run: paid } });
      saveStore.save(get().profile);
    }
    return 'ok';
  },
  /** Cheat: every one (true) or none (false) of these account unlock kinds bought (unlocks.js). */
  cheatAccountUnlocks(kinds, all) {
    const { profile, run } = get();
    let prof = profile;
    for (const k of kinds) prof = cheatAccountOwned(prof, k, all);
    set({ profile: prof, run: run ? refreshRunFromEquipment({ ...run, cheated: true }, catalog, prof) : run });
    get().persist();
  },
  /** Cheat: max shared base level (every ability boss beaten on normal + hard). */
  cheatMaxBaseLevel() {
    const { profile, run } = get();
    set({ profile: { ...profile, bossWins: maxBaseAbilityWins(profile.bossWins ?? {}) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: marks or clears one map boss win (normal or abyssal); base level, abyssal mode and Limit Break follow it. */
  cheatBossWin(id, hard, won) {
    const { profile, run } = get();
    set({ profile: { ...profile, bossWins: setBossWin(profile.bossWins ?? {}, id, hard, won) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: marks or clears every map boss win, normal and abyssal. */
  cheatAllBossWins(won) {
    const { profile, run } = get();
    let wins = profile.bossWins ?? {};
    for (const id of Object.keys(bossData.mapBosses)) for (const hard of [false, true]) wins = setBossWin(wins, Number(id), hard, won);
    set({ profile: { ...profile, bossWins: wins }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: shared base level back to 0 (every ability boss win forgotten). */
  cheatResetBaseLevel() {
    const { profile, run } = get();
    set({ profile: { ...profile, bossWins: resetBaseAbilityWins(profile.bossWins ?? {}) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },

  /* ---------------- ancestral echoes ---------------- */
  /**
   * Buys an echo (core/echoes.js echo.unlock) with run gold, like buyAccountUnlock: the current
   * run's, or the saved run's from outside a run. Returns echoBuyStatus ('ok' | 'owned' | 'level' | 'gold') or 'norun'.
   */
  buyEcho(id) {
    const { run, profile } = get();
    const r = run ?? profile.run;
    if (!r) return 'norun';
    const st = echoBuyStatus(profile, id, r.gold, bossLevel(profile.bossWins), slimeKingWins(profile));
    if (st !== 'ok') return st;
    const paid = { ...r, gold: r.gold - echoDef(id).unlock.gold };
    const prof = buyEchoIn(profile, id);
    if (run) {
      set({ run: paid, profile: prof });
      get().persist();
    } else {
      set({ profile: { ...prof, run: paid } });
      saveStore.save(get().profile);
    }
    return 'ok';
  },
  equipEcho(characterIndex, id) {
    const { profile, run } = get();
    const prof = equipEcho(profile, characterIndex, id);
    set({ profile: prof, run: run ? refreshRunFromEquipment(run, catalog, prof) : run });
    get().persist();
  },
  unequipEcho(characterIndex) {
    const { profile, run } = get();
    const prof = unequipEcho(profile, characterIndex);
    set({ profile: prof, run: run ? refreshRunFromEquipment(run, catalog, prof) : run });
    get().persist();
  },
  /** Limit Break: buys an extra affinity arrow on `stat` for a hero with Break Shards (core/progression/limitBreak.js). */
  addLimitArrow(characterIndex, stat) {
    const { profile, run } = get();
    const prof = addArrow(profile, characterIndex, stat);
    if (prof === profile) return;
    set({ profile: prof, run: run ? refreshRunFromEquipment(run, catalog, prof) : run });
    get().persist();
  },
  /** Limit Break: removes a hero's extra arrows, refunding the shards. */
  resetLimitBreak(characterIndex) {
    const { profile, run } = get();
    const prof = resetHero(profile, characterIndex);
    if (prof === profile) return;
    set({ profile: prof, run: run ? refreshRunFromEquipment(run, catalog, prof) : run });
    get().persist();
  },
  /** Passive Shards: rerolls a hero's passive into a random other one (core/progression/passiveShards.js). */
  rerollHeroPassive(characterIndex) {
    const { profile } = get();
    const r = rerollPassive(profile, characterIndex, rng);
    if (!r.passive) return;
    // only an offer: the passive changes (and the run's stats with it) once accepted
    set({ profile: r.profile });
    get().persist();
  },
  /** Takes the rolled passive (passiveShards.js acceptPassiveOffer). */
  acceptPassiveOffer(characterIndex) {
    const { profile, run } = get();
    const prof = acceptPassiveOffer(profile, characterIndex);
    if (prof === profile) return;
    set({ profile: prof, run: run ? refreshRunFromEquipment(run, catalog, prof) : run });
    get().persist();
  },
  /** Drops the rolled passive and rolls another one, paying again (the choice modal's Reroll). */
  rerollPassiveAgain(characterIndex) {
    const { profile } = get();
    const r = rerollPassive(keepPassive(profile, characterIndex), characterIndex, rng);
    if (!r.passive) return;
    set({ profile: r.profile });
    get().persist();
  },
  /** Drops the rolled passive and keeps the current one (the shards stay spent). */
  keepPassive(characterIndex) {
    const { profile } = get();
    const prof = keepPassive(profile, characterIndex);
    if (prof === profile) return;
    set({ profile: prof });
    get().persist();
  },

  /** Cheat: adds (or takes away) Passive Shards (flags the run as cheated). */
  cheatPassiveShards(n) {
    const { profile, run } = get();
    set({ profile: cheatPassiveShards(profile, n), run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: adds (or takes away) Class Emblems (flags the run as cheated). */
  cheatEmblems(n) {
    const { profile, run } = get();
    set({ profile: addEmblems(profile, n), run: run ? { ...run, cheated: true } : run });
    get().persist();
  },
  /** Cheat: adds (or takes away) Break Shards (flags the run as cheated). */
  cheatShards(n) {
    const { profile, run } = get();
    set({ profile: cheatShards(profile, n), run: run ? { ...run, cheated: true } : run });
    get().persist();
  },

  /** Cheat: every echo bought (true) or none (false) (flags the run as cheated). */
  cheatEchoes(all = true) {
    const { profile, run } = get();
    const prof = cheatEchoesOwned(profile, all);
    set({ profile: prof, run: run ? refreshRunFromEquipment({ ...run, cheated: true }, catalog, prof) : run });
    get().persist();
  },

  /** Cheat: every echo's mastery to the max or back to level 1 (flags the run as cheated). */
  cheatEchoLevels(max) {
    const { profile, run } = get();
    const prof = cheatEchoMastery(profile, max);
    set({ profile: prof, run: run ? refreshRunFromEquipment({ ...run, cheated: true }, catalog, prof) : run });
    get().persist();
  },

  /** Cheat: reveals the whole bestiary (flags the run as cheated). */
  revealBestiary() {
    const { profile, run } = get();
    set({ profile: revealBestiary(profile, bestiary), run: run ? { ...run, cheated: true } : run });
    get().persist();
  },

  /** Sandbox cheat: wipes the bestiary records (every creature back to "????"). */
  resetBestiary() {
    const { profile, run } = get();
    set({ profile: resetBestiary(profile), run: run ? { ...run, cheated: true } : run });
    get().persist();
  },

  /* ---------------- relics ---------------- */
  /**
   * The Forge on a relic: kind 'upgrade' (one level up) or 'reroll' (a new secondary stat), paid
   * with farm materials and run gold. Returns { id, before, after } or null when refused.
   */
  forgeRelic(id, kind) {
    const { run, profile } = get();
    if (!run) return null;
    const res = kind === 'upgrade' ? upgradeRelic(run, profile, id) : rerollRelic(run, profile, id, rng);
    if (!res.relic) return null;
    set({ run: refreshRunFromEquipment(res.run, catalog, res.profile), profile: res.profile });
    get().persist();
    return res.relic;
  },
  /** Cheat: every relic found (true) or none (false). */
  cheatRelics(all) {
    const { profile, run } = get();
    const prof = cheatRelics(profile, all);
    set({ profile: prof, run: run ? { ...refreshRunFromEquipment(run, catalog, prof), cheated: true } : run });
    get().persist();
  },

  /* ---------------- class promotion ---------------- */
  /** Promotes the run's class into one of its next choices (choiceId; the first one when omitted). */
  promoteClass(choiceId = null) {
    const { run, profile } = get();
    if (!run || !canPromoteClass(run)) return false;
    const next = promoteClass(run, choiceId, profile);
    if (next === run) return false;
    set({ run: refreshRunFromEquipment(next, catalog, profile) });
    get().persist();
    return true;
  },

  /* ---------------- talents ---------------- */
  /** Cheat: TP level to the max (every Slime King beaten) or back to 0 (talents.js tpLevel). */
  cheatTpLevel(all) {
    const { profile, run } = get();
    const slimeKingsBeaten = all ? Object.fromEntries(SLIME_IDS.map((id) => [id, 1])) : {};
    set({ profile: { ...profile, slimeKingsBeaten }, run: run ? refreshRunFromEquipment({ ...run, cheated: true }, catalog, { ...profile, slimeKingsBeaten }) : run });
    get().persist();
  },

  /* ---------------- cheats ---------------- */
  /** Title cheat menu: a run saved before an account cheat counts as cheated too, like a loaded one. */
  markSavedRunCheated() {
    const { profile, run } = get();
    if (run || !profile.run || profile.run.cheated) return;
    set({ profile: { ...profile, run: { ...profile.run, cheated: true } } });
    get().persist();
  },
  /** Applies one cheat from the map's cheat menu; `fn(run)` returns the new run. */
  applyCheat(fn) {
    const { run, profile } = get();
    if (!run) return;
    const next = refreshRunFromEquipment(fn(run), catalog, profile);
    set(isGameOver(next) ? { run: next, screen: SCREEN.GAME_OVER } : { run: next });
    get().persist();
  },

  /* ---------------- stats ---------------- */
  /** Saves the automatic distribution settings ({ on, weights }). */
  setAutoAlloc(autoAlloc) {
    const { profile } = get();
    set({ profile: { ...profile, autoAlloc: autoAllocOf({ autoAlloc }) } });
    get().persist(true);
  },
  confirmStats(staged) {
    const { run } = get();
    const next = confirmStatPoints(run, staged);
    set({ run: next });
    get().persist();
  },

  /* ---------------- equipment / shop ---------------- */
  buyItem(item) {
    const { run } = get();
    const owned = ownedCount(run.inventory, item.type, item.id);
    const st = buyStatus(item, owned, run.gold);
    if (st !== 'ok') return st;
    const next = { ...run, gold: run.gold - item.price, inventory: addItem(run.inventory, item.type, item.id) };
    set({ run: refreshRunFromEquipment(next, catalog, get().profile) });
    get().persist();
    steam.onPurchase(item);
    return 'ok';
  },
  equip(item, slot) {
    const { run } = get();
    const st = equipStatus({ item, slot, slots: run.slots, inventory: run.inventory });
    if (st !== 'ok') return st;
    const next = syncActiveSet({ ...run, slots: equipItem(run.slots, slot, item.id) });
    set({ run: refreshRunFromEquipment(next, catalog, get().profile) });
    get().persist();
    return 'ok';
  },
  unequip(slot) {
    const { run } = get();
    const next = syncActiveSet({ ...run, slots: unequipSlot(run.slots, slot) });
    set({ run: refreshRunFromEquipment(next, catalog, get().profile) });
    get().persist();
  },
  /** Buys a locked accessory slot (run gold + shared base level or Slime King victories). */
  unlockSlot(slot) {
    const { run, profile } = get();
    if (!canUnlockSlot(run.slots, slot, run.gold, bossLevel(profile.bossWins), slimeKingWins(profile))) return false;
    const next = unlockSlotInAllSets({ ...run, gold: run.gold - slotUnlockCost(slot), slots: unlockSlot(run.slots, slot) }, slot);
    set({ run: next });
    get().persist();
    return true;
  },

  /** Equipment sets (4 + boss set): switch the equipped set. */
  switchEquipSet(index) {
    const { run, profile } = get();
    if (!run) return;
    set({ run: refreshRunFromEquipment(switchSet(run, index), catalog, profile) });
    get().persist();
  },
  /** Unlocks the next equipment set for run gold. */
  unlockEquipSet() {
    const { run, profile } = get();
    if (!run) return false;
    const next = unlockNextSet(run, bossLevel(profile.bossWins), slimeKingWins(profile));
    if (next === run) return false;
    set({ run: next });
    get().persist();
    return true;
  },

  /* ---------------- game over ---------------- */
  finishRun() {
    const { run, profile } = get();
    if (!run) return;
    const prof = commitGameOver(run, profile, heroStats(run, catalog, profile));
    set({ run: null, profile: prof, screen: SCREEN.TITLE, battle: null, result: null });
    get().persist(true);
    if (!run.cheated) steam.onRunEnd(run, prof);
  },
  /** Ends the run (like finishRun) and starts a new one right away with the same hero, mode and class. */
  retryRun() {
    const { run } = get();
    if (!run) return;
    const { characterIndex, hardMode, classId } = run;
    get().finishRun();
    get().newRun(characterIndex, hardMode, classId);
  },
}));

// Discovered maps for Statistics: record every map the run stands on, however it got there.
useGame.subscribe((s) => {
  if (!s.run || !s.profile) return;
  const prof = markMapSeen(s.profile, s.run.map.id);
  if (prof !== s.profile) useGame.setState({ profile: prof });
});
