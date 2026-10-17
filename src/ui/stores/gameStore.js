/**
 * Zustand store: the only place where UI, Phaser and the core meet.
 * Core rules stay in src/core; this store wires state transitions and persistence.
 */
import { create } from 'zustand';
import worldData from '../../data/world.json';
import enemyData from '../../data/enemies.json';
import bossData from '../../data/bosses.json';
import catalog from '../../data/items.json';
import characterData from '../../data/characters.json';
import { createWorld } from '../../core/world/world.js';
import { createMathRng } from '../../core/rng/rng.js';
import { createSaveStore, migrateProfile } from '../../core/persistence/saveStore.js';
import { bridge } from '../../platform/desktop/bridge.js';
import {
  startRun, startBattle, finishBattle, tickGauge, isGameOver, confirmStatPoints, commitGameOver, snapshotRun, heroStats, markMapSeen, bossTouch, currentArea, currentDanger, refreshRunFromEquipment,
} from '../../core/session/session.js';
import { step as battleStep, requestHeal as battleRequestHeal, canRequestHeal, isOver, canQueueFreeHeal, queueFreeHeal } from '../../core/battle/engine.js';
import { battlePointsLeft } from '../../core/progression/battlePoints.js';
import { buyStatus, equipStatus, equipItem, unequipSlot, addItem, canUnlockSlot, unlockSlot, slotUnlockCost, ownedCount } from '../../core/equipment/slots.js';
import { steam } from '../../platform/steam/steam.js';
import { PROFILE_SAVE_SLOT, SANDBOX } from '../../config/sandbox.js';
import { CHEAT_TOGGLES } from '../../core/session/cheats.js';
import { autoAllocOf, splitPoints } from '../../core/progression/autoAlloc.js';
import { buildBestiary, recordBestiary, revealBestiary, resetBestiary } from '../../core/bestiary.js';
import { canPromoteClass, promoteClass, autoPromoteClass, autoClassBranch, runClassNode, AUTO_CLASS_MIN_BASE, resetClass, classResetStatus } from '../../core/progression/classes.js';
import { translate } from '../i18n/index.js';
import { baseAbilityLevel, maxBaseAbilityWins } from '../../core/progression/characters.js';
import { craft } from '../../core/crafting.js';
import { syncActiveSet, switchSet, unlockNextSet, unlockSlotInAllSets, restoreAfterBoss } from '../../core/equipment/sets.js';
import { ECHOES, addEcho, equipEcho, unequipEcho, unequipLockedEchoes } from '../../core/echoes.js';
import { accountOwned, accountBuyStatus, accountNextPrice, accountBuy, cheatAccountOwned } from '../../core/progression/unlocks.js';
import * as farm from '../../core/farm.js';
import { talentBuyStatus, buyTalent, resetTalents, earnTalentPoints, heroTalents, setHeroTalents } from '../../core/progression/talents.js';

