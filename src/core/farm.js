/**
 * Farm (not in the original game): a parallel, account-wide progression that keeps
 * producing in real time, even while the game is closed. Dark-fantasy themed.
 *
 *   Corrupted Garden - up to 8 plots, bought with gold (PLOT_PRICES), 6 crops (6 to 22
 *                      minutes) -> herbs and mushrooms,
 *                      brewed at the cauldron into potions and consumables.
 *   Abandoned Mine   - automatic production of ores and crystals (level-based rate and
 *                      storage); materials for the Forge (crafting.js) and mine upgrades.
 *   Laboratory       - up to LAB_SLOTS brewing slots (the first free, the others bought); timed elixirs that give temporary buffs
 *                      (a number of battles) to the current run.
 *   Stable           - up to STABLE_SLOTS creatures that work on their own: harvesters
 *                      pick ready plots, brewers make potions, passives speed up the farm.
 *
 * Everything is pure: functions take `now` (ms) and return a new farm/profile/run.
 */

const MIN = 60 * 1000;

export const PLOT_COUNT = 8;
/**
 * The garden starts with no plots: each one is bought, in order, with the run's gold once the
 * shared base level (bosses beaten, progression/characters.js) is high enough; the last three
 * also need SK (different Slime Kings beaten) (the SK, bestiary.js slimeKingWins: different Slime Kings beaten).
 * PLOT_PRICES[i] is the price of the (i + 1)-th plot.
 */
export const PLOT_PRICES = [
  { baseLevel: 2, gold: 70000 },
  { baseLevel: 4, gold: 150000 },
  { baseLevel: 6, gold: 220000 },
  { baseLevel: 8, gold: 600000 },
  { baseLevel: 11, gold: 1000000 },
  { baseLevel: 12, slimeKings: 1, gold: 1600000 },
  { baseLevel: 13, slimeKings: 2, gold: 2300000 },
  { baseLevel: 14, slimeKings: 3, gold: 3000000 },
];

/** Is a plot's requirement (base level or SK (different Slime Kings beaten)) met? */
export const plotNeedMet = (price, baseLevel, slimeWins = 0) =>
  baseLevel >= (price.baseLevel ?? 0) && slimeWins >= (price.slimeKings ?? 0);

/**
 * Six crops, from quick to slow (6 to 22 minutes). `seed`: base price of the seed, in gold of the current run, paid
 * each time the crop is planted, by hand or by auto replant (no run, no planting); the price
 * actually paid grows with the account and the run (seedCost).
 */
export const CROPS = [
  { id: 'shade_herb', kind: 'herb', time: 6 * MIN, yield: 3, seed: 1000 },
  { id: 'pale_mushroom', kind: 'mushroom', time: 6 * MIN, yield: 2, seed: 1500 },
  { id: 'bloodroot', kind: 'herb', time: 11 * MIN, yield: 3, seed: 4000 },
  { id: 'moon_cap', kind: 'mushroom', time: 13 * MIN, yield: 3, seed: 5000 },
  { id: 'ruin_bloom', kind: 'herb', time: 20 * MIN, yield: 2, seed: 12000 },
  { id: 'abyss_truffle', kind: 'mushroom', time: 22 * MIN, yield: 2, seed: 15000 },
];

/** Gold price formula of seeds and elixir brewing (scaledGoldPrice). */
export const SEED_LEVEL_GROWTH = 1.12; // x per shared base level
export const SEED_SLIME_BONUS = 0.2; // +20% per Slime King victory
export const SEED_PLOT_BONUS = 0.05; // +5% per plot owned after the first
export const SEED_GOLD_RATE = 1 / 2000000; // share of the run's gold per point of base seed (shade herb 0.05%, abyss truffle 0.75%)
export const SEED_MAX_MULT = 1000; // never more than 1000x the base seed...
export const SEED_MAX_GOLD_SHARE = 0.05; // ...nor more than 5% of the run's gold (but never below the base seed)

/**
 * Gold price of a farm service (seeds, elixir brewing) from its base price:
 *   base x 1.12^baseLevel x (1 + 0.2 x slimeKings) x (1 + 0.05 x (plots - 1)) + gold x base / 2 000 000,
 * capped at min(base x 1000, 5% of the run's gold) and never below the base price. The base level and
 * Slime Kings make it grow with the account, the gold term with the run's inflation, and the cap
 * keeps one purchase from eating the run: without a context it is the base price.
 */
export function scaledGoldPrice(base, { baseLevel = 0, slimeWins = 0, gold = 0, plots = 1, maxShare = SEED_MAX_GOLD_SHARE } = {}) {
  if (!base) return 0;
  const finite = Number.isFinite(gold);
  const g = finite ? Math.max(0, gold) : 0;
  const scaled = base * SEED_LEVEL_GROWTH ** Math.max(0, baseLevel) * (1 + SEED_SLIME_BONUS * Math.max(0, slimeWins)) * (1 + SEED_PLOT_BONUS * Math.max(0, plots - 1));
  const raw = scaled + g * base * SEED_GOLD_RATE;
  const cap = Math.min(base * SEED_MAX_MULT, finite ? Math.max(base, g * maxShare) : Infinity);
  return Math.round(Math.max(base, Math.min(cap, raw)));
}

/** Gold a crop costs to plant now (scaledGoldPrice of its base seed). */
export const seedCost = (cropId, ctx = {}) => scaledGoldPrice(farmDef(cropId)?.seed ?? 0, ctx);

/** Seed price of a crop on this farm for a wallet ({ gold, baseLevel, slimeWins }). */
export const farmSeedCost = (farm, cropId, wallet = {}) => seedCost(cropId, { ...wallet, plots: plotsOwned(farm) });

/**
 * Planting, replanting, brewing elixirs and hauling ores out of the mine are paid with the run's gold: those
 * functions take the gold still available and add what they paid to `farm.seedSpent`; the caller
 * takes it from the run and drops the field (settleSeeds) before saving.
 */
const spentSince = (f, from) => (f.seedSpent ?? 0) - (from.seedSpent ?? 0);
const payGold = (farm, gold, stat = null) => bumpStat({ ...farm, seedSpent: (farm.seedSpent ?? 0) + gold }, stat, gold);

/**
 * Lifetime farm counters (Statistics screen, farm tab): items harvested, potions brewed, elixirs
 * collected, ores hauled, creature jobs done, and the run gold spent on seeds, wages, brewing, hauls.
 */
export const FARM_STATS = ['harvested', 'potions', 'elixirs', 'ores', 'creatureWork', 'goldSeeds', 'goldWages', 'goldBrew', 'goldHaul'];
function bumpStat(farm, key, n = 1) {
  if (!key || !n) return farm;
  return { ...farm, stats: { ...farm.stats, [key]: (farm.stats?.[key] ?? 0) + n } };
}
/** Every FARM_STATS counter of a farm (0 when never counted). */
export const farmStats = (farm) => Object.fromEntries(FARM_STATS.map((k) => [k, farm?.stats?.[k] ?? 0]));

/** Splits a farm into { farm (without seedSpent / wageSpent), spent, wages (the part of spent that went to stable wages) }. */
export function settleSeeds(farm) {
  const { seedSpent = 0, wageSpent = 0, ...rest } = farm;
  return { farm: rest, spent: seedSpent, wages: wageSpent };
}

