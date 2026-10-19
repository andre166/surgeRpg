/**
 * Hero classes (not in the original game), chosen when a run starts, on top of the hero.
 * Each class is a tree: the base class branches into three subclasses at LV 10,000 (a choice);
 * the chosen subclass then evolves along its line of three specialisations, one after the
 * other at LV 40,000, 75,000 and 180,000, e.g.
 *   warrior → fighter → champion → gladiator → weapon master
 *           → brawler → berserker → monk → barbarian
 *           → knight  → paladin → guardian → rune knight
 * The run starts at the base class; run.classPath holds the ids reached so far. Promotions
 * last for the run only.
 *
 * Every node replaces the previous one: its stat percents are added like the other percent
 * bonuses of computeStats, and its passive (`mods`) uses the existing battle modifiers:
 *   critRate, combo (+ rates), critDamage (+ to the crit damage multiplier, only on a rolled
 *   crit), deathGuard (chance to survive a lethal hit at 1 HP, once per battle: the knight line
 *   4 / 8.5 / 11 / 14.5%, the other classes CLASS_GUARD_CHANCE).
 * Ancestral Echoes, items and other systems stay as they are.
 * Passives are all chance based: nothing fixed (no guaranteed crits, EXP, drain or battle points);
 * the one exception is `growth` (the warrior's fighter and adventurer lines): + a stat % growing
 * with the player's progress (STAT_GROWTH), a small help for the late game.
 */
import { isAccountOwned, subclassKind } from './unlocks.js';
import { slimeKingWins } from '../bestiary.js';
import { baseAbilityLevel } from './characters.js';

/**
 * Promotion levels follow Inflation RPG's normal-mode boss curve (src/data/world.json area levels):
 * the subclass around the bosses of maps 9-11 (LV 10-13k), the specialisations around bosses 12 / 13 /
 * 19 (LV 36-41k), at bosses 21-24 (LV 54-75k) and before the bosses of map 72 / the last boss
 * (LV 180k, below map 72's 222k).
 * Hero level needed for the base class and for the subclass (chosen).
 */
export const PROMOTION_LEVELS = [1, 10000];
/** Hero level of each specialisation of the chosen subclass, evolved in order. */
export const SPECIALISATION_LEVELS = [40000, 75000, 180000];
/** How much stronger each specialisation in the line is (positive percents and rates). */
const SPECIALISATION_SCALE = [1, 1.25, 1.5];
/**
 * Class stats are a small help, not a game changer: every percent of the trees below is multiplied by
 * this (e.g. warrior HP 0.2 → +4%). There are no negative stats: anything below 0 counts as 0.
 */
const CLASS_STAT_FACTOR = 0.2;
/**
 * Passives are a small help too, measured against Inflation RPG's accessories (docs/reverse/items.md):
 * one Critical Damage Ring gives +0.2 crit damage, a Critical Rate Ring +8%, the Combo Rate Ring +9%, a
 * Revival Necklace 45% to survive a lethal hit. The rates of the trees (critRate, combo, critDamage)
 * are multiplied by this, so even the top of a line is worth about one such ring; deathGuard stays 1.
 */
const CLASS_MOD_FACTOR = 0.25;
/**
 * Class deathGuard (a chance, not scaled by the factors above): the Revival Necklace's 45% minus 70%
 * for the classes other than the knight line, rolled once per battle on its own (battle/engine.js
 * classGuard), after the accessories' guard.
 */
export const CLASS_GUARD_CHANCE = 0.135;
/**
 * Growth sources: + pct of the node's `growth.stat` for every `per` of a progress counter
 * (accountProgress), each capped at `max`. Every step of a growing line adds one source; a node's
 * `growth.cap` limits the sum. Fixed + growth along a line: fighter ATK and trickster LUCK 6 / 9 /
 * 12 / 15% (the tops: 6% fixed + 9% growth), adventurer LUCK 4.5 / 6.5 / 9 / 12%.
 */
export const STAT_GROWTH = {
  wins: { per: 500, pct: 0.01, max: 0.06 }, // battles won (account)
  species: { per: 1, pct: 0.001, max: 0.06 }, // monster species defeated (bestiary)
  runs: { per: 1, pct: 0.001, max: 0.06 }, // runs finished
  slimeKings: { per: 1, pct: 0.01, max: 0.06 }, // SK: different Slime Kings beaten
  bp: { per: 1, pct: 0.002, max: 0.06 }, // battle points used in the current run (resets each run)
  bosses: { per: 1, pct: 0.005, max: 0.06 }, // shared base level (ability bosses beaten)
};

