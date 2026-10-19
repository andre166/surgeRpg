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
  it('warrior: +4% HP, +2% ATK, +3% DEF (no negative stats), no passive', () => {
    const s = stats('warrior');
    expect(s.total.hp).toBeCloseTo(104);
    expect(s.total.atk).toBeCloseTo(102);
    expect(s.total.def).toBeCloseTo(103);
    expect(s.total.speed).toBeCloseTo(100);
    expect(s.modifiers.critDamageMultiplier).toBe(1);
    expect(s.modifiers.drainSmall).toBeFalsy();
  });
  it('thief: +5% AGI and LUCK (no negative stats), no passive', () => {
    const s = stats('thief');
    expect(s.total.speed).toBeCloseTo(105);
    expect(s.total.luck).toBeCloseTo(105);
    expect(s.total.hp).toBeCloseTo(100);
    expect(s.modifiers.critRatePlus).toBe(0);
    expect(s.modifiers.comboRatePlus).toBe(0);
  });
  it('mage: +6% ATK (no negative stats), no passive', () => {
    const s = stats('mage');
    expect(s.total.atk).toBeCloseTo(106);
    expect(s.total.def).toBeCloseTo(100);
    expect(s.modifiers.critRatePlus).toBe(0);
    expect(s.modifiers.expMultiplier).toBeCloseTo(1);
    expect(s.modifiers.forcedCritHits).toBe(0);
  });
});