/**
 * Mine materials: production time (seconds per unit at level 1, divided by the level),
 * storage divisor (storage = MINE_STORAGE_PER_LEVEL * level / capDiv), the mine level that
 * opens the vein, how each works as a Forge ingredient (stat + percent) and `haul`, the gold of
 * the run paid per unit to bring it up (rarer, deeper veins cost more; see mineHaulCost).
 */
export const MATERIALS = [
  // scarce on purpose: the mine is a slow trickle to save up for the Forge (crafting.js), not a flood
  { id: 'iron_ore', seconds: 300, capDiv: 1, unlock: 1, haul: 40, forge: { stat: 'def', pct: 0.015 } },
  { id: 'dark_crystal', seconds: 1500, capDiv: 5, unlock: 1, haul: 300, forge: { stat: 'atk', pct: 0.025 } },
  { id: 'ember_coal', seconds: 450, capDiv: 1, unlock: 2, haul: 80, forge: { stat: 'speed', pct: 0.015 } },
  { id: 'bone_silver', seconds: 750, capDiv: 2, unlock: 2, haul: 200, forge: { stat: 'luck', pct: 0.02 } },
  { id: 'bloodstone', seconds: 1200, capDiv: 3, unlock: 3, haul: 600, forge: { stat: 'hp', pct: 0.025 } },
  { id: 'void_obsidian', seconds: 1800, capDiv: 4, unlock: 4, haul: 2000, forge: { stat: 'def', pct: 0.03 } },
  { id: 'soul_amber', seconds: 3000, capDiv: 6, unlock: 5, haul: 6000, forge: { stat: 'atk', pct: 0.04 } },
];

export const MINE_MAX_LEVEL = 5;
/** Storage per level before production stops (divided by each material's capDiv). */
export const MINE_STORAGE_PER_LEVEL = 12;
/** Haul price per mine level above 1: the deeper the shafts, the dearer each trip up (+25% a level). */
export const MINE_HAUL_DEPTH = 0.25;
/** Bulk discount when a vein is hauled with its storage full (scales with how full it is). */
export const MINE_HAUL_BULK = 0.3;

/**
 * Veins the old mine opened at a level (`unlock`); veins are bought now (UNLOCK_PRICES.veins), this
 * only tells old saves which veins they already had.
 */
export const mineMaterials = (level) => MATERIALS.filter((m) => m.unlock <= level);

/** Materials of the first `veins` veins (the bought ones, in MATERIALS order). */
const openVeins = (veins) => MATERIALS.slice(0, Math.max(0, veins));

/** Iron and crystals, plus some of the veins opened at the previous levels. */
const UPGRADE_EXTRA = { 2: { ember_coal: 6, bone_silver: 3 }, 3: { ember_coal: 6, bloodstone: 3 }, 4: { bloodstone: 3, void_obsidian: 2 } };

/** Iron and crystals grow with the level (about an hour or two of the current level's production each). */
export function mineUpgradeCost(level) {
  return { iron_ore: 12 * level, dark_crystal: 2 * level, ...UPGRADE_EXTRA[level] };
}

/**
 * Cauldron (garden): instant potions and consumables used during a run. BP potions keep runs from
 * becoming endless: after a dose the cauldron needs `recharge` before brewing that potion again,
 * about +3 BP per 40 minutes each (rarer ones a little better), whoever brews it (player or creature).
 */
export const POTIONS = [
  { id: 'healing_potion', cost: { shade_herb: 3, pale_mushroom: 1 }, effect: { kind: 'battleHeal' } },
  { id: 'vigor_tonic', cost: { bloodroot: 2, moon_cap: 1, pale_mushroom: 2 }, effect: { kind: 'bp', amount: 1 }, recharge: 15 * MIN },
  { id: 'ruin_draught', cost: { ruin_bloom: 1, abyss_truffle: 1, shade_herb: 2 }, effect: { kind: 'bp', amount: 3 }, recharge: 40 * MIN },
  { id: 'blood_tonic', cost: { bloodroot: 4, moon_cap: 2, bloodstone: 1 }, effect: { kind: 'bp', amount: 5 }, recharge: 60 * MIN },
  // Poção da Fortuna: every empty area of the current map gets a bonus (session.js fillCurrentMapBonuses)
  { id: 'fortune_brew', cost: { moon_cap: 2, ruin_bloom: 1, dark_crystal: 1 }, effect: { kind: 'mapBonus' }, recharge: 30 * MIN },
];

/**
 * Threshold potions (not in the original), brewed at the cauldron like the potions but bought on their
 * own (UNLOCK_PRICES.roomPotions): drunk only inside the secret white / black rooms, one per visit
 * (run.roomPotionUsed, cleared on entering a room), each adds `amount` battles to the room's counter
 * (run.roomExtra, spent when the counter runs out; it lasts until the end of the run).
 * session.js inSecretRoom / finishBattle.
 */
export const ROOM_POTIONS = [
  { id: 'threshold_drop', cost: { shade_herb: 3, pale_mushroom: 2, moon_cap: 1, dark_crystal: 1 }, effect: { kind: 'roomBattles', amount: 2 }, recharge: 20 * MIN },
  { id: 'threshold_tonic', cost: { bloodroot: 3, ruin_bloom: 1, bone_silver: 1 }, effect: { kind: 'roomBattles', amount: 3 }, recharge: 40 * MIN },
  { id: 'threshold_essence', cost: { ruin_bloom: 2, abyss_truffle: 2, soul_amber: 1 }, effect: { kind: 'roomBattles', amount: 5 }, recharge: 75 * MIN },
];

/** Cauldron recipes: the potions, then the threshold potions, with the unlock kind each is bought under. */
export const CAULDRON = [...POTIONS.map((p, i) => ({ def: p, kind: 'potions', index: i })), ...ROOM_POTIONS.map((p, i) => ({ def: p, kind: 'roomPotions', index: i }))];

/**
 * Laboratory: timed elixirs that buff the run for a number of battles. `fee`: base gold of the
 * current run paid to start brewing, grown like the seeds (brewFee; no run, no brewing).
 */
export const ELIXIRS = [
  { id: 'fury_elixir', time: 3 * MIN, cost: { bloodroot: 2, iron_ore: 2 }, buff: { pct: { atk: 0.05 } }, battles: 4, fee: 10000 },
  { id: 'stoneskin_elixir', time: 3 * MIN, cost: { moon_cap: 1, pale_mushroom: 2, iron_ore: 2 }, buff: { pct: { def: 0.05 } }, battles: 4, fee: 10000 },
  { id: 'insight_elixir', time: 6 * MIN, cost: { ruin_bloom: 1, abyss_truffle: 1, dark_crystal: 1 }, buff: { mods: { expMultiplier: 0.08 } }, battles: 4, fee: 15000 },
  { id: 'swift_elixir', time: 8 * MIN, cost: { moon_cap: 3, ember_coal: 2, bone_silver: 1 }, buff: { pct: { speed: 0.05, luck: 0.05 } }, battles: 4, fee: 20000 },
  { id: 'titan_elixir', time: 12 * MIN, cost: { ruin_bloom: 2, bloodstone: 1, void_obsidian: 1 }, buff: { pct: { hp: 0.055, atk: 0.055, def: 0.055, luck: 0.05, speed: 0.01 } }, battles: 4, fee: 40000 },
];

