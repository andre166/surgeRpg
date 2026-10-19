import { describe, it, expect } from 'vitest';
import { createProfile as newProfile } from '../core/persistence/profile.js';
import { cheatAccountOwned, ACCOUNT_UNLOCK_KINDS } from '../core/progression/unlocks.js';

// these tests work on an account with every talent tier, relic slot and class bought
const createProfile = () => ACCOUNT_UNLOCK_KINDS.reduce((p, k) => cheatAccountOwned(p, k, true), newProfile());
import { ECHOES, echoDef, addEcho, equipEcho, unequipEcho, heroEcho, echoHolders, ownsEcho, echoUnlocked, echoBuyStatus, buyEcho, echoFound, revealEcho, cheatEchoesOwned, cheatEchoMastery, masteryLevel, applyMastery, gainEchoXp, masteryInfo, heroEchoMastered, echoXp, MASTERY_MAX, RARITY_SCALE } from '../core/echoes.js';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import { createWorld } from '../core/world/world.js';
import { startRun, startBattle, finishBattle } from '../core/session/session.js';
import { computeStats } from '../core/attributes/stats.js';
import { createBattle, step, isOver } from '../core/battle/engine.js';
import { createSeededRng } from '../core/rng/rng.js';

const base = { hp: 100, atk: 100, def: 100, speed: 100, luck: 100 };

