/**
 * A bot that plays runs with the game's own rules (src/core), for balance numbers.
 *
 * Each battle it picks where to fight, among every map it can walk to (travel is free: the
 * encounters met on the way are not played):
 *   - a boss or slime king not beaten this run, when a few trial fights (on copies, with their
 *     own random numbers) are won at least `bossWinRate` of the time;
 *   - else the strongest area whose danger (core/encounters/gauge.js dangerLevel, the colour of
 *     the area borders) is at most `maxDanger`, skipping areas where it just lost.
 * After each battle it spends its stat points like the auto distribution (`weights`), and every
 * few battles buys and equips the gear that scores best (scoreStats).
 * The run ends when the battle points run out; `runsPerPlayer` > 1 plays the next runs on the
 * same profile (equipment, base level, talents carried over, like the game).
 */
import { startRun, startBattle, finishBattle, heroStats, confirmStatPoints, commitGameOver, refreshRunFromEquipment, isGameOver } from '../../src/core/session/session.js';
import { step, isOver, canRequestHeal, requestHeal } from '../../src/core/battle/engine.js';
import { createProfile } from '../../src/core/persistence/profile.js';
import { createSeededRng } from '../../src/core/rng/rng.js';
import { splitPoints } from '../../src/core/progression/autoAlloc.js';
import { battlePointsLeft } from '../../src/core/progression/battlePoints.js';
import { dangerLevel } from '../../src/core/encounters/gauge.js';
import { mapSlimes } from '../../src/core/encounters/slimeBosses.js';
import { buyStatus, equipStatus, equipItem, addItem, ownedCount, slotUnlockStatus, slotUnlockCost, unlockSlot, ACCESSORY_SLOTS, SLOT } from '../../src/core/equipment/slots.js';
import { ITEM_TYPE } from '../../src/core/equipment/items.js';
import { syncActiveSet } from '../../src/core/equipment/sets.js';
import { bossLevel } from '../../src/core/progression/characters.js';
import { recordBestiary, slimeKingWins } from '../../src/core/bestiary.js';
import { areaIndexAt } from '../../src/core/world/world.js';
import { reachableMaps, areaSpots } from './world.mjs';

export const DEFAULT_POLICY = Object.freeze({
  maxDanger: 1,
  bossWinRate: 0.6,
  bossTrials: 8,
  weights: { hp: 30, atk: 35, def: 25, speed: 10, luck: 0 },
  healBelow: 0.35, // pays a heal in boss fights under this HP share
  gearEvery: 3, // battles between shopping / equipping passes
  maxBattles: 5000, // safety stop for one run
});

const ROOMS = new Set([13, 14]);
const MAX_STEPS = 20000;

/** Plays one battle to the end; heals in boss fights when allowed. */
function fightTo(state, rng, healBelow) {
  let s = state;
  for (let i = 0; i < MAX_STEPS && !isOver(s); i += 1) {
    if (s.boss && healBelow > 0 && !s.healQueued && s.player.hp < s.player.maxHp * healBelow && canRequestHeal(s)) s = requestHeal(s);
    s = step(s, rng).state;
  }
  return s;
}

/** How good a hero is for the gear choice: log-weighted stats, battle points count a lot. */
function scoreStats(st) {
  const t = st.total;
  return Math.log(t.hp + 1) + Math.log(t.atk + 1) + 0.6 * Math.log(t.def + 1) + 0.3 * Math.log(t.speed + 1) + 0.2 * Math.log(t.luck + 1) + 2 * Math.log(st.modifiers.maxBattlePoints + 1);
}

const KEYS = { [ITEM_TYPE.WEAPON]: 'weapons', [ITEM_TYPE.ARMOR]: 'armors', [ITEM_TYPE.ACCESSORY]: 'accessories' };

