/**
 * Relics (not in the original game), after H. P. Lovecraft. Each relic is a fixed artifact with a
 * name, lore and pixel art (ui/components/RelicSprite.jsx); map bosses drop them (RELIC_DROPS),
 * apart from their item drops, once per account. Until dropped a relic shows as a shadow.
 *
 * Every relic has its own slot (RELICS order): once dropped it sits there for good and works for
 * every hero; it can't be removed. A relic gives a percent on one stat (hp, def, speed or luck),
 * rolled in its range (min..max) when it drops. The Forge improves it: an upgrade (+1 up to
 * RELIC_MAX_LEVEL) adds RELIC_LEVEL_STEP of the rolled percent a level, a reroll draws the percent
 * again in the range (the level stays). Both take mine materials (farm.js MATERIALS, from the farm
 * stock) and a gold fee from the run (forgeFee). Relics add permanent stat percents (computeStats `craftPct`).
 */
import { itemCount } from './farm.js';
import { createMathRng } from './rng/rng.js';

export const STAT_KEYS = ['hp', 'atk', 'def', 'speed', 'luck'];

/** The relics, in slot order: their stat and the percent range rolled at level 0 (name and lore: i18n relic.name.* / relic.lore.*). */
export const RELICS = Object.freeze([
  { id: 'drowned_idol', stat: 'hp', min: 0.06, max: 0.1 },
  { id: 'elder_sign', stat: 'def', min: 0.04, max: 0.08 },
  { id: 'silver_key', stat: 'speed', min: 0.03, max: 0.07 },
  { id: 'shining_trapezohedron', stat: 'luck', min: 0.05, max: 0.09 },
]);
/** One slot per relic. */
export const RELIC_SLOTS = RELICS.length;
export const relicDef = (id) => RELICS.find((r) => r.id === id) ?? null;

/** Map boss id -> the relic its win drops (chance 1 = always, while the account does not have it). */
export const RELIC_DROPS = Object.freeze({
  0: { relic: 'drowned_idol', chance: 1 }, // Zephos the Avatar
  2: { relic: 'elder_sign', chance: 1 }, // Ithila the Eidolon
  3: { relic: 'silver_key', chance: 1 }, // Molar the Matriarch
  5: { relic: 'shining_trapezohedron', chance: 1 }, // Thalith the Apex
});
/** The boss that drops a relic (its id), or null. */
export function relicBoss(id) {
  const e = Object.entries(RELIC_DROPS).find(([, d]) => d.relic === id);
  return e ? Number(e[0]) : null;
}

export const RELIC_MAX_LEVEL = 5;
/** Each level adds this share of the rolled percent (+5: twice it). */
export const RELIC_LEVEL_STEP = 0.2;

/** Materials of each upgrade, from level L to L+1 (index L): the deeper ores for the last ones. */
export const UPGRADE_COSTS = Object.freeze([
  { iron_ore: 6, dark_crystal: 1 },
  { iron_ore: 10, ember_coal: 4, dark_crystal: 2 },
  { bone_silver: 4, bloodstone: 2, dark_crystal: 3 },
  { bloodstone: 4, void_obsidian: 2, dark_crystal: 4 },
  { void_obsidian: 4, soul_amber: 2, dark_crystal: 5 },
]);
/** Materials of a reroll of the percent. */
export const REROLL_COST = Object.freeze({ iron_ore: 4, dark_crystal: 2 });

/** Gold fee of one upgrade or reroll, from the run: FORGE_FEE_SHARE of its gold, never below FORGE_FEE_MIN. */
export const FORGE_FEE_MIN = 20000;
export const FORGE_FEE_SHARE = 0.02;
export const forgeFee = (gold) => Math.max(FORGE_FEE_MIN, Math.round(Math.max(0, gold ?? 0) * FORGE_FEE_SHARE));

const round3 = (x) => Math.round(x * 1000) / 1000;

/** A percent in the relic's range (level 0). */
export function rollPct(def, rng = createMathRng()) {
  return round3(def.min + (def.max - def.min) * rng.next());
}

/** A relic as it drops: level 0 and a rolled percent. */
export function newRelic(id, rng = createMathRng()) {
  const def = relicDef(id);
  return def ? { level: 0, pct: rollPct(def, rng) } : null;
}

/** Empty relic state of a new account. */
export const createRelics = () => ({ owned: {} });

/** Loads saved relics: unknown ids are dropped, a percent out of range is rolled again (old forged relics are not kept). */
export function normalizeRelics(raw) {
  const owned = {};
  for (const [id, r] of Object.entries(raw?.owned ?? {})) {
    const def = relicDef(id);
    if (!def || !r) continue;
    const level = Math.min(RELIC_MAX_LEVEL, Math.max(0, Math.trunc(r.level) || 0));
    const pct = Number.isFinite(r.pct) && r.pct >= def.min && r.pct <= def.max ? r.pct : rollPct(def);
    owned[id] = { level, pct };
  }
  return { owned };
}