describe('ancestral echoes', () => {
  it("three legendaries: the Sleeper of R'lyeh, the Moon Moth Queen and the Tentacle King", () => {
    const e = echoDef('ruin_spirit');
    expect(e.rarity).toBe('legendary');
    expect(e.affinity).toBe('dark');
    expect(e.skill).toEqual({ every: 6, kind: 'burst', power: 0.525 }); // 5% x 1.75 x 6 hits
    expect(e.resonance).toEqual({ kind: 'spirit', power: 1.75 });
    expect(e.passive).toEqual({ pct: { hp: 0.036, atk: 0.038 } }); // set by hand
    expect(echoDef('abyss_eye').passive).toEqual({ mods: { critRatePlus: 0.03, critDamageMultiplier: 0.041 } });
    // the Queen and the King: passives set by hand
    expect(echoDef('moth_queen').passive).toEqual({ pct: { luck: 0.022, def: 0.007, hp: 0.004, atk: 0.005 }, mods: { critRatePlus: 0.018, critDamageMultiplier: 0.04, moveSpeedPct: 0.018 } });
    expect(echoDef('tentacle_king').passive).toEqual({ pct: { luck: 0.031, def: 0.007, hp: 0.004, atk: 0.005 }, mods: { goldBonus: 0.021, expMultiplier: 0.028, moveSpeedPct: 0.018 } });
  });
  it('account collection: one echo per hero, the same echo can be on several heroes', () => {
    let p = createProfile();
    expect(equipEcho(p, 0, 'ruin_spirit')).toBe(p); // not owned
    p = addEcho(p, 'ruin_spirit');
    expect(ownsEcho(p, 'ruin_spirit')).toBe(true);
    p = equipEcho(p, 0, 'ruin_spirit');
    expect(heroEcho(p, 0).id).toBe('ruin_spirit');
    p = equipEcho(p, 5, 'ruin_spirit'); // hero 0 keeps it
    expect(heroEcho(p, 0).id).toBe('ruin_spirit');
    expect(echoHolders(p, 'ruin_spirit')).toEqual([0, 5]);
    p = addEcho(p, 'tide_guardian');
    p = equipEcho(p, 0, 'tide_guardian'); // replaces hero 0's echo only
    expect(echoHolders(p, 'ruin_spirit')).toEqual([5]);
    p = unequipEcho(p, 5);
    expect(echoHolders(p, 'ruin_spirit')).toEqual([]);
  });
  it('passive feeds computeStats', () => {
    const s = computeStats({ base, equipment: null, character: { index: 0 }, echoId: 'moth_queen' });
    expect(s.modifiers.critDamageMultiplier).toBeCloseTo(1 + echoDef('moth_queen').passive.mods.critDamageMultiplier);
    const t = computeStats({ base, equipment: null, character: { index: 0 }, echoId: 'tide_guardian' });
    expect(t.total.luck).toBeCloseTo(100 * 1.056); // Gato das Sete Vidas: LUCK +5.6%
    expect(echoDef('tide_guardian').passive.mods).toEqual({ comboRatePlus: 0.02 });
  });
  it('skill fires every N player hits', () => {
    const echo = echoDef('tentacle_king'); // every 5
    const mods = computeStats({ base, equipment: null, character: { index: 0 } }).modifiers;
    let s = createBattle({
      player: { hp: 1e9, maxHp: 1e9, atk: 10, def: 1e9, modifiers: mods, echo },
      enemy: { name: 'dummy', hp: 1e12, maxHp: 1e12, atk: 1, critRate: 0, comboRate: 0, point: 1, skills: [] },
    });
    const rng = createSeededRng(1);
    let hits = 0;
    let bursts = 0;
    while (hits < 10 && !isOver(s)) {
      const r = step(s, rng);
      s = r.state;
      hits += r.events.filter((e) => e.type === 'playerHit').length;
      bursts += r.events.filter((e) => e.type === 'echoSkill').length;
    }
    expect(bursts).toBe(2);
  });
  it('resonance triggers once when the hero drops below half HP', () => {
    const echo = echoDef('tide_guardian');
    const mods = computeStats({ base, equipment: null, character: { index: 0 } }).modifiers;
    let s = createBattle({
      player: { hp: 1000, maxHp: 1000, atk: 1, def: 1, modifiers: mods, echo },
      enemy: { name: 'dummy', hp: 1e12, maxHp: 1e12, atk: 300, critRate: 0, comboRate: 0, point: 1, skills: [] },
    });
    const rng = createSeededRng(2);
    let res = 0;
    for (let i = 0; i < 200 && !isOver(s); i += 1) {
      const r = step(s, rng);
      s = r.state;
      res += r.events.filter((e) => e.type === 'echoResonance').length;
    }
    expect(res).toBe(1);
  });
  it('each echo is unlocked by the base level (the last ones by Slime Kings), then dropped, then bought with gold', () => {
    const fresh = createProfile();
    for (const e of ECHOES) {
      const p = revealEcho(fresh, e.id);
      const { baseLevel = 0, slimeKings = 0, gold } = e.unlock;
      const below = slimeKings ? [99, slimeKings - 1] : [baseLevel - 1, 0];
      const met = slimeKings ? [99, slimeKings] : [baseLevel, 0];
      expect(echoUnlocked(e.id, ...below)).toBe(false);
      expect(echoUnlocked(e.id, ...met)).toBe(true);
      expect(echoBuyStatus(p, e.id, 1e15, ...below)).toBe('level');
      expect(echoBuyStatus(fresh, e.id, 1e15, ...met)).toBe('drop'); // not dropped yet
      expect(echoFound(fresh, e.id)).toBe(false);
      expect(echoFound(p, e.id)).toBe(true);
      expect(echoBuyStatus(p, e.id, gold - 1, ...met)).toBe('gold');
      expect(echoBuyStatus(p, e.id, gold, ...met)).toBe('ok');
    }
    expect(ECHOES.map((e) => e.unlock.baseLevel ?? `slime${e.unlock.slimeKings}`)).toEqual([2, 4, 6, 10, 13, 15, 14, 16, 'slime2', 'slime4', 'slime6', 'slime8']);
    // three of each rarity, weakest first
    expect(ECHOES.map((e) => e.rarity)).toEqual(['common', 'common', 'common', 'rare', 'rare', 'rare', 'epic', 'epic', 'epic', 'legendary', 'legendary', 'legendary']);
    // every unlock is reachable (the base level tops out at 29, one per map boss)
    expect(ECHOES.every((e) => (e.unlock.baseLevel ?? 0) <= 29)).toBe(true);
    let p = fresh;
    expect(equipEcho(p, 0, 'ember_wisp')).toBe(p); // not bought
    p = buyEcho(p, 'ember_wisp');
    expect(ownsEcho(p, 'ember_wisp')).toBe(true);
    expect(echoBuyStatus(p, 'ember_wisp', 1e15, 99)).toBe('owned');
    expect(ownsEcho(p, 'moss_sprite')).toBe(false); // bought one by one
  });
  it('cheat: every echo bought, or none (and unequipped)', () => {
    let p = cheatEchoesOwned(createProfile(), true);
    expect(ECHOES.every((e) => ownsEcho(p, e.id))).toBe(true);
    p = equipEcho(p, 0, 'ruin_spirit');
    p = cheatEchoesOwned(p, false);
    expect(ownsEcho(p, 'ruin_spirit')).toBe(false);
    expect(heroEcho(p, 0)).toBeNull();
  });
});

