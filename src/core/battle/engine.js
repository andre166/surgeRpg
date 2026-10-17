/**
 * Turn-based battle engine (pure, serializable state; no rendering).
 * Port of the Battle.as state machine, stripped of animation timing.
 *
 * createBattle(...) -> state
 * step(state, rng)  -> { state, events[] }   resolves ONE action (one hit)
 * requestHeal(state) -> state                 queues a full heal for the next player turn
 *
 * Combat loop (Battle.as EEFBattleFunc):
 *   player hits; if enemy still alive roll combo -> player hits again (combo+1)
 *   else enemy hits; if player alive -> (apply queued heal) player hits; repeat.
 */
import { rollPlayerDamage, rollEnemyDamage, deathGuardChance, drainAmount, comboChance, healCost } from './damage.js';
import { RESONANCE_HP } from '../echoes.js';

export const PHASE = Object.freeze({
  PLAYER_TURN: 'player',
  ENEMY_TURN: 'enemy',
  WON: 'won',
  LOST: 'lost',
});

/**
 * @param {object} args {
 *   player: { hp, maxHp, atk, def, modifiers, echo? },   hp/maxHp are the derived totals (maxHp floored)
 *           echo: { skill, resonance } of an equipped Ancestral Echo (src/core/echoes.js; not in the original)
 *   enemy:  result of setupEnemy()
 *   hardMode: boolean
 *   gold: number (for the heal price)
 * }
 */
export function createBattle({ player, enemy, hardMode = false, gold = 0 }) {
  const maxHp = Math.floor(player.maxHp);
  return {
    phase: PHASE.PLAYER_TURN,
    hardMode,
    player: {
      hp: maxHp,
      maxHp,
      atk: player.atk,
      def: player.def,
      modifiers: player.modifiers,
    },
    enemy: { ...enemy },
    gold,
    combo: 1,
    turnsDone: 0,
    playerTurnsDone: 0,
    healQueued: false,
    healUsed: 0,
    highestDamage: 0,
    highestCombo: 1,
    log: [],
    echo: player.echo ? { skill: player.echo.skill ?? null, resonance: player.echo.resonance ?? null } : null,
    echoHits: 0,
    resonanceUsed: false,
  };
}

export function currentHealCost(state) {
  return healCost(state.gold, state.player.maxHp);
}

export function canRequestHeal(state) {
  if (state.phase === PHASE.WON || state.phase === PHASE.LOST) return false;
  if (state.healQueued) return false;
  return state.gold >= currentHealCost(state);
}

/** Whether a free heal (healing potion) can be queued now. */
export function canQueueFreeHeal(state) {
  return state.phase !== PHASE.WON && state.phase !== PHASE.LOST && !state.healQueued;
}

/** Queues a full heal without paying gold (Farm healing potion; not in the original). */
export function queueFreeHeal(state) {
  if (!canQueueFreeHeal(state)) return state;
  return { ...state, healQueued: true };
}

/** Buys a full heal that is applied at the start of the next player turn. */
export function requestHeal(state) {
  if (!canRequestHeal(state)) return state;
  const cost = currentHealCost(state);
  return { ...state, gold: state.gold - cost, healQueued: true, healUsed: state.healUsed + cost };
}

