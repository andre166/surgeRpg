import { describe, it, expect } from 'vitest';
import { createSeededRng, createSequenceRng } from '../core/rng/rng.js';
import { createProfile, createRun } from '../core/persistence/profile.js';
import { migrateProfile } from '../core/persistence/saveStore.js';
import { createFarm, itemCount } from '../core/farm.js';
import {
  RELICS, RELIC_DROPS, RELIC_SLOTS, RELIC_MAX_LEVEL, RELIC_LEVEL_STEP, UPGRADE_COSTS, REROLL_COST, FORGE_FEE_MIN, FORGE_FEE_SHARE,
  relicDef, relicBoss, rollRelicDrop, relicFound, ownedRelic, relicStats, relicSlots, relicPercents, forgeFee, forgeStatus,
  upgradeRelic, rerollRelic, upgradeCost, cheatRelics, normalizeRelics,
} from '../core/crafting.js';
import { computeStats } from '../core/attributes/stats.js';
import { hasRelicSprite } from '../ui/components/RelicSprite.jsx';

const ALL_MATS = { iron_ore: 99, dark_crystal: 99, ember_coal: 99, bone_silver: 99, bloodstone: 99, void_obsidian: 99, soul_amber: 99 };

/** An account with every relic, `items` in the farm stock, and a run of hero 3 holding `gold`. */
function setup(items = ALL_MATS, gold = 1e6) {
  const profile = { ...cheatRelics(createProfile(), true, createSeededRng(1)), farm: { ...createFarm(0), items } };
  const run = { ...createRun({ characterIndex: 3, profile }), gold };
  return { profile, run };
}

describe('relics: fixed artifacts in their own slots', () => {
  it('four relics, one per stat (hp, def, agility, luck), each with its pixel art and a boss that drops it', () => {
    expect(RELICS.map((r) => r.stat)).toEqual(['hp', 'def', 'speed', 'luck']);
    expect(RELIC_SLOTS).toBe(4);
    for (const r of RELICS) {
      expect(r.min).toBeLessThan(r.max);
      expect(hasRelicSprite(r.id)).toBe(true);
      expect(relicBoss(r.id)).not.toBeNull();
    }
    expect(Object.keys(RELIC_DROPS).map(Number)).toEqual([0, 2, 3, 5]);
  });

  it('a boss win drops its relic once per account, straight into its slot; others drop nothing', () => {
    const p = createProfile();
    expect(relicSlots(p)).toEqual([null, null, null, null]);
    const a = rollRelicDrop(p, 3, createSeededRng(3));
    expect(a.relic).toBe('silver_key');
    expect(relicSlots(a.profile)).toEqual([null, null, 'silver_key', null]);
    expect(ownedRelic(a.profile, 'silver_key').level).toBe(0);
    expect(rollRelicDrop(a.profile, 3, createSeededRng(3)).relic).toBeNull(); // already owned
    expect(rollRelicDrop(p, 1, createSeededRng(3)).relic).toBeNull(); // boss 1 drops none
  });

  it('the percent is rolled in the relic range', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const { profile } = rollRelicDrop(createProfile(), 2, createSeededRng(seed));
      const { pct } = ownedRelic(profile, 'elder_sign');
      expect(pct).toBeGreaterThanOrEqual(relicDef('elder_sign').min);
      expect(pct).toBeLessThanOrEqual(relicDef('elder_sign').max);
    }
  });

  it('dropped relics give one stat each, for every hero (computeStats craftPct)', () => {
    const { profile } = setup();
    const sum = relicPercents(profile);
    for (const r of RELICS) expect(sum[r.stat]).toBeCloseTo(ownedRelic(profile, r.id).pct, 3);
    expect(sum.atk).toBe(0);
    expect(relicPercents(createProfile())).toBeNull();
    const base = { hp: 100, atk: 100, def: 100, speed: 100, luck: 100 };
    const st = computeStats({ base, equipment: null, character: { index: 3 }, craftPct: sum });
    expect(st.total.luck).toBeCloseTo(100 * (1 + sum.luck));
  });
});

