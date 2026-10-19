import { describe, it, expect } from 'vitest';
import {
  createFarm as newFarm, CROPS, seedCost, farmSeedCost, POTIONS, ELIXIRS, PLOT_COUNT, PLOT_PRICES, plotsOwned, nextPlotPrice, plotBuyStatus, buyPlot, plant, plotState, harvest, harvestAll, mineStored, collectMine, upgradeMine, canUpgradeMine,
  brewPotion, potionRechargeLeft, farmDef, startElixir, brewFee, farmBrewFee, farmLabs, labSlotsOwned, LAB_SLOTS, creatureWage, onStrike, wageDue, debugWageDue, WAGE_PERIOD, labState, collectElixir, useBpPotion, drinkElixir, runBuffEffects, tickBuffs, itemCount, spendHealingPotion,
  removePlant, setAutoReplant, adoptCreature, adoptStatus, releaseCreature, tickStable, STABLE_SLOTS, cropTimeMult, mineSpeed, labTimeMult,
  MATERIALS, MINE_MAX_LEVEL, mineMaterials, mineUpgradeCost, normalizeMine, mineRates, cheatMaxOres, CHEAT_MAX_ORES, cheatAddOres, CHEAT_ORE_GIFT,
  UNLOCK_KINDS, UNLOCK_PRICES, ownedCount, unlockBuyStatus, buyUnlock, cheatSetOwned, ownedFromOldSave,
  CREATURES, startRunWages, rollCreatureDrop, creatureFound, cheatAdoptAll, mineHaulCost, mineCollectCost, settleSeeds,
} from '../core/farm.js';
import { createSequenceRng } from '../core/rng/rng.js';
import { oreGrid, ORE_SIZE } from '../ui/oreArt.js';
import { createProfile as newProfile, createRun } from '../core/persistence/profile.js';
import { cheatAccountOwned, ACCOUNT_UNLOCK_KINDS } from '../core/progression/unlocks.js';

// these tests work on an account with every echo rarity, talent tier, relic slot and class bought
const createProfile = () => ACCOUNT_UNLOCK_KINDS.reduce((p, k) => cheatAccountOwned(p, k, true), newProfile());
import { computeStats } from '../core/attributes/stats.js';
import { cheatRelics, forgeStatus, upgradeRelic } from '../core/crafting.js';
import { createBattle, queueFreeHeal, canQueueFreeHeal, freeHealBlock } from '../core/battle/engine.js';

const MIN = 60000;
// most tests work on a farm with every plot, crop, recipe and stall bought, the first two veins and one alembic
const createFarm = (now) => {
  const f = cheatSetOwned({ ...newFarm(now), plotsOwned: PLOT_COUNT }, UNLOCK_KINDS.filter((k) => k !== 'veins' && k !== 'labSlots'), true, now);
  return buyUnlock(buyUnlock(f, 'veins', now), 'veins', now);
};
const VEINS = 2;
const T0 = 1_000_000;

