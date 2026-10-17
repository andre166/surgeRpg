/**
 * Procedural pixel-art weapon sprites (24x24), one per catalog weapon, from its name:
 * "<Material> <Type> [+] [II]". The type picks the silhouette, the material the palette,
 * "+" adds a glow and "II" a gem in the guard, so every weapon reads differently.
 *
 * Shapes are rasterised along the diagonal (handle bottom-left, tip top-right): each part
 * covers a stretch of the axis with a half-width profile (and an optional sideways curve or
 * one-sided head), then the sprite gets side shading, an edge highlight and a dark outline.
 */
export const ART_SIZE = 24;

/** Material word -> blade [highlight, mid, shadow], guard/accent and glow colours. */
export const MATERIALS = {
  Flint: { blade: ['#c9c1b1', '#8f877a', '#5c564e'], accent: '#7a6a55', glow: '#d8cbb0' },
  Copper: { blade: ['#ffc69a', '#d9844c', '#9a5126'], accent: '#b5652f', glow: '#ffb27a' },
  Bronze: { blade: ['#f3d48f', '#c69a4e', '#8a6428'], accent: '#a87a33', glow: '#ffd98a' },
  Iron: { blade: ['#c4c8cf', '#868b95', '#575b63'], accent: '#6c6258', glow: '#d6dae0' },
  Steel: { blade: ['#eef3fa', '#aab6c6', '#6f7a8a'], accent: '#8f7a52', glow: '#e6f0ff' },
  Silver: { blade: ['#ffffff', '#d3d9e2', '#98a1ae'], accent: '#c9b37a', glow: '#ffffff' },
  Cobalt: { blade: ['#9ec8ff', '#3f7fe0', '#22488f'], accent: '#c8a24a', glow: '#7fb6ff' },
  Obsidian: { blade: ['#8a7aa6', '#3b3148', '#1c1724'], accent: '#7b2fbf', glow: '#b48cff' },
  Mithral: { blade: ['#f0fbff', '#a9e3f2', '#5fa8bd'], accent: '#d8e8f0', glow: '#c9f6ff' },
  Adamant: { blade: ['#b8f2cf', '#3fae7a', '#1f6b48'], accent: '#c6a24a', glow: '#8affc4' },
  Starsteel: { blade: ['#d6d4ff', '#7f7be6', '#3f3a9a'], accent: '#ffd76a', glow: '#b9b5ff' },
  Astral: { blade: ['#f2d6ff', '#b47cf0', '#6a3aa8'], accent: '#ffd76a', glow: '#e3b8ff' },
  Aether: { blade: ['#e3fffb', '#7fe6dc', '#2f9a93'], accent: '#ffffff', glow: '#a8fff4' },
  Eternal: { blade: ['#fff6c4', '#f2c84a', '#a8801e'], accent: '#ff6f5c', glow: '#ffe68a' },
  Sunforged: { blade: ['#ffffff', '#ffe27a', '#d9a21e'], accent: '#ff9f1e', glow: '#fff1a8' },
  Voidglass: { blade: ['#c79bff', '#5a2a9a', '#24103f'], accent: '#22d3ee', glow: '#a855f7' },
  Dragonbone: { blade: ['#fff8e6', '#e6d6b0', '#a8946a'], accent: '#8a2f24', glow: '#ffe2a8' },
  Moonlit: { blade: ['#f0f6ff', '#b8cff5', '#6a86c2'], accent: '#c0c8e0', glow: '#d6e6ff' },
  Primal: { blade: ['#d6ff8a', '#6ec23a', '#2f6e1a'], accent: '#8a5a2a', glow: '#b6ff5c' },
  Omega: { blade: ['#fff2a8', '#ff7a2f', '#b8261e'], accent: '#3a1a12', glow: '#ff9a3d' },
};
const DEFAULT_MATERIAL = MATERIALS.Iron;

const OUTLINE = '#14161f';
const GRIP = ['#9a6a3c', '#6b4626', '#3f2817'];
const GEM = '#ff4f6d';

/**
 * Type word -> shape. Axis units are pixels along the 45° diagonal (the sprite's diagonal is
 * ~32 long). Parts: [from, to, halfWidth(t) (t = 0..1 along the part), kind, extra].
 * kind: 'blade' | 'grip' | 'guard' | 'pommel' | 'pole' | 'head' (one-sided, extra.side).
 * extra.curve bends the part sideways (pixels at its end, quadratic).
 */