/**
 * Stable: creatures adopted with farm resources (each species once). They are tamed things of the
 * Mythos (names in i18n farm.cr.*, sprites in src/ui/stableArt.js); the ids are kept from the first
 * version so saves keep working.
 * Each one is found first: the first win of a run over its map boss (`drop.boss`) drops it with
 * `drop.chance`. Until then the stable shows it as a shadow, like the bestiary; once found it shows
 * what adopting it costs. Adopting it also needs the shared base level or SK (different Slime Kings beaten)
 * of `need` (same shape as PLOT_PRICES, checked with plotNeedMet).
 */
export const STABLE_SLOTS = 4;
export const CREATURES = [
  // harvesters: every `every` ms, harvest up to `plots` ready plots (auto replant applies)
  { id: 'abyss_slug', role: 'harvester', every: 5 * MIN, plots: 1, cost: { shade_herb: 5, pale_mushroom: 3 }, drop: { boss: 0, chance: 0.5 }, need: { baseLevel: 4 }, wage: 400 },
  { id: 'grave_crow', role: 'harvester', every: 8 * MIN, plots: 2, cost: { bloodroot: 4, moon_cap: 4, iron_ore: 3 }, drop: { boss: 3, chance: 0.35 }, need: { baseLevel: 5 }, wage: 1200 },
  // brewers: every `every` ms, brew one `potion` at the cauldron if the ingredients are in stock
  { id: 'imp_alchemist', role: 'brewer', every: 10 * MIN, potion: 'healing_potion', cost: { shade_herb: 6, pale_mushroom: 3, dark_crystal: 1 }, drop: { boss: 1, chance: 0.4 }, need: { baseLevel: 6 }, wage: 800 },
  { id: 'bog_toad', role: 'brewer', every: 15 * MIN, potion: 'vigor_tonic', cost: { bloodroot: 3, moon_cap: 3, dark_crystal: 1 }, drop: { boss: 6, chance: 0.3 }, need: { baseLevel: 7 }, wage: 1500 },
  // passives: always on while in the stable
  { id: 'moon_moth', role: 'passive', passive: { cropTime: 0.8 }, cost: { ruin_bloom: 2, abyss_truffle: 2 }, drop: { boss: 8, chance: 0.3 }, need: { baseLevel: 8, slimeKings: 3 }, wage: 2500 },
  { id: 'specter_mole', role: 'passive', passive: { mineSpeed: 1.3 }, cost: { iron_ore: 8, dark_crystal: 2 }, drop: { boss: 12, chance: 0.25 }, need: { baseLevel: 9 }, wage: 3000 },
  { id: 'arcane_owl', role: 'passive', passive: { labTime: 0.75 }, cost: { abyss_truffle: 2, dark_crystal: 2 }, drop: { boss: 21, chance: 0.25 }, need: { baseLevel: 10, slimeKings: 3 }, wage: 4000 },
];
/**
 * Wages: every WAGE_PERIOD each creature in the stable is paid its `wage` (base gold, grown like the
 * seeds by creatureWage, but never more than WAGE_MAX_GOLD_SHARE of the run's gold per payment) from
 * the current run. A creature that cannot be paid goes on strike: it stops working (and its passive
 * stops helping) until a payment goes through again; the time on strike is neither worked nor owed.
 * Only the last WAGE_MAX_BACKPAY periods are paid (and worked) when catching up a long absence.
 */
export const WAGE_PERIOD = 3 * MIN;
export const WAGE_MAX_GOLD_SHARE = 0.01;
export const WAGE_MAX_BACKPAY = 20;

/** Gold a creature costs per WAGE_PERIOD now (`ctx`: { baseLevel, slimeWins, gold }). */
export const creatureWage = (id, ctx = {}) => scaledGoldPrice(farmDef(id)?.wage ?? 0, { ...ctx, plots: 1, maxShare: WAGE_MAX_GOLD_SHARE });

/** Is the creature in this stall on strike (wage not paid)? */
export const onStrike = (stall) => !!stall?.striking;

/** Is a wage due now that the run's `gold` can pay (so tickStable would pay it)? */
export function wageDue(farm, now, gold, ctx = {}) {
  return (farm?.stable ?? []).some((st) => (st.paidUntil ?? st.lastAt) <= now && gold >= creatureWage(st.creature, { ...ctx, gold }));
}

/**
 * A new run starts: wages are counted from now. Every creature's next wage is due one WAGE_PERIOD
 * after the start (the time between runs is neither owed nor worked: no gold to pay it with), and
 * its work timer starts over, out of any strike.
 */
export function startRunWages(farm, now) {
  if (!(farm?.stable ?? []).length) return farm;
  const stable = farm.stable.map((st) => ({ ...st, lastAt: now, paidUntil: now + WAGE_PERIOD, striking: false }));
  return { ...farm, stable };
}

/**
 * Debug: makes one more wage payment due now for every creature (the next tickStable charges it),
 * without moving their schedule: each paidUntil goes back one WAGE_PERIOD.
 */
export function debugWageDue(farm, now) {
  const stable = (farm.stable ?? []).map((st) => ({ ...st, paidUntil: Math.min((st.paidUntil ?? st.lastAt) - WAGE_PERIOD, now) }));
  return { ...farm, stable };
}

/** Safety cap on creature actions simulated in one catch-up (long offline periods). */
export const STABLE_MAX_EVENTS = 500;

const BY_ID = Object.fromEntries([...CROPS, ...MATERIALS, ...POTIONS, ...ROOM_POTIONS, ...ELIXIRS, ...CREATURES].map((x) => [x.id, x]));
export const farmDef = (id) => BY_ID[id] ?? null;

export function createFarm(now = Date.now()) {
  return {
    plots: new Array(PLOT_COUNT).fill(null), // { crop, plantedAt }
    plotsOwned: 0, // plots bought so far: plots[0 .. plotsOwned - 1] can be planted
    owned: emptyOwned(), // kind -> how many of UNLOCK_PRICES[kind] are bought (in order)
    mine: { level: 1, at: {} }, // at: material id -> production start (set when the vein is bought)
    labs: new Array(LAB_SLOTS).fill(null), // per alembic: { elixir, startedAt } (labSlotsOwned of them usable)
    items: {}, // id -> count (crops, materials, potions, elixirs)
    autoReplant: false, // harvesting replants the same crop right away
    stable: [], // [{ creature, lastAt }] (up to STABLE_SLOTS)
    found: [], // creature ids dropped by their boss (they can be adopted)
  };
}

/* ---------------- unlocks (bought with gold + base level) ---------------- */

/**
 * Like the plots, crops, mine veins, potion and elixir recipes and stable stalls start locked: each
 * one is bought, in order, with the run's gold once the shared base level is high enough (the last
 * veins also need SK, different Slime Kings beaten, like the last plots).
 * UNLOCK_PRICES[kind][i] is the price of the (i + 1)-th one.
 */