describe('class trees', () => {
  it('each class branches into 3 subclasses at LV 10,000, each with a line of 3 specialisations', () => {
    for (const c of CLASSES) {
      const subs = classChildren(c.root.id);
      expect(subs).toHaveLength(3);
      for (const sub of subs) {
        expect(sub.minLevel).toBe(10000);
        const line = classLine(sub.id);
        expect(line.map((n) => n.minLevel)).toEqual([40000, 75000, 180000]);
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
    expect(classNode('gambler').pct.luck).toBeCloseTo(0.06); // 0.2 x 1.5 (3rd step) x 0.2 (CLASS_STAT_FACTOR)
    expect(classNode('shadow').mods.critRate).toBeCloseTo(0.0525); // 0.14 x 1.5 x 0.25 (CLASS_MOD_FACTOR)
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
    let run = { classId: 'thief', classTier: 0, classPath: [], level: 9999 };
    expect(canPromoteClass(run)).toBe(false);
    expect(promoteClass(run, 'hunter')).toBe(run);
    run = { ...run, level: 10000 };
    expect(nextClassOptions(run).map((n) => n.id)).toEqual(['rogue', 'hunter', 'trickster']);
    run = promoteClass(run, 'hunter');
    expect(run.classPath).toEqual(['hunter']);
    expect(run.classTier).toBe(1);
    expect(canPromoteClass(run)).toBe(false); // the line starts at LV 40,000
    run = { ...run, level: 180000 };
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
    expect(s.total.def).toBeCloseTo(112); // scout (hunter: crit + defense), 2nd step: 0.48 x 1.25 x 0.2
    expect(s.modifiers.expMultiplier).toBeCloseTo(1);
    expect(s.modifiers.maxBattlePoints).toBe(30);
  });
  it('runs promoted before the trees keep their former path (tier -> knight/paladin, rogue/assassin, sorcerer/archmage)', () => {
    expect(classPathOf({ classId: 'thief', classTier: 2 })).toEqual(['rogue', 'assassin']);
    const s = computeStats({ base, equipment: null, character: { index: 0 }, classId: 'thief', classTier: 2 });
    expect(s.total.speed).toBeCloseTo(109);
    expect(s.modifiers.critRatePlus).toBeCloseTo(0.03);
    expect(s.modifiers.forcedCritHits).toBe(0);
    expect(classTierDef('warrior', 1).id).toBe('knight');
  });
  it('runs without a class cannot promote', () => {
    expect(canPromoteClass({ classId: null, level: 9999 })).toBe(false);
  });
});

describe('auto class promotion', () => {
  it('follows the saved branch: into the subclass, then up its line as the level allows', async () => {
    const { autoPromoteClass } = await import('../core/progression/classes.js');
    let run = { classId: 'thief', classTier: 0, classPath: [], level: 5000 };
    expect(autoPromoteClass(run, 'trickster')).toBe(run); // LV 10,000 not reached
    run = autoPromoteClass({ ...run, level: 100000 }, 'trickster');
    expect(run.classPath).toEqual(['trickster', 'illusionist', 'pirate']);
    run = autoPromoteClass({ ...run, level: 1e6 }, 'trickster');
    expect(run.classPath).toEqual(['trickster', 'illusionist', 'pirate', 'gambler']);
  });
  it('leaves runs on another branch, without a branch, or with a foreign branch alone', async () => {
    const { autoPromoteClass } = await import('../core/progression/classes.js');
    const other = { classId: 'thief', classPath: ['hunter'], classTier: 1, level: 1e6 };
    expect(autoPromoteClass(other, 'trickster')).toBe(other);
    const fresh = { classId: 'thief', classPath: [], classTier: 0, level: 1e6 };
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

describe('class stats are a small help', () => {
  it('no class node has a negative stat, and none gives more than +30%', () => {
    const all = CLASSES.flatMap((c) => [c.root, ...classChildren(c.id).flatMap((s) => [s, ...classLine(s.id)])]);
    expect(all).toHaveLength(39);
    for (const n of all) for (const v of Object.values(n.pct)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(0.3); }
  });
});

describe('class passives are a small help (about one Inflation RPG ring at most)', () => {
  it('caps rates near one ring; every passive is chance based (no fixed bonus)', () => {
    const all = CLASSES.flatMap((c) => [c.root, ...classChildren(c.id).flatMap((s) => [s, ...classLine(s.id)])]);
    for (const { mods } of all) {
      expect(mods.critDamage ?? 0).toBeLessThanOrEqual(0.3); // Critical Damage Ring: +0.2
      expect(mods.critRate ?? 0).toBeLessThanOrEqual(0.08); // Critical Rate Ring: +8%
      expect(mods.combo ?? 0).toBeLessThanOrEqual(0.09); // Combo Rate Ring: +9%
      expect(Object.keys(mods).every((k) => ['critRate', 'combo', 'critDamage', 'deathGuard', 'growth'].includes(k))).toBe(true);
      expect(mods.deathGuard ?? 0).toBeLessThanOrEqual(1);
    }
  });
});

describe('adventurer line: luck growing with the account', () => {
  it('each step adds a source, each source is capped', async () => {
    const { classGrowth, accountProgress } = await import('../core/progression/classes.js');
    const none = { wins: 0, species: 0, runs: 0, slimeKings: 0 };
    const some = { wins: 1499, species: 20, runs: 30, slimeKings: 3 };
    const huge = { wins: 1e9, species: 1e9, runs: 1e9, slimeKings: 1e9 };
    expect(classGrowth(classNode('brawler'), none).pct).toBe(0);
    expect(classGrowth(classNode('brawler'), { wins: 500 }).pct).toBeCloseTo(0.01); // 500 wins
    expect(classGrowth(classNode('brawler'), some).pct).toBeCloseTo(0.015); // growth.cap
    expect(classGrowth(classNode('berserker'), some).pct).toBeCloseTo(0.025); // cap
    expect(classGrowth(classNode('monk'), some).pct).toBeCloseTo(0.04); // cap
    expect(classGrowth(classNode('barbarian'), some).pct).toBeCloseTo(0.045); // cap
    expect(classGrowth(classNode('barbarian'), huge).pct).toBeCloseTo(0.045);
    expect(classGrowth(classNode('knight'), huge).pct).toBe(0);
    // slimeKings is the SK: different Slime Kings beaten (4 wins over the same one count once)
    const p = { winBattles: 7, gameOverCount: 2, slimeKingsBeaten: { 1: 1, 2: 1 }, bestiary: { a: { defeated: 1 }, b: { seen: 3, defeated: 0 }, 'slime#1': { defeated: 4 } } };
    expect(accountProgress(p, { battlesUsed: 12 })).toEqual({ wins: 7, species: 1, runs: 2, slimeKings: 2, bp: 12, bosses: 0 });
    const base = { hp: 100, atk: 10, def: 10, speed: 5, luck: 100 };
    const s = computeStats({ base, equipment: null, character: { index: 0 }, classId: 'warrior', classPath: ['brawler'], account: some });
    expect(s.total.luck).toBeCloseTo(100 * (1 + 0.15 * 0.2 + 0.015));
  });
});

describe('knight line and the class lethal-hit guard', () => {
  it('knight HP halved, rune knight HP and DEF halved', () => {
    expect(classNode('knight').pct.hp).toBeCloseTo(0.045);
    expect(classNode('rune_knight').pct.hp).toBeCloseTo(0.0825); // 0.275 x 1.5 x 0.2
    expect(classNode('rune_knight').pct.def).toBeCloseTo(0.09);
  });
  it('guard: knight line 4 / 8.5 / 11 / 14.5%, others 13.5%, only once per battle', async () => {
    const { createBattle, step, PHASE } = await import('../core/battle/engine.js');
    const { createSequenceRng } = await import('../core/rng/rng.js');
    const { CLASS_GUARD_CHANCE } = await import('../core/progression/classes.js');
    expect(CLASS_GUARD_CHANCE).toBeCloseTo(0.45 * 0.3);
    const base = { hp: 100, atk: 10, def: 10, speed: 5, luck: 1 };
    const s = computeStats({ base, equipment: null, character: { index: 0 }, classId: 'warrior', classPath: ['knight'] });
    expect(s.modifiers.classGuard).toBeCloseTo(0.04); // knight
    expect(['knight', 'paladin', 'guardian', 'rune_knight'].map((id) => classNode(id).mods.deathGuard)).toEqual([0.04, 0.085, 0.11, 0.145]);
    expect(classNode('cleric').mods.deathGuard).toBeCloseTo(CLASS_GUARD_CHANCE); // other classes keep 13.5%
    expect(s.modifiers.deathGuard).toBe(0); // the accessories' guard is untouched
    let b = createBattle({ player: { maxHp: 100, atk: 10, def: 10, modifiers: s.modifiers }, enemy: { hp: 100, atk: 1e9, skills: [] } });
    const hit = (st) => step({ ...st, phase: PHASE.ENEMY_TURN, player: { ...st.player, hp: 50 } }, createSequenceRng([0]));
    const first = hit(b);
    expect(first.state.player.hp).toBe(1);
    expect(first.state.classGuardUsed).toBe(true);
    const second = hit(first.state);
    expect(second.state.player.hp).toBe(0);
  });
});

describe('fighter line: ATK growing with battles, BP, Slime Kings and bosses', () => {
  it('each step adds a source; BP counts the current run', async () => {
    const { classGrowth } = await import('../core/progression/classes.js');
    const a = { wins: 1000, bp: 10, slimeKings: 2, bosses: 4 };
    expect(classGrowth(classNode('fighter'), a)).toEqual({ stat: 'atk', pct: 0.02 });
    expect(classGrowth(classNode('champion'), a).pct).toBeCloseTo(0.04); // + 10 BP
    expect(classGrowth(classNode('gladiator'), a).pct).toBeCloseTo(0.06); // + 2 Slime Kings
    expect(classGrowth(classNode('weapon_master'), a).pct).toBeCloseTo(0.08); // + base level 4
    expect(classGrowth(classNode('weapon_master'), { wins: 1e9, bp: 1e9, slimeKings: 1e9, bosses: 1e9 }).pct).toBeCloseTo(0.09); // growth.cap
  });
  it('knight line grows in order: knight < paladin < guardian < rune knight', () => {
    const sum = (id) => Object.values(classNode(id).pct).reduce((s, v) => s + v, 0);
    expect(sum('knight')).toBeLessThan(sum('paladin'));
    expect(sum('paladin')).toBeLessThan(sum('guardian'));
    expect(sum('guardian')).toBeLessThan(sum('rune_knight'));
  });
});

describe('fighter line ATK stays a small help', () => {
  it('fixed ATK + full growth: 6 / 9 / 12 / 15% along the line, never above 15%', async () => {
    const { classGrowth } = await import('../core/progression/classes.js');
    const max = { wins: 1e9, bp: 1e9, slimeKings: 1e9, bosses: 1e9, species: 1e9, runs: 1e9 };
    const total = (id) => classNode(id).pct.atk + classGrowth(classNode(id), max).pct;
    expect(['fighter', 'champion', 'gladiator', 'weapon_master'].map((id) => +total(id).toFixed(4))).toEqual([0.06, 0.09, 0.12, 0.15]);
  });
});

describe('thief branches', () => {
  it('rogue = crit + agility, hunter = crit + defense, trickster = luck; 6 / 9 / 12 / 15% along each line', async () => {
    const { classGrowth } = await import('../core/progression/classes.js');
    const max = { wins: 1e9, bp: 1e9, slimeKings: 1e9, bosses: 1e9, species: 1e9, runs: 1e9 };
    const line = (sub, stat) => [sub, ...classLine(sub).map((n) => n.id)].map((id) => +(classNode(id).pct[stat] + classGrowth(classNode(id), max).pct).toFixed(4));
    expect(line('rogue', 'speed')).toEqual([0.06, 0.09, 0.12, 0.15]);
    expect(line('hunter', 'def')).toEqual([0.06, 0.09, 0.12, 0.15]);
    expect(line('trickster', 'luck')).toEqual([0.06, 0.09, 0.12, 0.15]);
    for (const id of ['rogue', 'shadow', 'hunter', 'beastmaster']) expect(classNode(id).mods.critRate).toBeGreaterThan(0);
    // the trickster line is the luck class: above the warrior's adventurer at every step
    expect(line('brawler', 'luck')).toEqual([0.045, 0.065, 0.09, 0.12]);
  });
});
