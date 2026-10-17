import { describe, it, expect } from 'vitest';
import {
  createFarm as newFarm, CROPS, PLOT_COUNT, PLOT_PRICES, plotsOwned, nextPlotPrice, plotBuyStatus, buyPlot, plant, plotState, harvest, harvestAll, mineStored, collectMine, upgradeMine, canUpgradeMine,
  brewPotion, startElixir, labState, collectElixir, useBpPotion, drinkElixir, runBuffEffects, tickBuffs, itemCount, spendHealingPotion,
  removePlant, setAutoReplant, adoptCreature, adoptStatus, releaseCreature, tickStable, STABLE_SLOTS, cropTimeMult, mineSpeed, labTimeMult,
  MATERIALS, MINE_MAX_LEVEL, mineMaterials, mineUpgradeCost, normalizeMine, mineRates, cheatMaxOres, CHEAT_MAX_ORES,
  UNLOCK_KINDS, UNLOCK_PRICES, ownedCount, unlockBuyStatus, buyUnlock, cheatSetOwned, ownedFromOldSave,
} from '../core/farm.js';
import { oreGrid, ORE_SIZE } from '../ui/oreArt.js';
import { createProfile as newProfile, createRun } from '../core/persistence/profile.js';
import { cheatAccountOwned, ACCOUNT_UNLOCK_KINDS } from '../core/progression/unlocks.js';

// these tests work on an account with every echo rarity, talent tier, relic slot and class bought
const createProfile = () => ACCOUNT_UNLOCK_KINDS.reduce((p, k) => cheatAccountOwned(p, k, true), newProfile());
import { computeStats } from '../core/attributes/stats.js';
import { craft, materialIngredient, craftStatus } from '../core/crafting.js';
import { createBattle, queueFreeHeal, canQueueFreeHeal } from '../core/battle/engine.js';

const MIN = 60000;
// most tests work on a farm with every plot, crop, recipe and stall bought, and the first two veins
const createFarm = (now) => {
  const f = cheatSetOwned({ ...newFarm(now), plotsOwned: PLOT_COUNT }, UNLOCK_KINDS.filter((k) => k !== 'veins'), true, now);
  return buyUnlock(buyUnlock(f, 'veins', now), 'veins', now);
};
const VEINS = 2;
const T0 = 1_000_000;

