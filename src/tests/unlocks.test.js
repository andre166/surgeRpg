import { describe, it, expect } from 'vitest';
import { addEmblems, emblemCount, rollEmblemDrop } from '../core/progression/classEmblems.js';
import { createProfile } from '../core/persistence/profile.js';
import { migrateProfile } from '../core/persistence/saveStore.js';
import {
  ACCOUNT_UNLOCK_KINDS, ACCOUNT_UNLOCK_PRICES, accountOwned, accountBuyStatus, accountBuy, cheatAccountOwned,
  talentTierKind, TALENT_TIER_KINDS, CLASS_IDS, subclassKind,
} from '../core/progression/unlocks.js';
import { talentRank } from '../core/progression/talents.js';
import { classOwned, CLASSES, subclassOwned, promoteClass, autoPromoteClass } from '../core/progression/classes.js';

describe('account unlocks: talent tiers, classes', () => {
  it('a new account has only the first class; each kind is bought in order with a base level and gold', () => {
    let p = createProfile();
    expect(accountOwned(p, 'classes')).toBe(1);
    for (const kind of ACCOUNT_UNLOCK_KINDS.filter((k) => k !== 'classes')) expect(accountOwned(p, kind)).toBe(0);
    for (const kind of ACCOUNT_UNLOCK_KINDS.filter((k) => k !== 'classes')) {
      const price = ACCOUNT_UNLOCK_PRICES[kind][accountOwned(p, kind)];
      expect(accountBuyStatus(p, kind, 1e12, price.baseLevel - 1)).toBe('level');
      expect(accountBuyStatus(p, kind, price.gold - 1, price.baseLevel)).toBe('gold');
      expect(accountBuyStatus(p, kind, price.gold, price.baseLevel)).toBe('ok');
    }
    // the classes cost Class Emblems (classEmblems.js) instead of gold, from the account
    expect(ACCOUNT_UNLOCK_PRICES.classes.slice(1).map((x) => x.baseLevel)).toEqual([6, 10]);
    const cp = ACCOUNT_UNLOCK_PRICES.classes[1];
    expect(accountBuyStatus(addEmblems(p, 99), 'classes', 1e12, cp.baseLevel - 1)).toBe('level');
    expect(accountBuyStatus(addEmblems(p, cp.emblems - 1), 'classes', 1e12, cp.baseLevel)).toBe('emblems');
    expect(accountBuyStatus(addEmblems(p, cp.emblems), 'classes', 0, cp.baseLevel)).toBe('ok');
    const bought = accountBuy(addEmblems(p, cp.emblems + 2), 'classes');
    expect(accountOwned(bought, 'classes')).toBe(2);
    expect(emblemCount(bought)).toBe(2);
    // the last talent tier needs Slime King victories
    const atk = talentTierKind('atk');
    let q = p;
    for (let i = 0; i < 2; i += 1) q = accountBuy(q, atk);
    expect(accountBuyStatus(q, atk, 1e12, 99, 1)).toBe('level');
    expect(accountBuyStatus(q, atk, 1e12, 99, 2)).toBe('ok');
    p = accountBuy(p, atk);
    expect(accountOwned(p, atk)).toBe(1);
    for (let i = 0; i < 9; i += 1) p = accountBuy(p, atk);
    expect(accountBuyStatus(p, atk, 1e12, 99)).toBe('max');
  });
  it('locks: ranks in an unbought tier, locked classes', () => {
    expect(talentRank('atk1', 5, 0)).toBe(0); // tier not bought
    expect(talentRank('atk1', 5, 1)).toBe(5);

    const q = createProfile();
    expect(classOwned(q, 'warrior')).toBe(true);
    expect(classOwned(q, 'mage')).toBe(false);
    expect(classOwned(cheatAccountOwned(q, 'classes', false), 'warrior')).toBe(true); // the free class stays
  });
  it('old saves keep what they used', () => {
    const p = migrateProfile({
      ...createProfile(), unlocks: undefined, lastClass: 'thief',
      echoes: { owned: ['tide_guardian'], equipped: { 0: 'tide_guardian' }, mastery: {} }, // epic
      heroTalents: { 0: { points: 0, earned: 9, ranks: { atk2: 1 } } },
    });
    expect(p.unlocks).toMatchObject({ classes: 2, 'talentTiers:atk': 2, 'talentTiers:def': 0 });
    expect(p.unlocks).not.toHaveProperty('echoRarities');
    expect(p.echoes.owned).toEqual(['tide_guardian']); // echoes already owned stay bought
    expect(createProfile().unlocks).toEqual({});
  });
  it('talent tiers are bought per branch', () => {
    let p = accountBuy(createProfile(), talentTierKind('atk'));
    expect(TALENT_TIER_KINDS.map((k) => accountOwned(p, k))).toEqual([1, 0, 0, 0]);
    p = accountBuy(p, talentTierKind('atk'));
    expect(accountOwned(p, talentTierKind('atk'))).toBe(2);
    expect(accountOwned(p, talentTierKind('luck'))).toBe(0);
    // saves from when the tiers were bought once for every branch keep that many in each
    const old = migrateProfile({ ...createProfile(), unlocks: { talentTiers: 3, classes: 1 } });
    expect(TALENT_TIER_KINDS.map((k) => old.unlocks[k])).toEqual([3, 3, 3, 3]);
    expect(old.unlocks).not.toHaveProperty('talentTiers');
  });
});

describe('subclasses: bought per class, in order, before promoting into them', () => {
  it('CLASS_IDS follows classes.CLASSES', () => {
    expect(CLASS_IDS).toEqual(CLASSES.map((c) => c.id));
  });
  it('a subclass not bought refuses the promotion (by hand and auto); bought, it works', () => {
    let p = createProfile();
    const run = { classId: 'warrior', classPath: [], level: 10000 };
    expect(subclassOwned(p, 'fighter')).toBe(false);
    expect(promoteClass(run, 'fighter', p)).toBe(run);
    expect(autoPromoteClass(run, 'fighter', p)).toBe(run);
    expect(promoteClass(run, 'fighter').classPath).toEqual(['fighter']); // no profile: no check
    const kind = subclassKind('warrior');
    expect(accountBuyStatus(p, kind, 1e12, 1)).toBe('level');
    expect(accountBuyStatus(p, kind, 1e12, 2)).toBe('ok');
    p = accountBuy(p, kind);
    expect(promoteClass(run, 'fighter', p).classPath).toEqual(['fighter']);
    expect(promoteClass(run, 'brawler', p)).toBe(run); // the second one is not bought yet
    expect(subclassOwned(p, 'thief')).toBe(true); // base classes are not subclasses
    p = accountBuy(accountBuy(p, kind), kind);
    expect(subclassOwned(p, 'knight')).toBe(true);
    expect(ACCOUNT_UNLOCK_PRICES[kind].at(-1)).toMatchObject({ slimeKings: 2 });
  });
  it('Class Emblem drop: one at a time', () => {
    const p = createProfile();
    expect(rollEmblemDrop(p, { next: () => 0.99 }).emblems).toBe(0);
    expect(rollEmblemDrop(p, { next: () => 0 }).profile.classEmblems).toBe(1);
    expect(rollEmblemDrop(p, { next: () => 0 }).emblems).toBe(1); // one in either mode
  });
});
