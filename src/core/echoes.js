/**
 * Ancestral Echoes (not in the original game). Account-wide collection: every echo
 * the player owns can be equipped by any hero, one echo per hero, and the same echo can
 * be equipped on several heroes at once.
 *
 * Each echo has four benefits:
 *   passive    - always on (stat percents and/or battle modifiers, applied in computeStats)
 *   skill      - every `every` player hits: 'burst' (extra hit = power x that hit's damage)
 *                or 'heal' (power x max HP)
 *   affinity   - element tag (display only for now; reserved for an element system)
 *   resonance  - once per battle, when an enemy hit leaves the hero below half HP:
 *                'spirit' (the echo strikes for power x the best hit of the battle)
 *                or 'heal' (power x max HP)
 *
 * Echoes are obtained from boss victories (rollEchoDrop).
 *
 * Mastery: an echo gains XP for every battle won while it is equipped on the run's hero
 * (ECHO_XP per enemy kind). Mastery goes from level 1 to MASTERY_MAX; every level above 1
 * adds MASTERY_STEP to all of the echo's numbers (passive, skill and resonance power), and
 * at the MASTERY_MILESTONES the skill triggers one attack sooner. XP is stored per echo on
 * the account, so it is kept when the echo moves to another hero.
 */

import { isAccountOwned } from './progression/unlocks.js';

export const RARITIES = ['common', 'rare', 'epic', 'legendary'];
export const AFFINITIES = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
/** Drop weights per rarity when an echo drops. */
export const RARITY_WEIGHTS = { common: 50, rare: 30, epic: 15, legendary: 5 };
/** Chance that a boss victory grants an echo (map bosses and event bosses). */
export const ECHO_DROP_CHANCE = 0.25;
/** HP ratio under which the resonance triggers. */
export const RESONANCE_HP = 0.5;

export const MASTERY_MAX = 10;
/** Total XP needed to reach each mastery level (index = level - 1). */
export const MASTERY_XP = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320];
/** Extra power per mastery level above 1. */
export const MASTERY_STEP = 0.06;
/** Mastery levels where the skill triggers one attack sooner (never below 2). */
export const MASTERY_MILESTONES = [5, 10];
/** XP for a won battle while the echo is equipped. */
export const ECHO_XP = { enemy: 1, slime: 3, boss: 5 };

export const ECHOES = [
  {
    id: 'ruin_spirit', rarity: 'legendary', affinity: 'fire',
    passive: { mods: { critDamageMultiplier: 0.15 } },
    skill: { every: 5, kind: 'burst', power: 2 },
    resonance: { kind: 'spirit', power: 3 },
  },
  {
    id: 'tide_guardian', rarity: 'epic', affinity: 'water',
    passive: { pct: { hp: 0.1 } },
    skill: { every: 6, kind: 'heal', power: 0.15 },
    resonance: { kind: 'heal', power: 0.5 },
  },
  {
    id: 'stone_colossus', rarity: 'epic', affinity: 'earth',
    passive: { pct: { def: 0.12 } },
    skill: { every: 4, kind: 'burst', power: 1.2 },
    resonance: { kind: 'heal', power: 0.3 },
  },
  {
    id: 'gale_dancer', rarity: 'rare', affinity: 'wind',
    passive: { mods: { comboRatePlus: 0.05 } },
    skill: { every: 4, kind: 'burst', power: 1 },
    resonance: { kind: 'spirit', power: 1.5 },
  },
  {
    id: 'dawn_saint', rarity: 'rare', affinity: 'light',
    passive: { mods: { drainSmall: true } },
    skill: { every: 5, kind: 'heal', power: 0.1 },
    resonance: { kind: 'heal', power: 0.4 },
  },
  {
    id: 'night_shade', rarity: 'rare', affinity: 'dark',
    passive: { mods: { critRatePlus: 0.05 } },
    skill: { every: 5, kind: 'burst', power: 1.5 },
    resonance: { kind: 'spirit', power: 2 },
  },
  {
    id: 'ember_wisp', rarity: 'common', affinity: 'fire',
    passive: { pct: { atk: 0.05 } },
    skill: { every: 6, kind: 'burst', power: 0.8 },
    resonance: { kind: 'spirit', power: 1 },
  },
  {
    id: 'moss_sprite', rarity: 'common', affinity: 'earth',
    passive: { pct: { hp: 0.05 } },
    skill: { every: 7, kind: 'heal', power: 0.08 },
    resonance: { kind: 'heal', power: 0.25 },
  },
];

const BY_ID = Object.fromEntries(ECHOES.map((e) => [e.id, e]));

export function echoDef(id) {
  return BY_ID[id] ?? null;
}

export function createEchoes() {
  return { owned: [], equipped: {}, mastery: {} };
}

export function echoXp(profile, id) {
  return profile?.echoes?.mastery?.[id] ?? 0;
}

export function masteryLevel(xp) {
  let lv = 1;
  for (let i = 1; i < MASTERY_XP.length; i += 1) if (xp >= MASTERY_XP[i]) lv = i + 1;
  return Math.min(lv, MASTERY_MAX);
}