describe('echo balance (like the subclasses)', () => {
  // even the strongest echo at full mastery is about one accessory / a specialisation's main stat
  const CAPS = { critRatePlus: 0.08, critDamageMultiplier: 0.2, comboRatePlus: 0.09, expMultiplier: 0.1, goldBonus: 0.1 };
  // set by hand above the rule: Duende gold 12%, Rei Tentacular LUCK 10.5% (both before mastery)
  const HAND_SET = new Set(['stone_colossus goldBonus', 'tentacle_king luck']);
  it('at full mastery every passive stays within one accessory, every stat within 15%', () => {
    for (const e of ECHOES) {
      const m = applyMastery(e, MASTERY_MAX);
      for (const [k, v] of Object.entries(m.passive.mods)) if (typeof v === 'number' && !HAND_SET.has(`${e.id} ${k}`) && e.exact?.mods?.[k] == null) expect(v, `${e.id} ${k}`).toBeLessThanOrEqual(CAPS[k] + 1e-9);
      for (const [k, v] of Object.entries(m.passive.pct)) if (!HAND_SET.has(`${e.id} ${k}`) && e.exact?.pct?.[k] == null) expect(v, `${e.id} ${k}`).toBeLessThanOrEqual(0.15);
    }
  });
  it('the burst skill adds a share of the hero damage that grows with rarity', () => {
    const share = (e, lv) => { const m = applyMastery(e, lv); return m.skill.power / m.skill.every; };
    // (the Duende's skill is set by hand: 20% every 4 attacks)
    const bursts = ECHOES.filter((e) => e.skill.kind === 'burst' && e.id !== 'stone_colossus');
    for (const e of bursts) {
      expect(share(e, 1)).toBeCloseTo(0.05 * RARITY_SCALE[e.rarity]); // the same for every echo of a rarity
      expect(share(e, MASTERY_MAX), e.id).toBeCloseTo(share(e, 1)); // mastery leaves the skill alone
    }
  });
});

describe('hand-set echoes', () => {
  it('Rei Tentacular: LUCK 3.1%, no longer growing with the account', () => {
    const e = echoDef('tentacle_king');
    expect(e.passive.pct.luck).toBeCloseTo(0.031);
    expect(e.growth).toBeUndefined();
    const at = (account) => computeStats({ base, equipment: null, character: { index: 0 }, echoId: 'tentacle_king', account }).total.luck;
    const lots = { wins: 1e6, species: 1e3, runs: 1e3, slimeKings: 99 };
    expect(at(lots)).toBeCloseTo(at({}));
  });
  it('Duende LUCK 10% / gold 8% / +4% map speed, Lâmpada-Fátua heals 4.1% and resonates 16.5%, the slime heals 0.3% every 3 hits', () => {
    expect(echoDef('stone_colossus').passive).toEqual({ pct: { luck: 0.1 }, mods: { goldBonus: 0.08, moveSpeedPct: 0.04 } });
    expect(echoDef('stone_colossus').skill).toEqual({ every: 4, kind: 'burst', power: 0.2 });
    expect(echoDef('stone_colossus').resonance).toEqual({ kind: 'spirit', power: 0.5 });
    expect(echoDef('dawn_saint').skill).toEqual({ every: 5, kind: 'heal', power: 0.041 });
    expect(echoDef('dawn_saint').resonance).toMatchObject({ kind: 'heal', power: 0.165 });
    expect(echoDef('moss_sprite').skill).toEqual({ every: 3, kind: 'heal', power: 0.003 });
  });
});

