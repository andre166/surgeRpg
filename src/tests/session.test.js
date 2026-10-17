import { describe, it, expect } from 'vitest';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';
import { createWorld, areaIndexAt, bossHit } from '../core/world/world.js';
import { createProfile } from '../core/persistence/profile.js';
import { startRun, startBattle, finishBattle, tickGauge, isGameOver, confirmStatPoints, commitGameOver, heroStats, markMapSeen, bossTouch } from '../core/session/session.js';
import { runToEnd } from '../core/battle/engine.js';
import { battlePointsLeft } from '../core/progression/battlePoints.js';
import { createSeededRng } from '../core/rng/rng.js';
import { dangerLevel } from '../core/encounters/gauge.js';
import { rollBonusType } from '../core/encounters/bonus.js';

const world = createWorld(worldData);
const ctx = (profile, run) => ({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData });

describe('world data', () => {
  it('has 77 maps and the start position is in area 0 of map 1 (level 1)', () => {
    expect(world.maps.length).toBe(77);
    const m = world.map(1);
    expect(areaIndexAt(m, world.start.x, world.start.y)).toBe(0);
    expect(m.areas[0].level).toBe(1);
  });
  it('every area references an existing enemy pool', () => {
    for (const m of world.maps) for (const a of m.areas) expect(enemyData.pools[a.pool], `${m.id}/${a.id}`).toBeTruthy();
  });
  it('danger level thresholds', () => {
    expect(dangerLevel(1, 1)).toBe(0);
    expect(dangerLevel(300, 1)).toBe(4);
    expect(dangerLevel(1, 100)).toBe(-2);
    expect(dangerLevel(50, 100, true)).toBe(2);
  });
});

