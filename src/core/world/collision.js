/**
 * Tile collision for hand-made maps: a grid of blocked cells (from the map editor's
 * boolean collision layer) stretched over the map, like its background art.
 * Movement into a blocked cell slides along the wall (x or y alone) or stops.
 */

/** Footprint half-size of the hero, in map pixels (around the feet point). */
export const HERO_RADIUS = 6;

/**
 * Grid from a flat row-major array (non-zero = blocked) of cols x rows cells,
 * stretched over a w x h map. Null when nothing is blocked.
 */
export function collisionGrid(flat, cols, rows, w, h) {
  if (!flat || !flat.some((v) => v)) return null;
  return { cols, rows, cw: w / cols, ch: h / rows, blocked: flat.map((v) => (v ? 1 : 0)) };
}

/** Whether the point (x, y) or the box of half-size r around it touches a blocked cell. */
export function isBlocked(grid, x, y, r = 0) {
  if (!grid) return false;
  const c0 = Math.floor((x - r) / grid.cw);
  const c1 = Math.floor((x + r) / grid.cw);
  const r0 = Math.floor((y - r) / grid.ch);
  const r1 = Math.floor((y + r) / grid.ch);
  for (let row = r0; row <= r1; row += 1) {
    if (row < 0 || row >= grid.rows) continue;
    for (let col = c0; col <= c1; col += 1) {
      if (col < 0 || col >= grid.cols) continue;
      if (grid.blocked[row * grid.cols + col]) return true;
    }
  }
  return false;
}

/**
 * Where a move from (x, y) to (nx, ny) ends: the target, else sliding along one axis,
 * else staying put. A hero already inside a wall (teleport, old save) moves freely out.
 */
export function moveWithCollision(grid, x, y, nx, ny, r = HERO_RADIUS) {
  if (!grid || !isBlocked(grid, nx, ny, r) || isBlocked(grid, x, y, r)) return { x: nx, y: ny };
  if (!isBlocked(grid, nx, y, r)) return { x: nx, y };
  if (!isBlocked(grid, x, ny, r)) return { x, y: ny };
  return { x, y };
}