export const UNLOCK_PRICES = {
  // shade herb, pale mushroom, bloodroot, moon cap, ruin bloom, abyss truffle (CROPS order)
  crops: [
    { baseLevel: 2, gold: 50000 }, { baseLevel: 4, gold: 150000 }, { baseLevel: 5, gold: 220000 },
    { baseLevel: 6, gold: 720000 }, { baseLevel: 6, slimeKings: 2, gold: 1000000 }, { baseLevel: 7, slimeKings: 3, gold: 1200000 },
  ],
  // iron, dark crystal, ember coal, bone silver, bloodstone, void obsidian, soul amber (MATERIALS order)
  veins: [
    { baseLevel: 2, gold: 50000 }, { baseLevel: 4, gold: 150000 }, { baseLevel: 6, gold: 220000 },
    { baseLevel: 8, gold: 720000 }, { baseLevel: 9, slimeKings: 2, gold: 1000000 }, { baseLevel: 11, slimeKings: 3, gold: 1200000 },
    { baseLevel: 13, slimeKings: 4, gold: 1500000 },
  ],
  // healing, vigor, ruin draught, blood tonic, fortune (POTIONS order): each opens with its ingredients
  // (the crops and veins above), at the crops' gold scale
  potions: [
    { baseLevel: 4, gold: 50000 }, { baseLevel: 6, gold: 150000 }, { baseLevel: 7, slimeKings: 1, gold: 500000 },
    { baseLevel: 9, slimeKings: 1, gold: 650000 }, { baseLevel: 9, slimeKings: 2, gold: 1000000 },
  ],
  // fury, stoneskin, insight, swift, titan (ELIXIRS order)
  elixirs: [
    { baseLevel: 4, gold: 50000 }, { baseLevel: 5, gold: 150000 }, { baseLevel: 5, gold: 220000 },
    { baseLevel: 5, gold: 720000 }, { baseLevel: 13, slimeKings: 3, gold: 1000000 },
  ],
  // the 4th opens with the last creature (CREATURES need, base level 10)
  stalls: [{ baseLevel: 4, gold: 150000 }, { baseLevel: 6, gold: 600000 }, { baseLevel: 8, gold: 1000000 }, { baseLevel: 10, gold: 2000000 }],
  // threshold potions (ROOM_POTIONS order): +2, +3, +5 battles in the secret rooms
  roomPotions: [{ baseLevel: 6, gold: 100000 }, { baseLevel: 9, gold: 1000000 }, { baseLevel: 12, slimeKings: 2, gold: 3000000 }],
  // laboratory alembics after the first (free): LAB_SLOTS - 1 of them
  labSlots: [{ baseLevel: 6, gold: 720000 }, { baseLevel: 10, slimeKings: 2, gold: 1200000 }],
};
export const UNLOCK_KINDS = Object.keys(UNLOCK_PRICES);

function emptyOwned() {
  return Object.fromEntries(UNLOCK_KINDS.map((k) => [k, 0]));
}

/** How many of a kind are bought (0..UNLOCK_PRICES[kind].length). */
export const ownedCount = (farm, kind) => Math.max(0, Math.min(UNLOCK_PRICES[kind]?.length ?? 0, Math.trunc(farm?.owned?.[kind] ?? 0)));
/** Is the `index`-th one of a kind bought? */
export const isOwned = (farm, kind, index) => index >= 0 && index < ownedCount(farm, kind);
const ownedId = (farm, kind, list, id) => isOwned(farm, kind, list.findIndex((x) => x.id === id));

/** Price of the next one of a kind ({ baseLevel, gold }), or null when all are bought. */
export const nextUnlockPrice = (farm, kind) => UNLOCK_PRICES[kind]?.[ownedCount(farm, kind)] ?? null;

/** Can the next one of a kind be bought? 'ok' | 'max' | 'level' (base level or Slime Kings too low) | 'gold'. */
export function unlockBuyStatus(farm, kind, gold, baseLevel, slimeWins = 0) {
  const price = nextUnlockPrice(farm, kind);
  if (!price) return 'max';
  if (!plotNeedMet(price, baseLevel, slimeWins)) return 'level';
  if (gold < price.gold) return 'gold';
  return 'ok';
}

/** Sets how many of a kind are bought; a newly bought vein starts digging at `now`. */
function setOwned(farm, kind, n, now) {
  const owned = Math.max(0, Math.min(UNLOCK_PRICES[kind].length, n));
  const before = ownedCount(farm, kind);
  let f = { ...farm, owned: { ...emptyOwned(), ...farm.owned, [kind]: owned } };
  if (kind === 'veins' && owned > before) {
    const at = { ...f.mine.at };
    for (const m of MATERIALS.slice(before, owned)) at[m.id] = now;
    f = { ...f, mine: { ...f.mine, at } };
  }
  return f;
}

/** Unlocks the next one of a kind (the caller takes nextUnlockPrice(farm, kind).gold from the run). */
export function buyUnlock(farm, kind, now) {
  if (!nextUnlockPrice(farm, kind)) return farm;
  return setOwned(farm, kind, ownedCount(farm, kind) + 1, now);
}

/** What saves from before the unlocks already had: everything they used, have in stock or had open. */
export function ownedFromOldSave(farm) {
  const used = (list, ids) => list.reduce((n, x, i) => (ids.has(x.id) || itemCount(farm, x.id) > 0 ? i + 1 : n), 0);
  const planted = new Set((farm.plots ?? []).filter(Boolean).map((x) => x.crop));
  return {
    crops: used(CROPS, planted),
    veins: mineMaterials(farm.mine?.level ?? 1).length,
    potions: used(POTIONS, new Set()),
    elixirs: used(ELIXIRS, new Set(farmLabs(farm).filter(Boolean).map((l) => l.elixir))),
    stalls: (farm.stable ?? []).length,
    labSlots: 0,
    roomPotions: 0,
  };
}

/**
 * Cheat: every one (true) or none (false) of these kinds bought. Stalls no longer owned free their
 * creature, and the creatures are all found (true) or forgotten (false); locked crops, recipes and
 * veins just stop being usable.
 */
export function cheatSetOwned(farm, kinds, all, now) {
  let f = farm;
  for (const kind of kinds) f = setOwned(f, kind, all ? UNLOCK_PRICES[kind].length : 0, now);
  if (kinds.includes('stalls')) {
    f = { ...f, stable: (f.stable ?? []).slice(0, ownedCount(f, 'stalls')) };
    f = { ...f, found: all ? CREATURES.map((c) => c.id) : f.stable.map((st) => st.creature) };
  }
  return f;
}

export const itemCount = (farm, id) => farm?.items?.[id] ?? 0;

function addItems(farm, delta) {
  const items = { ...farm.items };
  for (const [id, n] of Object.entries(delta)) items[id] = Math.max(0, (items[id] ?? 0) + n);
  return { ...farm, items };
}

export function canAfford(farm, cost) {
  return Object.entries(cost).every(([id, n]) => itemCount(farm, id) >= n);
}

const pay = (farm, cost) => addItems(farm, Object.fromEntries(Object.entries(cost).map(([id, n]) => [id, -n])));