/** The progress counters `growth` reads (STAT_GROWTH keys); `run` gives the BP used so far. */
export function accountProgress(profile, run = null) {
  const species = Object.entries(profile?.bestiary ?? {}).filter(([k, e]) => !k.startsWith('slime#') && (e?.defeated ?? 0) > 0).length;
  return {
    wins: profile?.winBattles ?? 0,
    species,
    runs: profile?.gameOverCount ?? 0,
    slimeKings: slimeKingWins(profile),
    bp: run?.battlesUsed ?? 0,
    bosses: baseAbilityLevel(profile?.bossWins ?? {}),
  };
}

/** + percent one growth source gives for the progress counters (accountProgress). */
export function growthOf(source, account) {
  const g = STAT_GROWTH[source];
  if (!g) return 0;
  return Math.min(g.max, Math.floor((account?.[source] ?? 0) / g.per) * g.pct);
}

/** A class node's growth now: { stat, pct } (pct 0 for nodes without growth; at most growth.cap). */
export function classGrowth(node, account) {
  const g = node?.mods?.growth;
  if (!g) return { stat: null, pct: 0 };
  const pct = g.sources.reduce((sum, src) => sum + growthOf(src, account), 0);
  return { stat: g.stat, pct: Math.min(pct, g.cap ?? Infinity) };
}

const node = (id, pct, mods, children = []) => ({ id, pct: { hp: 0, atk: 0, def: 0, speed: 0, luck: 0, ...pct }, mods, children });

