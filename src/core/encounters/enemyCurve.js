/**
 * Strength of the original's regular enemies by area level: the average HP, ATK and gold of
 * the enemy pools of every world.json area, smoothed (geometric means over bins of 25% in
 * level, HP and ATK never lower at a higher level). Used to rescale a pool played at another
 * level than its original one: an area of the map editor whose level differs from the area it
 * takes its enemies from (areaLayer.js) gets `statScale` (editorMap.js), applied by
 * enemyPick.js pickAreaEnemy.
 */

const BIN = Math.log(1.25);
const STATS = ['hp', 'atk', 'gold'];
const cache = new WeakMap(); // pools -> curve

function poolAverages(area, pool) {
  const out = {};
  for (const k of STATS) {
    const values = pool.map((e) => {
      if (k === 'hp') return e.hpMul != null ? area.baseHp * e.hpMul : e.hp;
      if (k === 'atk') return e.atkMul != null ? area.baseAtk * e.atkMul : e.atk;
      return e.gold;
    });
    out[k] = values.reduce((a, b) => a + b, 0) / values.length;
  }
  return out;
}

/** The curve of the original world: [{ level, hp, atk, gold }] sorted by level. */
export function enemyCurve(maps, pools) {
  if (cache.has(pools)) return cache.get(pools);
  const bins = new Map(); // bin -> { logs per stat, levels }
  for (const m of maps) {
    for (const area of m.areas) {
      const pool = pools[area.pool];
      if (!pool?.length || !(area.level >= 1)) continue;
      const avg = poolAverages(area, pool);
      if (!STATS.every((k) => avg[k] > 0)) continue;
      const b = Math.floor(Math.log(area.level) / BIN);
      if (!bins.has(b)) bins.set(b, { level: [], hp: [], atk: [], gold: [] });
      const bin = bins.get(b);
      bin.level.push(Math.log(area.level));
      for (const k of STATS) bin[k].push(Math.log(avg[k]));
    }
  }
  const mean = (l) => l.reduce((a, b) => a + b, 0) / l.length;
  const points = [...bins.keys()].sort((a, b) => a - b).map((b) => {
    const bin = bins.get(b);
    return { level: Math.exp(mean(bin.level)), hp: Math.exp(mean(bin.hp)), atk: Math.exp(mean(bin.atk)), gold: Math.exp(mean(bin.gold)) };
  });
  for (let i = 1; i < points.length; i += 1) {
    points[i].hp = Math.max(points[i].hp, points[i - 1].hp);
    points[i].atk = Math.max(points[i].atk, points[i - 1].atk);
  }
  cache.set(pools, points);
  return points;
}

/** Curve values at `level`: log-log interpolation, flat past either end. */
export function curveAt(points, level) {
  if (!points.length) return null;
  if (level <= points[0].level) return points[0];
  const last = points[points.length - 1];
  if (level >= last.level) return last;
  const i = points.findIndex((p) => p.level >= level);
  const [a, b] = [points[i - 1], points[i]];
  const t = Math.log(level / a.level) / Math.log(b.level / a.level);
  const out = { level };
  for (const k of STATS) out[k] = Math.exp(Math.log(a[k]) + t * (Math.log(b[k]) - Math.log(a[k])));
  return out;
}

/** { hp, atk, gold } multipliers that move enemies made for level `from` to level `to`; null when equal. */
export function statScale(points, from, to) {
  if (!(from >= 1) || !(to >= 1) || from === to) return null;
  const a = curveAt(points, from);
  const b = curveAt(points, to);
  if (!a || !b) return null;
  return { hp: b.hp / a.hp, atk: b.atk / a.atk, gold: b.gold / a.gold };
}