const lin = (a, b) => (t) => a + (b - a) * t;
const SHAPES = {
  greatsword: [[1, 3, () => 1.4, 'pommel'], [3, 10, () => 0.9, 'grip'], [10, 11.6, () => 4.2, 'guard'], [11.6, 31, (t) => 2.6 - 1.6 * t ** 3, 'blade']],
  zweihander: [[1, 3, () => 1.4, 'pommel'], [3, 10, () => 0.9, 'grip'], [10, 11.6, () => 4.2, 'guard'], [11.6, 15, () => 1.6, 'blade'], [15, 16.2, () => 2.8, 'guard'], [16.2, 31, (t) => 2.4 - 1.5 * t ** 3, 'blade']],
  warblade: [[1, 3, () => 1.3, 'pommel'], [3, 9, () => 0.9, 'grip'], [9, 10.6, () => 3.6, 'guard'], [10.6, 30, (t) => 2.5 - 1.2 * t ** 3 + (Math.floor(t * 9) % 2) * 0.7, 'blade']],
  edge: [[1, 2.6, () => 1.1, 'pommel'], [2.6, 10, () => 0.8, 'grip'], [10, 11.2, () => 2.2, 'guard'], [11.2, 31, (t) => 1.4 - 1 * t ** 6, 'blade', { curve: -2 }]],
  claymore: [[1, 3, () => 1.2, 'pommel'], [3, 9, () => 0.8, 'grip'], [9, 10.6, (t) => 4.6 - t, 'guard'], [10.6, 31, (t) => 1.9 - 1.3 * t ** 4, 'blade']],
  longsword: [[1, 3, () => 1.2, 'pommel'], [3, 8, () => 0.8, 'grip'], [8, 9.5, () => 3.4, 'guard'], [9.5, 30, (t) => 1.6 - 1.1 * t ** 5, 'blade']],
  short_sword: [[3, 5, () => 1.2, 'pommel'], [5, 10, () => 0.8, 'grip'], [10, 11.5, () => 3, 'guard'], [11.5, 26, (t) => 1.7 - 1.2 * t ** 3, 'blade']],
  sabre: [[2, 4, () => 1.1, 'pommel'], [4, 9, () => 0.8, 'grip'], [9, 10.4, () => 2.6, 'guard'], [10.4, 30, (t) => 1.3 - 0.8 * t ** 3, 'blade', { curve: -4 }]],
  falchion: [[2, 4, () => 1.1, 'pommel'], [4, 9, () => 0.8, 'grip'], [9, 10.4, () => 3, 'guard'], [10.4, 28, (t) => 1.4 + 1.2 * Math.sin(t * Math.PI * 0.85), 'blade', { curve: -3 }]],
  talon: [[3, 5, () => 1.1, 'pommel'], [5, 10, () => 0.8, 'grip'], [10, 11.2, () => 2.6, 'guard'], [11.2, 28, (t) => 1.8 - 1.5 * t ** 2, 'blade', { curve: -7 }]],
  fang: [[5, 7, () => 1.1, 'pommel'], [7, 12, () => 0.8, 'grip'], [12, 13.2, () => 2.4, 'guard'], [13.2, 26, (t) => 1.7 - 1.5 * t ** 1.5, 'blade', { curve: 4 }]],
  dagger: [[6, 8, () => 1.1, 'pommel'], [8, 13, () => 0.75, 'grip'], [13, 14.3, () => 2.6, 'guard'], [14.3, 26, (t) => 1.3 - 1.1 * t ** 2, 'blade']],
  knife: [[6, 8, () => 1, 'pommel'], [8, 14, () => 0.85, 'grip'], [14, 25, (t) => 1.5 - 1.3 * t ** 3, 'blade', { curve: -2 }]],
  cleaver: [[2, 4, () => 1, 'pommel'], [4, 19, () => 0.8, 'pole'], [16, 27, (t) => 4.5 + Math.sin(t * Math.PI) * 1.2, 'head', { side: -1 }], [19, 22, () => 0.9, 'pole']],
  halberd: [[0, 30, () => 0.65, 'pole'], [19, 26, (t) => 4 * Math.sin(t * Math.PI) + 0.8, 'head', { side: -1 }], [21, 25, () => 1.6, 'head', { side: 1 }], [29, 33, (t) => 1.2 - 1.1 * t, 'blade']],
  glaive: [[0, 21, () => 0.65, 'pole'], [21, 22.4, () => 1.6, 'guard'], [22.4, 33, (t) => 1.8 - 1.4 * t ** 2, 'blade', { curve: -3.5 }]],
};

/** Type word in the name -> shape. */
const TYPE_SHAPE = {
  Zweihander: 'zweihander', Greatsword: 'greatsword', Warblade: 'warblade', Claymore: 'claymore',
  Blade: 'longsword', Edge: 'edge', Sword: 'short_sword', Sabre: 'sabre', Falchion: 'falchion',
  Talon: 'talon', Fang: 'fang', Shiv: 'dagger', Knife: 'knife', Cleaver: 'cleaver', Halberd: 'halberd', Glaive: 'glaive',
};