describe('farm: corrupted garden', () => {
  it('8 plots and six crops of 2, 5 and 15 minutes', () => {
    expect(createFarm(T0).plots.length).toBe(PLOT_COUNT);
    expect(PLOT_COUNT).toBe(8);
    expect(CROPS.length).toBe(6);
    expect([...new Set(CROPS.map((c) => c.time / MIN))]).toEqual([2, 5, 15]);
  });
  it('plants, grows in real time and harvests the yield', () => {
    let f = plant(createFarm(T0), 0, 'shade_herb', T0);
    expect(plotState(f.plots[0], T0 + MIN).status).toBe('growing');
    expect(harvest(f, 0, T0 + MIN)).toBe(f); // not ready
    f = harvest(f, 0, T0 + 2 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(3);
    expect(f.plots[0]).toBeNull();
    f = plant(plant(f, 1, 'ruin_bloom', T0), 2, 'pale_mushroom', T0);
    f = harvestAll(f, T0 + 5 * MIN); // only the 2-minute crop is ready
    expect(itemCount(f, 'pale_mushroom')).toBe(2);
    expect(f.plots[1]).not.toBeNull();
  });
});

describe('farm: abandoned mine', () => {
  it('produces automatically up to its storage and keeps partial progress', () => {
    let f = createFarm(T0);
    expect(mineStored(f.mine, T0 + 150 * 1000, 1, VEINS)).toEqual({ iron_ore: 2, dark_crystal: 0 });
    f = collectMine(f, T0 + 150 * 1000);
    expect(itemCount(f, 'iron_ore')).toBe(2);
    expect(mineStored(f.mine, T0 + 180 * 1000, 1, VEINS).iron_ore).toBe(1); // the 30s already dug were kept
    expect(mineStored(createFarm(T0).mine, T0 + 10 * 3600 * 1000, 1, VEINS)).toEqual({ iron_ore: 30, dark_crystal: 6 }); // capped
  });
  it('upgrades with ores and crystals', () => {
    let f = createFarm(T0);
    expect(canUpgradeMine(f)).toBe(false);
    f = { ...f, items: { iron_ore: 20, dark_crystal: 3 } };
    f = upgradeMine(f, T0);
    expect(f.mine.level).toBe(2);
    expect(itemCount(f, 'iron_ore')).toBe(0);
  });
  it('veins are bought in order; each one starts digging when bought', () => {
    expect(mineMaterials(1).map((m) => m.id)).toEqual(['iron_ore', 'dark_crystal']);
    expect(UNLOCK_PRICES.veins).toHaveLength(MATERIALS.length);
    let f = { ...createFarm(T0), items: { iron_ore: 20, dark_crystal: 3 } };
    f = upgradeMine(f, T0 + 60 * MIN);
    f = buyUnlock(buyUnlock(f, 'veins', T0 + 60 * MIN), 'veins', T0 + 60 * MIN);
    const s = mineStored(f.mine, T0 + 60 * MIN + 90 * 1000, 1, ownedCount(f, 'veins'));
    expect(s.ember_coal).toBe(2); // 90s / level 2 = 45s each, counted from the purchase
    expect(s.bone_silver).toBe(1);
    expect(s.bloodstone).toBeUndefined();
    expect(mineUpgradeCost(2)).toMatchObject({ ember_coal: 10, bone_silver: 5 });
    for (const m of MATERIALS) expect(m.forge.pct).toBeGreaterThan(0);
  });
  it('loads old saves that kept only oreAt/crystalAt', () => {
    const m = normalizeMine({ level: 2, oreAt: T0, crystalAt: T0 + 1000 }, T0 + 5000);
    expect(m.at).toMatchObject({ iron_ore: T0, dark_crystal: T0 + 1000, ember_coal: T0 + 5000, bone_silver: T0 + 5000 });
    expect(m.oreAt).toBeUndefined();
    expect(mineStored(m, T0 + 31 * 1000).iron_ore).toBe(1);
  });
  it('cheat: max ores fills the deepest mine and the stock', () => {
    const f = cheatMaxOres(cheatSetOwned({ ...createFarm(T0), items: { iron_ore: 3 } }, ['veins'], true, T0), T0);
    expect(f.mine.level).toBe(MINE_MAX_LEVEL);
    for (const m of MATERIALS) expect(itemCount(f, m.id)).toBe(CHEAT_MAX_ORES);
    const s = mineStored(f.mine, T0);
    for (const [id, { cap }] of Object.entries(mineRates(MINE_MAX_LEVEL))) expect(s[id]).toBe(cap);
  });
  it('every material has a distinct pixel-art sprite', () => {
    const seen = new Set();
    for (const m of MATERIALS) {
      const g = oreGrid(m.id);
      expect(g).toHaveLength(ORE_SIZE);
      expect(g.flat().filter(Boolean).length).toBeGreaterThan(60);
      seen.add(JSON.stringify(g));
    }
    expect(seen.size).toBe(MATERIALS.length);
  });
});

describe('farm: cauldron, laboratory and buffs', () => {
  it('brews potions from crops and uses BP potions on the run', () => {
    let f = { ...createFarm(T0), items: { bloodroot: 2, moon_cap: 2 } };
    f = brewPotion(f, 'vigor_tonic');
    expect(itemCount(f, 'vigor_tonic')).toBe(1);
    expect(itemCount(f, 'bloodroot')).toBe(0);
    const run = { ...createRun({ characterIndex: 0, profile: createProfile() }), battlesUsed: 10 };
    const res = useBpPotion(f, run, 'vigor_tonic');
    expect(res.run.battlesUsed).toBe(7);
    expect(itemCount(res.farm, 'vigor_tonic')).toBe(0);
  });
  it('the laboratory brews one elixir at a time; elixirs buff the run for N battles', () => {
    let f = { ...createFarm(T0), items: { bloodroot: 4, dark_crystal: 2, moon_cap: 2, iron_ore: 3 } };
    f = startElixir(f, 'fury_elixir', T0);
    expect(startElixir(f, 'stoneskin_elixir', T0)).toBe(f); // alembic busy
    expect(labState(f.lab, T0 + MIN).status).toBe('brewing');
    f = collectElixir(f, T0 + 3 * MIN);
    expect(itemCount(f, 'fury_elixir')).toBe(1);
    let run = createRun({ characterIndex: 0, profile: createProfile() });
    ({ run } = drinkElixir(f, run, 'fury_elixir'));
    const buff = runBuffEffects(run);
    expect(buff.pct.atk).toBeCloseTo(0.3);
    const base = { hp: 100, atk: 100, def: 100, speed: 100, luck: 100 };
    expect(computeStats({ base, equipment: null, character: { index: 0 }, buff }).total.atk).toBeCloseTo(130);
    for (let i = 0; i < 10; i += 1) run = tickBuffs(run);
    expect(run.buffs).toEqual([]);
  });
  it('a healing potion queues a free heal in battle', () => {
    const f = spendHealingPotion({ ...createFarm(T0), items: { healing_potion: 1 } });
    expect(itemCount(f, 'healing_potion')).toBe(0);
    expect(spendHealingPotion(f)).toBeNull();
    const s = createBattle({ player: { hp: 10, maxHp: 10, atk: 1, def: 1, modifiers: {} }, enemy: { hp: 10, maxHp: 10, atk: 1, skills: [] }, gold: 0 });
    expect(canQueueFreeHeal(s)).toBe(true);
    expect(queueFreeHeal(s).healQueued).toBe(true);
  });
});

describe('farm materials in the Forge', () => {
  it('ores and crystals are crafting ingredients consumed from the farm stock', () => {
    const profile = { ...createProfile(), farm: { ...createFarm(T0), items: { dark_crystal: 3 } } };
    const run = createRun({ characterIndex: 0, profile });
    const picks = [materialIngredient('dark_crystal'), materialIngredient('dark_crystal'), materialIngredient('dark_crystal')];
    expect(craftStatus(run, picks, profile)).toBe('ok');
    const res = craft(run, profile, picks);
    expect(res.relic.bonus.atk).toBeCloseTo(0.05 * 3 * 1.25, 3);
    expect(itemCount(res.profile.farm, 'dark_crystal')).toBe(0);
  });
});

describe('farm: auto replant and remove', () => {
  it('auto replant plants the same crop again after harvesting', () => {
    let f = setAutoReplant(plant(createFarm(T0), 0, 'bloodroot', T0), true);
    f = harvestAll(f, T0 + 5 * MIN);
    expect(itemCount(f, 'bloodroot')).toBe(3);
    expect(f.plots[0]).toEqual({ crop: 'bloodroot', plantedAt: T0 + 5 * MIN });
    f = harvest(setAutoReplant(f, false), 0, T0 + 10 * MIN);
    expect(f.plots[0]).toBeNull();
  });
  it('removing a plant frees the plot without any harvest', () => {
    let f = plant(createFarm(T0), 3, 'ruin_bloom', T0);
    f = removePlant(f, 3);
    expect(f.plots[3]).toBeNull();
    expect(itemCount(f, 'ruin_bloom')).toBe(0);
    expect(removePlant(f, 3)).toBe(f);
  });
});

describe('farm: creature stable', () => {
  const rich = (f) => ({ ...f, items: { shade_herb: 50, pale_mushroom: 50, bloodroot: 50, moon_cap: 50, ruin_bloom: 50, abyss_truffle: 50, iron_ore: 50, dark_crystal: 50 } });
  it('adopts each species once, up to 4 stalls, paying farm resources', () => {
    let f = rich(createFarm(T0));
    f = adoptCreature(f, 'abyss_slug', T0);
    expect(itemCount(f, 'shade_herb')).toBe(45);
    expect(adoptStatus(f, 'abyss_slug')).toBe('owned');
    for (const id of ['grave_crow', 'imp_alchemist', 'bog_toad']) f = adoptCreature(f, id, T0);
    expect(f.stable.length).toBe(STABLE_SLOTS);
    expect(adoptStatus(f, 'moon_moth')).toBe('full');
    f = releaseCreature(f, 0);
    expect(f.stable.length).toBe(3);
  });
  it('Abyssal Slug harvests 1 ready plot every 5 minutes, also while away', () => {
    let f = adoptCreature(rich(createFarm(T0)), 'abyss_slug', T0);
    f = plant(plant(f, 0, 'shade_herb', T0), 1, 'shade_herb', T0);
    const herbs = itemCount(f, 'shade_herb');
    f = tickStable(f, T0 + 4 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(herbs); // not yet
    f = tickStable(f, T0 + 5 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(herbs + 3); // one plot
    f = tickStable(f, T0 + 10 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(herbs + 6); // the other one
    expect(f.plots.every((p) => p === null)).toBe(true);
  });
  it('harvesters respect auto replant, simulating each moment in order', () => {
    let f = setAutoReplant(adoptCreature(rich(createFarm(T0)), 'abyss_slug', T0), true);
    f = plant(f, 0, 'shade_herb', T0);
    const herbs = itemCount(f, 'shade_herb');
    f = tickStable(f, T0 + 60 * MIN); // 12 slug actions; the plot regrows every 2 min
    expect(itemCount(f, 'shade_herb')).toBe(herbs + 12 * 3);
  });
  it('alchemists brew potions while ingredients last', () => {
    let f = { ...createFarm(T0), items: { shade_herb: 6, dark_crystal: 2 } };
    f = adoptCreature(f, 'imp_alchemist', T0); // pays 6 herbs + 2 crystals
    f = { ...f, items: { ...f.items, shade_herb: 6, pale_mushroom: 2 } };
    f = tickStable(f, T0 + 30 * MIN); // 3 tries, ingredients for 2
    expect(itemCount(f, 'healing_potion')).toBe(2);
  });
  it('passives speed up crops, the mine and the laboratory', () => {
    let f = rich(createFarm(T0));
    f = adoptCreature(adoptCreature(adoptCreature(f, 'moon_moth', T0), 'specter_mole', T0), 'arcane_owl', T0);
    expect(cropTimeMult(f)).toBeCloseTo(0.8);
    f = plant(f, 0, 'ruin_bloom', T0);
    expect(plotState(f.plots[0], T0 + 12 * MIN, cropTimeMult(f)).status).toBe('ready'); // 15 min * 0.8
    expect(mineSpeed(f)).toBeCloseTo(1.3);
    expect(labTimeMult(f)).toBeCloseTo(0.75);
    f = startElixir(f, 'fury_elixir', T0);
    expect(collectElixir(f, T0 + 2.25 * MIN).lab).toBeNull(); // 3 min * 0.75
  });
});

describe('farm: plots bought with gold', () => {
  it('a new garden has no plots; each one is bought in order, with a base level and gold', () => {
    let f = buyUnlock(newFarm(T0), 'crops', T0); // with the first crop bought
    expect(plotsOwned(f)).toBe(0);
    expect(plant(f, 0, 'shade_herb', T0)).toBe(f); // nothing to plant on yet
    expect(PLOT_PRICES.length).toBe(PLOT_COUNT);
    const first = nextPlotPrice(f);
    expect(plotBuyStatus(f, 1e12, first.baseLevel - 1)).toBe('level');
    expect(plotBuyStatus(f, first.gold - 1, first.baseLevel)).toBe('gold');
    expect(plotBuyStatus(f, first.gold, first.baseLevel)).toBe('ok');
    f = buyPlot(f);
    expect(plotsOwned(f)).toBe(1);
    expect(plant(f, 0, 'shade_herb', T0).plots[0]).not.toBeNull();
    expect(plant(f, 1, 'shade_herb', T0)).toBe(f); // the second plot is not bought yet
    // prices only go up
    PLOT_PRICES.slice(1).forEach((p, i) => {
      expect(p.gold).toBeGreaterThan(PLOT_PRICES[i].gold);
      expect(p.baseLevel).toBeGreaterThanOrEqual(PLOT_PRICES[i].baseLevel);
    });
    for (let i = 1; i < PLOT_COUNT; i += 1) f = buyPlot(f);
    expect(plotsOwned(f)).toBe(PLOT_COUNT);
    expect(nextPlotPrice(f)).toBeNull();
    expect(plotBuyStatus(f, 1e12, 99)).toBe('max');
    expect(buyPlot(f)).toBe(f);
  });

  it('auto replant only turns on above base level 25', async () => {
    const { AUTO_REPLANT_MIN_BASE, autoReplantUnlocked } = await import('../core/farm.js');
    expect(AUTO_REPLANT_MIN_BASE).toBe(26);
    expect(autoReplantUnlocked(25)).toBe(false);
    expect(autoReplantUnlocked(26)).toBe(true);
    const f = createFarm(T0);
    expect(setAutoReplant(f, true, 25)).toBe(f);
    expect(setAutoReplant(f, true, 26).autoReplant).toBe(true);
    expect(setAutoReplant({ ...f, autoReplant: true }, false, 0).autoReplant).toBe(false); // turning off is always allowed
  });
});

describe('farm: harvest all lock', () => {
  it('"Harvest all" needs base level 16', async () => {
    const { HARVEST_ALL_MIN_BASE, harvestAllUnlocked } = await import('../core/farm.js');
    expect(HARVEST_ALL_MIN_BASE).toBe(16);
    expect(harvestAllUnlocked(15)).toBe(false);
    expect(harvestAllUnlocked(16)).toBe(true);
  });
});

describe('cheatSetPlotsOwned', () => {
  it('buys every plot or none (clearing crops of plots no longer owned)', async () => {
    const { createFarm, cheatSetPlotsOwned, plotsOwned, PLOT_COUNT } = await import('../core/farm.js');
    const all = cheatSetPlotsOwned(createFarm(0), PLOT_COUNT);
    expect(plotsOwned(all)).toBe(PLOT_COUNT);
    const planted = { ...all, plots: all.plots.map(() => ({ crop: 'shade_herb', plantedAt: 0 })) };
    const none = cheatSetPlotsOwned(planted, 0);
    expect(plotsOwned(none)).toBe(0);
    expect(none.plots.every((p) => p === null)).toBe(true);
  });
});

describe('farm unlocks: crops, veins, recipes and stalls bought with gold + base level', () => {
  it('a new farm has nothing bought; each kind is bought in order with a base level and gold', () => {
    let f = newFarm(T0);
    for (const kind of UNLOCK_KINDS) {
      expect(ownedCount(f, kind)).toBe(0);
      const first = UNLOCK_PRICES[kind][0];
      expect(unlockBuyStatus(f, kind, 1e12, first.baseLevel - 1)).toBe('level');
      expect(unlockBuyStatus(f, kind, first.gold - 1, first.baseLevel)).toBe('gold');
      expect(unlockBuyStatus(f, kind, first.gold, first.baseLevel)).toBe('ok');
    }
    f = { ...f, plotsOwned: 1 };
    expect(plant(f, 0, 'shade_herb', T0)).toBe(f); // crop not bought
    expect(brewPotion({ ...f, items: { shade_herb: 9, pale_mushroom: 9 } }, 'healing_potion').items.healing_potion).toBeUndefined();
    expect(adoptStatus({ ...f, items: { shade_herb: 9, pale_mushroom: 9 } }, 'abyss_slug')).toBe('full'); // no stall
    expect(mineStored(f.mine, T0 + 3600 * 1000, 1, ownedCount(f, 'veins'))).toEqual({});
    f = buyUnlock(f, 'crops', T0);
    expect(plant(f, 0, 'shade_herb', T0).plots[0]).not.toBeNull();
    for (const kind of UNLOCK_KINDS) {
      let g = f;
      for (let i = 0; i < 99; i += 1) g = buyUnlock(g, kind, T0);
      expect(ownedCount(g, kind)).toBe(UNLOCK_PRICES[kind].length);
      expect(unlockBuyStatus(g, kind, 1e12, 99)).toBe('max');
    }
  });
  it('cheat: all or none of a kind; losing stalls frees their creatures', () => {
    let f = createFarm(T0);
    f = adoptCreature({ ...f, items: { shade_herb: 9, pale_mushroom: 9 } }, 'abyss_slug', T0);
    expect(f.stable).toHaveLength(1);
    const none = cheatSetOwned(f, ['stalls', 'crops'], false, T0);
    expect(ownedCount(none, 'stalls')).toBe(0);
    expect(none.stable).toHaveLength(0);
    expect(ownedCount(none, 'crops')).toBe(0);
    const all = cheatSetOwned(none, UNLOCK_KINDS, true, T0);
    for (const kind of UNLOCK_KINDS) expect(ownedCount(all, kind)).toBe(UNLOCK_PRICES[kind].length);
  });
  it('old saves keep what they used: crops planted or in stock, the veins of their mine level, stalls in use', () => {
    const old = { ...newFarm(T0), plots: [{ crop: 'bloodroot', plantedAt: T0 }, null], items: { moon_cap: 1 }, mine: { level: 2, at: {} }, stable: [{ creature: 'abyss_slug', lastAt: T0 }], lab: { elixir: 'stoneskin_elixir', startedAt: T0 } };
    expect(ownedFromOldSave(old)).toEqual({ crops: 4, veins: 4, potions: 0, elixirs: 2, stalls: 1 });
  });
});
