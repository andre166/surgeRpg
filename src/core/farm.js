/**
 * Farm (not in the original game): a parallel, account-wide progression that keeps
 * producing in real time, even while the game is closed. Dark-fantasy themed.
 *
 *   Corrupted Garden - up to 8 plots, bought with gold (PLOT_PRICES), 6 crops (2, 5 and 15
 *                      minutes) -> herbs and mushrooms,
 *                      brewed at the cauldron into potions and consumables.
 *   Abandoned Mine   - automatic production of ores and crystals (level-based rate and
 *                      storage); materials for the Forge (crafting.js) and mine upgrades.
 *   Laboratory       - one brewing slot; timed elixirs that give temporary buffs
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
 * shared base level (bosses beaten, progression/characters.js) is high enough.
 * PLOT_PRICES[i] is the price of the (i + 1)-th plot.
 */
export const PLOT_PRICES = [
  { baseLevel: 1, gold: 2000 },
  { baseLevel: 2, gold: 10000 },
  { baseLevel: 3, gold: 50000 },
  { baseLevel: 4, gold: 250000 },
  { baseLevel: 5, gold: 1000000 },
  { baseLevel: 6, gold: 5000000 },
  { baseLevel: 8, gold: 25000000 },
  { baseLevel: 10, gold: 100000000 },
];

/** Six crops: two per growth time. */
export const CROPS = [
  { id: 'shade_herb', kind: 'herb', time: 2 * MIN, yield: 3 },
  { id: 'pale_mushroom', kind: 'mushroom', time: 2 * MIN, yield: 2 },
  { id: 'bloodroot', kind: 'herb', time: 5 * MIN, yield: 3 },
  { id: 'moon_cap', kind: 'mushroom', time: 5 * MIN, yield: 3 },
  { id: 'ruin_bloom', kind: 'herb', time: 15 * MIN, yield: 2 },
  { id: 'abyss_truffle', kind: 'mushroom', time: 15 * MIN, yield: 2 },
];

/**
 * Mine materials: production time (seconds per unit at level 1, divided by the level),
 * storage divisor (storage = MINE_STORAGE_PER_LEVEL * level / capDiv), the mine level that
 * opens the vein, and how each works as a Forge ingredient (stat + percent).
 */
export const MATERIALS = [
  { id: 'iron_ore', seconds: 60, capDiv: 1, unlock: 1, forge: { stat: 'def', pct: 0.03 } },
  { id: 'dark_crystal', seconds: 300, capDiv: 5, unlock: 1, forge: { stat: 'atk', pct: 0.05 } },
  { id: 'ember_coal', seconds: 90, capDiv: 1, unlock: 2, forge: { stat: 'speed', pct: 0.03 } },
  { id: 'bone_silver', seconds: 150, capDiv: 2, unlock: 2, forge: { stat: 'luck', pct: 0.04 } },
  { id: 'bloodstone', seconds: 240, capDiv: 3, unlock: 3, forge: { stat: 'hp', pct: 0.05 } },
  { id: 'void_obsidian', seconds: 360, capDiv: 4, unlock: 4, forge: { stat: 'def', pct: 0.06 } },
  { id: 'soul_amber', seconds: 600, capDiv: 6, unlock: 5, forge: { stat: 'atk', pct: 0.08 } },
];

export const MINE_MAX_LEVEL = 5;
/** Storage per level before production stops (divided by each material's capDiv). */
export const MINE_STORAGE_PER_LEVEL = 30;

/**
 * Veins the old mine opened at a level (`unlock`); veins are bought now (UNLOCK_PRICES.veins), this
 * only tells old saves which veins they already had.
 */
export const mineMaterials = (level) => MATERIALS.filter((m) => m.unlock <= level);

/** Materials of the first `veins` veins (the bought ones, in MATERIALS order). */
const openVeins = (veins) => MATERIALS.slice(0, Math.max(0, veins));

/** Iron and crystals, plus some of the veins opened at the previous levels. */
const UPGRADE_EXTRA = { 2: { ember_coal: 10, bone_silver: 5 }, 3: { ember_coal: 10, bloodstone: 5 }, 4: { bloodstone: 5, void_obsidian: 4 } };

export function mineUpgradeCost(level) {
  return { iron_ore: 20 * level, dark_crystal: 3 * level, ...UPGRADE_EXTRA[level] };
}

