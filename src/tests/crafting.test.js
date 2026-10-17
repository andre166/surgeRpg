import { describe, it, expect } from 'vitest';
import catalog from '../data/items.json';
import { createProfile as newProfile, createRun } from '../core/persistence/profile.js';
import { cheatAccountOwned, ACCOUNT_UNLOCK_KINDS } from '../core/progression/unlocks.js';

// these tests work on an account with every echo rarity, talent tier, relic slot and class bought
const createProfile = () => ACCOUNT_UNLOCK_KINDS.reduce((p, k) => cheatAccountOwned(p, k, true), newProfile());
import {
  isCraftable, spareCount, ingredientBonus, craftPreview, craftStatus, craft, heroRelics, firstFreeRelicSlot, relicPercents, RELIC_SLOTS,
} from '../core/crafting.js';
import { computeStats } from '../core/attributes/stats.js';

const lootWeapons = catalog.weapons.filter(isCraftable);
const lootAcc = catalog.accessories.filter(isCraftable);

function setup() {
  const profile = createProfile();
  const run = createRun({ characterIndex: 3, profile });
  const w = lootWeapons.slice(0, 3);
  for (const it of w) run.inventory.weapons[it.id] = 1;
  run.inventory.accessories[lootAcc[0].id] = 2;
  return { profile, run, w };
}

describe('crafting', () => {
  it('only loot (not sold, not the starting gear) can be used', () => {
    expect(isCraftable(catalog.weapons[0])).toBe(false);
    expect(isCraftable(catalog.weapons.find((i) => i.price > 0))).toBe(false);
    expect(lootWeapons.length).toBeGreaterThan(0);
  });
  it('equipped copies are not spare', () => {
    const { run } = setup();
    const acc = lootAcc[0];
    expect(spareCount(run, acc)).toBe(2);
    run.slots[2] = acc.id;
    expect(spareCount(run, acc)).toBe(1);
  });
  it('three of a kind get the set bonus', () => {
    const { w } = setup();
    const p = craftPreview(w);
    expect(p.setBonus).toBe(true);
    const raw = w.reduce((a, it) => a + ingredientBonus(it).pct, 0);
    expect(p.bonus.atk).toBeCloseTo(raw * 1.25, 2);
    expect(p.main).toBe('atk');
    expect(craftPreview([w[0], w[1], null])).toBeNull();
  });
  it('needs enough spare copies', () => {
    const { run, w } = setup();
    expect(craftStatus(run, [w[0], w[0], w[1]])).toBe('not-enough');
    expect(craftStatus(run, w)).toBe('ok');
  });
  it('forging consumes the items and fills the hero relic slots (4 per hero)', () => {
    const { profile, run, w } = setup();
    expect(heroRelics(profile, 3)).toEqual(new Array(RELIC_SLOTS).fill(null));
    const res = craft(run, profile, w);
    expect(res.relic).toBeTruthy();
    for (const it of w) expect(res.run.inventory.weapons[it.id]).toBe(0);
    expect(heroRelics(res.profile, 3)[0]).toBe(res.relic);
    expect(firstFreeRelicSlot(res.profile, 3)).toBe(1);
    expect(heroRelics(res.profile, 0).every((r) => r === null)).toBe(true); // bound to hero 3 only
  });
  it('relic bonuses of all slots add up and feed computeStats', () => {
    const { profile, run, w } = setup();
    let p = craft(run, profile, w).profile;
    const r0 = heroRelics(p, 3)[0];
    p = { ...p, crafted: { 3: [r0, r0, null, null] } };
    const pct = relicPercents(p, 3);
    expect(pct.atk).toBeCloseTo(r0.bonus.atk * 2);
    const base = { hp: 100, atk: 100, def: 100, speed: 100, luck: 100 };
    const s = computeStats({ base, equipment: null, character: { index: 3 }, craftPct: pct });
    expect(s.total.atk).toBeCloseTo(100 * (1 + pct.atk));
    expect(relicPercents(p, 0)).toBeNull();
  });
  it('forging into a filled slot replaces that relic', () => {
    const { profile, run, w } = setup();
    const first = craft(run, profile, w);
    const run2 = { ...first.run, inventory: { ...first.run.inventory, weapons: first.run.inventory.weapons.map((n, i) => (w.some((x) => x.id === i) ? 1 : n)) } };
    const second = craft(run2, first.profile, w, 0);
    expect(heroRelics(second.profile, 3)[0]).toBe(second.relic);
    expect(heroRelics(second.profile, 3).filter(Boolean).length).toBe(1);
  });
  it('permanent copies are consumed too, so discarding the run cannot duplicate items', () => {
    const { profile, run, w } = setup();
    const prof = { ...profile, inventory: { ...profile.inventory, weapons: run.inventory.weapons.slice() } };
    const res = craft(run, prof, w);
    for (const it of w) expect(res.profile.inventory.weapons[it.id]).toBe(0);
  });
});