describe('farm: corrupted garden', () => {
  it('8 plots and six crops, from 6 to 22 minutes', () => {
    expect(createFarm(T0).plots.length).toBe(PLOT_COUNT);
    expect(PLOT_COUNT).toBe(8);
    expect(CROPS.length).toBe(6);
    expect(CROPS.map((c) => c.time / MIN)).toEqual([6, 6, 11, 13, 20, 22]);
  });
  it('plants, grows in real time and harvests the yield', () => {
    let f = plant(createFarm(T0), 0, 'shade_herb', T0);
    expect(plotState(f.plots[0], T0 + MIN).status).toBe('growing');
    expect(harvest(f, 0, T0 + 5 * MIN)).toBe(f); // not ready
    f = harvest(f, 0, T0 + 6 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(3);
    expect(f.plots[0]).toBeNull();
    f = plant(plant(f, 1, 'ruin_bloom', T0), 2, 'pale_mushroom', T0);
    f = harvestAll(f, T0 + 10 * MIN); // only the 6-minute crop is ready
    expect(itemCount(f, 'pale_mushroom')).toBe(2);
    expect(f.plots[1]).not.toBeNull();
  });
});

describe('farm: abandoned mine', () => {
  it('produces automatically up to its storage and keeps partial progress', () => {
    let f = createFarm(T0);
    expect(mineStored(f.mine, T0 + 750 * 1000, 1, VEINS)).toEqual({ iron_ore: 2, dark_crystal: 0 }); // 5 min each
    f = collectMine(f, T0 + 750 * 1000);
    expect(itemCount(f, 'iron_ore')).toBe(2);
    expect(mineStored(f.mine, T0 + 900 * 1000, 1, VEINS).iron_ore).toBe(1); // the 150s already dug were kept
    expect(mineStored(createFarm(T0).mine, T0 + 10 * 3600 * 1000, 1, VEINS)).toEqual({ iron_ore: 12, dark_crystal: 2 }); // capped
  });
  it('hauling costs run gold: per unit, rarer veins, deeper mine, with a bulk discount as storage fills', () => {
    expect(mineHaulCost('iron_ore', 2, 1, 30)).toBe(Math.ceil(2 * 40 * (1 - 0.3 * 2 / 30)));
    expect(mineHaulCost('iron_ore', 30, 1, 30)).toBe(840); // full: 30% off
    expect(mineHaulCost('iron_ore', 30, 5, 150)).toBeGreaterThan(mineHaulCost('iron_ore', 30, 1, 150)); // deeper
    expect(mineHaulCost('dark_crystal', 1, 1, 6) / 1).toBeGreaterThan(mineHaulCost('iron_ore', 1, 1, 30)); // rarer
    expect(mineHaulCost('iron_ore', 0, 1, 30)).toBe(0);
    for (const m of MATERIALS) expect(m.haul).toBeGreaterThan(0);
    const f = createFarm(T0);
    const at = T0 + 750 * 1000;
    const cost = mineCollectCost(f, at);
    expect(cost.total).toBe(cost.iron_ore + cost.dark_crystal);
    expect(collectMine(f, at, cost.total - 1)).toBe(f); // not enough gold: nothing collected
    const g = collectMine(f, at, cost.total);
    expect(itemCount(g, 'iron_ore')).toBe(2);
    expect(settleSeeds(g).spent).toBe(cost.total);
    // one vein only
    const later = T0 + 10 * 3600 * 1000;
    const one = collectMine(f, later, Infinity, 'dark_crystal');
    expect(itemCount(one, 'dark_crystal')).toBe(2);
    expect(itemCount(one, 'iron_ore')).toBe(0);
    expect(settleSeeds(one).spent).toBe(mineCollectCost(f, later).dark_crystal);
  });
  it('upgrading keeps the stored ores for hauling instead of collecting them free', () => {
    let f = { ...createFarm(T0), items: { iron_ore: 12, dark_crystal: 2 } };
    const at = T0 + 10 * 3600 * 1000;
    f = upgradeMine(f, at);
    expect(f.mine.level).toBe(2);
    expect(itemCount(f, 'iron_ore')).toBe(0);
    expect(mineStored(f.mine, at, 1, VEINS)).toEqual({ iron_ore: 12, dark_crystal: 2 });
    expect(f.seedSpent).toBeUndefined();
  });
  it('upgrades with ores and crystals', () => {
    let f = createFarm(T0);
    expect(canUpgradeMine(f)).toBe(false);
    f = { ...f, items: { iron_ore: 12, dark_crystal: 2 } };
    f = upgradeMine(f, T0);
    expect(f.mine.level).toBe(2);
    expect(itemCount(f, 'iron_ore')).toBe(0);
  });
  it('the mine is a slow trickle: about a dozen iron and two crystals an hour at level 1', () => {
    const r = mineRates(1, 1, VEINS);
    expect(3600 / r.iron_ore.seconds).toBe(12);
    expect(3600 / r.dark_crystal.seconds).toBeCloseTo(2.4);
    expect(r.iron_ore.cap).toBe(12);
    expect(r.dark_crystal.cap).toBe(2);
  });
  it('veins are bought in order; each one starts digging when bought', () => {
    expect(mineMaterials(1).map((m) => m.id)).toEqual(['iron_ore', 'dark_crystal']);
    expect(UNLOCK_PRICES.veins).toHaveLength(MATERIALS.length);
    let f = { ...createFarm(T0), items: { iron_ore: 20, dark_crystal: 3 } };
    f = upgradeMine(f, T0 + 60 * MIN);
    f = buyUnlock(buyUnlock(f, 'veins', T0 + 60 * MIN), 'veins', T0 + 60 * MIN);
    const s = mineStored(f.mine, T0 + 60 * MIN + 450 * 1000, 1, ownedCount(f, 'veins'));
    expect(s.ember_coal).toBe(2); // 450s / level 2 = 225s each, counted from the purchase
    expect(s.bone_silver).toBe(1);
    expect(s.bloodstone).toBeUndefined();
    expect(mineUpgradeCost(2)).toMatchObject({ iron_ore: 24, dark_crystal: 4, ember_coal: 6, bone_silver: 3 });
    for (const m of MATERIALS) expect(m.forge.pct).toBeGreaterThan(0);
  });
  it('loads old saves that kept only oreAt/crystalAt', () => {
    const m = normalizeMine({ level: 2, oreAt: T0, crystalAt: T0 + 1000 }, T0 + 5000);
    expect(m.at).toMatchObject({ iron_ore: T0, dark_crystal: T0 + 1000, ember_coal: T0 + 5000, bone_silver: T0 + 5000 });
    expect(m.oreAt).toBeUndefined();
    expect(mineStored(m, T0 + 151 * 1000).iron_ore).toBe(1); // level 2: 150s each
  });
  it('cheat: max ores fills the deepest mine and the stock', () => {
    const f = cheatMaxOres(cheatSetOwned({ ...createFarm(T0), items: { iron_ore: 3 } }, ['veins'], true, T0), T0);
    expect(f.mine.level).toBe(MINE_MAX_LEVEL);
    for (const m of MATERIALS) expect(itemCount(f, m.id)).toBe(CHEAT_MAX_ORES);
    const s = mineStored(f.mine, T0);
    for (const [id, { cap }] of Object.entries(mineRates(MINE_MAX_LEVEL))) expect(s[id]).toBe(cap);
  });
  it('cheat: add ores gives a stock of every material and leaves the mine alone', () => {
    const base = { ...createFarm(T0), items: { iron_ore: 3 } };
    const f = cheatAddOres(base);
    expect(itemCount(f, 'iron_ore')).toBe(3 + CHEAT_ORE_GIFT);
    for (const m of MATERIALS.slice(1)) expect(itemCount(f, m.id)).toBe(CHEAT_ORE_GIFT);
    expect(f.mine).toBe(base.mine);
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
  it('BP potions recharge: the Gole da Ruína gives +3 BP and needs 40 minutes before the next dose', () => {
    const items = { ruin_bloom: 5, abyss_truffle: 5, shade_herb: 10 };
    let f = { ...createFarm(T0), items };
    expect(farmDef('ruin_draught').effect.amount).toBe(3);
    f = brewPotion(f, 'ruin_draught', T0);
    expect(itemCount(f, 'ruin_draught')).toBe(1);
    expect(potionRechargeLeft(f, 'ruin_draught', T0 + 10 * MIN)).toBe(30 * MIN);
    expect(brewPotion(f, 'ruin_draught', T0 + 39 * MIN)).toBe(f); // still recharging
    f = brewPotion(f, 'ruin_draught', T0 + 40 * MIN);
    expect(itemCount(f, 'ruin_draught')).toBe(2);
    // every BP potion gives about 3 BP per 40 minutes of cauldron
    for (const p of POTIONS.filter((x) => x.effect.kind === 'bp')) expect(p.effect.amount / (p.recharge / (40 * MIN))).toBeGreaterThanOrEqual(2.6);
    for (const p of POTIONS.filter((x) => x.effect.kind === 'bp')) expect(p.effect.amount / (p.recharge / (40 * MIN))).toBeLessThanOrEqual(3.6);
    // the Elixir of Insight gives +15% EXP
    expect(farmDef('insight_elixir').buff.mods.expMultiplier).toBeCloseTo(0.08);
  });
  it('brews potions from crops and uses BP potions on the run', () => {
    let f = { ...createFarm(T0), items: { bloodroot: 2, moon_cap: 1, pale_mushroom: 2 } };
    f = brewPotion(f, 'vigor_tonic');
    expect(itemCount(f, 'vigor_tonic')).toBe(1);
    expect(itemCount(f, 'bloodroot')).toBe(0);
    const run = { ...createRun({ characterIndex: 0, profile: createProfile() }), battlesUsed: 10 };
    const res = useBpPotion(f, run, 'vigor_tonic');
    expect(res.run.battlesUsed).toBe(9); // Tônico de Vigor: +1 BP
    expect(itemCount(res.farm, 'vigor_tonic')).toBe(0);
  });
  it('brewing an elixir costs run gold: its fee grows like the seeds and is capped the same way', () => {
    const items = { bloodroot: 4, iron_ore: 2 };
    const f = { ...createFarm(T0), items };
    const base = brewFee('fury_elixir');
    expect(base).toBe(ELIXIRS[0].fee);
    expect(brewFee('titan_elixir')).toBeGreaterThan(base); // stronger elixirs cost more
    const ctx = { baseLevel: 12, slimeWins: 2 };
    const fee = brewFee('fury_elixir', { ...ctx, gold: 1e7 });
    expect(fee).toBeGreaterThan(base);
    expect(brewFee('fury_elixir', { baseLevel: 60, slimeWins: 9, gold: 1e6 })).toBe(1e6 * 0.05); // 5% of the gold
    expect(startElixir(f, 'fury_elixir', T0, base - 1, ctx)).toBe(f); // not enough gold
    const g = startElixir(f, 'fury_elixir', T0, 1e7, ctx);
    expect(farmLabs(g)[0]?.elixir).toBe('fury_elixir');
    expect(settleSeeds(g).spent).toBe(fee);
  });
  it('up to three alembics: the first free, two bought; each brews its own elixir, brewing gets dearer', () => {
    expect(LAB_SLOTS).toBe(3);
    expect(UNLOCK_PRICES.labSlots).toHaveLength(LAB_SLOTS - 1);
    let f = { ...createFarm(T0), items: { bloodroot: 9, dark_crystal: 9, moon_cap: 9, pale_mushroom: 9, iron_ore: 9 } };
    expect(labSlotsOwned(f)).toBe(1);
    const one = farmBrewFee(f, 'fury_elixir', { gold: 1e7, baseLevel: 10 });
    f = buyUnlock(buyUnlock(f, 'labSlots', T0), 'labSlots', T0);
    expect(labSlotsOwned(f)).toBe(3);
    expect(farmBrewFee(f, 'fury_elixir', { gold: 1e7, baseLevel: 10 })).toBeGreaterThan(one);
    f = startElixir(startElixir(startElixir(f, 'fury_elixir', T0), 'stoneskin_elixir', T0), 'fury_elixir', T0 + MIN);
    expect(farmLabs(f).map((l) => l?.elixir)).toEqual(['fury_elixir', 'stoneskin_elixir', 'fury_elixir']);
    expect(startElixir(f, 'fury_elixir', T0)).toBe(f); // every alembic busy
    f = collectElixir(f, T0 + 3 * MIN); // the first two are ready
    expect(itemCount(f, 'fury_elixir')).toBe(1);
    expect(itemCount(f, 'stoneskin_elixir')).toBe(1);
    expect(farmLabs(f)[2]?.elixir).toBe('fury_elixir');
    f = collectElixir(f, T0 + 4 * MIN, 2);
    expect(itemCount(f, 'fury_elixir')).toBe(2);
  });
  it('the laboratory brews one elixir at a time; elixirs buff the run for N battles', () => {
    let f = { ...createFarm(T0), items: { bloodroot: 4, dark_crystal: 2, moon_cap: 2, pale_mushroom: 2, iron_ore: 3 } };
    f = startElixir(f, 'fury_elixir', T0);
    expect(startElixir(f, 'stoneskin_elixir', T0)).toBe(f); // alembic busy
    expect(labState(farmLabs(f)[0], T0 + MIN).status).toBe('brewing');
    f = collectElixir(f, T0 + 3 * MIN);
    expect(itemCount(f, 'fury_elixir')).toBe(1);
    let run = createRun({ characterIndex: 0, profile: createProfile() });
    ({ run } = drinkElixir(f, run, 'fury_elixir'));
    const buff = runBuffEffects(run);
    expect(buff.pct.atk).toBeCloseTo(0.05);
    const base = { hp: 100, atk: 100, def: 100, speed: 100, luck: 100 };
    expect(computeStats({ base, equipment: null, character: { index: 0 }, buff }).total.atk).toBeCloseTo(105);
    for (let i = 0; i < 4; i += 1) run = tickBuffs(run); // elixirs last 4 battles
    expect(run.buffs).toEqual([]);
  });
  it('a healing potion queues a free heal in battle: only against bosses / Slime Kings, once per battle', () => {
    const f = spendHealingPotion({ ...createFarm(T0), items: { healing_potion: 1 } });
    expect(itemCount(f, 'healing_potion')).toBe(0);
    expect(spendHealingPotion(f)).toBeNull();
    const fight = (boss) => createBattle({ player: { hp: 10, maxHp: 10, atk: 1, def: 1, modifiers: {} }, enemy: { hp: 10, maxHp: 10, atk: 1, skills: [] }, gold: 0, boss });
    const normal = fight(false);
    expect(freeHealBlock(normal)).toBe('notBoss');
    expect(queueFreeHeal(normal)).toBe(normal);
    const s = fight(true);
    expect(canQueueFreeHeal(s)).toBe(true);
    const healed = queueFreeHeal(s);
    expect(healed.healQueued).toBe(true);
    // once the queued heal is spent, a second potion is still refused in this battle
    const later = { ...healed, healQueued: false };
    expect(freeHealBlock(later)).toBe('used');
    expect(queueFreeHeal(later)).toBe(later);
  });
});

describe('farm materials in the Forge', () => {
  it('ores and crystals pay relic upgrades, taken from the farm stock', () => {
    const profile = { ...cheatRelics(createProfile(), true), farm: { ...createFarm(T0), items: { iron_ore: 6, dark_crystal: 1 } } };
    const run = { ...createRun({ characterIndex: 0, profile }), gold: 1e6 }; // the forge fee comes from the run
    expect(forgeStatus(run, profile, 'silver_key', 'upgrade')).toBe('ok');
    const res = upgradeRelic(run, profile, 'silver_key');
    expect(res.relic.after.level).toBe(1);
    expect(itemCount(res.profile.farm, 'iron_ore')).toBe(0);
    expect(itemCount(res.profile.farm, 'dark_crystal')).toBe(0);
  });
});

describe('farm: auto replant and remove', () => {
  it('auto replant plants the same crop again after harvesting', () => {
    let f = setAutoReplant(plant(createFarm(T0), 0, 'bloodroot', T0), true);
    f = harvestAll(f, T0 + 11 * MIN);
    expect(itemCount(f, 'bloodroot')).toBe(3);
    expect(f.plots[0]).toEqual({ crop: 'bloodroot', plantedAt: T0 + 11 * MIN });
    f = harvest(setAutoReplant(f, false), 0, T0 + 22 * MIN);
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

describe('farm: seeds paid with the run gold', () => {
  const owned = (f) => ({ ...f, plotsOwned: 2, owned: { ...f.owned, crops: CROPS.length } });
  it('seed price grows with base level, Slime Kings, plots and gold, capped by 5% of the gold and 1000x', () => {
    const base = seedCost('shade_herb');
    expect(base).toBe(CROPS[0].seed); // no context: the base seed
    const rich = { baseLevel: 10, gold: 1e7 };
    expect(seedCost('shade_herb', rich)).toBeGreaterThan(base);
    expect(seedCost('shade_herb', { ...rich, slimeWins: 3 })).toBeGreaterThan(seedCost('shade_herb', rich));
    expect(seedCost('shade_herb', { ...rich, plots: 8 })).toBeGreaterThan(seedCost('shade_herb', rich));
    expect(seedCost('abyss_truffle', { gold: 1e8 })).toBeGreaterThan(seedCost('abyss_truffle', { gold: 1e6 }));
    expect(seedCost('abyss_truffle', { baseLevel: 40, slimeWins: 6, gold: 1e6 })).toBe(1e6 * 0.05); // 5% of the gold
    expect(seedCost('shade_herb', { baseLevel: 40, gold: 10 })).toBe(base); // never below the base seed
    expect(seedCost('shade_herb', { baseLevel: 99, slimeWins: 9, gold: 1e15 })).toBe(base * 1000); // absolute cap
    const f = owned(createFarm(T0));
    const ctx = { baseLevel: 12, slimeWins: 1 };
    const cost = farmSeedCost(f, 'bloodroot', { ...ctx, gold: 1e6 });
    expect(cost).toBeGreaterThan(CROPS[2].seed);
    expect(settleSeeds(plant(f, 0, 'bloodroot', T0, 1e6, ctx)).spent).toBe(cost);
  });
  it('planting needs the seed gold and records what was paid', () => {
    const f = owned(createFarm(T0));
    const seed = seedCost('bloodroot');
    expect(seed).toBeGreaterThan(0);
    expect(plant(f, 0, 'bloodroot', T0, seed - 1)).toBe(f);
    const g = plant(f, 0, 'bloodroot', T0, seed);
    expect(g.plots[0]).not.toBeNull();
    const s = settleSeeds(g);
    expect(s.spent).toBe(seed);
    expect(s.farm.seedSpent).toBeUndefined();
  });
  it('auto replant pays each seed and stops when the gold runs out', () => {
    let f = setAutoReplant(owned(createFarm(T0)), true);
    const seed = seedCost('shade_herb');
    f = plant(plant(f, 0, 'shade_herb', T0), 1, 'shade_herb', T0);
    f = settleSeeds(f).farm;
    f = harvestAll(f, T0 + 6 * MIN, seed); // gold for one replant only
    expect(f.plots[0]).not.toBeNull();
    expect(f.plots[1]).toBeNull();
    expect(settleSeeds(f).spent).toBe(seed);
    expect(itemCount(f, 'shade_herb')).toBe(6); // both harvested
  });
});

describe('farm: stable wages', () => {
  const withSlug = () => ({ ...createFarm(T0), plotsOwned: 1, owned: { ...createFarm(T0).owned, crops: CROPS.length }, found: ['abyss_slug', 'moon_moth'], stable: [{ creature: 'abyss_slug', lastAt: T0, paidUntil: T0 }] });
  it('a new run counts wages from its start: nothing owed from before, the first one 3 minutes in', () => {
    // a creature last paid long before this run (between runs nothing could be paid)
    const stale = { ...withSlug(), stable: [{ creature: 'abyss_slug', lastAt: T0, paidUntil: T0, striking: true }] };
    const start = T0 + 5 * 60 * MIN;
    const f = startRunWages(stale, start);
    expect(f.stable[0]).toMatchObject({ lastAt: start, paidUntil: start + WAGE_PERIOD, striking: false });
    // a battle 1 minute in: no wage charged
    expect(settleSeeds(tickStable(f, start + MIN, 1e9)).spent).toBe(0);
    // at 3 minutes the first wage is due and paid
    expect(settleSeeds(tickStable(f, start + WAGE_PERIOD, 1e9)).wages).toBeGreaterThan(0);
  });
  it('each creature is paid every 3 minutes from the run gold, capped at 1% of it', () => {
    expect(WAGE_PERIOD).toBe(3 * MIN);
    const base = creatureWage('abyss_slug');
    expect(base).toBe(CREATURES[0].wage);
    expect(creatureWage('abyss_slug', { baseLevel: 10, gold: 1e7 })).toBeGreaterThan(base);
    expect(creatureWage('arcane_owl', { baseLevel: 60, slimeWins: 9, gold: 1e7 })).toBe(1e7 * 0.01);
    const f = tickStable(withSlug(), T0 + 7 * MIN, 1e9); // paydays at 0, 3 and 6 minutes
    const wage = creatureWage('abyss_slug', { gold: 1e9 });
    expect(settleSeeds(f).spent).toBeGreaterThanOrEqual(3 * base);
    expect(settleSeeds(f).spent).toBeLessThanOrEqual(3 * wage);
    expect(f.stable[0].paidUntil).toBe(T0 + 9 * MIN);
    expect(onStrike(f.stable[0])).toBe(false);
  });
  it('unpaid creatures strike: no work, no passive, and the strike is not owed', () => {
    let f = plant(withSlug(), 0, 'shade_herb', T0);
    f = settleSeeds(f).farm;
    f = tickStable(f, T0 + 10 * MIN, 0); // no gold: on strike from the start
    expect(onStrike(f.stable[0])).toBe(true);
    expect(itemCount(f, 'shade_herb')).toBe(0); // the ready crop was not harvested
    expect(settleSeeds(f).spent).toBe(0);
    const moth = { ...f, stable: [{ creature: 'moon_moth', lastAt: T0, paidUntil: T0, striking: true }] };
    expect(cropTimeMult(moth)).toBe(1); // passive off while on strike
    // paid again: works from now on, without paying for the strike
    const later = tickStable(f, T0 + 16 * MIN, 1e9);
    expect(onStrike(later.stable[0])).toBe(false);
    const w = creatureWage('abyss_slug', { gold: 1e9 }); // paydays at 10, 13 and 16 minutes (each on the gold left)
    expect(settleSeeds(later).spent).toBeGreaterThan(2.9 * w);
    expect(settleSeeds(later).spent).toBeLessThanOrEqual(3 * w);
    expect(itemCount(later, 'shade_herb')).toBe(3); // harvested at 15 minutes
  });
  it('wageDue tells when a payment is due and payable; settleSeeds reports the wages apart', () => {
    let f = settleSeeds(tickStable(withSlug(), T0, 1e9)).farm; // payday at 0 paid: next at 3 minutes
    expect(wageDue(f, T0 + MIN, 1e9)).toBe(false);
    expect(wageDue(f, T0 + 3 * MIN, 1e9)).toBe(true);
    expect(wageDue(f, T0 + 3 * MIN, 0)).toBe(false); // cannot pay: no tick needed
    const paid = settleSeeds(tickStable(f, T0 + 3 * MIN, 1e9));
    expect(paid.wages).toBeGreaterThan(0);
    expect(paid.wages).toBe(paid.spent);
    // debug: one more payment due now, the schedule stays the same
    const next = paid.farm.stable[0].paidUntil;
    f = debugWageDue(paid.farm, T0 + 4 * MIN);
    expect(wageDue(f, T0 + 4 * MIN, 1e9)).toBe(true);
    const extra = tickStable(f, T0 + 4 * MIN, 1e9);
    expect(settleSeeds(extra).wages).toBeGreaterThan(0);
    expect(extra.stable[0].paidUntil).toBe(next);
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
    f = tickStable(f, T0 + 5 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(herbs); // its first job comes before the 6 minutes of growth
    f = tickStable(f, T0 + 10 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(herbs + 3); // one plot
    f = tickStable(f, T0 + 15 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(herbs + 6); // the other one
    expect(f.plots.every((p) => p === null)).toBe(true);
  });
  it('harvesters respect auto replant, simulating each moment in order', () => {
    let f = setAutoReplant(adoptCreature(rich(createFarm(T0)), 'abyss_slug', T0), true);
    f = plant(f, 0, 'shade_herb', T0);
    const herbs = itemCount(f, 'shade_herb');
    // slug every 5 min, herb every 6: it harvests at 10, 20, 30, 40, 50 and 60 min (replanted each time)
    f = tickStable(f, T0 + 60 * MIN);
    expect(itemCount(f, 'shade_herb')).toBe(herbs + 6 * 3);
  });
  it('alchemists brew potions while ingredients last', () => {
    let f = { ...createFarm(T0), items: { shade_herb: 6, pale_mushroom: 3, dark_crystal: 2 } };
    f = adoptCreature(f, 'imp_alchemist', T0); // pays 6 herbs, 3 mushrooms + 1 crystal
    f = { ...f, items: { ...f.items, shade_herb: 6, pale_mushroom: 2 } };
    f = tickStable(f, T0 + 30 * MIN); // 3 tries, ingredients for 2
    expect(itemCount(f, 'healing_potion')).toBe(2);
  });
  it('passives speed up crops, the mine and the laboratory', () => {
    let f = rich(createFarm(T0));
    f = adoptCreature(adoptCreature(adoptCreature(f, 'moon_moth', T0), 'specter_mole', T0), 'arcane_owl', T0);
    expect(cropTimeMult(f)).toBeCloseTo(0.8);
    f = plant(f, 0, 'ruin_bloom', T0);
    expect(plotState(f.plots[0], T0 + 16 * MIN, cropTimeMult(f)).status).toBe('ready'); // 20 min * 0.8
    expect(plotState(f.plots[0], T0 + 15 * MIN, cropTimeMult(f)).status).toBe('growing');
    expect(mineSpeed(f)).toBeCloseTo(1.3);
    expect(labTimeMult(f)).toBeCloseTo(0.75);
    f = startElixir(f, 'fury_elixir', T0);
    expect(farmLabs(collectElixir(f, T0 + 2.25 * MIN))[0]).toBeNull(); // 3 min * 0.75
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
    PLOT_PRICES.slice(1).forEach((p, i) => expect(p.gold).toBeGreaterThan(PLOT_PRICES[i].gold));
    // base levels 2, 4, 6, 8, 11, then 12, 13 and 14 plus 1, 2 and 3 Slime King victories
    expect(PLOT_PRICES.map((p) => p.baseLevel)).toEqual([2, 4, 6, 8, 11, 12, 13, 14]);
    expect(PLOT_PRICES.map((p) => p.slimeKings ?? 0)).toEqual([0, 0, 0, 0, 0, 1, 2, 3]);
    for (let i = 1; i < 5; i += 1) f = buyPlot(f);
    // the sixth plot needs base level 12 and a Slime King victory, both
    expect(plotBuyStatus(f, 1e12, 99, 0)).toBe('level');
    expect(plotBuyStatus(f, 1e12, 11, 1)).toBe('level');
    expect(plotBuyStatus(f, 1e12, 12, 1)).toBe('ok');
    for (let i = 5; i < PLOT_COUNT; i += 1) f = buyPlot(f);
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
    expect(adoptStatus({ ...f, items: { shade_herb: 9, pale_mushroom: 9 } }, 'abyss_slug')).toBe('unknown'); // not dropped yet
    expect(adoptStatus({ ...f, found: ['abyss_slug'], items: { shade_herb: 9, pale_mushroom: 9 } }, 'abyss_slug')).toBe('full'); // no stall
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
  it('cauldron recipes need base level 4/6, then 7/9/9 plus 1/1/2 Slime Kings; elixirs 4/5/5/5, then 13 + 3 Slime Kings; alembics 6, then 10 + 2 Slime Kings', () => {
    expect(POTIONS).toHaveLength(5);
    expect(ELIXIRS).toHaveLength(5);
    expect(UNLOCK_PRICES.potions).toHaveLength(POTIONS.length);
    expect(UNLOCK_PRICES.elixirs).toHaveLength(ELIXIRS.length);
    expect(UNLOCK_PRICES.potions.map((p) => [p.baseLevel, p.slimeKings ?? 0])).toEqual([[4, 0], [6, 0], [7, 1], [9, 1], [9, 2]]);
    expect(UNLOCK_PRICES.elixirs.map((p) => [p.baseLevel, p.slimeKings ?? 0])).toEqual([[4, 0], [5, 0], [5, 0], [5, 0], [13, 3]]);
    expect(UNLOCK_PRICES.labSlots.map((p) => [p.baseLevel, p.slimeKings ?? 0])).toEqual([[6, 0], [10, 2]]);
    for (const kind of ['potions', 'elixirs']) {
      UNLOCK_PRICES[kind].slice(1).forEach((p, i) => expect(p.gold).toBeGreaterThan(UNLOCK_PRICES[kind][i].gold));
    }
    let f = newFarm(T0);
    for (let i = 0; i < 4; i += 1) f = buyUnlock(f, 'potions', T0);
    expect(unlockBuyStatus(f, 'potions', 1e12, 99, 1)).toBe('level');
    expect(unlockBuyStatus(f, 'potions', 1e12, 99, 2)).toBe('ok');
  });
  it('mine veins need base level 2/4/6/8, then 9/11/13 plus 2/3/4 Slime King victories', () => {
    expect(UNLOCK_PRICES.veins.map((p) => [p.baseLevel, p.slimeKings ?? 0])).toEqual([[2, 0], [4, 0], [6, 0], [8, 0], [9, 2], [11, 3], [13, 4]]);
    let f = newFarm(T0);
    for (let i = 0; i < 4; i += 1) f = buyUnlock(f, 'veins', T0);
    // bloodstone needs both: base level 9 and 2 Slime Kings
    expect(unlockBuyStatus(f, 'veins', 1e12, 99, 1)).toBe('level');
    expect(unlockBuyStatus(f, 'veins', 1e12, 8, 2)).toBe('level');
    expect(unlockBuyStatus(f, 'veins', 1e12, 9, 2)).toBe('ok');
  });
  it('crops need base level 2/4/5/6, then 6 plus 2 and 7 plus 3 Slime King victories', () => {
    expect(UNLOCK_PRICES.crops.map((p) => [p.baseLevel, p.slimeKings ?? 0])).toEqual([[2, 0], [4, 0], [5, 0], [6, 0], [6, 2], [7, 3]]);
  });
  it('stable stalls need base level 4/6/8/10', () => {
    expect(UNLOCK_PRICES.stalls.map((p) => [p.baseLevel, p.slimeKings ?? 0])).toEqual([[4, 0], [6, 0], [8, 0], [10, 0]]);
  });
  it('creatures drop from their map boss once; until then they cannot be adopted', () => {
    const ids = CREATURES.map((c) => c.drop.boss);
    expect(new Set(ids).size).toBe(CREATURES.length); // one creature per boss
    let f = { ...createFarm(T0), found: [], items: { shade_herb: 9, pale_mushroom: 9 } };
    expect(adoptStatus(f, 'abyss_slug')).toBe('unknown');
    expect(rollCreatureDrop(f, 0, createSequenceRng([0.99])).creature).toBeNull(); // unlucky roll
    expect(rollCreatureDrop(f, 2, createSequenceRng([0])).creature).toBeNull(); // boss without a creature
    const d = rollCreatureDrop(f, 0, createSequenceRng([0]));
    expect(d.creature).toBe('abyss_slug');
    f = d.farm;
    expect(creatureFound(f, 'abyss_slug')).toBe(true);
    expect(adoptStatus(f, 'abyss_slug')).toBe('ok');
    expect(rollCreatureDrop(f, 0, createSequenceRng([0])).farm).toBe(f); // already found
  });
  it('adopting needs base level 4 to 10, one per creature (the two that eat truffles also 3 Slime Kings)', () => {
    expect(CREATURES.map((c) => [c.need.baseLevel, c.need.slimeKings ?? 0])).toEqual([[4, 0], [5, 0], [6, 0], [7, 0], [8, 3], [9, 0], [10, 3]]);
    const f = { ...createFarm(T0), owned: { ...createFarm(T0).owned, stalls: 1 }, found: ['abyss_slug', 'specter_mole'], items: { shade_herb: 9, pale_mushroom: 9, iron_ore: 15, dark_crystal: 3 } };
    expect(adoptStatus(f, 'abyss_slug', 3, 0)).toBe('level');
    expect(adoptCreature(f, 'abyss_slug', T0, 3, 0)).toBe(f);
    expect(adoptStatus(f, 'abyss_slug', 4, 0)).toBe('ok');
    expect(adoptStatus(f, 'specter_mole', 8, 0)).toBe('level');
    expect(adoptStatus(f, 'specter_mole', 9, 0)).toBe('ok');
  });
  it('cheat: adopt every creature (free, as many as the stalls hold) or release them all', () => {
    let f = adoptCreature({ ...newFarm(T0), owned: { ...newFarm(T0).owned, stalls: 1 }, found: ['bog_toad'], items: { bloodroot: 9, moon_cap: 9, dark_crystal: 9 } }, 'bog_toad', T0);
    expect(f.stable.map((s) => s.creature)).toEqual(['bog_toad']);
    f = cheatAdoptAll(f, true, T0);
    expect(ownedCount(f, 'stalls')).toBe(STABLE_SLOTS);
    expect(f.stable).toHaveLength(STABLE_SLOTS);
    expect(f.stable[0].creature).toBe('bog_toad'); // kept
    expect(new Set(f.stable.map((s) => s.creature)).size).toBe(STABLE_SLOTS);
    for (const c of CREATURES) expect(creatureFound(f, c.id)).toBe(true);
    const none = cheatAdoptAll(f, false, T0);
    expect(none.stable).toHaveLength(0);
    expect(ownedCount(none, 'stalls')).toBe(STABLE_SLOTS);
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
    expect(ownedFromOldSave(old)).toEqual({ crops: 4, veins: 4, potions: 0, elixirs: 2, stalls: 1, labSlots: 0, roomPotions: 0 });
    expect(farmLabs(old)[0].elixir).toBe('stoneskin_elixir'); // the old single alembic moves to the first
  });
});

describe('farm statistics', () => {
  it('counts harvests, potions, elixirs, ores and the run gold spent, by kind', async () => {
    const { farmStats } = await import('../core/farm.js');
    let f = { ...createFarm(T0), items: { bloodroot: 9, moon_cap: 9, pale_mushroom: 9, iron_ore: 9 } };
    expect(farmStats(f).harvested).toBe(0);
    f = plant(f, 0, 'shade_herb', T0, 1e6);
    f = harvest(f, 0, T0 + 6 * MIN);
    f = brewPotion(f, 'vigor_tonic', T0);
    f = startElixir(f, 'fury_elixir', T0, 1e6);
    f = collectElixir(f, T0 + 3 * MIN);
    f = collectMine(f, T0 + 750 * 1000, 1e6);
    const s = farmStats(f);
    expect(s.harvested).toBe(3);
    expect(s.potions).toBe(1);
    expect(s.elixirs).toBe(1);
    expect(s.ores).toBe(2);
    expect(s.goldSeeds).toBeGreaterThan(0);
    expect(s.goldBrew).toBeGreaterThan(0);
    expect(s.goldHaul).toBeGreaterThan(0);
    expect(settleSeeds(f).farm.stats).toEqual(f.stats); // the counters survive the gold settlement
  });
});