/** Cauldron (garden): instant potions and consumables used during a run. */
export const POTIONS = [
  { id: 'healing_potion', cost: { shade_herb: 3, pale_mushroom: 1 }, effect: { kind: 'battleHeal' } },
  { id: 'vigor_tonic', cost: { bloodroot: 2, moon_cap: 2 }, effect: { kind: 'bp', amount: 3 } },
  { id: 'ruin_draught', cost: { ruin_bloom: 1, abyss_truffle: 1, shade_herb: 2 }, effect: { kind: 'bp', amount: 8 } },
];

/** Laboratory: timed elixirs that buff the run for a number of battles. */
export const ELIXIRS = [
  { id: 'fury_elixir', time: 3 * MIN, cost: { bloodroot: 2, dark_crystal: 1 }, buff: { pct: { atk: 0.3 } }, battles: 10 },
  { id: 'stoneskin_elixir', time: 3 * MIN, cost: { moon_cap: 2, iron_ore: 3 }, buff: { pct: { def: 0.3 } }, battles: 10 },
  { id: 'insight_elixir', time: 6 * MIN, cost: { ruin_bloom: 1, abyss_truffle: 1, dark_crystal: 2 }, buff: { mods: { expMultiplier: 0.5 } }, battles: 10 },
];

/**
 * Stable: creatures adopted with farm resources (each species once). They are tamed things of the
 * Mythos (names in i18n farm.cr.*, sprites in src/ui/stableArt.js); the ids are kept from the first
 * version so saves keep working.
 */
export const STABLE_SLOTS = 4;
export const CREATURES = [
  // harvesters: every `every` ms, harvest up to `plots` ready plots (auto replant applies)
  { id: 'abyss_slug', role: 'harvester', every: 5 * MIN, plots: 1, cost: { shade_herb: 5, pale_mushroom: 3 } },
  { id: 'grave_crow', role: 'harvester', every: 8 * MIN, plots: 2, cost: { bloodroot: 4, moon_cap: 4, iron_ore: 5 } },
  // brewers: every `every` ms, brew one `potion` at the cauldron if the ingredients are in stock
  { id: 'imp_alchemist', role: 'brewer', every: 10 * MIN, potion: 'healing_potion', cost: { shade_herb: 6, dark_crystal: 2 } },
  { id: 'bog_toad', role: 'brewer', every: 15 * MIN, potion: 'vigor_tonic', cost: { bloodroot: 3, moon_cap: 3, dark_crystal: 2 } },
  // passives: always on while in the stable
  { id: 'moon_moth', role: 'passive', passive: { cropTime: 0.8 }, cost: { ruin_bloom: 2, abyss_truffle: 2 } },
  { id: 'specter_mole', role: 'passive', passive: { mineSpeed: 1.3 }, cost: { iron_ore: 15, dark_crystal: 3 } },
  { id: 'arcane_owl', role: 'passive', passive: { labTime: 0.75 }, cost: { abyss_truffle: 2, dark_crystal: 4 } },
];
/** Safety cap on creature actions simulated in one catch-up (long offline periods). */
export const STABLE_MAX_EVENTS = 500;

const BY_ID = Object.fromEntries([...CROPS, ...MATERIALS, ...POTIONS, ...ELIXIRS, ...CREATURES].map((x) => [x.id, x]));
export const farmDef = (id) => BY_ID[id] ?? null;

export function createFarm(now = Date.now()) {
  return {
    plots: new Array(PLOT_COUNT).fill(null), // { crop, plantedAt }
    plotsOwned: 0, // plots bought so far: plots[0 .. plotsOwned - 1] can be planted
    owned: emptyOwned(), // kind -> how many of UNLOCK_PRICES[kind] are bought (in order)
    mine: { level: 1, at: {} }, // at: material id -> production start (set when the vein is bought)
    lab: null, // { elixir, startedAt }
    items: {}, // id -> count (crops, materials, potions, elixirs)
    autoReplant: false, // harvesting replants the same crop right away
    stable: [], // [{ creature, lastAt }] (up to STABLE_SLOTS)
  };
}

/* ---------------- unlocks (bought with gold + base level) ---------------- */

/**
 * Like the plots, crops, mine veins, potion and elixir recipes and stable stalls start locked: each
 * one is bought, in order, with the run's gold once the shared base level is high enough.
 * UNLOCK_PRICES[kind][i] is the price of the (i + 1)-th one.
 */
