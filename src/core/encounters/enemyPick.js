/**
 * Picks and resolves the enemy for an encounter (EneData.as eneload tree).
 * Returns an enemy definition in the shape expected by battle/enemySetup.js.
 */
import { weightedPick } from './weighted.js';
import { scaledBossGold } from './eventBoss.js';

function toDef(entry, area, hardMode, key) {
  const hp = entry.hpMul != null ? area.baseHp * entry.hpMul : entry.hp;
  const atk = entry.atkMul != null ? area.baseAtk * entry.atkMul : entry.atk;
  return {
    id: key,
    name: entry.name,
    sprite: entry.sprite,
    scale: entry.scale,
    hp,
    atk,
    gold: entry.gold,
    expParam: entry.expParam,
    expMode: area.expScale === -2 ? 'raw' : 'scaled',
    expScale: area.expScale,
    skills: entry.skills ?? [0],
    drops: entry.drops ?? [null, null, null],
    hardDrops: entry.hardDrops ?? null,
  };
}

/** Regular enemy of an area. `pools` is data/enemies.json pools. */
export function pickAreaEnemy({ area, pools, hardMode }, rng) {
  const poolKey = hardMode && area.poolHard ? area.poolHard : area.pool;
  const weights = hardMode && area.weightsHard ? area.weightsHard : area.weights;
  const pool = pools[poolKey];
  if (!pool || !pool.length) return null;
  const idx = weightedPick(weights ?? pool.map(() => 10), rng);
  const entry = pool[Math.min(idx, pool.length - 1)];
  return toDef(entry, area, hardMode, `${poolKey}#${idx}`);
}

/** Map boss (ids 0..28) definition. */
export function mapBossDef(bossData, bossId, areaLevel) {
  const b = bossData.mapBosses[bossId];
  if (!b) return null;
  return {
    id: `boss#${bossId}`,
    name: b.name,
    sprite: b.sprite,
    scale: b.scale,
    hp: b.hp,
    atk: b.atk,
    gold: b.gold,
    expParam: b.expParam,
    expMode: b.expScale === -2 ? 'raw' : 'scaled',
    expScale: b.expScale,
    skills: [0],
    drops: b.drops,
    hardDrops: b.hardDrops,
    bpBonus: b.bpBonus,
    areaLevel,
  };
}

/** Hidden event boss (ids >= 32) definition; stats differ by mode. */
export function eventBossDef(bossData, bossId, areaLevel, hardMode) {
  const e = bossData.eventBosses[bossId];
  if (!e) return null;
  const line = hardMode ? e.hard : e.normal;
  const gold = line.goldScaled ? scaledBossGold(bossId, areaLevel, hardMode) : line.gold;
  return {
    id: `event#${bossId}`,
    name: line.name,
    sprite: line.sprite,
    scale: line.scale,
    // event bosses carry their own hard-mode numbers; the generic x10/x8.5/x5 is applied on top by setupEnemy
    hp: line.hp,
    atk: line.atk,
    gold,
    expParam: line.expParam,
    expMode: 'raw',
    expScale: -2,
    skills: [0],
    drops: line.drops,
    hardDrops: line.hardDrops,
    bpBonus: 0,
    areaLevel,
    eventBoss: true,
  };
}