/* ---------------- stable passives ---------------- */

function passiveProduct(farm, key) {
  let m = 1;
  for (const c of farm?.stable ?? []) {
    if (onStrike(c)) continue;
    const v = farmDef(c.creature)?.passive?.[key];
    if (v) m *= v;
  }
  return m;
}
/** Crop growth time multiplier (Moon Moth). */
export const cropTimeMult = (farm) => passiveProduct(farm, 'cropTime');
/** Mine production speed multiplier (Specter Mole). */
export const mineSpeed = (farm) => passiveProduct(farm, 'mineSpeed');
/** Elixir brewing time multiplier (Arcane Owl). */
export const labTimeMult = (farm) => passiveProduct(farm, 'labTime');

/* ---------------- garden ---------------- */

/** 'empty' | 'growing' | 'ready', with progress 0..1 and ms left. `timeMult`: cropTimeMult(farm). */
export function plotState(plot, now, timeMult = 1) {
  if (!plot) return { status: 'empty', progress: 0, left: 0 };
  const time = farmDef(plot.crop).time * timeMult;
  const elapsed = now - plot.plantedAt;
  if (elapsed >= time) return { status: 'ready', progress: 1, left: 0 };
  return { status: 'growing', progress: Math.max(0, elapsed / time), left: time - elapsed };
}

/** Plots bought so far (0..PLOT_COUNT). */
export const plotsOwned = (farm) => Math.max(0, Math.min(PLOT_COUNT, farm?.plotsOwned ?? 0));

/** Price of the next plot ({ baseLevel, gold }), or null when every plot is owned. */
export const nextPlotPrice = (farm) => PLOT_PRICES[plotsOwned(farm)] ?? null;

/**
 * Can the next plot be bought? 'ok' | 'max' (all owned) | 'level' (base level or Slime King
 * victories too low) | 'gold'.
 */
export function plotBuyStatus(farm, gold, baseLevel, slimeWins = 0) {
  const price = nextPlotPrice(farm);
  if (!price) return 'max';
  if (!plotNeedMet(price, baseLevel, slimeWins)) return 'level';
  if (gold < price.gold) return 'gold';
  return 'ok';
}

/** Unlocks the next plot (the caller takes nextPlotPrice(farm).gold from the run). */
export function buyPlot(farm) {
  if (!nextPlotPrice(farm)) return farm;
  return { ...farm, plotsOwned: plotsOwned(farm) + 1 };
}

/**
 * Plants a crop on an empty owned plot, paying its seed (needs `gold` >= farmSeedCost; `ctx`:
 * { baseLevel, slimeWins } for the price).
 */
export function plant(farm, plotIndex, cropId, now, gold = Infinity, ctx = {}) {
  if (!ownedId(farm, 'crops', CROPS, cropId) || plotIndex >= plotsOwned(farm) || farm.plots[plotIndex]) return farm;
  const cost = farmSeedCost(farm, cropId, { ...ctx, gold });
  if (gold < cost) return farm;
  const plots = farm.plots.slice();
  plots[plotIndex] = { crop: cropId, plantedAt: now };
  return payGold({ ...farm, plots }, cost, 'goldSeeds');
}

/**
 * Harvests a ready plot; with autoReplant on, the same crop is planted again right away when
 * `gold` pays its seed (farmSeedCost with `ctx`; otherwise the plot is left empty).
 */
export function harvest(farm, plotIndex, now, gold = Infinity, ctx = {}) {
  const plot = farm.plots[plotIndex];
  if (!plot || plotState(plot, now, cropTimeMult(farm)).status !== 'ready') return farm;
  const plots = farm.plots.slice();
  const cost = farmSeedCost(farm, plot.crop, { ...ctx, gold });
  const replant = farm.autoReplant && ownedId(farm, 'crops', CROPS, plot.crop) && gold >= cost;
  plots[plotIndex] = replant ? { crop: plot.crop, plantedAt: now } : null;
  const f = bumpStat(addItems({ ...farm, plots }, { [plot.crop]: farmDef(plot.crop).yield }), 'harvested', farmDef(plot.crop).yield);
  return replant ? payGold(f, cost, 'goldSeeds') : f;
}

/** Digs up a planted crop (growing or ready) without harvesting it. */
export function removePlant(farm, plotIndex) {
  if (!farm.plots[plotIndex]) return farm;
  const plots = farm.plots.slice();
  plots[plotIndex] = null;
  return { ...farm, plots };
}

/**
 * Auto replant unlocks with the shared base level (progression/characters.js): it needs more than
 * 25, i.e. at least AUTO_REPLANT_MIN_BASE.
 */
export const AUTO_REPLANT_MIN_BASE = 26;
export const autoReplantUnlocked = (baseLevel) => baseLevel >= AUTO_REPLANT_MIN_BASE;

/** Turns auto replant on or off; it can only be turned on once unlocked by the base level. */
export function setAutoReplant(farm, on, baseLevel = Infinity) {
  if (on && !autoReplantUnlocked(baseLevel)) return farm;
  return { ...farm, autoReplant: !!on };
}

/** "Harvest all" unlocks with the shared base level (progression/characters.js). */
export const HARVEST_ALL_MIN_BASE = 16;
export const harvestAllUnlocked = (baseLevel) => baseLevel >= HARVEST_ALL_MIN_BASE;

/** Harvests every ready plot (the "Harvest all" button needs harvestAllUnlocked; stable harvesters do not). */
export function harvestAll(farm, now, gold = Infinity, ctx = {}) {
  let f = farm;
  for (let i = 0; i < f.plots.length; i += 1) f = harvest(f, i, now, gold - spentSince(f, farm), ctx);
  return f;
}

/* ---------------- mine ---------------- */

/** Starts the clock of every one of the first `veins` veins that has none yet. */
function veinTimes(at, veins, now) {
  const out = { ...at };
  for (const m of openVeins(veins)) if (!Number.isFinite(out[m.id])) out[m.id] = now;
  return out;
}

/** Loads a saved mine: old saves (oreAt/crystalAt) move to `at`; veins with no clock start now. */
export function normalizeMine(raw, now = Date.now()) {
  const level = Math.min(MINE_MAX_LEVEL, Math.max(1, Math.trunc(raw?.level) || 1));
  const at = { ...(raw?.at && typeof raw.at === 'object' ? raw.at : {}) };
  if (!Number.isFinite(at.iron_ore) && Number.isFinite(raw?.oreAt)) at.iron_ore = raw.oreAt;
  if (!Number.isFinite(at.dark_crystal) && Number.isFinite(raw?.crystalAt)) at.dark_crystal = raw.crystalAt;
  return { level, at: veinTimes(at, MATERIALS.length, now) };
}

/** Production start of a vein (old saves kept only iron/crystal, as oreAt/crystalAt). */
function veinAt(mine, id) {
  const at = mine.at?.[id];
  if (Number.isFinite(at)) return at;
  if (id === 'dark_crystal' && Number.isFinite(mine.crystalAt)) return mine.crystalAt;
  return Number.isFinite(mine.oreAt) ? mine.oreAt : 0;
}

