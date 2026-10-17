import { describe, it, expect } from 'vitest';
import { CLASSES, heroClass, classTierDef, canPromoteClass, promoteClass, nextClassTier, classChildren, classLine, classNode, nextClassOptions, classPathOf, runClassNode } from '../core/progression/classes.js';
import { computeStats } from '../core/attributes/stats.js';

const base = { hp: 100, atk: 100, def: 100, speed: 100, luck: 100 };
const stats = (classId) => computeStats({ base, equipment: null, character: { index: 0 }, classId });

describe('hero classes', () => {
  it('has warrior, thief and mage', () => {
    expect(CLASSES.map((c) => c.id)).toEqual(['warrior', 'thief', 'mage']);
    expect(heroClass('nope')).toBeNull();
  });
  it('no class keeps the original numbers', () => {
    expect(stats(null).total).toEqual(base);
  });
  it('warrior: +20% HP, +10% ATK, +15% DEF, -10% AGI, heavier crits and drain', () => {
    const s = stats('warrior');
    expect(s.total.hp).toBeCloseTo(120);
    expect(s.total.atk).toBeCloseTo(110);
    expect(s.total.def).toBeCloseTo(115);
    expect(s.total.speed).toBeCloseTo(90);
    expect(s.modifiers.critDamageMultiplier).toBeCloseTo(1.3);
    expect(s.modifiers.drainSmall).toBe(true);
  });
  it('thief: +25% AGI and LUCK, -10% HP, better crit and combo rates', () => {
    const s = stats('thief');
    expect(s.total.speed).toBeCloseTo(125);
    expect(s.total.luck).toBeCloseTo(125);
    expect(s.total.hp).toBeCloseTo(90);
    expect(s.modifiers.critRatePlus).toBeCloseTo(0.05);
    expect(s.modifiers.comboRatePlus).toBeCloseTo(0.05);
  });
  it('mage: +30% ATK, -15% DEF, -10% HP, +20% EXP and a guaranteed first crit', () => {
    const s = stats('mage');
    expect(s.total.atk).toBeCloseTo(130);
    expect(s.total.def).toBeCloseTo(85);
    expect(s.modifiers.expMultiplier).toBeCloseTo(1.2);
    expect(s.modifiers.forcedCritHits).toBe(1);
  });
});

describe('class trees', () => {
  it('each class branches into 3 subclasses at LV 200, each with a line of 3 specialisations', () => {
    for (const c of CLASSES) {
      const subs = classChildren(c.root.id);
      expect(subs).toHaveLength(3);
      for (const sub of subs) {
        expect(sub.minLevel).toBe(200);
        const line = classLine(sub.id);
        expect(line.map((n) => n.minLevel)).toEqual([1000, 2000, 5000]);
        expect(classChildren(sub.id)).toHaveLength(1); // no choice after the subclass
        expect(classChildren(line[2].id)).toHaveLength(0);
      }
    }
    expect(classChildren('warrior').map((n) => n.id)).toEqual(['fighter', 'brawler', 'knight']);
    expect(classLine('trickster').map((n) => n.id)).toEqual(['illusionist', 'pirate', 'gambler']);
  });
  it('each step of a line is stronger than the one before', () => {
    const [a, b, c] = classLine('trickster');
    expect(b.pct.luck).toBeGreaterThan(a.pct.luck); // scaled positive percents: pirate .75 > illusionist .7
    expect(classNode('gambler').pct.luck).toBeCloseTo(1.5);
    expect(classNode('gambler').mods.critRate).toBeCloseTo(0.27);
    expect(c.minLevel).toBeGreaterThan(b.minLevel);
  });
  it('every class has a name in both languages', async () => {
    const pt = (await import('../ui/i18n/pt.js')).default;
    const en = (await import('../ui/i18n/en.js')).default;
    const ids = [];
    const walk = (n) => { ids.push(n.id); classChildren(n.id).forEach(walk); };
    CLASSES.forEach((c) => walk(c.root));
    expect(ids).toHaveLength(39);
    for (const id of ids) { expect(pt['class.' + id], id).toBeTruthy(); expect(en['class.' + id], id).toBeTruthy(); }
  });
});