/** The three trees. Former tiers (knight/paladin, rogue/assassin, sorcerer/archmage) kept as one path each. */
const TREES = [
  // the three base classes give stats only (no passive); the passives start with the subclasses
  node('warrior', { hp: 0.2, atk: 0.1, def: 0.15 }, {}, [
    // warrior branches: fighter = strength (battle stats, ATK first, plus ATK growing with battles
    // won, BP used, Slime Kings and bosses: STAT_GROWTH), brawler = luck (a little luck and a few
    // battle stats, both modest, plus luck growing with the account; shown as Adventurer / Treasure
    // Hunter / Lucky Wanderer / Fortune Lord, ids kept for saves), knight = tank (HP / DEF, survives
    // lethal hits; each step a little stronger: knight < paladin < guardian < rune knight)
    node('fighter', { hp: 0.15, atk: 0.2, def: 0.1, speed: 0.05 }, { critDamage: 0.25, growth: { stat: 'atk', sources: ['wins'], cap: 0.02 } }, [
      node('champion', { hp: 0.2, atk: 0.25, def: 0.15, speed: 0.1 }, { critRate: 0.05, critDamage: 0.4, growth: { stat: 'atk', sources: ['wins', 'bp'], cap: 0.04 } }),
      node('gladiator', { hp: 0.2, atk: 0.24, def: 0.1, speed: 0.2 }, { critDamage: 0.3, combo: 0.1, growth: { stat: 'atk', sources: ['wins', 'bp', 'slimeKings'], cap: 0.06 } }),
      node('weapon_master', { hp: 0.15, atk: 0.2, def: 0.1, speed: 0.1 }, { critRate: 0.1, critDamage: 0.35, growth: { stat: 'atk', sources: ['wins', 'bp', 'slimeKings', 'bosses'], cap: 0.09 } }),
    ]),
    node('brawler', { hp: 0.1, atk: 0.05, def: 0.05, luck: 0.15 }, { growth: { stat: 'luck', sources: ['wins'], cap: 0.015 } }, [
      node('berserker', { hp: 0.1, atk: 0.1, def: 0.05, luck: 0.2 }, { growth: { stat: 'luck', sources: ['wins', 'species'], cap: 0.025 } }),
      node('monk', { hp: 0.1, atk: 0.05, def: 0.05, speed: 0.1, luck: 0.2 }, { growth: { stat: 'luck', sources: ['wins', 'species', 'runs'], cap: 0.04 } }),
      node('barbarian', { hp: 0.15, atk: 0.1, def: 0.05, luck: 0.25 }, { growth: { stat: 'luck', sources: ['wins', 'species', 'runs', 'slimeKings'], cap: 0.045 } }),
    ]),
    node('knight', { hp: 0.225, atk: 0.05, def: 0.4 }, { deathGuard: 0.04 }, [
      node('paladin', { hp: 0.3, atk: 0.1, def: 0.4 }, { deathGuard: 0.085 }),
      node('guardian', { hp: 0.3, def: 0.45 }, { deathGuard: 0.11 }),
      node('rune_knight', { hp: 0.275, atk: 0.15, def: 0.3 }, { deathGuard: 0.145 }),
    ]),
  ]),
  node('thief', { speed: 0.25, luck: 0.25 }, {}, [
    // thief branches, each step 6 / 9 / 12 / 15% in its main stat: rogue = crit chance + agility,
    // trickster = luck (the luck class of the game: fixed + luck growing with the account, above the
    // warrior's adventurer), hunter = crit chance + defense
    node('rogue', { speed: 0.3 }, { critRate: 0.08 }, [
      node('assassin', { speed: 0.45 }, { critRate: 0.12 }),
      node('duelist', { speed: 0.48 }, { critRate: 0.13 }),
      node('shadow', { speed: 0.5 }, { critRate: 0.14 }),
    ]),
    node('hunter', { def: 0.3 }, { critRate: 0.08 }, [
      node('sharpshooter', { def: 0.45 }, { critRate: 0.12 }),
      node('scout', { def: 0.48 }, { critRate: 0.13 }),
      node('beastmaster', { def: 0.5 }, { critRate: 0.14 }),
    ]),
    node('trickster', { luck: 0.2 }, { growth: { stat: 'luck', sources: ['wins'], cap: 0.02 } }, [
      node('illusionist', { luck: 0.25 }, { growth: { stat: 'luck', sources: ['wins', 'species'], cap: 0.04 } }),
      node('pirate', { luck: 0.24 }, { growth: { stat: 'luck', sources: ['wins', 'species', 'runs'], cap: 0.06 } }),
      node('gambler', { luck: 0.2 }, { growth: { stat: 'luck', sources: ['wins', 'species', 'runs', 'slimeKings'], cap: 0.09 } }),
    ]),
  ]),
  node('mage', { atk: 0.3 }, {}, [
    node('sorcerer', { atk: 0.5 }, { critRate: 0.1 }, [
      node('archmage', { atk: 0.75 }, { critRate: 0.15 }),
      node('elementalist', { atk: 0.85 }, { critRate: 0.1, critDamage: 0.5 }),
      node('warlock', { hp: 0.05, atk: 0.7 }, { critRate: 0.1 }),
    ]),
    node('cleric', { hp: 0.2, atk: 0.25, def: 0.1 }, { deathGuard: CLASS_GUARD_CHANCE }, [
      node('priest', { hp: 0.4, atk: 0.35, def: 0.25 }, { deathGuard: CLASS_GUARD_CHANCE }),
      node('druid', { hp: 0.35, atk: 0.4, def: 0.15, speed: 0.15 }, { combo: 0.1 }),
      node('oracle', { hp: 0.2, atk: 0.5, def: 0.1, luck: 0.3 }, { critRate: 0.13 }),
    ]),
    node('necromancer', { hp: 0.05, atk: 0.4 }, { critRate: 0.05 }, [
      node('lich', { hp: 0.1, atk: 0.65 }, { critRate: 0.1, deathGuard: CLASS_GUARD_CHANCE }),
      node('summoner', { hp: 0.15, atk: 0.55, def: 0.05, speed: 0.1 }, { critRate: 0.1, combo: 0.15 }),
      node('reaper', { atk: 0.8 }, { critRate: 0.15, critDamage: 0.6 }),
    ]),
  ]),
];

/**
 * Index of every node: id → { ...node, tier, minLevel, parent, classId }. The base class
 * branches into its three subclasses (a choice, LV 200); a subclass's three specialisations
 * are then a line, evolved one after the other (LV 1000, 2000, 5000): each one's parent is
 * the previous one, and each step is stronger (positive percents and rates scaled up).
 */