describe('hand-set echoes: extra stats', () => {
  it('Grimório, Fagulha and Slime get the stats set by hand, on top of the rest', () => {
    expect(echoDef('wailing_soul').passive).toEqual({ pct: { def: 0.008 }, mods: { expMultiplier: 0.05 } });
    expect(echoDef('ember_wisp').passive.pct).toEqual({ atk: 0.02, hp: 0.007, speed: 0.004 });
    expect(echoDef('moss_sprite').passive.pct).toEqual({ hp: 0.038, def: 0.014, luck: 0.008 });
    expect(echoDef('moth_queen').resonance).toEqual({ kind: 'heal', power: 0.18, strike: 1 });
  });
  it('Lâmpada-Fátua: ATK 2.1%, HP 0.8%, +2% walking speed, no drain, and its healing resonance also strikes for 30%', () => {
    const e = echoDef('dawn_saint');
    expect(e.passive.pct).toEqual({ atk: 0.021, hp: 0.008 });
    // Fantasma Abóbora crit 5%, Sereia combo 3% and a 90% resonance
    expect(echoDef('night_shade').passive).toEqual({ mods: { critRatePlus: 0.05 } });
    expect(echoDef('gale_dancer').passive).toEqual({ mods: { comboRatePlus: 0.03 } });
    expect(echoDef('gale_dancer').resonance).toEqual({ kind: 'spirit', power: 0.9 });
    const s = computeStats({ base, equipment: null, character: { index: 0 }, echoId: 'dawn_saint' });
    const none = computeStats({ base, equipment: null, character: { index: 0 } });
    expect(s.modifiers.moveSpeed).toBeCloseTo(none.modifiers.moveSpeed * 1.02);
    expect(s.modifiers.drainSmall).toBe(false);
    expect(e.resonance).toEqual({ kind: 'heal', power: 0.165, strike: 0.3 });
    expect(applyMastery(e, 5).resonance).toEqual(e.resonance); // mastery leaves the resonance alone
    // below half HP: heals 16.5% and the spirit strikes for 30% of the best hit
    let st = createBattle({ player: { hp: 1000, maxHp: 1000, atk: 1, def: 0, modifiers: none.modifiers, echo: e }, enemy: { name: 'x', hp: 1e9, atk: 1, def: 0, exp: 1, gold: 1, skills: [] }, gold: 0 });
    st = { ...st, player: { ...st.player, hp: 400 }, highestDamage: 1000, phase: 'enemy' }; // already below half HP
    const r = step(st, createSeededRng(1));
    const res = r.events.filter((ev) => ev.type === 'echoResonance');
    expect(res.map((ev) => ev.kind)).toEqual(['heal', 'spirit']);
    expect(res[0].amount).toBe(165);
    expect(res[1].damage).toBe(300);
  });
});

describe('echo mastery', () => {
  it('levels from XP, capped at 10', () => {
    expect(masteryLevel(0)).toBe(1);
    expect(masteryLevel(9)).toBe(1);
    expect(masteryLevel(10)).toBe(2);
    expect(masteryLevel(70)).toBe(5);
    expect(masteryLevel(99999)).toBe(MASTERY_MAX);
  });
  it('each level scales only the passive: the skill and the resonance stay as they are', () => {
    const e = echoDef('tentacle_king');
    const m5 = applyMastery(e, 5);
    expect(m5.passive.mods.goldBonus).toBeCloseTo(e.passive.mods.goldBonus * 1.24);
    expect(m5.passive.pct.luck).toBeCloseTo(e.passive.pct.luck * 1.24);
    for (const lv of [1, 5, MASTERY_MAX]) {
      expect(applyMastery(e, lv).skill).toEqual(e.skill);
      expect(applyMastery(e, lv).resonance).toEqual(e.resonance);
    }
  });
  it('XP is per echo on the account and only for owned echoes', () => {
    let p = createProfile();
    expect(gainEchoXp(p, 'tentacle_king', 5).profile).toBe(p);
    p = addEcho(p, 'tentacle_king');
    const g = gainEchoXp(p, 'tentacle_king', 12);
    expect(g.levelUp).toBe(true);
    expect(masteryInfo(g.profile, 'tentacle_king')).toEqual({ level: 2, xp: 12, current: 10, next: 25 });
  });
  it('the equipped echo gains XP when the hero wins, and battles use the mastered numbers', () => {
    let profile = addEcho(createProfile(), 'tentacle_king');
    profile = equipEcho(profile, 0, 'tentacle_king');
    profile = { ...profile, echoes: { ...profile.echoes, mastery: { tentacle_king: 70 } } };
    const luck = heroEchoMastered(profile, 0).passive.pct.luck;
    expect(luck).toBeCloseTo(echoDef('tentacle_king').passive.pct.luck * 1.24); // level 5
    const world = createWorld(worldData);
    const run = { ...startRun({ profile, characterIndex: 0, hardMode: false, world, catalog }), base: { hp: 1e9, atk: 1e9, def: 1e9, speed: 1e6, luck: 1e6 } };
    const rng = createSeededRng(4);
    const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, -1, rng);
    expect(sb.battle.echo.skill).toEqual(echoDef('tentacle_king').skill); // the skill does not grow
    expect(sb.stats.bonusPercent.luck).toBeGreaterThanOrEqual(luck - 1e-9); // the mastered passive is in the stats
    const fin = finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, drop: null, world, catalog }, rng);
    expect(fin.result.echoXp).toMatchObject({ id: 'tentacle_king', amount: 1, level: 5 });
    expect(echoXp(fin.profile, 'tentacle_king')).toBe(71);
  });
});