export const UNLOCK_PRICES = {
  crops: [
    { baseLevel: 1, gold: 1000 }, { baseLevel: 1, gold: 3000 }, { baseLevel: 2, gold: 15000 },
    { baseLevel: 3, gold: 60000 }, { baseLevel: 5, gold: 300000 }, { baseLevel: 7, gold: 1500000 },
  ],
  veins: [
    { baseLevel: 1, gold: 2000 }, { baseLevel: 2, gold: 8000 }, { baseLevel: 3, gold: 40000 },
    { baseLevel: 4, gold: 200000 }, { baseLevel: 6, gold: 1000000 }, { baseLevel: 8, gold: 5000000 },
    { baseLevel: 11, gold: 25000000 },
  ],
  potions: [{ baseLevel: 1, gold: 3000 }, { baseLevel: 3, gold: 30000 }, { baseLevel: 6, gold: 600000 }],
  elixirs: [{ baseLevel: 2, gold: 20000 }, { baseLevel: 4, gold: 200000 }, { baseLevel: 7, gold: 3000000 }],
  stalls: [{ baseLevel: 2, gold: 25000 }, { baseLevel: 4, gold: 250000 }, { baseLevel: 7, gold: 2500000 }, { baseLevel: 10, gold: 30000000 }],
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

/** Can the next one of a kind be bought? 'ok' | 'max' | 'level' (base level too low) | 'gold'. */
export function unlockBuyStatus(farm, kind, gold, baseLevel) {
  const price = nextUnlockPrice(farm, kind);
  if (!price) return 'max';
  if (baseLevel < price.baseLevel) return 'level';
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
    elixirs: used(ELIXIRS, new Set(farm.lab ? [farm.lab.elixir] : [])),
    stalls: (farm.stable ?? []).length,
  };
}

/**
 * Cheat: every one (true) or none (false) of these kinds bought. Stalls no longer owned free their
 * creature; locked crops, recipes and veins just stop being usable.
 */
