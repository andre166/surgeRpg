/**
 * Hero classes (not in the original game), chosen when a run starts, on top of the hero.
 * Each class is a tree: the base class branches into three subclasses at LV 200 (a choice);
 * the chosen subclass then evolves along its line of three specialisations, one after the
 * other at LV 1000, 2000 and 5000, e.g.
 *   warrior → fighter → champion → gladiator → weapon master
 *           → brawler → berserker → monk → barbarian
 *           → knight  → paladin → guardian → rune knight
 * The run starts at the base class; run.classPath holds the ids reached so far. Promotions
 * last for the run only.
 *
 * Every node replaces the previous one: its stat percents are added like the other percent
 * bonuses of computeStats, and its passive (`mods`) uses the existing battle modifiers:
 *   critDamage (+ to the crit damage multiplier), critRate, combo (+ rates), exp (+ EXP),
 *   forcedCrit (first N hits are critical), drainSmall / drain (hits drain HP),
 *   deathGuard (chance to survive a lethal hit: 1 = 45%, 2 = 62%), bp (+ max battle points).
 */
import { isAccountOwned } from './unlocks.js';

/** Hero level needed for the base class and for the subclass (chosen). */
export const PROMOTION_LEVELS = [1, 200];
/** Hero level of each specialisation of the chosen subclass, evolved in order. */
export const SPECIALISATION_LEVELS = [1000, 2000, 5000];
/** How much stronger each specialisation in the line is (positive percents and rates). */
const SPECIALISATION_SCALE = [1, 1.25, 1.5];

const node = (id, pct, mods, children = []) => ({ id, pct: { hp: 0, atk: 0, def: 0, speed: 0, luck: 0, ...pct }, mods, children });