describe('relics: the Forge', () => {
  it('the fee is a share of the run gold, never below the minimum', () => {
    expect(forgeFee(0)).toBe(FORGE_FEE_MIN);
    expect(forgeFee(1e8)).toBe(1e8 * FORGE_FEE_SHARE);
  });

  it('upgrading adds a step of the rolled percent per level, paying materials and run gold', () => {
    const { profile, run } = setup();
    const res = upgradeRelic(run, profile, 'silver_key');
    expect(res.relic.after.level).toBe(1);
    const { pct } = ownedRelic(profile, 'silver_key');
    expect(relicStats('silver_key', res.relic.after).pct).toBeCloseTo(pct * (1 + RELIC_LEVEL_STEP), 3);
    for (const [m, n] of Object.entries(UPGRADE_COSTS[0])) expect(itemCount(res.profile.farm, m)).toBe(99 - n);
    expect(res.run.gold).toBe(run.gold - forgeFee(run.gold));
  });

  it('stops at the max level: twice the rolled percent', () => {
    let { profile, run } = setup(ALL_MATS, 1e9);
    for (let i = 0; i < RELIC_MAX_LEVEL; i += 1) ({ profile, run } = upgradeRelic(run, profile, 'drowned_idol'));
    const st = ownedRelic(profile, 'drowned_idol');
    expect(st.level).toBe(RELIC_MAX_LEVEL);
    expect(upgradeCost(st)).toBeNull();
    expect(forgeStatus(run, profile, 'drowned_idol', 'upgrade')).toBe('max');
    expect(relicStats('drowned_idol', st).pct).toBeCloseTo(st.pct * 2, 3);
  });

  it('a reroll draws the percent again in the range, keeping the level', () => {
    let { profile, run } = setup();
    ({ profile, run } = upgradeRelic(run, profile, 'elder_sign'));
    const res = rerollRelic(run, profile, 'elder_sign', createSequenceRng([0.5]));
    const st = ownedRelic(res.profile, 'elder_sign');
    const d = relicDef('elder_sign');
    expect(st.level).toBe(1);
    expect(st.pct).toBeCloseTo(d.min + (d.max - d.min) * 0.5, 3);
    for (const [m, n] of Object.entries(REROLL_COST)) expect(itemCount(res.profile.farm, m)).toBe(itemCount(profile.farm, m) - n);
  });

  it('refuses without materials, gold or the relic', () => {
    const { profile, run } = setup({ iron_ore: 1 });
    expect(forgeStatus(run, profile, 'silver_key', 'upgrade')).toBe('materials');
    expect(forgeStatus(run, profile, 'silver_key', 'reroll')).toBe('materials');
    const rich = setup();
    expect(forgeStatus({ ...rich.run, gold: FORGE_FEE_MIN - 1 }, rich.profile, 'silver_key', 'upgrade')).toBe('gold');
    expect(forgeStatus(rich.run, createProfile(), 'silver_key', 'upgrade')).toBe('missing');
    expect(upgradeRelic(run, profile, 'silver_key').relic).toBeNull();
  });
});

describe('relics: saves', () => {
  it('old forged relics are dropped; relics survive a reload', () => {
    const old = migrateProfile({ ...createProfile(), crafted: { 0: [{ quality: 'rare', bonus: { atk: 0.1 } }] }, forgePending: { characterIndex: 0 } });
    expect(old.crafted).toBeUndefined();
    expect(old.forgePending).toBeUndefined();
    expect(old.relics).toEqual({ owned: {} });
    const { profile } = setup();
    const back = migrateProfile(JSON.parse(JSON.stringify(profile)));
    expect(back.relics.owned).toEqual(profile.relics.owned);
  });

  it('broken entries are cleaned: unknown ids dropped, a percent out of range rolled again', () => {
    const n = normalizeRelics({ owned: { nope: { level: 2 }, silver_key: { level: 99, pct: 0.5 }, elder_sign: { level: 1, pct: 0.05 } } });
    expect(Object.keys(n.owned).sort()).toEqual(['elder_sign', 'silver_key']);
    expect(n.owned.silver_key.level).toBe(RELIC_MAX_LEVEL);
    expect(n.owned.silver_key.pct).toBeLessThanOrEqual(relicDef('silver_key').max);
    expect(n.owned.elder_sign).toEqual({ level: 1, pct: 0.05 });
  });

  it('the cheat finds every relic, or clears them', () => {
    const all = cheatRelics(createProfile(), true);
    expect(RELICS.every((r) => relicFound(all, r.id))).toBe(true);
    expect(cheatRelics(all, false).relics).toEqual({ owned: {} });
  });
});