describe('run loop', () => {
  it('a new run starts with 30 BP, level 1 and the starting bonus', () => {
    const profile = createProfile();
    const run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
    expect(battlePointsLeft(run)).toBe(30);
    expect(run.level).toBe(1);
    expect(run.bonuses[1][0]).toBe(25);
    const s = heroStats(run, catalog, profile);
    expect(s.total).toEqual({ hp: 100, atk: 15, def: 15, speed: 5, luck: 1 }); // starter weapon +5 ATK, starter armor +5 DEF
  });

  it('the gauge fills while moving and eventually triggers a battle', () => {
    const profile = createProfile();
    let run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
    const rng = createSeededRng(3);
    let battle = false;
    for (let i = 0; i < 400 && !battle; i += 1) {
      const r = tickGauge(run, world, 1, rng);
      run = r.run;
      battle = r.battle;
    }
    expect(battle).toBe(true);
  });

  it('a full battle cycle updates BP, exp, gold and bonuses', () => {
    const profile = createProfile();
    let run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
    const rng = createSeededRng(11);
    const sb = startBattle(ctx(profile, run), -1, rng);
    expect(sb).not.toBeNull();
    expect(sb.enemy.name).toBeTruthy();
    expect(battlePointsLeft(sb.run)).toBe(27); // 1 + provisional 2
    const end = runToEnd(sb.battle, rng);
    const fin = finishBattle({ ...ctx(profile, sb.run), battle: end.state, enemy: sb.enemy, bossId: sb.bossId, drop: sb.drop }, rng);
    if (fin.result.won) {
      expect(battlePointsLeft(fin.run)).toBe(29);
      expect(fin.run.gold).toBe(sb.run.gold + fin.result.gold);
      expect(fin.run.level).toBeGreaterThanOrEqual(1);
    } else {
      expect(battlePointsLeft(fin.run)).toBe(27);
    }
    expect(fin.run.map.gauge).toBe(0);
  });

  it('a run ends after 30 won battles with no bosses', () => {
    const profile = createProfile();
    let run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
    const rng = createSeededRng(5);
    let n = 0;
    while (!isGameOver(run) && n < 200) {
      const sb = startBattle(ctx(profile, run), -1, rng);
      // force a win for the accounting test
      const won = { ...sb.battle, phase: 'won', enemy: { ...sb.battle.enemy, hp: 0 } };
      const fin = finishBattle({ ...ctx(profile, sb.run), battle: won, enemy: sb.enemy, bossId: sb.bossId, drop: null }, rng);
      run = fin.run;
      n += 1;
    }
    expect(n).toBe(30);
    expect(isGameOver(run)).toBe(true);
    expect(run.level).toBeGreaterThan(1);
  });

  it('stat points are confirmed in whole and game over commits inventory', () => {
    const profile = createProfile();
    let run = startRun({ profile, characterIndex: 2, hardMode: false, world, catalog });
    run = { ...run, statPoints: 8 };
    run = confirmStatPoints(run, { hp: 2, atk: 1, def: 1, speed: 2, luck: 2 });
    expect(run.base).toEqual({ hp: 110, atk: 13, def: 13, speed: 9, luck: 3 });
    expect(run.statPoints).toBe(0);
    expect(confirmStatPoints(run, { hp: 1 })).toBe(run); // not enough points
    run.inventory.weapons[1] = 1;
    const p = commitGameOver({ ...run, level: 313 }, profile);
    expect(p.gameOverCount).toBe(1);
    expect(p.highestLevel).toBe(313);
    expect(p.inventory.weapons[1]).toBe(1);
    expect(p.lastCharacter).toBe(2);
  });

  it('records the best-level snapshot only when the level record is beaten', () => {
    const profile = createProfile();
    const run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
    const stats = heroStats(run, catalog, profile);
    const p1 = commitGameOver({ ...run, level: 300 }, profile, stats);
    expect(p1.highestRecord.level).toBe(300);
    expect(p1.highestRecord.base.hp).toBe(100);
    expect(p1.highestRecord.bonus.atk).toBe(Math.floor(stats.bonus.atk));
    expect(p1.highestRecord.slots).toEqual([0, 0, -1, -2, -2, -2, -2, -2, -2, -2, -2, -2]);
    expect(p1.highestRecord.copies.slice(0, 3)).toEqual([1, 1, 0]);
    const p2 = commitGameOver({ ...run, level: 200 }, p1, stats);
    expect(p2.highestRecord.level).toBe(300);
    const p3 = commitGameOver({ ...run, level: 400 }, p2, stats);
    expect(p3.highestRecord.level).toBe(400);
  });

  it('touching a boss keeps the hero outside it (StageMap.as)', () => {
    const run = startRun({ profile: createProfile(), characterIndex: 0, hardMode: false, world, catalog });
    const boss = world.map(1).bosses[0]; // rect x 706..894, y 144..256
    const hit = bossTouch(run, world, 800, 270, 800, 250);
    expect(hit).toEqual({ bossId: boss.id, slimeId: -1, x: 800, y: 270 });
    expect(bossHit(boss, hit.x, hit.y)).toBe(false);
    // after a lost fight, walking away does not touch the boss again
    expect(bossTouch(run, world, 800, 270, 800, 290).bossId).toBe(-1);
    // a hero left inside by an older save is pushed out without a battle
    const out = bossTouch(run, world, 800, 200, 800, 205);
    expect(out.bossId).toBe(-1);
    expect(bossHit(boss, out.x, out.y)).toBe(false);
    // beaten bosses are ignored
    expect(bossTouch({ ...run, bossBeaten: { [boss.id]: 1 } }, world, 800, 270, 800, 250)).toEqual({ bossId: -1, slimeId: -1, x: 800, y: 250 });
  });

  it('marks discovered maps once', () => {
    const p = createProfile();
    const p1 = markMapSeen(p, 2);
    expect(p1.mapsSeen).toEqual({ 2: 1 });
    expect(markMapSeen(p1, 2)).toBe(p1);
  });

  it('boss win grants its BP bonus and flags the boss', () => {
    const profile = createProfile();
    let run = startRun({ profile, characterIndex: 0, hardMode: false, world, catalog });
    const rng = createSeededRng(9);
    const sb = startBattle(ctx(profile, run), 0, rng);
    expect(sb.bossId).toBe(0);
    const won = { ...sb.battle, phase: 'won' };
    const fin = finishBattle({ ...ctx(profile, sb.run), battle: won, enemy: sb.enemy, bossId: 0, drop: null }, rng);
    expect(battlePointsLeft(fin.run)).toBe(29 + 3);
    expect(fin.run.bossBeaten[0]).toBe(1);
    expect(fin.profile.bossWins[0]).toBe(1);
    expect(fin.result.abilityLevelUp).toBe(true);
  });
});

describe('bonus roll', () => {
  it('returns a valid type for low levels and never 5/6 early', () => {
    const rng = createSeededRng(1);
    for (let i = 0; i < 500; i += 1) {
      const t = rollBonusType({ areaLevel: 25, targetIndex: 1, currentIndex: 0, gameOverCount: 0, hardMode: false }, rng);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(14);
      expect([5, 6, 9, 11]).not.toContain(t);
    }
  });
});