/** The account's state of a relic ({ level, pct }), or null when it has not dropped yet. */
export const ownedRelic = (profile, id) => profile?.relics?.owned?.[id] ?? null;
export const relicFound = (profile, id) => !!ownedRelic(profile, id);

/** The stat and percent a relic gives at its level: { stat, pct }. */
export function relicStats(id, state) {
  const def = relicDef(id);
  if (!def || !state) return null;
  return { stat: def.stat, pct: round3(state.pct * (1 + RELIC_LEVEL_STEP * (state.level ?? 0))) };
}

/** The relic slots (RELICS order): the relic's id once dropped, null while it is a shadow. */
export function relicSlots(profile) {
  return RELICS.map((r) => (relicFound(profile, r.id) ? r.id : null));
}

/** Sum of the stat percents of every dropped relic (null when none); the same for every hero. */
export function relicPercents(profile) {
  const ids = relicSlots(profile).filter(Boolean);
  if (!ids.length) return null;
  const sum = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  for (const id of ids) {
    const s = relicStats(id, ownedRelic(profile, id));
    sum[s.stat] += s.pct;
  }
  for (const k of STAT_KEYS) sum[k] = round3(sum[k]);
  return sum;
}

/** The relic a boss win drops: { profile, relic: id | null } (nothing when already owned). */
export function rollRelicDrop(profile, bossId, rng = createMathRng()) {
  const d = RELIC_DROPS[bossId];
  if (!d || relicFound(profile, d.relic) || (d.chance < 1 && rng.next() >= d.chance)) return { profile, relic: null };
  const relics = profile.relics ?? createRelics();
  return { profile: { ...profile, relics: { ...relics, owned: { ...relics.owned, [d.relic]: newRelic(d.relic, rng) } } }, relic: d.relic };
}

/** Materials of the next upgrade of a relic (null at the max level). */
export const upgradeCost = (state) => ((state?.level ?? 0) < RELIC_MAX_LEVEL ? UPGRADE_COSTS[state?.level ?? 0] : null);

/**
 * Can the Forge work on a relic? kind 'upgrade' | 'reroll'.
 * 'ok' | 'missing' (not dropped) | 'max' (upgrade at the max level) | 'materials' | 'gold' (the fee)
 */
export function forgeStatus(run, profile, id, kind) {
  const state = ownedRelic(profile, id);
  if (!state) return 'missing';
  const cost = kind === 'upgrade' ? upgradeCost(state) : REROLL_COST;
  if (!cost) return 'max';
  if (Object.entries(cost).some(([m, n]) => itemCount(profile.farm, m) < n)) return 'materials';
  if ((run?.gold ?? 0) < forgeFee(run?.gold)) return 'gold';
  return 'ok';
}

/** Takes the materials from the farm stock and the fee from the run. */
function pay(run, profile, cost) {
  const items = { ...(profile.farm?.items ?? {}) };
  for (const [m, n] of Object.entries(cost)) items[m] -= n;
  return { run: { ...run, gold: run.gold - forgeFee(run.gold) }, profile: { ...profile, farm: { ...profile.farm, items } } };
}

function setRelic(profile, id, state) {
  return { ...profile, relics: { ...profile.relics, owned: { ...profile.relics.owned, [id]: state } } };
}

/** Upgrades a relic one level: { run, profile, relic: { id, before, after } } (relic null when refused). */
export function upgradeRelic(run, profile, id) {
  if (forgeStatus(run, profile, id, 'upgrade') !== 'ok') return { run, profile, relic: null };
  const before = ownedRelic(profile, id);
  const paid = pay(run, profile, upgradeCost(before));
  const after = { ...before, level: before.level + 1 };
  return { run: paid.run, profile: setRelic(paid.profile, id, after), relic: { id, before, after } };
}

/** Draws a relic's percent again in its range, keeping the level: { run, profile, relic: { id, before, after } }. */
export function rerollRelic(run, profile, id, rng = createMathRng()) {
  if (forgeStatus(run, profile, id, 'reroll') !== 'ok') return { run, profile, relic: null };
  const before = ownedRelic(profile, id);
  const paid = pay(run, profile, REROLL_COST);
  const after = { ...before, pct: rollPct(relicDef(id), rng) };
  return { run: paid.run, profile: setRelic(paid.profile, id, after), relic: { id, before, after } };
}

/** Cheat: every relic owned (true; the ones owned keep their level) or none (false). */
export function cheatRelics(profile, all, rng = createMathRng()) {
  if (!all) return { ...profile, relics: createRelics() };
  const owned = { ...(profile.relics?.owned ?? {}) };
  for (const r of RELICS) if (!owned[r.id]) owned[r.id] = newRelic(r.id, rng);
  return { ...profile, relics: { owned } };
}