/** { level, xp, current (level start), next (next level total, null at max) } */
export function masteryInfo(profile, id) {
  const xp = echoXp(profile, id);
  const level = masteryLevel(xp);
  return { level, xp, current: MASTERY_XP[level - 1], next: level >= MASTERY_MAX ? null : MASTERY_XP[level] };
}

/** Echo definition with its numbers scaled by a mastery level. */
export function applyMastery(echo, level) {
  if (!echo) return null;
  const m = 1 + MASTERY_STEP * (Math.max(1, level) - 1);
  const scale = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, typeof v === 'number' ? v * m : v]));
  const sooner = MASTERY_MILESTONES.filter((x) => level >= x).length;
  return {
    ...echo,
    masteryLevel: level,
    passive: { pct: scale(echo.passive.pct), mods: scale(echo.passive.mods) },
    skill: { ...echo.skill, every: Math.max(2, echo.skill.every - sooner), power: echo.skill.power * m },
    resonance: { ...echo.resonance, power: echo.resonance.power * m },
  };
}

/** The hero's echo with mastery applied (what battles and stats use), or null. */
export function heroEchoMastered(profile, characterIndex) {
  const e = heroEcho(profile, characterIndex);
  return e ? applyMastery(e, masteryLevel(echoXp(profile, e.id))) : null;
}

/** Adds mastery XP to an owned echo. Returns { profile, levelUp }. */
export function gainEchoXp(profile, id, amount) {
  if (!ownsEcho(profile, id) || amount <= 0) return { profile, levelUp: false };
  const before = masteryLevel(echoXp(profile, id));
  const cap = MASTERY_XP[MASTERY_MAX - 1];
  const xp = Math.min(cap, echoXp(profile, id) + amount);
  const e = profile.echoes;
  const next = { ...profile, echoes: { ...e, mastery: { ...(e.mastery ?? {}), [id]: xp } } };
  return { profile: next, levelUp: masteryLevel(xp) > before };
}

export function ownsEcho(profile, id) {
  return !!profile?.echoes?.owned?.includes(id);
}

/** Echo equipped on a hero (definition), or null. */
export function heroEcho(profile, characterIndex) {
  return echoDef(profile?.echoes?.equipped?.[characterIndex]);
}

/** Hero indexes that have an echo equipped (sorted). */
export function echoHolders(profile, id) {
  const eq = profile?.echoes?.equipped ?? {};
  return Object.keys(eq).filter((h) => eq[h] === id).map(Number).sort((a, b) => a - b);
}

export function addEcho(profile, id) {
  if (!echoDef(id) || ownsEcho(profile, id)) return profile;
  const e = profile.echoes ?? createEchoes();
  return { ...profile, echoes: { ...e, owned: [...e.owned, id] } };
}

/** Is the echo's rarity bought (progression/unlocks.js echoRarities)? */
export function echoRarityOwned(profile, id) {
  return isAccountOwned(profile, 'echoRarities', RARITIES.indexOf(echoDef(id)?.rarity));
}

/** Equips an owned echo of a bought rarity on a hero (replacing that hero's echo; other heroes keep theirs). */
export function equipEcho(profile, characterIndex, id) {
  if (!ownsEcho(profile, id) || !echoRarityOwned(profile, id)) return profile;
  const e = profile.echoes;
  return { ...profile, echoes: { ...e, equipped: { ...e.equipped, [characterIndex]: id } } };
}

export function unequipEcho(profile, characterIndex) {
  const e = profile.echoes ?? createEchoes();
  const equipped = { ...e.equipped };
  delete equipped[characterIndex];
  return { ...profile, echoes: { ...e, equipped } };
}

/** Unequips every echo whose rarity is no longer bought (after the unlock cheat). */
export function unequipLockedEchoes(profile) {
  const e = profile.echoes ?? createEchoes();
  const equipped = Object.fromEntries(Object.entries(e.equipped ?? {}).filter(([, id]) => echoRarityOwned(profile, id)));
  return { ...profile, echoes: { ...e, equipped } };
}

/** Applies the passive to computeStats' percent table and modifiers. */
export function applyEchoPassive(echo, pct, mods) {
  if (!echo) return;
  for (const [k, v] of Object.entries(echo.passive.pct ?? {})) pct[k] += v;
  for (const [k, v] of Object.entries(echo.passive.mods ?? {})) {
    if (typeof v === 'boolean') mods[k] = mods[k] || v;
    else mods[k] += v;
  }
}

/**
 * After a boss victory: maybe grant a random unowned echo (rarity-weighted).
 * Returns the echo id or null.
 */
export function rollEchoDrop(profile, rng) {
  if (rng.next() >= ECHO_DROP_CHANCE) return null;
  const pool = ECHOES.filter((e) => !ownsEcho(profile, e.id));
  if (!pool.length) return null;
  const total = pool.reduce((a, e) => a + RARITY_WEIGHTS[e.rarity], 0);
  let roll = rng.next() * total;
  for (const e of pool) {
    roll -= RARITY_WEIGHTS[e.rarity];
    if (roll < 0) return e.id;
  }
  return pool[pool.length - 1].id;
}
