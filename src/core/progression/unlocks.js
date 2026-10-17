/**
 * Account unlocks (not in the original game). Like the farm plots (src/core/farm.js), echo
 * rarities, talent tiers, relic slots and base classes start locked: each one is bought, in
 * order, with the run's gold once the shared base level (progression/characters.js) is high
 * enough. profile.unlocks[kind] = how many of that kind are bought; they belong to the account.
 *
 *   echoRarities - echoes.RARITIES in order: only echoes of a bought rarity can be equipped
 *   talentTiers  - the five talent tiers (same in every branch): ranks are only bought in a bought tier
 *   relicSlots   - the relic slots of every hero (crafting.RELIC_SLOTS): forging needs a bought slot
 *   classes      - classes.CLASSES in order: a run starts with a bought class (the first one is free)
 */

/** ACCOUNT_UNLOCK_PRICES[kind][i] is the price ({ baseLevel, gold }) of the (i + 1)-th one. */
export const ACCOUNT_UNLOCK_PRICES = {
  echoRarities: [
    { baseLevel: 1, gold: 50000 }, { baseLevel: 3, gold: 500000 }, { baseLevel: 6, gold: 5000000 }, { baseLevel: 10, gold: 50000000 },
  ],
  talentTiers: [
    { baseLevel: 1, gold: 10000 }, { baseLevel: 2, gold: 100000 }, { baseLevel: 4, gold: 1000000 },
    { baseLevel: 7, gold: 10000000 }, { baseLevel: 10, gold: 100000000 },
  ],
  relicSlots: [
    { baseLevel: 1, gold: 20000 }, { baseLevel: 3, gold: 300000 }, { baseLevel: 6, gold: 3000000 }, { baseLevel: 9, gold: 30000000 },
  ],
  classes: [{ baseLevel: 0, gold: 0 }, { baseLevel: 2, gold: 200000 }, { baseLevel: 4, gold: 2000000 }],
};
export const ACCOUNT_UNLOCK_KINDS = Object.keys(ACCOUNT_UNLOCK_PRICES);
/** Bought from the start: the first class, so a new account can start a run. */
const START = { classes: 1 };

const total = (kind) => ACCOUNT_UNLOCK_PRICES[kind]?.length ?? 0;

/** How many of a kind the account has bought. */
export function accountOwned(profile, kind) {
  const n = Math.trunc(profile?.unlocks?.[kind] ?? 0);
  return Math.max(START[kind] ?? 0, Math.min(total(kind), Number.isFinite(n) ? n : 0));
}

/** Is the `index`-th one of a kind bought? */
export const isAccountOwned = (profile, kind, index) => index >= 0 && index < accountOwned(profile, kind);

/** Price of the next one of a kind, or null when all are bought. */
export const accountNextPrice = (profile, kind) => ACCOUNT_UNLOCK_PRICES[kind]?.[accountOwned(profile, kind)] ?? null;

/** Can the next one of a kind be bought? 'ok' | 'max' | 'level' (base level too low) | 'gold'. */
export function accountBuyStatus(profile, kind, gold, baseLevel) {
  const price = accountNextPrice(profile, kind);
  if (!price) return 'max';
  if (baseLevel < price.baseLevel) return 'level';
  if (gold < price.gold) return 'gold';
  return 'ok';
}

function setOwned(profile, kind, n) {
  return { ...profile, unlocks: { ...(profile.unlocks ?? {}), [kind]: Math.max(START[kind] ?? 0, Math.min(total(kind), n)) } };
}

/** Unlocks the next one of a kind (the caller takes accountNextPrice(profile, kind).gold from the run). */
export function accountBuy(profile, kind) {
  if (!accountNextPrice(profile, kind)) return profile;
  return setOwned(profile, kind, accountOwned(profile, kind) + 1);
}

/** Cheat: every one (true) or none (false; the free first class stays) of a kind bought. */
export function cheatAccountOwned(profile, kind, all) {
  return setOwned(profile, kind, all ? total(kind) : 0);
}

/**
 * What saves from before the unlocks already had, so nothing in use gets locked: the rarities of
 * the equipped echoes, the tiers with ranks, the relic slots in use and the classes played.
 * `rarityOf(id)` / `tierOf(talentId)` / `classIndex(id)` come from the modules that own them.
 */
export function accountOwnedFromOldSave(raw, { rarityOf, tierOf, classIndex }) {
  const echoes = Object.values(raw?.echoes?.equipped ?? {}).map((id) => rarityOf(id)).filter((i) => i >= 0);
  const tiers = Object.values(raw?.heroTalents ?? {}).flatMap((tl) => Object.entries(tl?.ranks ?? {}).filter(([, r]) => r > 0).map(([id]) => tierOf(id)));
  const relics = Object.values(raw?.crafted ?? {}).flatMap((list) => (Array.isArray(list) ? list.map((r, i) => (r ? i : -1)) : []));
  return {
    echoRarities: Math.max(0, ...echoes) + (echoes.length ? 1 : 0),
    talentTiers: tiers.length ? Math.max(...tiers) + 1 : 0,
    relicSlots: relics.length ? Math.max(-1, ...relics) + 1 : 0,
    classes: Math.max(1, classIndex(raw?.lastClass) + 1),
  };
}