function playerHit(state, rng) {
  const events = [];
  const p = state.player;
  const e = state.enemy;
  const roll = rollPlayerDamage(
    {
      atk: p.atk,
      critRate: e.critRate,
      hpRatio: p.hp / p.maxHp,
      hitsDone: state.playerTurnsDone,
      forcedCritHits: p.modifiers.forcedCritHits,
      critDamageMultiplier: p.modifiers.critDamageMultiplier,
      enemyPoint: e.point,
      enemyMaxHp: e.maxHp,
      hardMode: state.hardMode,
    },
    rng,
  );
  let hp = p.hp;
  const drain = drainAmount(roll.damage, p.modifiers);
  if (drain > 0) hp = Math.min(p.maxHp, hp + drain);
  let enemyHp = e.hp - roll.damage;
  if (enemyHp < 0) enemyHp = 0;

  events.push({
    type: 'playerHit',
    damage: roll.damage,
    critical: roll.critical,
    combo: state.combo,
    motion: roll.motion,
    drain,
  });

  // Ancestral Echo skill: every N player hits
  let echoHits = state.echoHits ?? 0;
  const skill = state.echo?.skill;
  if (skill && enemyHp > 0) {
    echoHits += 1;
    if (echoHits % skill.every === 0) {
      if (skill.kind === 'burst') {
        const dmg = Math.max(1, Math.floor(roll.damage * skill.power));
        enemyHp = Math.max(0, enemyHp - dmg);
        events.push({ type: 'echoSkill', kind: 'burst', damage: dmg });
      } else if (skill.kind === 'heal') {
        const amount = Math.floor(p.maxHp * skill.power);
        hp = Math.min(p.maxHp, hp + amount);
        events.push({ type: 'echoSkill', kind: 'heal', amount });
      }
    }
  }

  let next = {
    ...state,
    player: { ...p, hp },
    enemy: { ...e, hp: enemyHp },
    turnsDone: state.turnsDone + 1,
    playerTurnsDone: state.playerTurnsDone + 1,
    highestDamage: Math.max(state.highestDamage, roll.damage),
    echoHits,
  };

  if (enemyHp > 0) {
    const chance = comboChance(e.comboRate, hp / p.maxHp);
    if (rng.next() <= chance) {
      const combo = state.combo + 1;
      next = { ...next, phase: PHASE.PLAYER_TURN, combo, highestCombo: Math.max(next.highestCombo, combo) };
      events.push({ type: 'combo', combo });
    } else {
      next = { ...next, phase: PHASE.ENEMY_TURN, combo: 1 };
    }
  } else {
    next = { ...next, phase: PHASE.WON };
    events.push({ type: 'won' });
  }
  return { state: next, events };
}

function enemyHit(state, rng) {
  const events = [];
  const p = state.player;
  const e = state.enemy;
  const roll = rollEnemyDamage({ enemyAtk: e.atk, def: p.def, playerMaxHp: p.maxHp }, rng);
  const before = p.hp;
  let hp = before - roll.damage;
  let guarded = false;
  if (hp < 0) {
    hp = 0;
    if (before !== 1 && p.modifiers.deathGuard >= 1) {
      if (rng.next() < deathGuardChance(p.modifiers.deathGuard)) {
        hp = 1;
        guarded = true;
      }
    }
  }
  events.push({ type: 'enemyHit', damage: roll.damage, guarded, skill: e.skills.length ? e.skills[0] : 0 });

  let next = { ...state, player: { ...p, hp }, turnsDone: state.turnsDone + 1 };

  // Ancestral Echo resonance: once per battle, when the hero falls below half HP
  const res = state.echo?.resonance;
  if (res && !state.resonanceUsed && hp > 0 && hp < p.maxHp * RESONANCE_HP) {
    next = { ...next, resonanceUsed: true };
    if (res.kind === 'spirit') {
      const dmg = Math.max(1, Math.floor(Math.max(1, state.highestDamage) * res.power));
      const enemyHp = Math.max(0, e.hp - dmg);
      next = { ...next, enemy: { ...e, hp: enemyHp }, highestDamage: Math.max(next.highestDamage, dmg) };
      events.push({ type: 'echoResonance', kind: 'spirit', damage: dmg });
      if (enemyHp === 0) {
        events.push({ type: 'won' });
        return { state: { ...next, phase: PHASE.WON }, events };
      }
    } else if (res.kind === 'heal') {
      const amount = Math.floor(p.maxHp * res.power);
      hp = Math.min(p.maxHp, hp + amount);
      next = { ...next, player: { ...next.player, hp } };
      events.push({ type: 'echoResonance', kind: 'heal', amount });
    }
  }

  if (hp > 0) {
    next = { ...next, phase: PHASE.PLAYER_TURN };
    if (state.healQueued) {
      next = { ...next, player: { ...next.player, hp: p.maxHp }, healQueued: false };
      events.push({ type: 'healed', hp: p.maxHp });
    }
  } else {
    next = { ...next, phase: PHASE.LOST };
    events.push({ type: 'lost' });
  }
  return { state: next, events };
}

/** Resolves exactly one action. Returns the unchanged state when the battle is over. */
export function step(state, rng) {
  if (state.phase === PHASE.PLAYER_TURN) return playerHit(state, rng);
  if (state.phase === PHASE.ENEMY_TURN) return enemyHit(state, rng);
  return { state, events: [] };
}

export function isOver(state) {
  return state.phase === PHASE.WON || state.phase === PHASE.LOST;
}

/** Runs the battle to completion (used by tests and simulations). */
export function runToEnd(state, rng, maxSteps = 100000) {
  let s = state;
  const all = [];
  for (let i = 0; i < maxSteps && !isOver(s); i += 1) {
    const r = step(s, rng);
    s = r.state;
    all.push(...r.events);
  }
  return { state: s, events: all };
}