/** The three trees. Former tiers (knight/paladin, rogue/assassin, sorcerer/archmage) kept as one path each. */
const TREES = [
  node('warrior', { hp: 0.2, atk: 0.1, def: 0.15, speed: -0.1 }, { critDamage: 0.3, drainSmall: true }, [
    node('fighter', { hp: 0.3, atk: 0.25, def: 0.15, speed: -0.05 }, { critDamage: 0.5, drainSmall: true }, [
      node('champion', { hp: 0.45, atk: 0.45, def: 0.25 }, { critDamage: 0.8, critRate: 0.05, drainSmall: true }),
      node('gladiator', { hp: 0.4, atk: 0.35, def: 0.2, speed: 0.1 }, { critDamage: 0.6, combo: 0.1, drain: true }),
      node('weapon_master', { hp: 0.35, atk: 0.5, def: 0.15, speed: 0.05 }, { critDamage: 0.7, forcedCrit: 2 }),
    ]),
    node('brawler', { hp: 0.4, atk: 0.15, def: 0.1, speed: 0.05 }, { combo: 0.08, drain: true }, [
      node('berserker', { hp: 0.5, atk: 0.5, def: -0.1, speed: 0.1 }, { critDamage: 0.6, combo: 0.1, drain: true }),
      node('monk', { hp: 0.45, atk: 0.3, def: 0.15, speed: 0.3 }, { combo: 0.18, critRate: 0.06, drain: true }),
      node('barbarian', { hp: 0.7, atk: 0.35, def: 0.1 }, { critDamage: 0.4, drain: true, deathGuard: 1 }),
    ]),
    node('knight', { hp: 0.35, atk: 0.15, def: 0.3, speed: -0.1 }, { critDamage: 0.45, drainSmall: true, deathGuard: 1 }, [
      node('paladin', { hp: 0.5, atk: 0.25, def: 0.45, speed: -0.05 }, { critDamage: 0.6, drain: true, deathGuard: 1 }),
      node('guardian', { hp: 0.6, atk: 0.15, def: 0.6, speed: -0.1 }, { critDamage: 0.3, drainSmall: true, deathGuard: 2 }),
      node('rune_knight', { hp: 0.4, atk: 0.4, def: 0.35 }, { critDamage: 0.5, exp: 0.2, deathGuard: 1 }),
    ]),
  ]),
  node('thief', { hp: -0.1, speed: 0.25, luck: 0.25 }, { critRate: 0.05, combo: 0.05 }, [
    node('rogue', { hp: -0.05, atk: 0.1, speed: 0.4, luck: 0.4 }, { critRate: 0.08, combo: 0.08 }, [
      node('assassin', { hp: -0.05, atk: 0.2, speed: 0.6, luck: 0.55 }, { critRate: 0.12, combo: 0.1, forcedCrit: 1 }),
      node('duelist', { atk: 0.3, speed: 0.55, luck: 0.4 }, { critRate: 0.08, combo: 0.2 }),
      node('shadow', { hp: -0.05, atk: 0.25, speed: 0.5, luck: 0.5 }, { critRate: 0.15, critDamage: 0.3, forcedCrit: 1 }),
    ]),
    node('hunter', { atk: 0.15, speed: 0.3, luck: 0.35 }, { critRate: 0.06, exp: 0.15 }, [
      node('sharpshooter', { atk: 0.35, speed: 0.4, luck: 0.45 }, { critRate: 0.15, critDamage: 0.4 }),
      node('scout', { hp: 0.1, atk: 0.2, speed: 0.6, luck: 0.45 }, { combo: 0.1, exp: 0.25, bp: 3 }),
      node('beastmaster', { hp: 0.2, atk: 0.25, speed: 0.45, luck: 0.45 }, { combo: 0.15, exp: 0.15, drainSmall: true }),
    ]),
    node('trickster', { atk: 0.05, speed: 0.35, luck: 0.5 }, { critRate: 0.06, combo: 0.06, deathGuard: 1 }, [
      node('illusionist', { hp: 0.05, atk: 0.15, speed: 0.5, luck: 0.7 }, { critRate: 0.1, deathGuard: 2 }),
      node('pirate', { hp: 0.15, atk: 0.3, speed: 0.45, luck: 0.6 }, { critRate: 0.06, combo: 0.12, drain: true }),
      node('gambler', { hp: -0.1, atk: 0.2, speed: 0.4, luck: 1 }, { critRate: 0.18, critDamage: 0.4 }),
    ]),
  ]),
  node('mage', { hp: -0.1, atk: 0.3, def: -0.15 }, { exp: 0.2, forcedCrit: 1 }, [
    node('sorcerer', { hp: -0.05, atk: 0.5, def: -0.1 }, { exp: 0.35, forcedCrit: 2 }, [
      node('archmage', { atk: 0.75, def: -0.05 }, { exp: 0.5, forcedCrit: 3 }),
      node('elementalist', { atk: 0.85, def: -0.1 }, { exp: 0.3, forcedCrit: 2, critDamage: 0.5 }),
      node('warlock', { hp: 0.05, atk: 0.7, def: -0.05 }, { exp: 0.35, forcedCrit: 2, drain: true }),
    ]),
    node('cleric', { hp: 0.2, atk: 0.25, def: 0.1 }, { exp: 0.2, drainSmall: true, deathGuard: 1 }, [
      node('priest', { hp: 0.4, atk: 0.35, def: 0.25 }, { exp: 0.3, drain: true, deathGuard: 2 }),
      node('druid', { hp: 0.35, atk: 0.4, def: 0.15, speed: 0.15 }, { exp: 0.35, combo: 0.1, drain: true }),
      node('oracle', { hp: 0.2, atk: 0.5, def: 0.1, luck: 0.3 }, { exp: 0.6, critRate: 0.08, forcedCrit: 1 }),
    ]),
    node('necromancer', { hp: 0.05, atk: 0.4, def: -0.05 }, { exp: 0.25, forcedCrit: 1, drain: true }, [
      node('lich', { hp: 0.1, atk: 0.65 }, { exp: 0.35, forcedCrit: 2, drain: true, deathGuard: 2 }),
      node('summoner', { hp: 0.15, atk: 0.55, def: 0.05, speed: 0.1 }, { exp: 0.4, forcedCrit: 2, combo: 0.15 }),
      node('reaper', { atk: 0.8, def: -0.1 }, { critRate: 0.1, critDamage: 0.6, forcedCrit: 1, drain: true }),
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
  const pct = Object.fromEntries(Object.entries(n.pct).map(([k, v]) => [k, v > 0 ? v * scale : v]));
  const mods = { ...n.mods };
  for (const k of ['critDamage', 'critRate', 'combo', 'exp']) if (mods[k]) mods[k] *= scale;
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
  if (mods.deathGuard) m.deathGuard += mods.deathGuard;
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

/** Promotes the run into one of its next choices (`choiceId`; the first one when omitted). */
export function promoteClass(run, choiceId = null) {
  if (!canPromoteClass(run)) return run;
  const options = nextClassOptions(run);
  const pick = choiceId ? options.find((o) => o.id === choiceId) : options[0];
  if (!pick) return run;
  const path = [...classPathOf(run), pick.id];
  return { ...run, classPath: path, classTier: path.length };
}

/**
 * Auto promotion along a pre-selected branch (profile.autoClass[classId] = subclass id): from
 * the base class it promotes into that subclass, then up its line, as many steps as the run's
 * level allows. Runs on another branch (picked by hand) or without a branch are left alone.
 */
export function autoPromoteClass(run, branch) {
  if (!branch || !BY_ID[run?.classId]?.node(branch) || NODES[branch].parent !== run.classId) return run;
  let next = run;
  for (;;) {
    const path = classPathOf(next);
    if (path.length && path[0] !== branch) return next;
    if (!canPromoteClass(next)) return next;
    const promoted = promoteClass(next, path.length ? null : branch);
    if (promoted === next) return next;
    next = promoted;
  }
}

/** Base level (baseAbilityLevel, from boss wins) needed to use auto promotion. */
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