export function createBot(game, policy = DEFAULT_POLICY) {
  const { world, data, exits } = game;
  const { catalog, enemyPools, bossData } = data;
  const ctxOf = (run, profile) => ({ run, profile, world, catalog, enemyPools, bossData });
  const spotsCache = new Map();
  const spotsOf = (map) => {
    if (!spotsCache.has(map.id)) spotsCache.set(map.id, areaSpots(map));
    return spotsCache.get(map.id);
  };
  const forSale = (run) => [...catalog.weapons, ...catalog.armors, ...catalog.accessories].filter((it) => it.price > 0 && (run.hardMode || !it.hard));

  function score(run, profile) {
    return scoreStats(heroStats(run, catalog, profile));
  }

  /** Buys the best affordable upgrade (one per pass), then equips the best owned gear. */
  function manageGear(run, profile) {
    let r = run;
    // shopping: the item that raises the score the most when equipped, while gold lasts
    for (let pass = 0; pass < 4; pass += 1) {
      const base = score(r, profile);
      let best = null;
      for (const it of forSale(r)) {
        if (buyStatus(it, ownedCount(r.inventory, it.type, it.id), r.gold) !== 'ok') continue;
        const bought = { ...r, inventory: addItem(r.inventory, it.type, it.id) };
        const equipped = equipBest(bought, profile, it.type);
        const gain = score(equipped, profile) - base;
        if (gain > 0.01 && (!best || gain / it.price > best.value)) best = { it, value: gain / it.price };
      }
      if (!best) break;
      r = { ...r, gold: r.gold - best.it.price, inventory: addItem(r.inventory, best.it.type, best.it.id) };
      r = equipBest(r, profile, best.it.type);
    }
    // an accessory slot when an owned accessory is left over
    const base = bossLevel(profile.bossWins);
    const slimes = slimeKingWins(profile);
    for (const slot of ACCESSORY_SLOTS) {
      if (r.slots[slot] !== SLOT.LOCKED) continue;
      if (slotUnlockStatus(r.slots, slot, r.gold, base, slimes) !== 'ok') break;
      r = { ...r, gold: r.gold - slotUnlockCost(slot), slots: unlockSlot(r.slots, slot) };
      break;
    }
    for (const type of [ITEM_TYPE.WEAPON, ITEM_TYPE.ARMOR, ITEM_TYPE.ACCESSORY]) r = equipBest(r, profile, type);
    return refreshRunFromEquipment(syncActiveSet(r), catalog, profile);
  }

  /** Equips the owned items of one type that score best (accessories: greedy, slot by slot). */
  function equipBest(run, profile, type) {
    const list = catalog[KEYS[type]];
    const owned = list.filter((it) => ownedCount(run.inventory, type, it.id) > 0);
    const slots = type === ITEM_TYPE.ACCESSORY ? ACCESSORY_SLOTS : [type];
    let r = run;
    for (const slot of slots) {
      if (r.slots[slot] === SLOT.LOCKED) continue;
      let best = { run: r, score: score(r, profile) };
      for (const it of owned) {
        if (equipStatus({ item: it, slot, slots: r.slots, inventory: r.inventory }) !== 'ok') continue;
        const cand = { ...r, slots: equipItem(r.slots, slot, it.id) };
        const s = score(cand, profile);
        if (s > best.score + 1e-9) best = { run: cand, score: s };
      }
      r = best.run;
    }
    return r;
  }

  /** Share of `trials` fights won against a boss / slime from the hero's current state (copies only). */
  function winRate(run, profile, target, seed) {
    let wins = 0;
    for (let i = 0; i < policy.bossTrials; i += 1) {
      const rng = createSeededRng(seed + i * 7919);
      const at = { ...run, map: { ...run.map, id: target.mapId, x: target.x, y: target.y } };
      const sb = startBattle(ctxOf(at, structuredClone(profile)), target.bossId, rng, target.slimeId >= 0 ? { slimeId: target.slimeId } : {});
      if (!sb) return 0;
      if (fightTo(sb.battle, rng, policy.healBelow).phase === 'won') wins += 1;
    }
    return wins / policy.bossTrials;
  }

  /** Bosses and slime kings not beaten this run on the maps it can reach. */
  function bossTargets(run, mapIds) {
    const out = [];
    for (const id of mapIds) {
      const map = world.map(id);
      for (const b of map.bosses ?? []) if (!run.bossBeaten[b.id]) out.push({ key: `boss#${b.id}`, mapId: id, x: b.x, y: b.y, bossId: b.id, slimeId: -1 });
      for (const s of mapSlimes(map)) if (!run.slimesBeaten?.[s.id]) out.push({ key: `slime#${s.id}`, mapId: id, x: s.x, y: s.y, bossId: -1, slimeId: s.id });
    }
    return out;
  }

  /** The strongest area within the danger limit (not one it just lost in), else the weakest one. */
  function pickArea(run, mapIds, lostAt) {
    let best = null;
    let weakest = null;
    for (const id of mapIds) {
      const map = world.map(id);
      for (const [idx, spot] of Object.entries(spotsOf(map))) {
        const area = map.areas[idx];
        if (!area || !enemyPools[area.pool]?.length) continue;
        const key = `${id}:${idx}`;
        const cand = { key, mapId: id, x: spot.x, y: spot.y, level: area.level, bossId: -1, slimeId: -1 };
        if (!weakest || area.level < weakest.level) weakest = cand;
        if (dangerLevel(area.level, run.level, run.hardMode) > policy.maxDanger) continue;
        if ((lostAt.get(key) ?? 0) > run.level) continue;
        if (!best || area.level > best.level) best = cand;
      }
    }
    return best ?? weakest;
  }

  /**
   * Plays one run. Returns { profile, stats } with the run's numbers: battles, final level, the
   * level after given battle counts, every boss / slime first reached, tried and beaten.
   */
  function playRun(profile, seed) {
    const rng = createSeededRng(seed);
    let run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog, classId: 'warrior' });
    let prof = profile;
    const stats = { battles: 0, wins: 0, losses: 0, levelAt: {}, targets: {}, areas: {}, tp: 0, gold: 0, endMap: null, capped: false };
    const lostAt = new Map(); // area key -> hero level needed before it is tried again
    const estimates = new Map(); // target key -> { level, rate }
    const note = (key) => (stats.targets[key] ??= { reachedLevel: null, reachedBattle: null, tries: 0, wins: 0, winLevel: null, winBattle: null });

    while (!isGameOver(run) && stats.battles < policy.maxBattles) {
      if (stats.battles % policy.gearEvery === 0) run = manageGear(run, prof);
      const mapIds = ROOMS.has(run.map.id) ? [run.map.id] : reachableMaps(world, exits, run.map.id);
      let target = null;
      if (!ROOMS.has(run.map.id)) {
        for (const t of bossTargets(run, mapIds)) {
          const n = note(t.key);
          if (n.reachedLevel == null) Object.assign(n, { reachedLevel: run.level, reachedBattle: stats.battles });
          // re-estimated once the hero is 5% stronger than at the last estimate
          const e = estimates.get(t.key);
          if (!e || run.level > e.level * 1.05 + 1) estimates.set(t.key, { level: run.level, rate: winRate(run, prof, t, seed * 31 + stats.battles) });
          if (estimates.get(t.key).rate >= policy.bossWinRate) {
            target = t;
            break;
          }
        }
      }
      if (!target) {
        target = ROOMS.has(run.map.id)
          ? { key: `${run.map.id}:${areaIndexAt(world.map(run.map.id), run.map.x, run.map.y)}`, mapId: run.map.id, x: run.map.x, y: run.map.y, bossId: -1, slimeId: -1 }
          : pickArea(run, mapIds, lostAt);
      }
      if (!target) break;

      run = { ...run, map: { ...run.map, id: target.mapId, x: target.x, y: target.y } };
      const sb = startBattle(ctxOf(run, prof), target.bossId, rng, target.slimeId >= 0 ? { slimeId: target.slimeId } : {});
      if (!sb) break;
      const end = fightTo(sb.battle, rng, policy.healBelow);
      const slime = sb.slimeId >= 0 ? { id: sb.slimeId, talentPoints: sb.talentPoints } : null;
      const fin = finishBattle({ run: sb.run, profile: prof, battle: end, enemy: sb.enemy, bossId: sb.bossId, slime, drop: sb.drop, world, catalog }, rng);
      run = fin.run;
      prof = fin.result.won ? recordBestiary(fin.profile, sb.enemy.id, true) : fin.profile;
      if (run.statPoints > 0) run = confirmStatPoints(run, splitPoints(run.statPoints, policy.weights));

      stats.battles += 1;
      const won = fin.result.won;
      if (won) stats.wins += 1;
      else stats.losses += 1;
      stats.tp += fin.result.talentPoints ?? 0;
      stats.gold += fin.result.gold ?? 0;
      const areaKey = target.bossId < 0 && target.slimeId < 0 ? target.key : null;
      if (areaKey) {
        const a = (stats.areas[areaKey] ??= { battles: 0, losses: 0 });
        a.battles += 1;
        if (!won) {
          a.losses += 1;
          lostAt.set(areaKey, Math.ceil(run.level * 1.15));
        }
      } else {
        const n = note(target.key);
        n.tries += 1;
        if (won) Object.assign(n, { wins: n.wins + 1, winLevel: n.winLevel ?? run.level, winBattle: n.winBattle ?? stats.battles });
        else estimates.delete(target.key); // lost: estimate again before the next try
      }
      // event bosses (rare encounters) met in area fights
      if (sb.bossId >= 32) {
        const n = note(`event#${sb.bossId}`);
        n.tries += 1;
        if (won) n.wins += 1;
      }
      for (const cp of [10, 25, 50, 100, 200, 400]) if (stats.battles === cp) stats.levelAt[cp] = run.level;
    }
    stats.capped = !isGameOver(run);
    stats.level = run.level;
    stats.endMap = run.map.id;
    stats.bp = battlePointsLeft(run);
    prof = commitGameOver(run, prof, heroStats(run, catalog, prof));
    return { profile: prof, stats };
  }

  return { playRun, newProfile: () => createProfile() };
}
