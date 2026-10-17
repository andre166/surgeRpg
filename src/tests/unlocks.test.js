import { describe, it, expect } from 'vitest';
import { createProfile } from '../core/persistence/profile.js';
import { migrateProfile } from '../core/persistence/saveStore.js';
import {
  ACCOUNT_UNLOCK_KINDS, ACCOUNT_UNLOCK_PRICES, accountOwned, accountBuyStatus, accountBuy, cheatAccountOwned,
} from '../core/progression/unlocks.js';
import { addEcho, equipEcho, heroEcho, unequipLockedEchoes } from '../core/echoes.js';
import { talentBuyStatus, earnTalentPoints, createTalents } from '../core/progression/talents.js';
import { classOwned } from '../core/progression/classes.js';
import { relicSlotsOwned, firstFreeRelicSlot } from '../core/crafting.js';

describe('account unlocks: echo rarities, talent tiers, relic slots, classes', () => {
  it('a new account has only the first class; each kind is bought in order with a base level and gold', () => {
    let p = createProfile();
    expect(accountOwned(p, 'classes')).toBe(1);
    for (const kind of ACCOUNT_UNLOCK_KINDS.filter((k) => k !== 'classes')) expect(accountOwned(p, kind)).toBe(0);
    for (const kind of ACCOUNT_UNLOCK_KINDS) {
      const price = ACCOUNT_UNLOCK_PRICES[kind][accountOwned(p, kind)];
      expect(accountBuyStatus(p, kind, 1e12, price.baseLevel - 1)).toBe('level');
      expect(accountBuyStatus(p, kind, price.gold - 1, price.baseLevel)).toBe('gold');
      expect(accountBuyStatus(p, kind, price.gold, price.baseLevel)).toBe('ok');
    }
    p = accountBuy(p, 'relicSlots');
    expect(accountOwned(p, 'relicSlots')).toBe(1);
    for (let i = 0; i < 9; i += 1) p = accountBuy(p, 'relicSlots');
    expect(accountBuyStatus(p, 'relicSlots', 1e12, 99)).toBe('max');
  });
  it('locks: equipping echoes of an unbought rarity, ranks in an unbought tier, forging, locked classes', () => {
    let p = addEcho(createProfile(), 'ruin_spirit'); // legendary
    expect(heroEcho(equipEcho(p, 0, 'ruin_spirit'), 0)).toBeNull();
    const all = cheatAccountOwned(p, 'echoRarities', true);
    p = equipEcho(all, 0, 'ruin_spirit');
    expect(heroEcho(p, 0)?.id).toBe('ruin_spirit');
    expect(heroEcho(unequipLockedEchoes(cheatAccountOwned(p, 'echoRarities', false)), 0)).toBeNull();

    const tal = earnTalentPoints(createTalents(), 100);
    expect(talentBuyStatus(tal, 'atk1', 0)).toBe('tier');
    expect(talentBuyStatus(tal, 'atk1', 1)).toBe('ok');

    const q = createProfile();
    expect(relicSlotsOwned(q)).toBe(0);
    expect(firstFreeRelicSlot(q, 0)).toBe(-1);
    expect(classOwned(q, 'warrior')).toBe(true);
    expect(classOwned(q, 'mage')).toBe(false);
    expect(classOwned(cheatAccountOwned(q, 'classes', false), 'warrior')).toBe(true); // the free class stays
  });
  it('old saves keep what they used', () => {
    const p = migrateProfile({
      ...createProfile(), unlocks: undefined, lastClass: 'thief',
      echoes: { owned: ['tide_guardian'], equipped: { 0: 'tide_guardian' }, mastery: {} }, // epic
      heroTalents: { 0: { points: 0, earned: 9, ranks: { atk2: 1 } } },
      crafted: { 0: [null, { quality: 'common' }] },
    });
    expect(p.unlocks).toEqual({ echoRarities: 3, talentTiers: 2, relicSlots: 2, classes: 2 });
    expect(createProfile().unlocks).toEqual({});
  });
});