const NODES = {};
const add = (n, tier, minLevel, parent, classId, scale = 1) => {
  const pct = Object.fromEntries(Object.entries(n.pct).map(([k, v]) => [k, v > 0 ? Math.round(v * scale * CLASS_STAT_FACTOR * 1000) / 1000 : 0]));
  const mods = { ...n.mods };
  for (const k of ['critDamage', 'critRate', 'combo']) if (mods[k]) mods[k] = Math.round(mods[k] * scale * CLASS_MOD_FACTOR * 10000) / 10000;
  NODES[n.id] = { ...n, pct, mods, tier, minLevel, parent, classId, applyModifiers: (m) => applyClassMods(m, mods) };
};
for (const root of TREES) {
  add(root, 0, PROMOTION_LEVELS[0], null, root.id);
  for (const sub of root.children) {
    add(sub, 1, PROMOTION_LEVELS[1], root.id, root.id);
    sub.children.forEach((spec, i) => add(spec, 2 + i, SPECIALISATION_LEVELS[i], i === 0 ? sub.id : sub.children[i - 1].id, root.id, SPECIALISATION_SCALE[i]));
  }
}

/** Applies a node's passive to the battle modifiers of computeStats. */
export function applyClassMods(m, mods = {}) {
  if (mods.critDamage) m.critDamageMultiplier += mods.critDamage;
  if (mods.critRate) m.critRatePlus += mods.critRate;
  if (mods.combo) m.comboRatePlus += mods.combo;
  if (mods.exp) m.expMultiplier += mods.exp;
  if (mods.forcedCrit && m.forcedCritHits < mods.forcedCrit) m.forcedCritHits = mods.forcedCrit;
  if (mods.drainSmall) m.drainSmall = true;
  if (mods.drain) m.drain = true;
  if (mods.deathGuard) m.classGuard = Math.max(m.classGuard ?? 0, mods.deathGuard);
  if (mods.bp) m.maxBattlePoints += mods.bp;
}

/** Class trees, each { id, root, nodes } (root = base class node, nodes by tier). */
export const CLASSES = TREES.map((t) => ({
  id: t.id,
  root: NODES[t.id],
  /** Node of an id in this tree (with tier, minLevel and parent). */
  node: (id) => (NODES[id]?.classId === t.id ? NODES[id] : null),
}));

export const DEFAULT_CLASS = 'warrior';

/** Is a base class bought (progression/unlocks.js classes, in CLASSES order; the first is free)? */
export function classOwned(profile, id) {
  return isAccountOwned(profile, 'classes', CLASSES.findIndex((c) => c.id === id));
}
const BY_ID = Object.fromEntries(CLASSES.map((c) => [c.id, c]));

/**
 * Is a node open to promotion? Subclasses are bought per class (progression/unlocks.js
 * subclasses:<class>, in order); the other nodes need nothing. Without a profile nothing is checked.
 */
export function subclassOwned(profile, id) {
  const n = NODES[id];
  if (!profile || !n || n.tier !== 1) return true;
  return isAccountOwned(profile, subclassKind(n.classId), subclassIndex(id));
}

/** Position of a subclass among its class's three (its unlock index), or -1. */
export function subclassIndex(id) {
  const n = NODES[id];
  return n?.tier === 1 ? BY_ID[n.classId].root.children.findIndex((c) => c.id === id) : -1;
}

/** Paths runs promoted before the trees existed followed (their tier → these ids). */
const LEGACY_PATHS = { warrior: ['knight', 'paladin'], thief: ['rogue', 'assassin'], mage: ['sorcerer', 'archmage'] };

/** Class tree, or null for runs started before classes existed. */
export function heroClass(id) {
  return BY_ID[id] ?? null;
}

/** Node of a class id (any tier), or null. */
export function classNode(id) {
  return NODES[id] ?? null;
}

/** Next nodes after a node: the three subclasses of a base class, else the next specialisation in line. */
export function classChildren(id) {
  return Object.values(NODES).filter((n) => n.parent === id);
}

/** The specialisation line of a subclass, in order. */
export function classLine(subId) {
  const line = [];
  for (let n = classChildren(subId)[0]; n; n = classChildren(n.id)[0]) line.push(n);
  return line;
}

/** True when the node with this id is an ancestor of node n (somewhere above it in its tree). */
export function classAncestor(id, n) {
  for (let p = NODES[n?.parent]; p; p = NODES[p.parent]) if (p.id === id) return true;
  return false;
}

