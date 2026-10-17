/**
 * Mine material sprites in pixel art (16x16), drawn procedurally like CropSprite: shaded
 * blobs for rocks, faceted polygons for gems and shards, a dark outline around the whole.
 * Pure (no React) so tests and scripts can rasterise the grids.
 *
 *   iron_ore      - rust-brown rock with bright metal veins
 *   dark_crystal  - violet crystal cluster (three shards)
 *   ember_coal    - black coal lump with glowing cracks
 *   bone_silver   - pale bone rock studded with silver nuggets
 *   bloodstone    - faceted blood-red gem
 *   void_obsidian - glossy black shard with a violet sheen
 *   soul_amber    - amber teardrop with a trapped soul inside
 */
export const ORE_SIZE = 16;
const S = ORE_SIZE;

const grid = () => Array.from({ length: S }, () => Array(S).fill(null));
function put(g, x, y, c) { if (y >= 0 && y < S && x >= 0 && x < S) g[y][x] = c; }

/** Ellipse shaded from the top left (light / mid / dark). */
function blob(g, cx, cy, rx, ry, p) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const v = dx * 0.5 + dy * 0.7;
    put(g, x, y, v < -0.35 ? p[0] : v > 0.4 ? p[2] : p[1]);
  }
}

/** Fills the pixels whose centre is inside the polygon (even-odd rule). */
function poly(g, pts, c) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const px = x + 0.5, py = y + 0.5;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) put(g, x, y, c);
  }
}

function dots(g, list, c) { for (const [x, y] of list) put(g, x, y, c); }

/** Outline around everything drawn; `cut` darkens the bottom-right edge pixels a little. */
function outline(g, c) {
  const out = g.map((r) => r.slice());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = c;
  }
  return out;
}

/**
 * Irregular rock: the union of three lumps, lit as one shape. Pixels on the upper-left rim
 * are light, the lower-right rim (two pixels deep at the bottom) dark, the rest mid.
 */
function rock(g, p) {
  const lumps = [[8.5, 9.8, 6.6, 5], [6, 7.4, 4.2, 3.6], [11, 7.4, 3.4, 3.2]];
  const inside = (x, y) => lumps.some(([cx, cy, rx, ry]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inside(x, y)) continue;
    let c = p[1];
    if (!inside(x, y - 1) || !inside(x - 1, y)) c = p[0];
    if (!inside(x, y + 1) || !inside(x + 1, y) || !inside(x, y + 2)) c = p[2];
    put(g, x, y, c);
  }
}

