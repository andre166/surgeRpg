/**
 * Account unlocks (not in the original game). Like the farm plots (src/core/farm.js), talent
 * tiers, subclasses and base classes start locked: each one is bought, in order, with the
 * run's gold once the shared base level (progression/characters.js) is high enough; the last one
 * of each needs SK (different Slime Kings beaten) instead (bestiary.js slimeKingWins), like the farm.
 * profile.unlocks[kind] = how many of that kind are bought; they belong to the account.
 * (Ancestral Echoes are bought one by one, each with its own price: echoes.js echo.unlock.)
 *
 *   talentTiers:<branch> - the three tiers of one talent branch (talents.TALENT_BRANCHES), each
 *                  branch bought on its own: ranks are only bought in a bought tier of their branch
 *   classes      - classes.CLASSES in order: a run starts with a bought class (the first one is free);
 *                  priced in Class Emblems (classEmblems.js, `emblems`) instead of run gold
 *   subclasses:<class> - the three subclasses of one class (classes.js), in order: a run can only
 *                  be promoted into a bought subclass (and so up its line of specialisations)
 */

import { TALENT_BRANCHES } from './talents.js';
import { plotNeedMet } from '../farm.js';
import { emblemCount } from './classEmblems.js';

/** Unlock kind of the tiers of a talent branch ('talentTiers:atk', ...). */
export const talentTierKind = (branch) => `talentTiers:${branch}`;
export const TALENT_TIER_KINDS = TALENT_BRANCHES.map(talentTierKind);
/** Unlock kind of the subclasses of a class ('subclasses:warrior', ...). */
export const subclassKind = (classId) => `subclasses:${classId}`;
/** classes.CLASSES ids (not imported: classes.js imports this module; a test keeps them in sync). */
export const CLASS_IDS = ['warrior', 'thief', 'mage'];
export const SUBCLASS_KINDS = CLASS_IDS.map(subclassKind);
const SUBCLASS_PRICES = [{ baseLevel: 2, gold: 300000 }, { baseLevel: 10, gold: 3000000 }, { slimeKings: 2, gold: 30000000 }];
const TALENT_TIER_PRICES = [
  { baseLevel: 2, gold: 10000 }, { baseLevel: 10, gold: 1000000 }, { slimeKings: 2, gold: 100000000 },
];

/** ACCOUNT_UNLOCK_PRICES[kind][i] is the price ({ baseLevel | slimeKings, gold | emblems }) of the (i + 1)-th one. */
export const ACCOUNT_UNLOCK_PRICES = {
  ...Object.fromEntries(TALENT_TIER_KINDS.map((k) => [k, TALENT_TIER_PRICES])),
  classes: [{ baseLevel: 0, emblems: 0 }, { baseLevel: 6, emblems: 8 }, { baseLevel: 10, emblems: 12 }],
  ...Object.fromEntries(SUBCLASS_KINDS.map((k) => [k, SUBCLASS_PRICES])),
};
export const ACCOUNT_UNLOCK_KINDS = Object.keys(ACCOUNT_UNLOCK_PRICES);
/** Bought from the start: the first class, so a new account can start a run. */
const START = { classes: 1 };

const total = (kind) => ACCOUNT_UNLOCK_PRICES[kind]?.length ?? 0;

/** How many of a kind the account has bought. */
/** Tiers bought per talent branch ({ atk: 2, ... }), for talents.talentPassive. */
export function talentTiersOwned(profile) {
  return Object.fromEntries(TALENT_BRANCHES.map((b) => [b, accountOwned(profile, talentTierKind(b))]));
}

export function accountOwned(profile, kind) {
  const n = Math.trunc(profile?.unlocks?.[kind] ?? 0);
  return Math.max(START[kind] ?? 0, Math.min(total(kind), Number.isFinite(n) ? n : 0));
}

/** Is the `index`-th one of a kind bought? */
export const isAccountOwned = (profile, kind, index) => index >= 0 && index < accountOwned(profile, kind);

/** Price of the next one of a kind, or null when all are bought. */
export const accountNextPrice = (profile, kind) => ACCOUNT_UNLOCK_PRICES[kind]?.[accountOwned(profile, kind)] ?? null;

/** Is this price paid in Class Emblems (the account's) rather than run gold? */
export const paidInEmblems = (price) => price?.emblems != null;

/**
 * Can the next one of a kind be bought? 'ok' | 'max' | 'level' (base level or Slime Kings too low) |
 * 'gold' | 'emblems' (not enough Class Emblems).
 */
export function accountBuyStatus(profile, kind, gold, baseLevel, slimeWins = 0) {
  const price = accountNextPrice(profile, kind);
  if (!price) return 'max';
  if (!plotNeedMet(price, baseLevel, slimeWins)) return 'level';
  if (paidInEmblems(price)) return emblemCount(profile) < price.emblems ? 'emblems' : 'ok';
  if (gold < price.gold) return 'gold';
  return 'ok';
}

function setOwned(profile, kind, n) {
  return { ...profile, unlocks: { ...(profile.unlocks ?? {}), [kind]: Math.max(START[kind] ?? 0, Math.min(total(kind), n)) } };
}

/**
 * Unlocks the next one of a kind. Emblem prices are spent here; for gold ones the caller takes
 * accountNextPrice(profile, kind).gold from the run.
 */
export function accountBuy(profile, kind) {
  const price = accountNextPrice(profile, kind);
  if (!price) return profile;
  const paid = paidInEmblems(price) ? { ...profile, classEmblems: Math.max(0, emblemCount(profile) - price.emblems) } : profile;
  return setOwned(paid, kind, accountOwned(profile, kind) + 1);
}

/** Cheat: every one (true) or none (false; the free first class stays) of a kind bought. */
export function cheatAccountOwned(profile, kind, all) {
  return setOwned(profile, kind, all ? total(kind) : 0);
}

/**
 * What saves from before the unlocks already had, so nothing in use gets locked: the tiers with
 * ranks (per branch) and the classes played.
 * `talentOf(talentId)` ({ branch, tier }) / `classIndex(id)` come from the modules that own them.
 */
export function accountOwnedFromOldSave(raw, { talentOf, classIndex }) {
  const talents = Object.values(raw?.heroTalents ?? {}).flatMap((tl) => Object.entries(tl?.ranks ?? {}).filter(([, r]) => r > 0).map(([id]) => talentOf(id)).filter(Boolean));
  return {
    ...talentTiersFromOld(TALENT_BRANCHES.map((b) => Math.max(0, ...talents.filter((t) => t.branch === b).map((t) => t.tier + 1)))),
    classes: Math.max(1, classIndex(raw?.lastClass) + 1),
  };
}

/**
 * Talent tier kinds from per-branch counts (in TALENT_BRANCHES order), or from one count for every
 * branch: saves from when the tiers were bought once for all branches keep that many in each.
 */
export function talentTiersFromOld(perBranch) {
  return Object.fromEntries(TALENT_TIER_KINDS.map((k, i) => [k, Array.isArray(perBranch) ? perBranch[i] : perBranch]));
}
