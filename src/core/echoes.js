/**
 * Ancestral Echoes (not in the original game). Account-wide collection: every echo
 * the player owns can be equipped by any hero, one echo per hero, and the same echo can
 * be equipped on several heroes at once.
 *
 * The commons are a little fire ghost, a whispering Lovecraftian tome and a cozy slime; the rares (Sereia Afogada,
 * Lâmpada-Fátua, Fantasma Abóbora), epics (Duende Ganancioso, Gato das Sete Vidas, Olho Abissal)
 * and legendaries (O Dormente de R'lyeh, A Rainha das Mariposas Lunares, O Rei do Castelo
 * Tentacular) are hand-drawn (game/animations/echoArt.js).
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
 * Each echo is bought on its own (echo.unlock), in three steps: the shared base level
 * (progression/characters.js) reaches unlock.baseLevel (the last two: unlock.slimeKings Slime King
 * victories, bestiary.js slimeKingWins, like the farm); then a map boss drops it (BOSS_ECHO_DROPS),
 * which reveals it (echoes.found: name and sprite shown); then it is bought with the run's gold
 * (unlock.gold). Bought echoes belong to the account.
 *
 * Mastery: an echo gains XP for every battle won while it is equipped on the run's hero
 * (ECHO_XP per enemy kind). Mastery goes from level 1 to MASTERY_MAX; every level above 1
 * adds MASTERY_STEP to the echo's passive numbers only (its skill and resonance stay as they are).
 * XP is stored per echo on the account, so it is kept when the echo moves to another hero.
 */

import { plotNeedMet } from './farm.js';

export const RARITIES =['common', 'rare', 'epic', 'legendary'];
export const AFFINITIES = ['fire', 'water', 'earth', 'wind', 'light', 'dark'];
/** HP ratio under which the resonance triggers. */
export const RESONANCE_HP = 0.5;
/** Base map walking speed (stats.js modifiers.moveSpeed): moveSpeedPct is a share of it. */
const MOVE_SPEED_BASE = 10;

export const MASTERY_MAX = 10;
/** Total XP needed to reach each mastery level (index = level - 1). */
export const MASTERY_XP = [0, 10, 25, 45, 70, 100, 140, 190, 250, 320];
/** Extra passive per mastery level above 1. */
export const MASTERY_STEP = 0.06;
/** XP for a won battle while the echo is equipped. */
export const ECHO_XP = { enemy: 1, slime: 3, boss: 5 };

/**
 * Prices (unlock.gold) are paid from one run's gold (gameStore buyEcho: run.gold), so each fits what a run
 * earns when the echo opens (npm run simulate: ~80-160k a run early, ~150-300k by run 40): commons about a
 * third of a run, rares half a run to a run, epics and legendaries a whole late-game run (the price is the gate).
 *
 * Balance (the same method as the subclasses, progression/classes.js): an echo is a small help, not a
 * game changer. The table below is written in the classes' tree units and turned into the real numbers:
 *   - stat percents x ECHO_STAT_FACTOR, battle rates (crit, combo, crit damage, EXP, gold) x ECHO_MOD_FACTOR,
 *     like CLASS_STAT_FACTOR / CLASS_MOD_FACTOR;
 *   - each rarity a step stronger (RARITY_SCALE, like SPECIALISATION_SCALE), for all of its numbers;
 *   - measured against Inflation RPG's accessories (docs/reverse/items.md): even the strongest echo at
 *     full mastery is worth about one of them (Critical Rate Ring +8%, Critical Damage Ring +0.2, Combo
 *     Rate Ring +9%, EXP Gem +10%; gold like EXP) and about a specialisation's main stat (15%);
 *   - the skill is not a free second attack: its power comes from a share of the hero's damage (burst)
 *     or of max HP (heal) per hit, times how many hits it waits (`every`), so a fast skill hits softer;
 *     the resonance (once per battle) is a share of the best hit or of max HP.
 * Booleans (drainSmall, the Small Recovery Necklace) are kept as they are. A `power` written in the table and
 * the `exact` percents / modifiers are hand-set values, used as they are (mastery still scales the passive ones); `growth` (a stat growing with the account up to its cap, the same
 * as the classes' growth) is not scaled by mastery.
 */
export const RARITY_SCALE = { common: 1, rare: 1.25, epic: 1.5, legendary: 1.75 };
const ECHO_STAT_FACTOR = 0.2;
const ECHO_MOD_FACTOR = 0.25;
/** Burst skill: extra damage per player hit, as a share of the hero's damage (power = share x every). */
export const ECHO_BURST_SHARE = 0.05;
/** Heal skill: max HP healed per player hit (power = share x every). */
export const ECHO_HEAL_SHARE = 0.01;
/** Resonance: x the best hit of the battle (spirit) or share of max HP (heal), before the rarity step. */
export const ECHO_RESONANCE = { spirit: 1, heal: 0.2 };