/** Seconds per unit and storage of every open vein (the first `veins`). `speed`: mineSpeed(farm). */
export function mineRates(level, speed = 1, veins = MATERIALS.length) {
  return Object.fromEntries(openVeins(veins).map((m) => [m.id, { seconds: m.seconds / level / speed, cap: Math.floor((MINE_STORAGE_PER_LEVEL * level) / m.capDiv) }]));
}

/** Materials waiting to be collected (capped by storage), per open vein. */
export function mineStored(mine, now, speed = 1, veins = MATERIALS.length) {
  return Object.fromEntries(Object.entries(mineRates(mine.level, speed, veins)).map(([id, { seconds, cap }]) => (
    [id, Math.min(cap, Math.max(0, Math.floor((now - veinAt(mine, id)) / 1000 / seconds)))]
  )));
}

/**
 * Gold of the run to haul `units` of a material out of a mine of `level` with `cap` storage:
 * units x the material's haul price x depth (+MINE_HAUL_DEPTH per level above 1), less a bulk
 * discount of up to MINE_HAUL_BULK as the storage fills (waiting is cheaper, but a full vein stops).
 */
export function mineHaulCost(id, units, level, cap) {
  const m = farmDef(id);
  if (!m?.haul || units <= 0) return 0;
  const depth = 1 + MINE_HAUL_DEPTH * (level - 1);
  const bulk = 1 - MINE_HAUL_BULK * Math.min(1, units / Math.max(1, cap));
  return Math.ceil(units * m.haul * depth * bulk);
}

/** Haul cost of what every open vein has stored now: { [id]: gold, total }. */
export function mineCollectCost(farm, now) {
  const veins = ownedCount(farm, 'veins');
  const r = mineRates(farm.mine.level, mineSpeed(farm), veins);
  const s = mineStored(farm.mine, now, mineSpeed(farm), veins);
  const out = { total: 0 };
  for (const [id, { cap }] of Object.entries(r)) {
    out[id] = mineHaulCost(id, s[id], farm.mine.level, cap);
    out.total += out[id];
  }
  return out;
}

/**
 * Collects the mine (every open vein, or only vein `only`), paying the haul with the run's `gold`:
 * nothing is collected unless it covers the whole haul. Keeps the partial progress of the next
 * unit unless storage was full.
 */
export function collectMine(farm, now, gold = Infinity, only = null) {
  const veins = ownedCount(farm, 'veins');
  const r = mineRates(farm.mine.level, mineSpeed(farm), veins);
  const s = mineStored(farm.mine, now, mineSpeed(farm), veins);
  const ids = Object.keys(r).filter((id) => (only == null || id === only) && s[id] > 0);
  const cost = ids.reduce((n, id) => n + mineHaulCost(id, s[id], farm.mine.level, r[id].cap), 0);
  if (!ids.length || gold < cost) return farm;
  const at = { ...farm.mine.at };
  const got = {};
  for (const id of ids) {
    const { seconds, cap } = r[id];
    at[id] = s[id] >= cap ? now : veinAt(farm.mine, id) + s[id] * seconds * 1000;
    got[id] = s[id];
  }
  const { oreAt, crystalAt, ...mine } = farm.mine; // drop the old-save fields
  const hauled = Object.values(got).reduce((a, n) => a + n, 0);
  return payGold(bumpStat(addItems({ ...farm, mine: { ...mine, at } }, got), 'ores', hauled), cost, 'goldHaul');
}

export function canUpgradeMine(farm) {
  return farm.mine.level < MINE_MAX_LEVEL && canAfford(farm, mineUpgradeCost(farm.mine.level));
}

/**
 * Upgrading keeps what every vein has stored (still to be hauled, at the new depth): the clocks are
 * moved so the faster, bigger level shows the same units (only the next unit's progress is lost).
 */
export function upgradeMine(farm, now) {
  if (!canUpgradeMine(farm)) return farm;
  const veins = ownedCount(farm, 'veins');
  const s = mineStored(farm.mine, now, mineSpeed(farm), veins);
  const level = farm.mine.level + 1;
  const r = mineRates(level, mineSpeed(farm), veins);
  const at = { ...farm.mine.at };
  for (const [id, { seconds }] of Object.entries(r)) at[id] = now - s[id] * seconds * 1000;
  const { oreAt, crystalAt, ...mine } = farm.mine; // drop the old-save fields
  return { ...pay(farm, mineUpgradeCost(farm.mine.level)), mine: { ...mine, level, at } };
}

/* ---------------- cauldron (potions) ---------------- */

/** Milliseconds before the cauldron can brew this potion again (0 = ready; potions without recharge are always ready). */
export function potionRechargeLeft(farm, potionId, now) {
  const p = farmDef(potionId);
  const at = farm?.brewedAt?.[potionId];
  if (!p?.recharge || !Number.isFinite(at)) return 0;
  return Math.max(0, at + p.recharge - now);
}

export function brewPotion(farm, potionId, now = Date.now()) {
  const r = CAULDRON.find((x) => x.def.id === potionId);
  const p = r?.def;
  if (!p || !isOwned(farm, r.kind, r.index) || !canAfford(farm, p.cost) || potionRechargeLeft(farm, potionId, now) > 0) return farm;
  const f = bumpStat(addItems(pay(farm, p.cost), { [p.id]: 1 }), 'potions');
  return p.recharge ? { ...f, brewedAt: { ...f.brewedAt, [p.id]: now } } : f;
}

/* ---------------- laboratory (elixirs) ---------------- */

/** Laboratory alembics: the first is free, the others are bought (UNLOCK_PRICES.labSlots). */
export const LAB_SLOTS = 3;
/** Extra brew fee per alembic owned after the first (more alembics, dearer brewing). */
export const LAB_SLOT_FEE = 0.15;

/** Alembics the farm can use (1..LAB_SLOTS). */
export const labSlotsOwned = (farm) => 1 + ownedCount(farm, 'labSlots');

/** Every alembic (LAB_SLOTS long, null = idle); saves from before keep their single `lab` in the first. */
export function farmLabs(farm) {
  const labs = Array.isArray(farm?.labs) ? farm.labs.slice(0, LAB_SLOTS) : [];
  while (labs.length < LAB_SLOTS) labs.push(null);
  if (!labs[0] && farm?.lab) labs[0] = farm.lab;
  return labs.map((l) => (l && farmDef(l.elixir) && Number.isFinite(l.startedAt) ? l : null));
}

/** First idle alembic the farm owns, or -1. */
export const freeLabSlot = (farm) => farmLabs(farm).findIndex((l, i) => !l && i < labSlotsOwned(farm));

/** Writes the alembics back (and drops the old single `lab`). */
function withLabs(farm, labs) {
  const { lab, ...rest } = farm;
  return { ...rest, labs };
}

/** `timeMult`: labTimeMult(farm). */
export function labState(lab, now, timeMult = 1) {
  if (!lab) return { status: 'idle', progress: 0, left: 0 };
  const time = farmDef(lab.elixir).time * timeMult;
  const elapsed = now - lab.startedAt;
  if (elapsed >= time) return { status: 'ready', progress: 1, left: 0 };
  return { status: 'brewing', progress: elapsed / time, left: time - elapsed };
}