describe('Duende Ganancioso: battle gold bonus', () => {
  it('goldBonus raises the gold of every battle', async () => {
    const { applyEchoPassive } = await import('../core/echoes.js');
    const mods = { goldBonus: 0 };
    applyEchoPassive(echoDef('stone_colossus'), { hp: 0, atk: 0, def: 0, speed: 0, luck: 0 }, mods);
    expect(mods.goldBonus).toBeCloseTo(echoDef('stone_colossus').passive.mods.goldBonus);
  });
});

describe('echoes dropped by bosses', () => {
  const winBoss = (profile, bossId) => {
    const world = createWorld(worldData);
    const map = world.maps.find((m) => (m.bosses ?? []).some((b) => b.id === bossId));
    const boss = map.bosses.find((b) => b.id === bossId);
    let run = { ...startRun({ profile, characterIndex: 0, hardMode: false, world, catalog }), base: { hp: 1e9, atk: 1e9, def: 1e9, speed: 1e6, luck: 1e6 } };
    run = { ...run, map: { ...run.map, id: map.id, x: boss.x, y: boss.y } };
    const rng = createSeededRng(9);
    const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, bossId, rng);
    return finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, drop: null, world, catalog }, rng);
  };

  it('the boss of map 4 (boss 2) reveals the Fagulha Errante once its base level is met (not owned: bought later), then nothing', async () => {
    const { BOSS_ECHO_DROPS } = await import('../core/echoes.js');
    expect(BOSS_ECHO_DROPS[2]).toEqual({ echo: 'ember_wisp', chance: 1 });
    expect(winBoss(createProfile(), 2).result.echo).toBeNull(); // base level 1 only: below the echo's 2
    const based = { ...createProfile(), bossWins: { 0: 1 } };
    const fin = winBoss(based, 2);
    expect(fin.result.echo).toBe('ember_wisp');
    expect(echoFound(fin.profile, 'ember_wisp')).toBe(true);
    expect(ownsEcho(fin.profile, 'ember_wisp')).toBe(false);
    expect(winBoss(fin.profile, 2).result.echo).toBeNull();
    expect(winBoss(createProfile(), 0).result.echo).toBeNull();
  });
});

describe('cheat: echo mastery', () => {
  it('every echo at max level, or all back to level 1 (owned echoes kept)', () => {
    const p = cheatEchoesOwned(newProfile(), true);
    const max = cheatEchoMastery(p, true);
    for (const e of ECHOES) expect(masteryLevel(echoXp(max, e.id))).toBe(MASTERY_MAX);
    const zero = cheatEchoMastery(max, false);
    for (const e of ECHOES) expect(masteryLevel(echoXp(zero, e.id))).toBe(1);
    expect(zero.echoes.owned).toEqual(max.echoes.owned);
  });
});