/** Ordered from the weakest to the strongest (rarity, then unlock price): the Echoes screen lists them so. */
const RAW_ECHOES = [
  {
    id: 'ember_wisp', rarity: 'common', affinity: 'fire',
    unlock: { baseLevel: 2, gold: 30000 },
    // set by hand: ATK 2%, HP 0.7%, AGI 0.4%
    passive: {},
    exact: { pct: { atk: 0.02, hp: 0.007, speed: 0.004 } },
    skill: { every: 6, kind: 'burst' },
    resonance: { kind: 'spirit' },
  },
  {
    // Grimório Sussurrante (the id is from a first version, kept for saves): forbidden knowledge, more EXP
    id: 'wailing_soul', rarity: 'common', affinity: 'dark',
    unlock: { baseLevel: 4, gold: 40000 },
    // set by hand: DEF 0.8%, EXP 5%
    passive: {},
    exact: { pct: { def: 0.008 }, mods: { expMultiplier: 0.05 } },
    skill: { every: 6, kind: 'burst' },
    resonance: { kind: 'spirit' },
  },
  {
    // Slime Aconchegante (the id is from the first version, kept for saves)
    id: 'moss_sprite', rarity: 'common', affinity: 'earth',
    unlock: { baseLevel: 6, gold: 50000 },
    // set by hand: HP 3.8%, DEF 1.4%, LUCK 0.8%
    passive: {},
    exact: { pct: { hp: 0.038, def: 0.014, luck: 0.008 } },
    skill: { every: 3, kind: 'heal', power: 0.003 }, // set by hand: 0.3% of max HP every 3 hits
    resonance: { kind: 'heal' },
  },
  {
    // Sereia Afogada (the id is from the first version, kept for saves)
    id: 'gale_dancer', rarity: 'rare', affinity: 'water',
    unlock: { baseLevel: 10, gold: 150000 },
    // set by hand: combo rate 3%; the resonance strikes for 90% of the best hit
    passive: {},
    exact: { mods: { comboRatePlus: 0.03 } },
    skill: { every: 4, kind: 'burst' },
    resonance: { kind: 'spirit', power: 0.9 },
  },
  {
    // Lâmpada-Fátua
    id: 'dawn_saint', rarity: 'rare', affinity: 'light',
    unlock: { baseLevel: 13, gold: 220000 },
    // set by hand: ATK 2.1%, HP 0.8%, + 2% walking speed on the map
    passive: {},
    exact: { pct: { atk: 0.021, hp: 0.008 }, mods: { moveSpeedPct: 0.02 } },
    skill: { every: 5, kind: 'heal', power: 0.041 }, // set by hand: 4.1% of max HP
    // set by hand: heals 16.5% of max HP and the spirit strikes for 30% of the best hit
    resonance: { kind: 'heal', power: 0.165, strike: 0.3 },
  },
  {
    // Fantasma Abóbora
    id: 'night_shade', rarity: 'rare', affinity: 'dark',
    unlock: { baseLevel: 15, gold: 300000 },
    // set by hand: crit rate 5%
    passive: {},
    exact: { mods: { critRatePlus: 0.05 } },
    skill: { every: 5, kind: 'burst' },
    resonance: { kind: 'spirit' },
  },
  {
    // Duende Ganancioso (id kept for saves): more gold from every battle
    id: 'stone_colossus', rarity: 'epic', affinity: 'earth',
    unlock: { baseLevel: 14, gold: 400000 },
    // set by hand: LUCK 10%, gold 8%, + 4% walking speed on the map
    passive: {},
    exact: { pct: { luck: 0.1 }, mods: { goldBonus: 0.08, moveSpeedPct: 0.04 } },
    skill: { every: 4, kind: 'burst', power: 0.2 }, // set by hand: every 4 attacks, a hit of 20% of the hero's damage
    resonance: { kind: 'spirit', power: 0.5 }, // set by hand: 50% of the best hit
  },
  {
    // Gato das Sete Vidas (id kept for saves): quick claws, and it lands on its feet
    id: 'tide_guardian', rarity: 'epic', affinity: 'wind',
    unlock: { baseLevel: 16, gold: 500000 },
    // set by hand: LUCK 5.6%, combo rate 2%
    passive: {},
    exact: { pct: { luck: 0.056 }, mods: { comboRatePlus: 0.02 } },
    skill: { every: 3, kind: 'burst' },
    resonance: { kind: 'heal' },
  },
  {
    // Olho Abissal: it sees the weak spot
    id: 'abyss_eye', rarity: 'epic', affinity: 'dark',
    unlock: { slimeKings: 2, gold: 600000 },
    // set by hand: crit rate 3%, crit damage 4.1%
    passive: {},
    exact: { mods: { critRatePlus: 0.03, critDamageMultiplier: 0.041 } },
    skill: { every: 5, kind: 'burst' },
    resonance: { kind: 'spirit' },
  },
  {
    // O Dormente de R'lyeh (the id is from the first version, kept for saves)
    id: 'ruin_spirit', rarity: 'legendary', affinity: 'dark',
    unlock: { slimeKings: 4, gold: 800000 },
    // set by hand: HP 3.6%, ATK 3.8%
    passive: {},
    exact: { pct: { hp: 0.036, atk: 0.038 } },
    skill: { every: 6, kind: 'burst' },
    resonance: { kind: 'spirit' },
  },
  {
    // A Rainha das Mariposas Lunares
    id: 'moth_queen', rarity: 'legendary', affinity: 'light',
    unlock: { slimeKings: 6, gold: 1000000 },
    // set by hand: LUCK 2.2%, DEF 0.7%, HP 0.4%, ATK 0.5%, crit rate 1.8%, crit damage 4%, + 1.8% walking speed on the map
    passive: {},
    exact: { pct: { luck: 0.022, def: 0.007, hp: 0.004, atk: 0.005 }, mods: { critRatePlus: 0.018, critDamageMultiplier: 0.04, moveSpeedPct: 0.018 } },
    skill: { every: 4, kind: 'burst' },
    resonance: { kind: 'heal', power: 0.18, strike: 1 }, // set by hand: heals 18% of max HP and the spirit strikes for 100% of the best hit
  },
  {
    // O Rei do Castelo Tentacular: ruler of the economy
    id: 'tentacle_king', rarity: 'legendary', affinity: 'dark',
    unlock: { slimeKings: 8, gold: 1200000 },
    // set by hand: LUCK 3.1%, DEF 0.7%, HP 0.4%, ATK 0.5%, gold 2.1%, EXP 2.8%, + 1.8% walking speed on the map
    passive: {},
    exact: { pct: { luck: 0.031, def: 0.007, hp: 0.004, atk: 0.005 }, mods: { goldBonus: 0.021, expMultiplier: 0.028, moveSpeedPct: 0.018 } },
    skill: { every: 5, kind: 'burst' },
    resonance: { kind: 'spirit' },
  },
];