/** Gold an elixir costs to brew now (scaledGoldPrice of its fee; `ctx`: { baseLevel, slimeWins, gold }). */
export const brewFee = (elixirId, ctx = {}) => Math.round(scaledGoldPrice(farmDef(elixirId)?.fee ?? 0, ctx) * (1 + LAB_SLOT_FEE * Math.max(0, (ctx.labSlots ?? 1) - 1)));

/** Brew fee on this farm (its alembics count). */
export const farmBrewFee = (farm, elixirId, ctx = {}) => brewFee(elixirId, { ...ctx, labSlots: labSlotsOwned(farm) });

/**
 * Starts brewing an elixir in the first idle alembic: pays its ingredients and its fee in run gold
 * (`gold` must cover farmBrewFee; added to farm.seedSpent like the seeds).
 */
export function startElixir(farm, elixirId, now, gold = Infinity, ctx = {}) {
  const e = ELIXIRS.find((x) => x.id === elixirId);
  const slot = freeLabSlot(farm);
  if (!e || !ownedId(farm, 'elixirs', ELIXIRS, elixirId) || slot < 0 || !canAfford(farm, e.cost)) return farm;
  const fee = farmBrewFee(farm, elixirId, { ...ctx, gold });
  if (gold < fee) return farm;
  const labs = farmLabs(farm);
  labs[slot] = { elixir: e.id, startedAt: now };
  return payGold(withLabs(pay(farm, e.cost), labs), fee, 'goldBrew');
}

/** Collects every ready alembic (or only alembic `slot`). */
export function collectElixir(farm, now, slot = null) {
  const mult = labTimeMult(farm);
  const labs = farmLabs(farm);
  const got = {};
  labs.forEach((l, i) => {
    if (!l || (slot != null && i !== slot) || labState(l, now, mult).status !== 'ready') return;
    got[l.elixir] = (got[l.elixir] ?? 0) + 1;
    labs[i] = null;
  });
  if (!Object.keys(got).length) return farm;
  return bumpStat(addItems(withLabs(farm, labs), got), 'elixirs', Object.values(got).reduce((a, n) => a + n, 0));
}

/* ---------------- stable ---------------- */

export function ownsCreature(farm, id) {
  return (farm?.stable ?? []).some((c) => c.creature === id);
}

/** Has the creature dropped from its boss yet (or is it already in the stable)? */
export function creatureFound(farm, id) {
  return !!farm?.found?.includes(id) || ownsCreature(farm, id);
}

/** Creature that map boss `bossId` can drop, or null. */
export const bossCreature = (bossId) => CREATURES.find((c) => c.drop.boss === bossId) ?? null;

/**
 * First win of a run over a map boss: rolls its creature if it was not found yet.
 * Returns { farm, creature } (creature = the id that dropped, or null).
 */
export function rollCreatureDrop(farm, bossId, rng) {
  const c = bossCreature(bossId);
  if (!c || creatureFound(farm, c.id) || rng.next() >= c.drop.chance) return { farm, creature: null };
  return { farm: { ...farm, found: [...(farm.found ?? []), c.id] }, creature: c.id };
}

/**
 * 'ok' | 'unknown' (not dropped yet) | 'owned' | 'level' (base level or SK (different Slime Kings beaten) of
 * `need` too low) | 'full' | 'no-resources'
 */
export function adoptStatus(farm, id, baseLevel = Infinity, slimeWins = Infinity) {
  const c = CREATURES.find((x) => x.id === id);
  if (!c) return 'no-resources';
  if (ownsCreature(farm, id)) return 'owned';
  if (!creatureFound(farm, id)) return 'unknown';
  if (!plotNeedMet(c.need, baseLevel, slimeWins)) return 'level';
  if ((farm.stable ?? []).length >= ownedCount(farm, 'stalls')) return 'full';
  if (!canAfford(farm, c.cost)) return 'no-resources';
  return 'ok';
}

export function adoptCreature(farm, id, now, baseLevel = Infinity, slimeWins = Infinity) {
  if (adoptStatus(farm, id, baseLevel, slimeWins) !== 'ok') return farm;
  const c = CREATURES.find((x) => x.id === id);
  return { ...pay(farm, c.cost), stable: [...(farm.stable ?? []), { creature: id, lastAt: now, paidUntil: now }] };
}

/**
 * Cheat: adopts (true) or releases (false) every creature. Adopting finds them all, buys every stall
 * and fills the free ones in CREATURES order, free of cost, need and wages already due (only
 * STABLE_SLOTS fit); the ones already in the stable stay.
 */
export function cheatAdoptAll(farm, all, now) {
  if (!all) return { ...farm, stable: [] };
  const f = cheatSetOwned(farm, ['stalls'], true, now);
  const stable = (f.stable ?? []).slice();
  for (const c of CREATURES) {
    if (stable.length >= ownedCount(f, 'stalls')) break;
    if (!stable.some((st) => st.creature === c.id)) stable.push({ creature: c.id, lastAt: now, paidUntil: now });
  }
  return { ...f, stable };
}

/** Releases a creature (its stall is freed; no refund). */
export function releaseCreature(farm, index) {
  const stable = (farm.stable ?? []).slice();
  if (!stable[index]) return farm;
  stable.splice(index, 1);
  return { ...farm, stable };
}

/** Milliseconds until a working creature acts again (null for passives). */
export function creatureNextIn(stall, now) {
  const c = farmDef(stall.creature);
  if (!c?.every) return null;
  return c.every - ((now - stall.lastAt) % c.every);
}

/**
 * Runs every creature action due up to `now`, in time order, so harvests see the plots as
 * they were at that moment (works for long offline periods, up to STABLE_MAX_EVENTS actions).
 */
/**
 * Pays the wages due up to `now` (WAGE_PERIOD each, from `gold`, added to farm.seedSpent).
 * Returns { farm, workUntil } where workUntil[i] is how far stall i was paid to work.
 */
function payWages(farm, now, gold, ctx) {
  let f = farm;
  const workUntil = [];
  const stable = (farm.stable ?? []).map((stall, i) => {
    let paid = stall.paidUntil ?? stall.lastAt;
    let { lastAt } = stall;
    // a long absence: only the last WAGE_MAX_BACKPAY periods are paid and worked
    const oldest = now - WAGE_MAX_BACKPAY * WAGE_PERIOD;
    if (paid < oldest) {
      paid = oldest;
      lastAt = Math.max(lastAt, oldest);
    }
    while (paid <= now) {
      const left = gold - spentSince(f, farm);
      const wage = creatureWage(stall.creature, { ...ctx, gold: left });
      if (left < wage) break;
      f = { ...payGold(f, wage, 'goldWages'), wageSpent: (f.wageSpent ?? 0) + wage };
      paid += WAGE_PERIOD;
    }
    const striking = paid <= now;
    workUntil[i] = striking ? paid : now;
    return { ...stall, lastAt, paidUntil: paid, striking };
  });
  return { farm: { ...f, stable }, workUntil };
}

