import { describe, it, expect } from 'vitest';
import { createBattle, step, runToEnd, requestHeal, canRequestHeal, PHASE } from '../core/battle/engine.js';
import { setupEnemy, BONUS } from '../core/battle/enemySetup.js';
import { computeStats } from '../core/attributes/stats.js';
import { createSeededRng, createSequenceRng } from '../core/rng/rng.js';
import { rollDrop } from '../core/battle/drops.js';

const base = { hp: 100, atk: 10, def: 10, speed: 5, luck: 1 };
const player = computeStats({ base, equipment: null, character: { index: 0 } });
const slime = { id: 'e1', name: 'test', hp: 30, atk: 6, gold: 10, expParam: 0, expMode: 'scaled', expScale: 1, skills: [0], drops: [null, null, null] };

function makeBattle(seed = 1, enemyDef = slime, bonus = BONUS.NONE) {
  const enemy = setupEnemy({ enemy: enemyDef, areaLevel: 1, player, bonus });
  return createBattle({
    player: { hp: player.total.hp, maxHp: player.total.hp, atk: player.total.atk, def: player.total.def, modifiers: player.modifiers },
    enemy,
    gold: 0,
  });
}

describe('setupEnemy', () => {
  it('scaled exp = expForLevel(area) * scale * (1 + expParam/50), floored', () => {
    const e = setupEnemy({ enemy: { ...slime, expParam: 50 }, areaLevel: 1, player });
    expect(e.exp).toBe(Math.floor(3 * 1 * 2));
  });
  it('bonus kinds change HP / ATK / gold / exp', () => {
    expect(setupEnemy({ enemy: slime, areaLevel: 1, player, bonus: BONUS.HALF_HP }).hp).toBe(15.5);
    expect(setupEnemy({ enemy: slime, areaLevel: 1, player, bonus: BONUS.HALF_ATK }).atk).toBe(3.5);
    expect(setupEnemy({ enemy: slime, areaLevel: 1, player, bonus: BONUS.GOLD_X7 }).gold).toBe(70);
    expect(setupEnemy({ enemy: { ...slime, expParam: 50 }, areaLevel: 1, player, bonus: BONUS.EXP_X2 }).exp).toBe(12);
  });
  it('hard mode multiplies hp x10, atk x8.5, gold x5, exp x24 for regular enemies', () => {
    const e = setupEnemy({ enemy: { ...slime, expParam: 50 }, areaLevel: 1, player, hardMode: true });
    expect(e.hp).toBe(300);
    expect(e.atk).toBe(51);
    expect(e.gold).toBe(50);
    expect(e.exp).toBe(Math.floor(6 * 12 * 2));
  });
});

describe('battle engine', () => {
  it('player acts first and the battle ends in a win or a loss', () => {
    const rng = createSeededRng(42);
    const b = makeBattle();
    expect(b.phase).toBe(PHASE.PLAYER_TURN);
    const { state, events } = runToEnd(b, rng);
    expect([PHASE.WON, PHASE.LOST]).toContain(state.phase);
    expect(events.at(-1).type).toBe(state.phase);
  });

  it('is deterministic for a given seed', () => {
    const a = runToEnd(makeBattle(), createSeededRng(7));
    const b = runToEnd(makeBattle(), createSeededRng(7));
    expect(a.events).toEqual(b.events);
  });

  it('a combo keeps the player turn and increments the counter', () => {
    const b = makeBattle();
    // player hit: crit roll 0.99 (no crit), motion, def jitter, spread, spread, then combo roll 0 (success)
    const rng = createSequenceRng([0.99, 0, 0, 0.5, 0.5, 0]);
    const r = step(b, rng);
    expect(r.state.phase).toBe(PHASE.PLAYER_TURN);
    expect(r.state.combo).toBe(2);
    expect(r.events.map((e) => e.type)).toEqual(['playerHit', 'combo']);
  });

  it('queued heal restores full HP at the start of the next player turn', () => {
    let b = { ...makeBattle(), gold: 1_000_000 };
    expect(canRequestHeal(b)).toBe(true);
    b = requestHeal(b);
    expect(b.healQueued).toBe(true);
    // force enemy turn then an enemy hit
    b = { ...b, phase: PHASE.ENEMY_TURN, player: { ...b.player, hp: 50 } };
    const r = step(b, createSequenceRng([0.5, 0.5, 0]));
    expect(r.state.player.hp).toBe(r.state.player.maxHp);
    expect(r.events.some((e) => e.type === 'healed')).toBe(true);
  });

  it('heal cannot be bought twice or without gold', () => {
    const b = makeBattle();
    expect(canRequestHeal(b)).toBe(false);
    const rich = requestHeal({ ...b, gold: 1_000_000 });
    expect(canRequestHeal(rich)).toBe(false);
  });
});

describe('rollDrop', () => {
  const drops = [{ type: 0, itemId: 3, chance: 0.5 }, null, null];
  it('returns the item when the roll succeeds and none are owned', () => {
    const r = rollDrop({ drops, itemRate: 1, ownedCount: () => 0, highestLevel: 1 }, createSequenceRng([0, 0.1]));
    expect(r).toEqual({ type: 0, itemId: 3 });
  });
  it('is blocked at 10 copies (3 for accessories)', () => {
    expect(rollDrop({ drops, itemRate: 1, ownedCount: () => 10, highestLevel: 1 }, createSequenceRng([0, 0]))).toBeNull();
    const acc = [{ type: 2, itemId: 1, chance: 1 }, null, null];
    expect(rollDrop({ drops: acc, itemRate: 1, ownedCount: () => 3, highestLevel: 1 }, createSequenceRng([0, 0]))).toBeNull();
  });
  it('repeat drops are heavily reduced below highest level 2000', () => {
    // chance 0.5 -> >=0.15 -> 0.185 ; *0.1 -> 0.0185 ; owned>=1 -> *0.55 = 0.010175
    const r = rollDrop({ drops, itemRate: 1, ownedCount: () => 1, highestLevel: 1 }, createSequenceRng([0, 0.0102]));
    expect(r).toBeNull();
    const r2 = rollDrop({ drops, itemRate: 1, ownedCount: () => 1, highestLevel: 1 }, createSequenceRng([0, 0.0101]));
    expect(r2).toEqual({ type: 0, itemId: 3 });
  });
});
