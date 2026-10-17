/**
 * Permanent profile (meta-progression) and per-run state factories.
 * Mirrors the split between GameSaveData (permanent) and GData (per-run)
 * documented in docs/reverse/progression-save.md section 5.6.
 */
import { createAutoAlloc } from '../progression/autoAlloc.js';
import { initialSlots } from '../equipment/slots.js';
import { normalizeSets } from '../equipment/sets.js';
import { STARTING_STATS } from '../progression/characters.js';
import { createEchoes } from '../echoes.js';
import { createFarm } from '../farm.js';

export const SAVE_VERSION = 1;

export function createProfile() {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    gameOverCount: 0,
    newGameCount: 0,
    highestLevel: 0,
    highestCombo: 0,
    highestDamage: 0,
    winBattles: 0,
    loseBattles: 0,
    inventory: { weapons: [1], armors: [1], accessories: [] },
    slots: initialSlots(),
    equipmentSets: normalizeSets(null, initialSlots()), // 4 sets + boss set, per account (src/core/equipment/sets.js)
    gold: 0, // the original keeps gold in the per-run object but lets you shop at game over; we carry 0 into the next run
    characterExp: new Array(16).fill(0),
    bossWins: {}, // key: bossId (normal) / bossId+100 (hard) -> 1
    bossesSeen: {},
    mapsSeen: {}, // HakkenmapV: map id -> 1 once entered
    heroTalents: {}, // hero index -> talent tree { points, earned, ranks } (src/core/progression/talents.js)
    farm: createFarm(), // Farm: garden plots, mine, laboratory and its stock (src/core/farm.js)
    echoes: createEchoes(), // Ancestral Echoes: { owned: [ids], equipped: { hero: id } } (src/core/echoes.js)
    crafted: {}, // hero index -> [4 relic slots] (src/core/crafting.js)
    unlocks: {}, // kind -> how many are bought: echo rarities, talent tiers, relic slots, classes (core/progression/unlocks.js)
    bestiary: {}, // enemy id -> { seen, defeated } (src/core/bestiary.js)
    highestRecord: null, // stats and equipment at the best level (GameOver.as HighItemEquip / shp...)
    lastCharacter: 0,
    lastClass: 'warrior',
    options: { bgm: 0.6, bgmOn: true, sfx: 0.8, afterBattle: 0, fullscreen: false, language: 'en' },
    tutorialSeen: {},
    autoAlloc: createAutoAlloc(), // automatic stat-point distribution (core/progression/autoAlloc.js)
    autoClass: {}, // class id -> subclass branch promoted into automatically (core/progression/classes.js)
    run: null, // in-progress run snapshot (continue)
  };
}

export function createRun({ characterIndex, hardMode = false, profile, classId = null }) {
  return {
    active: true,
    hardMode,
    characterIndex,
    classId, // hero class (src/core/progression/classes.js); null for runs from older saves
    classTier: 0, // promotions so far in the class tree (0-2), for this run only
    classPath: [], // class ids picked at each promotion (src/core/progression/classes.js)
    level: 1,
    exp: 0,
    base: { ...STARTING_STATS },
    statPoints: 0,
    statPointsSpent: 0,
    gold: 0,
    totalGold: 0,
    deaths: 0,
    battlesUsed: 0,
    battles: 0,
    maxBattlePoints: hardMode ? 10 : 30, // recomputed from equipment by the session
    bossBeaten: {}, // per-run boss ids beaten (for map changes)
    bossWinCount: {}, // per-run wins per boss (already-won bosses stop dropping)
    slimesBeaten: {},
    buffs: [], // Farm elixir buffs: [{ id, battlesLeft }] // per-run slime bosses defeated (they come back next run)
    inventory: {
      weapons: profile.inventory.weapons.slice(),
      armors: profile.inventory.armors.slice(),
      accessories: profile.inventory.accessories.slice(),
    },
    slots: profile.slots.slice(),
    equipSets: normalizeSets(profile.equipmentSets, profile.slots), // run copy of the account sets
    map: { id: 1, x: 0, y: 0, gauge: 0 },
    highestCombo: 1,
    highestDamage: 0,
    startedAt: Date.now(),
  };
}