/** Ids picked so far in the run's class tree (old runs: their former tier mapped to a path). */
export function classPathOf(run) {
  if (!BY_ID[run?.classId]) return [];
  if (Array.isArray(run.classPath)) return run.classPath;
  return (LEGACY_PATHS[run.classId] ?? []).slice(0, run.classTier ?? 0);
}

/** Current node of a class with a path of picks (invalid picks end the path), or null without a class. */
export function currentClassNode(classId, path = []) {
  const c = BY_ID[classId];
  if (!c) return null;
  let cur = c.root;
  for (const id of path ?? []) {
    const next = NODES[id];
    if (!next || next.parent !== cur.id) break;
    cur = next;
  }
  return cur;
}

/** The run's current class node. */
export function runClassNode(run) {
  return currentClassNode(run?.classId, classPathOf(run));
}

/**
 * Node for a class at a tier (old callers): follows the run's path, or the former linear
 * branch when no path is given.
 */
export function classTierDef(classId, tierIndex = 0, path = null) {
  if (!BY_ID[classId]) return null;
  const p = path ?? (LEGACY_PATHS[classId] ?? []);
  return currentClassNode(classId, p.slice(0, Math.max(0, tierIndex ?? 0)));
}

/** The next choices of the run (the current node's children), [] at the top or without a class. */
export function nextClassOptions(run) {
  const cur = runClassNode(run);
  return cur ? classChildren(cur.id) : [];
}

/** First next choice (they share the level requirement), or null at the top. */
export function nextClassTier(run) {
  return nextClassOptions(run)[0] ?? null;
}

export function canPromoteClass(run) {
  const next = nextClassTier(run);
  return !!next && run.level >= next.minLevel;
}

/**
 * Promotes the run into one of its next choices (`choiceId`; the first one when omitted). With a
 * profile, a subclass not bought (subclassOwned) is refused.
 */
export function promoteClass(run, choiceId = null, profile = null) {
  if (!canPromoteClass(run)) return run;
  const options = nextClassOptions(run);
  const pick = choiceId ? options.find((o) => o.id === choiceId) : options[0];
  if (!pick || !subclassOwned(profile, pick.id)) return run;
  const path = [...classPathOf(run), pick.id];
  return { ...run, classPath: path, classTier: path.length };
}

/**
 * Auto promotion along a pre-selected branch (profile.autoClass[classId] = subclass id): from
 * the base class it promotes into that subclass, then up its line, as many steps as the run's
 * level allows. Runs on another branch (picked by hand) or without a branch are left alone.
 */
export function autoPromoteClass(run, branch, profile = null) {
  if (!branch || !BY_ID[run?.classId]?.node(branch) || NODES[branch].parent !== run.classId) return run;
  let next = run;
  for (;;) {
    const path = classPathOf(next);
    if (path.length && path[0] !== branch) return next;
    if (!canPromoteClass(next)) return next;
    const promoted = promoteClass(next, path.length ? null : branch, profile);
    if (promoted === next) return next;
    next = promoted;
  }
}

/** Base level (bossLevel, map bosses beaten) needed to use auto promotion. */
export const AUTO_CLASS_MIN_BASE = 16;

/** The auto-promotion branch saved for a class, or null. */
export function autoClassBranch(profile, classId) {
  const id = profile?.autoClass?.[classId];
  return id && NODES[id]?.parent === classId ? id : null;
}

/** Gold to reset the class back to its base (a fresh pick of branch): grows with the hero level. */
export const CLASS_RESET_BASE_COST = 20000;
export const CLASS_RESET_COST_PER_LEVEL = 100;
export function classResetCost(level) {
  return CLASS_RESET_BASE_COST + CLASS_RESET_COST_PER_LEVEL * Math.max(1, Math.floor(level ?? 1));
}

/** 'ok' | 'base' (nothing to reset) | 'no-gold'. */
export function classResetStatus(run) {
  if (!BY_ID[run?.classId] || !classPathOf(run).length) return 'base';
  return (run.gold ?? 0) >= classResetCost(run.level) ? 'ok' : 'no-gold';
}

/** Back to the base class for the gold cost (the run's level is kept). */
export function resetClass(run) {
  if (classResetStatus(run) !== 'ok') return run;
  return { ...run, gold: run.gold - classResetCost(run.level), classPath: [], classTier: 0 };
}