/** Material, shape and modifiers parsed from a weapon name. */
export function weaponLook(name) {
  const words = String(name ?? '').replace(/[+]/g, ' + ').split(/\s+/).filter(Boolean);
  const material = words.find((w) => MATERIALS[w]) ?? null;
  const type = words.find((w) => TYPE_SHAPE[w]) ?? null;
  return { material, type, shape: TYPE_SHAPE[type] ?? 'short_sword', plus: words.includes('+'), second: words.includes('II') };
}

/**
 * Rasterises a weapon into a 24x24 grid of colours (null = transparent).
 * Deterministic: the same name always gives the same picture.
 */
export function weaponGrid(name) {
  const look = weaponLook(name);
  const mat = MATERIALS[look.material] ?? DEFAULT_MATERIAL;
  const parts = SHAPES[look.shape];
  const N = ART_SIZE;
  const grid = Array.from({ length: N }, () => Array(N).fill(null));
  const kind = Array.from({ length: N }, () => Array(N).fill(null));
  // axis from the bottom-left corner towards the top-right
  const x0 = 1.5;
  const y0 = N - 1.5;
  const R = Math.SQRT1_2;
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const px = x + 0.5 - x0;
      const py = y0 - (y + 0.5);
      const u = (px + py) * R; // along the axis
      const v = (px - py) * R; // across it (+ = lower-right side)
      for (const [from, to, half, k, extra = {}] of parts) {
        if (u < from || u > to) continue;
        const t = (u - from) / Math.max(0.001, to - from);
        const off = extra.curve ? extra.curve * t * t : 0;
        const w = half(t);
        const d = v - off;
        const inside = extra.side ? (d * extra.side >= -0.4 && Math.abs(d) <= w) : Math.abs(d) <= w;
        if (!inside) continue;
        // shading: light on the upper-left side, dark on the lower-right, bright edge line
        const rel = extra.side ? Math.abs(d) / Math.max(0.5, w) : d / Math.max(0.5, w);
        let c;
        if (k === 'blade' || k === 'head') {
          c = rel < -0.35 ? mat.blade[0] : rel > 0.4 ? mat.blade[2] : mat.blade[1];
          if (k === 'head' && rel > 0.75) c = mat.blade[0]; // the axe's cutting edge catches light
        } else if (k === 'grip' || k === 'pole') {
          c = rel < -0.2 ? GRIP[0] : rel > 0.3 ? GRIP[2] : GRIP[1];
          if (k === 'grip' && Math.round(u) % 2 === 0) c = GRIP[2]; // wrapping
        } else {
          c = rel < 0 ? mat.accent : shade(mat.accent, -0.3);
        }
        grid[y][x] = c;
        kind[y][x] = k;
      }
    }
  }
  // gem on the guard for "II"
  if (look.second) {
    const g = guardCentre(kind);
    if (g) grid[g.y][g.x] = GEM;
  }
  // dark outline around everything
  const out = grid.map((row) => row.slice());
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (grid[y][x]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy]?.[x + dx]);
      if (near) out[y][x] = OUTLINE;
    }
  }
  // "+" : a soft glow ring outside the outline
  if (look.plus) {
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        if (out[y][x]) continue;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => out[y + dy]?.[x + dx] === OUTLINE);
        if (near) out[y][x] = `${mat.glow}99`;
      }
    }
  }
  return out;
}

/** Where the 'II' gem goes: the centre of the guard, or of the head for weapons without one. */
function guardCentre(kind) {
  const cells = [];
  for (const want of ['guard', 'head']) {
    kind.forEach((row, y) => row.forEach((k, x) => { if (k === want) cells.push({ x, y }); }));
    if (cells.length) break;
  }
  if (!cells.length) return null;
  const cx = cells.reduce((a, c) => a + c.x, 0) / cells.length;
  const cy = cells.reduce((a, c) => a + c.y, 0) / cells.length;
  return cells.reduce((best, c) => ((c.x - cx) ** 2 + (c.y - cy) ** 2 < (best.x - cx) ** 2 + (best.y - cy) ** 2 ? c : best));
}

/** Lightens (amt > 0) or darkens (amt < 0) a #rrggbb colour. */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (v) => Math.round(Math.max(0, Math.min(255, amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = ch(n >> 16); const g = ch((n >> 8) & 255); const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Horizontal runs of equal colour, for compact SVG rects: [{ x, y, w, fill }]. */
export function weaponRuns(name) {
  const grid = weaponGrid(name);
  const runs = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === c) end += 1;
      if (c) runs.push({ x, y, w: end - x, fill: c });
      x = end;
    }
  });
  return runs;
}