const round4 = (v) => Math.round(v * 10000) / 10000;

/** Real numbers of a RAW_ECHOES entry (see the balance notes above). */
function balanceEcho(e) {
  const k = RARITY_SCALE[e.rarity] ?? 1;
  const pct = Object.fromEntries(Object.entries(e.passive.pct ?? {}).map(([s, v]) => [s, round4(Math.max(0, v) * k * ECHO_STAT_FACTOR)]));
  const mods = Object.fromEntries(Object.entries(e.passive.mods ?? {}).map(([m, v]) => [m, typeof v === 'number' ? round4(v * k * ECHO_MOD_FACTOR) : v]));
  const share = e.skill.kind === 'heal' ? ECHO_HEAL_SHARE : ECHO_BURST_SHARE;
  // hand-set values (`exact`) are used as they are, over the balanced ones
  Object.assign(pct, e.exact?.pct);
  Object.assign(mods, e.exact?.mods);
  return {
    ...e,
    passive: { ...(Object.keys(pct).length ? { pct } : {}), ...(Object.keys(mods).length ? { mods } : {}) },
    skill: { every: e.skill.every, kind: e.skill.kind, power: e.skill.power ?? round4(share * k * e.skill.every) },
    resonance: { kind: e.resonance.kind, power: e.resonance.power ?? round4(ECHO_RESONANCE[e.resonance.kind] * k), ...(e.resonance.strike ? { strike: e.resonance.strike } : {}) },
  };
}

export const ECHOES = RAW_ECHOES.map(balanceEcho);

const BY_ID = Object.fromEntries(ECHOES.map((e) => [e.id, e]));

export function echoDef(id) {
  return BY_ID[id] ?? null;
}

