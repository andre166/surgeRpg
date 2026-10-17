/**
 * EXP required to go from level L to L+1 ("one level exp").
 * Faithful port of Game.as GameDataVar()/OneExpTableFunc()
 * (reverse/decomp/scripts/Game.as:269-1158).
 *
 * - Levels 0..9 are hard-coded seeds.
 * - Levels 10..119999 are built incrementally: each entry starts from the
 *   previous one and adds a bump that depends on divisibility of the level.
 * - Levels 120000..124999 use the closed formula, with a monotonic guard for
 *   the first 500 entries.
 * - Levels >= 125000 use the closed formula directly.
 */

const TABLE_SIZE = 125000;
const INCREMENTAL_END = 120000;

let table = null;

function closedForm(level) {
  return Math.floor(level * (level * 0.0022385 + 6.35));
}

function bump(level) {
  let add = 0;
  if (level % 121 === 0) add += 30;
  else if (level % 103 === 0) add += 26;
  else if (level % 97 === 0) add += 23;
  else if (level % 83 === 0) add += 17;
  else if (level % 79 === 0) add += 16;
  else if (level % 67 === 0) add += 15;
  else if (level % 43 === 0) add += 13;
  else if (level % 37 === 0) add += 11;
  else if (level % 23 === 0) add += 8;
  else if (level % 21 === 0) add += 6;
  else if (level % 13 === 0) add += 4;
  else if (level % 7 === 0) add += 2;
  else if (level % 3 === 0) add += Math.trunc(level * 0.02);

  if (level % 3000 === 0) add += 400;
  else if (level % 1000 === 0) add += 200;

  if (level % 500 === 0) add += 200;
  if (level % 50 === 0) add += 20;

  if (level % 200 === 0) add += 300;
  else if (level % 100 === 0) add += 150;

  if (level % 15 === 0) add += 1;
  return add;
}

function build() {
  const t = new Float64Array(TABLE_SIZE);
  const seeds = [3, 3, 4, 4, 6, 6, 6, 8, 8, 8];
  for (let i = 0; i < seeds.length; i += 1) t[i] = seeds[i];
  for (let i = 10; i < INCREMENTAL_END; i += 1) {
    t[i] = t[i - 1] + bump(i);
  }
  for (let i = INCREMENTAL_END; i < INCREMENTAL_END + 500; i += 1) {
    t[i] = closedForm(i);
    if (t[i - 1] > t[i]) t[i] = t[i - 1];
  }
  for (let i = INCREMENTAL_END + 500; i < TABLE_SIZE; i += 1) {
    t[i] = closedForm(i);
  }
  return t;
}

/** EXP needed to advance from `level` to `level + 1`. */
export function expForLevel(level) {
  if (level < 0) return 0;
  if (level < TABLE_SIZE) {
    if (!table) table = build();
    return table[level];
  }
  return closedForm(level);
}

/** Exposed for tests / tooling. */
export function _resetExpTableCache() {
  table = null;
}