export function tickStable(farm, now, gold = Infinity, ctx = {}) {
  if (!(farm.stable ?? []).length) return farm;
  // nothing due (no wage, no action): the same farm, so the background tick saves nothing
  const idle = farm.stable.every((st) => {
    const every = farmDef(st.creature)?.every;
    return !st.striking && (st.paidUntil ?? st.lastAt) > now && (!every || st.lastAt + every > now);
  });
  if (idle) return farm;
  const paid = payWages(farm, now, gold, ctx);
  const stable = paid.farm.stable;
  const events = [];
  const cycles = stable.map(() => 0);
  stable.forEach((stall, i) => {
    const c = farmDef(stall.creature);
    if (!c?.every) return;
    for (let t = stall.lastAt + c.every; t <= paid.workUntil[i] && events.length < STABLE_MAX_EVENTS; t += c.every) {
      events.push({ t, i });
      cycles[i] += 1;
    }
  });
  events.sort((a, b) => a.t - b.t);
  let f = paid.farm;
  for (const { t, i } of events) {
    const c = farmDef(stable[i].creature);
    if (c.role === 'harvester') {
      let left = c.plots;
      for (let p = 0; p < f.plots.length && left > 0; p += 1) {
        if (plotState(f.plots[p], t, cropTimeMult(f)).status === 'ready') {
          f = bumpStat(harvest(f, p, t, gold - spentSince(f, farm), ctx), 'creatureWork');
          left -= 1;
        }
      }
    } else if (c.role === 'brewer') {
      const brewed = brewPotion(f, c.potion, t);
      f = brewed === f ? f : bumpStat(brewed, 'creatureWork');
    }
  }
  const capped = events.length >= STABLE_MAX_EVENTS;
  return {
    ...f,
    stable: stable.map((stall, i) => {
      // on strike: idle until paid again, starting from now (the strike is neither worked nor owed)
      if (stall.striking) return { ...stall, lastAt: now, paidUntil: now };
      const c = farmDef(stall.creature);
      if (!c?.every) return stall;
      return { ...stall, lastAt: capped ? now : stall.lastAt + cycles[i] * c.every };
    }),
  };
}

/* ---------------- using consumables in a run ---------------- */

/** Potions with a BP effect: restore Battle Points (never above the maximum). */
export function useBpPotion(farm, run, potionId) {
  const p = POTIONS.find((x) => x.id === potionId);
  if (!p || p.effect.kind !== 'bp' || itemCount(farm, potionId) < 1 || !run) return { farm, run };
  return {
    farm: addItems(farm, { [potionId]: -1 }),
    run: { ...run, battlesUsed: Math.max(0, run.battlesUsed - p.effect.amount) },
  };
}

/**
 * Drinks a threshold potion inside a secret room: its battles go to run.roomExtra, spent once the
 * room's own counter runs out (session.js finishBattle). `inRoom`: session.js inSecretRoom(run).
 */
export function useRoomPotion(farm, run, potionId, inRoom) {
  const p = ROOM_POTIONS.find((x) => x.id === potionId);
  if (!p || !run || !inRoom || run.roomPotionUsed || itemCount(farm, potionId) < 1) return { farm, run };
  return { farm: addItems(farm, { [potionId]: -1 }), run: { ...run, roomExtra: (run.roomExtra ?? 0) + p.effect.amount, roomPotionUsed: true } };
}

/** Drinks an elixir: adds (or refreshes) its buff on the run. */
export function drinkElixir(farm, run, elixirId) {
  const e = ELIXIRS.find((x) => x.id === elixirId);
  if (!e || itemCount(farm, elixirId) < 1 || !run) return { farm, run };
  const buffs = (run.buffs ?? []).filter((b) => b.id !== e.id);
  buffs.push({ id: e.id, battlesLeft: e.battles });
  return { farm: addItems(farm, { [elixirId]: -1 }), run: { ...run, buffs } };
}

/** Spends one of an item from the storehouse; null when there is none. */
export function spendItem(farm, id) {
  if (itemCount(farm, id) < 1) return null;
  return addItems(farm, { [id]: -1 });
}

/** Uses one healing potion (the battle queues a free full heal). */
export function spendHealingPotion(farm) {
  if (itemCount(farm, 'healing_potion') < 1) return null;
  return addItems(farm, { healing_potion: -1 });
}

/** Active buff effects of a run, merged ({ pct, mods }) for computeStats. */
export function runBuffEffects(run) {
  const pct = {};
  const mods = {};
  for (const b of run?.buffs ?? []) {
    const e = farmDef(b.id);
    if (!e || b.battlesLeft <= 0) continue;
    for (const [k, v] of Object.entries(e.buff.pct ?? {})) pct[k] = (pct[k] ?? 0) + v;
    for (const [k, v] of Object.entries(e.buff.mods ?? {})) mods[k] = (mods[k] ?? 0) + v;
  }
  return { pct, mods };
}

/** One battle passed: every buff loses a charge; spent buffs are removed. */
export function tickBuffs(run) {
  if (!run?.buffs?.length) return run;
  return { ...run, buffs: run.buffs.map((b) => ({ ...b, battlesLeft: b.battlesLeft - 1 })).filter((b) => b.battlesLeft > 0) };
}

/** Stock every material reaches with cheatMaxOres. */
export const CHEAT_MAX_ORES = 9999;

/** Units of every material cheatAddOres adds. */
export const CHEAT_ORE_GIFT = 500;

/** Cheat: `amount` more of every mine material in the storehouse (the mine itself is left as it is). */
export function cheatAddOres(farm, amount = CHEAT_ORE_GIFT) {
  const items = { ...farm.items };
  for (const m of MATERIALS) items[m.id] = (items[m.id] ?? 0) + amount;
  return { ...farm, items };
}

/** Cheat: mine at its deepest with every vein's storage full, and a max stock of every material. */
export function cheatMaxOres(farm, now) {
  const level = MINE_MAX_LEVEL;
  const rates = mineRates(level, mineSpeed(farm), ownedCount(farm, 'veins'));
  const at = Object.fromEntries(Object.entries(rates).map(([id, { seconds, cap }]) => [id, now - cap * seconds * 1000]));
  const items = { ...farm.items };
  for (const m of MATERIALS) items[m.id] = Math.max(items[m.id] ?? 0, CHEAT_MAX_ORES);
  return { ...farm, mine: { level, at }, items };
}

/** Cheat: sets how many garden plots are owned (0..PLOT_COUNT); plots no longer owned lose their crop. */
export function cheatSetPlotsOwned(farm, n) {
  const owned = Math.max(0, Math.min(PLOT_COUNT, n));
  const plots = farm.plots.map((p, i) => (i < owned ? p : null));
  return { ...farm, plots, plotsOwned: owned };
}

/** Cheat: finish every timer and add a stack of every crop and material. */
export function cheatFarm(farm, now) {
  const plots = farm.plots.map((p) => (p ? { ...p, plantedAt: now - farmDef(p.crop).time } : p));
  const stable = (farm.stable ?? []).map((st) => ({ ...st }));
  const labs = farmLabs(farm).map((l) => (l ? { ...l, startedAt: now - farmDef(l.elixir).time } : l));
  const delta = Object.fromEntries([...CROPS, ...MATERIALS].map((x) => [x.id, 20]));
  return addItems(withLabs({ ...farm, plots, stable }, labs), delta);
}