const DRAW = {
  iron_ore(g) {
    rock(g, ['#a4a4ae', '#787884', '#4c4c58']);
    // rust-coloured iron nuggets, each with a glint
    for (const [x, y] of [[5, 7], [10, 8], [7, 11]]) {
      dots(g, [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]], '#c8703c');
      put(g, x + 1, y + 1, '#8a4224');
      put(g, x, y, '#f0b080');
    }
    dots(g, [[12, 11], [4, 10]], '#a85a30');
    return '#22222a';
  },
  dark_crystal(g) {
    // back shard (left), main shard, small front shard (right)
    poly(g, [[0.8, 7], [3, 3.5], [5.6, 6.5], [5.6, 14.5], [1.4, 14.5]], '#5a34b0');
    poly(g, [[0.8, 7], [3, 3.5], [3, 14.5], [1.4, 14.5]], '#8a64e6');
    poly(g, [[8, 0.5], [11, 4], [11, 14.5], [5.5, 14.5], [5.5, 4]], '#6a40d8');
    poly(g, [[8, 0.5], [5.5, 4], [5.5, 14.5], [8, 14.5]], '#a888ff');
    poly(g, [[8, 0.5], [8.6, 3], [8.6, 14.5], [8, 14.5]], '#d8ccff');
    poly(g, [[13, 8], [15, 10.5], [14.5, 14.5], [11, 14.5], [11.5, 10]], '#4a2a96');
    poly(g, [[13, 8], [11.5, 10], [11, 14.5], [12.8, 14.5]], '#7a54d8');
    dots(g, [[6, 3], [7, 2]], '#ffffff');
    return '#1c0f36';
  },
  ember_coal(g) {
    rock(g, ['#5a5262', '#36303e', '#1e1a24']);
    // glowing cracks
    dots(g, [[6, 8], [7, 9], [8, 9], [9, 10], [10, 10], [10, 11]], '#ff7a2a');
    dots(g, [[7, 9], [9, 10]], '#ffd060');
    dots(g, [[12, 8], [12, 9], [4, 11], [5, 11]], '#ff5a1e');
    // dull facets on top
    dots(g, [[5, 5], [6, 5], [10, 6]], '#7a7286');
    return '#0e0a10';
  },
  bone_silver(g) {
    rock(g, ['#f2ead6', '#d2c6a8', '#a0937a']);
    // silver nuggets, each with a bright pixel
    for (const [x, y] of [[5, 7], [10, 9], [7, 11]]) {
      dots(g, [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]], '#a8b6cc');
      put(g, x, y, '#ffffff');
    }
    dots(g, [[12, 7], [4, 10]], '#7c8aa2');
    dots(g, [[9, 6], [13, 11]], '#8a7c64'); // pits
    return '#3a3024';
  },
  bloodstone(g) {
    // octagonal cut: crown facets around a table
    const P = { hi: '#ff9a9a', l: '#e8384a', m: '#b81e34', d: '#7a0e22', dd: '#4e0616' };
    poly(g, [[5, 2], [11, 2], [14, 5.5], [14, 10], [8, 15], [2, 10], [2, 5.5]], P.m);
    poly(g, [[5, 2], [8, 2], [8, 5.5], [2, 5.5]], P.l);
    poly(g, [[8, 2], [11, 2], [14, 5.5], [8, 5.5]], P.m);
    poly(g, [[2, 5.5], [5, 5.5], [8, 15], [2, 10]], P.m);
    poly(g, [[11, 5.5], [14, 5.5], [14, 10], [8, 15]], P.d);
    poly(g, [[5, 5.5], [11, 5.5], [8, 15]], P.l);
    poly(g, [[8, 5.5], [11, 5.5], [8, 15]], P.m);
    dots(g, [[5, 3], [6, 3], [5, 4]], P.hi);
    dots(g, [[6, 7], [7, 8]], '#ffd0d0');
    dots(g, [[12, 9], [11, 11]], P.dd);
    return '#2a0410';
  },
  void_obsidian(g) {
    // jagged slab leaning right, conchoidal facets
    poly(g, [[4, 15], [1.5, 9], [5, 3], [9, 1], [14.5, 6], [12.5, 13], [8, 15]], '#2a2238');
    poly(g, [[5, 3], [9, 1], [8, 7], [3.5, 8]], '#4a3e66');
    poly(g, [[9, 1], [14.5, 6], [10, 8], [8, 7]], '#352a4a');
    poly(g, [[1.5, 9], [3.5, 8], [6, 15], [4, 15]], '#1a1426');
    poly(g, [[10, 8], [14.5, 6], [12.5, 13]], '#120e1c');
    // violet sheen along the edges
    dots(g, [[5, 4], [6, 3], [7, 2]], '#c8a0ff');
    dots(g, [[4, 5], [4, 6]], '#8a64d0');
    dots(g, [[9, 8], [10, 9], [10, 10]], '#7a50c8');
    dots(g, [[8, 2]], '#ffffff');
    return '#06040a';
  },
  soul_amber(g) {
    // teardrop: round body plus a tapering tip
    blob(g, 8, 10, 5.4, 4.8, ['#ffd870', '#f0a030', '#b0601a']);
    poly(g, [[8, 1], [11.5, 7], [4.5, 7]], '#f0a030');
    poly(g, [[8, 1], [8, 7], [4.5, 7]], '#ffd870');
    // the soul: a small pale wisp with two dark eyes
    dots(g, [[7, 8], [8, 8], [6, 9], [7, 9], [8, 9], [9, 9], [6, 10], [7, 10], [8, 10], [9, 10], [7, 11], [9, 11], [10, 12]], '#eafcff');
    dots(g, [[7, 9], [9, 9]], '#2a4a5a');
    dots(g, [[6, 11], [8, 11]], '#b8eef8');
    dots(g, [[5, 6], [6, 5], [5, 7]], '#fff4c8');
    return '#4a2408';
  },
};

/** 16x16 grid of colours (null = transparent) for a material, or null if unknown. */
export function oreGrid(id) {
  const draw = DRAW[id];
  if (!draw) return null;
  const g = grid();
  const ink = draw(g);
  return outline(g, ink);
}

export const ORE_IDS = Object.keys(DRAW);

/** Horizontal runs of one colour: [x, y, width, colour]. */
export function oreRuns(g) {
  const out = [];
  g.forEach((row, y) => {
    for (let x = 0; x < S;) {
      const c = row[x];
      let w = 1;
      while (x + w < S && row[x + w] === c) w++;
      if (c) out.push([x, y, w, c]);
      x += w;
    }
  });
  return out;
}