export const world = createWorld(worldData);
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
    let profile = loaded.profile;
    // sandbox sessions always start muted (music and sound effects can be turned on in Options)
    if (SANDBOX) profile = { ...profile, options: { ...profile.options, bgmOn: false, sfx: 0 } };
    set({ profile, restoredFromBackup: loaded.restoredFromBackup, screen: SCREEN.TITLE });
    steam.init(bridge).catch(() => {});
  },
  async persist(immediate = false) {
    const { profile, run } = get();
    if (!profile) return;
    const snap = snapshotRun(profile, run);
    set({ profile: snap });
    const doSave = () => saveStore.save(get().profile);
    if (immediate) {
      await doSave();
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 300);
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
    const run = startRun({ profile, characterIndex, hardMode, world, catalog, classId });
    const prof = { ...profile, newGameCount: profile.newGameCount + 1, lastCharacter: characterIndex, lastClass: run.classId };
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
    // any placement ends the run's start position (see startRun atStart)
    const { atStart, ...map } = run.map;
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
    const autoOk = baseAbilityLevel(fin.profile.bossWins) >= AUTO_CLASS_MIN_BASE;
    const promoted = autoOk ? autoPromoteClass(fin.run, autoClassBranch(fin.profile, fin.run.classId)) : fin.run;
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
    if (run && run.classId === classId && baseAbilityLevel(profile.bossWins) >= AUTO_CLASS_MIN_BASE) {
      const promoted = autoPromoteClass(run, autoClassBranch(nextProfile, classId));
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
    const { profile } = get();
    const now = Date.now();
    const fns = {
      tick: (f) => f,
      adopt: (f) => farm.adoptCreature(f, args[0], now),
      release: (f) => farm.releaseCreature(f, args[0]),
      plant: (f) => farm.plant(f, args[0], args[1], now),
      harvest: (f) => farm.harvest(f, args[0], now),
      harvestAll: (f) => (farm.harvestAllUnlocked(baseAbilityLevel(profile.bossWins)) ? farm.harvestAll(f, now) : f),
      removePlant: (f) => farm.removePlant(f, args[0]),
      setAutoReplant: (f) => farm.setAutoReplant(f, args[0], baseAbilityLevel(profile.bossWins)),
      collectMine: (f) => farm.collectMine(f, now),
      upgradeMine: (f) => farm.upgradeMine(f, now),
      brewPotion: (f) => farm.brewPotion(f, args[0]),
      startElixir: (f) => farm.startElixir(f, args[0], now),
      collectElixir: (f) => farm.collectElixir(f, now),
    };
    if (!fns[action]) return;
    // auto replant stays off below its base level (older saves may have it on)
    let start = profile.farm;
    if (start.autoReplant && !farm.autoReplantUnlocked(baseAbilityLevel(profile.bossWins))) start = { ...start, autoReplant: false };
    // stable creatures catch up first (harvests and brews due until now)
    const before = farm.tickStable(start, now);
    const after = fns[action](before);
    if (after === profile.farm) return;
    set({ profile: { ...profile, farm: after } });
    get().persist();
  },
  /**
   * Buys the next garden plot with the run's gold (needs the shared base level of farm.PLOT_PRICES).
   * Returns farm.plotBuyStatus: 'ok', or why it could not ('max' | 'level' | 'gold'), or 'norun'.
   */
  buyFarmPlot() {
    const { run, profile } = get();
    if (!run) return 'norun';
    const st = farm.plotBuyStatus(profile.farm, run.gold, baseAbilityLevel(profile.bossWins));
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
    const st = farm.unlockBuyStatus(profile.farm, kind, run.gold, baseAbilityLevel(profile.bossWins));
    if (st !== 'ok') return st;
    const price = farm.nextUnlockPrice(profile.farm, kind);
    set({ run: { ...run, gold: run.gold - price.gold }, profile: { ...profile, farm: farm.buyUnlock(profile.farm, kind, Date.now()) } });
    get().persist();
    return 'ok';
  },
  /** Uses a BP potion or drinks an elixir on the current run. */
  useFarmItem(id) {
    const { profile, run } = get();
    if (!run) return;
    const def = farm.farmDef(id);
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
  /**
   * Buys the next echo rarity / talent tier / relic slot / class (`kind` of unlocks.js) with run
   * gold: the current run's, or the saved run's when buying from outside a run (hero select).
   * Returns accountBuyStatus: 'ok', or why it could not ('max' | 'level' | 'gold'), or 'norun'.
   */
  buyAccountUnlock(kind) {
    const { run, profile } = get();
    const r = run ?? profile.run;
    if (!r) return 'norun';
    const st = accountBuyStatus(profile, kind, r.gold, baseAbilityLevel(profile.bossWins));
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
    if (kinds.includes('echoRarities')) prof = unequipLockedEchoes(prof);
    set({ profile: prof, run: run ? refreshRunFromEquipment({ ...run, cheated: true }, catalog, prof) : run });
    get().persist();
  },
  /** Cheat: max shared base level (every ability boss beaten on normal + hard). */
  cheatMaxBaseLevel() {
    const { profile, run } = get();
    set({ profile: { ...profile, bossWins: maxBaseAbilityWins(profile.bossWins ?? {}) }, run: run ? { ...run, cheated: true } : run });
    get().persist();
  },

  /* ---------------- ancestral echoes ---------------- */
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
  /** Cheat: unlock every echo (flags the run as cheated). */
  grantAllEchoes() {
    const { profile, run } = get();
    let prof = profile;
    for (const e of ECHOES) prof = addEcho(prof, e.id);
    set({ profile: prof, run: run ? { ...run, cheated: true } : run });
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

  /* ---------------- crafting ---------------- */
  /** Forges a relic from three loot items into relic slot `slot` of the run's hero. Returns the relic or null. */
  craftRelic(items, slot) {
    const { run, profile } = get();
    if (!run) return null;
    const res = craft(run, profile, items, slot);
    if (!res.relic) return null;
    set({ run: refreshRunFromEquipment(res.run, catalog, res.profile), profile: res.profile });
    get().persist();
    return res.relic;
  },

  /* ---------------- class promotion ---------------- */
  /** Promotes the run's class into one of its next choices (choiceId; the first one when omitted). */
  promoteClass(choiceId = null) {
    const { run, profile } = get();
    if (!run || !canPromoteClass(run)) return false;
    const next = promoteClass(run, choiceId);
    if (next === run) return false;
    set({ run: refreshRunFromEquipment(next, catalog, profile) });
    get().persist();
    return true;
  },

  /* ---------------- talents ---------------- */
  /** Talents belong to a hero: these act on the run's hero. */
  buyTalent(id) {
    const { profile, run } = get();
    if (!run) return 'locked';
    const tal = heroTalents(profile, run.characterIndex);
    const tiers = accountOwned(profile, 'talentTiers');
    const st = talentBuyStatus(tal, id, tiers);
    if (st !== 'ok') return st;
    set({ profile: setHeroTalents(profile, run.characterIndex, buyTalent(tal, id, tiers)) });
    get().persist();
    return 'ok';
  },
  /** Cheat: talent points for the run's hero (flags the run as cheated). */
  grantTalentPoints(n) {
    const { profile, run } = get();
    if (!run) return;
    set({ profile: setHeroTalents(profile, run.characterIndex, earnTalentPoints(heroTalents(profile, run.characterIndex), n)), run: { ...run, cheated: true } });
    get().persist();
  },
  resetTalents() {
    const { profile, run } = get();
    if (!run) return;
    set({ profile: setHeroTalents(profile, run.characterIndex, resetTalents(heroTalents(profile, run.characterIndex))) });
    get().persist();
  },

  /* ---------------- cheats ---------------- */
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
    get().persist();
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
  /** Buys a locked accessory slot (run gold + shared base level). */
  unlockSlot(slot) {
    const { run, profile } = get();
    if (!canUnlockSlot(run.slots, slot, run.gold, baseAbilityLevel(profile.bossWins))) return false;
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
    const next = unlockNextSet(run, baseAbilityLevel(profile.bossWins));
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
}));

// Discovered maps for Statistics: record every map the run stands on, however it got there.
useGame.subscribe((s) => {
  if (!s.run || !s.profile) return;
  const prof = markMapSeen(s.profile, s.run.map.id);
  if (prof !== s.profile) useGame.setState({ profile: prof });
});