describe('class promotion', () => {
  it('promotes into the chosen subclass, then along its line in order', () => {
    let run = { classId: 'thief', classTier: 0, classPath: [], level: 199 };
    expect(canPromoteClass(run)).toBe(false);
    expect(promoteClass(run, 'hunter')).toBe(run);
    run = { ...run, level: 200 };
    expect(nextClassOptions(run).map((n) => n.id)).toEqual(['rogue', 'hunter', 'trickster']);
    run = promoteClass(run, 'hunter');
    expect(run.classPath).toEqual(['hunter']);
    expect(run.classTier).toBe(1);
    expect(canPromoteClass(run)).toBe(false); // the line starts at LV 1000
    run = { ...run, level: 5000 };
    expect(nextClassOptions(run).map((n) => n.id)).toEqual(['sharpshooter']); // no choice
    expect(promoteClass(run, 'scout')).toBe(run); // cannot skip ahead
    run = promoteClass(promoteClass(promoteClass(run)));
    expect(run.classPath).toEqual(['hunter', 'sharpshooter', 'scout', 'beastmaster']);
    expect(runClassNode(run).id).toBe('beastmaster');
    expect(nextClassTier(run)).toBeNull();
    expect(canPromoteClass(run)).toBe(false);
  });
  it('the chosen node replaces the base bonuses', () => {
    const s = computeStats({ base, equipment: null, character: { index: 0 }, classId: 'thief', classPath: ['hunter', 'sharpshooter', 'scout'] });
    expect(s.total.speed).toBeCloseTo(175); // scout, 2nd step: +60% x 1.25
    expect(s.modifiers.expMultiplier).toBeCloseTo(1.3125);
    expect(s.modifiers.maxBattlePoints).toBe(33);
  });
  it('runs promoted before the trees keep their former path (tier -> knight/paladin, rogue/assassin, sorcerer/archmage)', () => {
    expect(classPathOf({ classId: 'thief', classTier: 2 })).toEqual(['rogue', 'assassin']);
    const s = computeStats({ base, equipment: null, character: { index: 0 }, classId: 'thief', classTier: 2 });
    expect(s.total.speed).toBeCloseTo(160);
    expect(s.modifiers.critRatePlus).toBeCloseTo(0.12);
    expect(s.modifiers.forcedCritHits).toBe(1);
    expect(classTierDef('warrior', 1).id).toBe('knight');
  });
  it('runs without a class cannot promote', () => {
    expect(canPromoteClass({ classId: null, level: 9999 })).toBe(false);
  });
});

describe('auto class promotion', () => {
  it('follows the saved branch: into the subclass, then up its line as the level allows', async () => {
    const { autoPromoteClass } = await import('../core/progression/classes.js');
    let run = { classId: 'thief', classTier: 0, classPath: [], level: 150 };
    expect(autoPromoteClass(run, 'trickster')).toBe(run); // LV 200 not reached
    run = autoPromoteClass({ ...run, level: 2500 }, 'trickster');
    expect(run.classPath).toEqual(['trickster', 'illusionist', 'pirate']);
    run = autoPromoteClass({ ...run, level: 9000 }, 'trickster');
    expect(run.classPath).toEqual(['trickster', 'illusionist', 'pirate', 'gambler']);
  });
  it('leaves runs on another branch, without a branch, or with a foreign branch alone', async () => {
    const { autoPromoteClass } = await import('../core/progression/classes.js');
    const other = { classId: 'thief', classPath: ['hunter'], classTier: 1, level: 9000 };
    expect(autoPromoteClass(other, 'trickster')).toBe(other);
    const fresh = { classId: 'thief', classPath: [], classTier: 0, level: 9000 };
    expect(autoPromoteClass(fresh, null)).toBe(fresh);
    expect(autoPromoteClass(fresh, 'brawler')).toBe(fresh); // a warrior branch
  });
});

describe('class reset', () => {
  it('costs gold that grows with the level and puts the class back at its base', async () => {
    const { classResetCost, classResetStatus, resetClass } = await import('../core/progression/classes.js');
    expect(classResetCost(200)).toBeLessThan(classResetCost(2000));
    const run = { classId: 'thief', classPath: ['trickster', 'illusionist'], classTier: 2, level: 1500, gold: 10 };
    expect(classResetStatus(run)).toBe('no-gold');
    expect(resetClass(run)).toBe(run);
    const rich = { ...run, gold: classResetCost(1500) + 5 };
    const r = resetClass(rich);
    expect(r.classPath).toEqual([]);
    expect(r.classTier).toBe(0);
    expect(r.gold).toBe(5);
    expect(classResetStatus(r)).toBe('base');
  });
});