export function createEchoes() {
  return { owned: [], found: [], equipped: {}, mastery: {} };
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

/** Echo definition at a mastery level: only the passive grows (skill and resonance stay as they are). */
export function applyMastery(echo, level) {
  if (!echo) return null;
  const m = 1 + MASTERY_STEP * (Math.max(1, level) - 1);
  const scale = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, typeof v === 'number' ? v * m : v]));
  return {
    ...echo,
    masteryLevel: level,
    passive: { pct: scale(echo.passive.pct), mods: scale(echo.passive.mods) },
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

/** Has a boss dropped the echo (revealed: shown and buyable)? Owned echoes count as found. */
export function echoFound(profile, id) {
  return ownsEcho(profile, id) || !!profile?.echoes?.found?.includes(id);
}

/** Marks an echo as dropped (revealed). */
export function revealEcho(profile, id) {
  if (!echoDef(id) || echoFound(profile, id)) return profile;
  const e = profile.echoes ?? createEchoes();
  return { ...profile, echoes: { ...e, found: [...(e.found ?? []), id] } };
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

/**
 * Echoes a map boss drops when beaten: boss id -> { echo, chance }. The drop reveals the echo (it can
 * then be bought); it only drops once its base level / Slime Kings are met, and until it is found.
 */
export const BOSS_ECHO_DROPS = Object.freeze({
  2: { echo: 'ember_wisp', chance: 1 }, // the boss of map 4
});

/** The echo a boss win reveals (rolled only for chances below 1): { profile, echo: id | null }. */
export function rollBossEcho(profile, bossId, rng, baseLevel = Infinity, slimeWins = Infinity) {
  const d = BOSS_ECHO_DROPS[bossId];
  if (!d || echoFound(profile, d.echo) || !echoUnlocked(d.echo, baseLevel, slimeWins) || (d.chance < 1 && rng.next() >= d.chance)) return { profile, echo: null };
  return { profile: revealEcho(profile, d.echo), echo: d.echo };
}

/** Are the echo's needs (base level or SK (different Slime Kings beaten)) met (it can be bought)? */
export function echoUnlocked(id, baseLevel, slimeWins = 0) {
  const e = echoDef(id);
  return !!e && plotNeedMet(e.unlock, baseLevel, slimeWins);
}

/** Can the echo be bought? 'ok' | 'owned' | 'level' (base level or Slime Kings too low) | 'drop' (not dropped yet) | 'gold'. */
export function echoBuyStatus(profile, id, gold, baseLevel, slimeWins = 0) {
  if (ownsEcho(profile, id)) return 'owned';
  if (!echoUnlocked(id, baseLevel, slimeWins)) return 'level';
  if (!echoFound(profile, id)) return 'drop';
  if (gold < echoDef(id).unlock.gold) return 'gold';
  return 'ok';
}

/** Adds a bought echo (the caller takes echoDef(id).unlock.gold from the run). */
export const buyEcho = addEcho;

/** Equips an owned echo on a hero (replacing that hero's echo; other heroes keep theirs). */
export function equipEcho(profile, characterIndex, id) {
  if (!ownsEcho(profile, id)) return profile;
  const e = profile.echoes;
  return { ...profile, echoes: { ...e, equipped: { ...e.equipped, [characterIndex]: id } } };
}

export function unequipEcho(profile, characterIndex) {
  const e = profile.echoes ?? createEchoes();
  const equipped = { ...e.equipped };
  delete equipped[characterIndex];
  return { ...profile, echoes: { ...e, equipped } };
}

/** Cheat: every echo bought (true) or none (false; also unequipped, mastery XP is kept). */
export function cheatEchoesOwned(profile, all) {
  const e = profile.echoes ?? createEchoes();
  return { ...profile, echoes: { ...e, owned: all ? ECHOES.map((x) => x.id) : [], equipped: all ? e.equipped : {} } };
}

/** Cheat: every echo at max mastery (max = true) or back to level 1 (owned / equipped echoes are kept). */
export function cheatEchoMastery(profile, max) {
  const e = profile.echoes ?? createEchoes();
  const mastery = max ? Object.fromEntries(ECHOES.map((x) => [x.id, MASTERY_XP[MASTERY_MAX - 1]])) : {};
  return { ...profile, echoes: { ...e, mastery } };
}

/** Applies the passive to computeStats' percent table and modifiers. */
export function applyEchoPassive(echo, pct, mods) {
  if (!echo) return;
  for (const [k, v] of Object.entries(echo.passive.pct ?? {})) pct[k] += v;
  for (const [k, v] of Object.entries(echo.passive.mods ?? {})) {
    // walking speed on the map, as a share of the base speed (stats.js moveSpeed starts at 10)
    if (k === 'moveSpeedPct') mods.moveSpeed += MOVE_SPEED_BASE * v;
    else if (typeof v === 'boolean') mods[k] = mods[k] || v;
    else mods[k] += v;
  }
}