export function cheatSetOwned(farm, kinds, all, now) {
  let f = farm;
  for (const kind of kinds) f = setOwned(f, kind, all ? UNLOCK_PRICES[kind].length : 0, now);
  if (kinds.includes('stalls')) f = { ...f, stable: (f.stable ?? []).slice(0, ownedCount(f, 'stalls')) };
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

/** Can the next plot be bought? 'ok' | 'max' (all owned) | 'level' (base level too low) | 'gold'. */
export function plotBuyStatus(farm, gold, baseLevel) {
  const price = nextPlotPrice(farm);
  if (!price) return 'max';
  if (baseLevel < price.baseLevel) return 'level';
  if (gold < price.gold) return 'gold';
  return 'ok';
}

/** Unlocks the next plot (the caller takes nextPlotPrice(farm).gold from the run). */
export function buyPlot(farm) {
  if (!nextPlotPrice(farm)) return farm;
  return { ...farm, plotsOwned: plotsOwned(farm) + 1 };
}

export function plant(farm, plotIndex, cropId, now) {
  if (!ownedId(farm, 'crops', CROPS, cropId) || plotIndex >= plotsOwned(farm) || farm.plots[plotIndex]) return farm;
  const plots = farm.plots.slice();
  plots[plotIndex] = { crop: cropId, plantedAt: now };
  return { ...farm, plots };
}

/** Harvests a ready plot; with autoReplant on, the same crop is planted again right away. */
export function harvest(farm, plotIndex, now) {
  const plot = farm.plots[plotIndex];
  if (!plot || plotState(plot, now, cropTimeMult(farm)).status !== 'ready') return farm;
  const plots = farm.plots.slice();
  plots[plotIndex] = farm.autoReplant && ownedId(farm, 'crops', CROPS, plot.crop) ? { crop: plot.crop, plantedAt: now } : null;
  return addItems({ ...farm, plots }, { [plot.crop]: farmDef(plot.crop).yield });
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
export function harvestAll(farm, now) {
  let f = farm;
  for (let i = 0; i < f.plots.length; i += 1) f = harvest(f, i, now);
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

/** Collects the mine; keeps the partial progress of the next unit unless storage was full. */
export function collectMine(farm, now) {
  const veins = ownedCount(farm, 'veins');
  const r = mineRates(farm.mine.level, mineSpeed(farm), veins);
  const s = mineStored(farm.mine, now, mineSpeed(farm), veins);
  const at = { ...farm.mine.at };
  for (const [id, { seconds, cap }] of Object.entries(r)) at[id] = s[id] >= cap ? now : veinAt(farm.mine, id) + s[id] * seconds * 1000;
  const { oreAt, crystalAt, ...mine } = farm.mine; // drop the old-save fields
  return addItems({ ...farm, mine: { ...mine, at } }, s);
}

export function canUpgradeMine(farm) {
  return farm.mine.level < MINE_MAX_LEVEL && canAfford(farm, mineUpgradeCost(farm.mine.level));
}

/** Upgrading collects first so no production is lost. */
export function upgradeMine(farm, now) {
  if (!canUpgradeMine(farm)) return farm;
  const f = pay(collectMine(farm, now), mineUpgradeCost(farm.mine.level));
  return { ...f, mine: { ...f.mine, level: f.mine.level + 1 } };
}

/* ---------------- cauldron (potions) ---------------- */

export function brewPotion(farm, potionId) {
  const p = POTIONS.find((x) => x.id === potionId);
  if (!p || !ownedId(farm, 'potions', POTIONS, potionId) || !canAfford(farm, p.cost)) return farm;
  return addItems(pay(farm, p.cost), { [p.id]: 1 });
}

/* ---------------- laboratory (elixirs) ---------------- */

/** `timeMult`: labTimeMult(farm). */
export function labState(lab, now, timeMult = 1) {
  if (!lab) return { status: 'idle', progress: 0, left: 0 };
  const time = farmDef(lab.elixir).time * timeMult;
  const elapsed = now - lab.startedAt;
  if (elapsed >= time) return { status: 'ready', progress: 1, left: 0 };
  return { status: 'brewing', progress: elapsed / time, left: time - elapsed };
}

export function startElixir(farm, elixirId, now) {
  const e = ELIXIRS.find((x) => x.id === elixirId);
  if (!e || !ownedId(farm, 'elixirs', ELIXIRS, elixirId) || farm.lab || !canAfford(farm, e.cost)) return farm;
  return { ...pay(farm, e.cost), lab: { elixir: e.id, startedAt: now } };
}

export function collectElixir(farm, now) {
  if (labState(farm.lab, now, labTimeMult(farm)).status !== 'ready') return farm;
  return addItems({ ...farm, lab: null }, { [farm.lab.elixir]: 1 });
}

/* ---------------- stable ---------------- */

export function ownsCreature(farm, id) {
  return (farm?.stable ?? []).some((c) => c.creature === id);
}

/** 'ok' | 'owned' | 'full' | 'no-resources' */
export function adoptStatus(farm, id) {
  const c = CREATURES.find((x) => x.id === id);
  if (!c) return 'no-resources';
  if (ownsCreature(farm, id)) return 'owned';
  if ((farm.stable ?? []).length >= ownedCount(farm, 'stalls')) return 'full';
  if (!canAfford(farm, c.cost)) return 'no-resources';
  return 'ok';
}

export function adoptCreature(farm, id, now) {
  if (adoptStatus(farm, id) !== 'ok') return farm;
  const c = CREATURES.find((x) => x.id === id);
  return { ...pay(farm, c.cost), stable: [...(farm.stable ?? []), { creature: id, lastAt: now }] };
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
export function tickStable(farm, now) {
  const stable = farm.stable ?? [];
  if (!stable.length) return farm;
  const events = [];
  const cycles = stable.map(() => 0);
  stable.forEach((stall, i) => {
    const c = farmDef(stall.creature);
    if (!c?.every) return;
    for (let t = stall.lastAt + c.every; t <= now && events.length < STABLE_MAX_EVENTS; t += c.every) {
      events.push({ t, i });
      cycles[i] += 1;
    }
  });
  if (!events.length) return farm;
  events.sort((a, b) => a.t - b.t);
  let f = farm;
  for (const { t, i } of events) {
    const c = farmDef(stable[i].creature);
    if (c.role === 'harvester') {
      let left = c.plots;
      for (let p = 0; p < f.plots.length && left > 0; p += 1) {
        if (plotState(f.plots[p], t, cropTimeMult(f)).status === 'ready') {
          f = harvest(f, p, t);
          left -= 1;
        }
      }
    } else if (c.role === 'brewer') {
      f = brewPotion(f, c.potion);
    }
  }
  const capped = events.length >= STABLE_MAX_EVENTS;
  return {
    ...f,
    stable: stable.map((stall, i) => {
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

/** Drinks an elixir: adds (or refreshes) its buff on the run. */
export function drinkElixir(farm, run, elixirId) {
  const e = ELIXIRS.find((x) => x.id === elixirId);
  if (!e || itemCount(farm, elixirId) < 1 || !run) return { farm, run };
  const buffs = (run.buffs ?? []).filter((b) => b.id !== e.id);
  buffs.push({ id: e.id, battlesLeft: e.battles });
  return { farm: addItems(farm, { [elixirId]: -1 }), run: { ...run, buffs } };
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
  const lab = farm.lab ? { ...farm.lab, startedAt: now - farmDef(farm.lab.elixir).time } : null;
  const delta = Object.fromEntries([...CROPS, ...MATERIALS].map((x) => [x.id, 20]));
  return addItems({ ...farm, plots, lab, stable }, delta);
}
