import React, { useMemo } from 'react';

/**
 * Mine materials in pixel art (24x24), matching the potion and crop sprites: chunky shapes with a
 * warm brown outline, lit from the upper left, and a white glint. Each material is a stack of
 * layers (a polygon or a mask, shaded as a rounded rock or as a cut gem), then its details (metal
 * flecks, glowing cracks, a soul trapped in amber...). Gems twinkle (.ore-twinkle, animated in CSS;
 * hidden on tiny icons) and the magical ones glow.
 */
const S = 24;
const INK = '#4a3020';
const GLINT = '#ffffff';

const ORES = {
  iron_ore: {
    layers: [{ poly: [[3, 15], [6, 8], [11, 5], [17, 6], [21, 11], [20, 18], [13, 21], [5, 20]], color: ['#b3a898', '#857a6c', '#5a5046'] }],
    deco(g) {
      const silver = [[8, 11], [9, 11], [9, 12], [14, 9], [15, 9], [15, 10], [12, 15], [13, 15], [13, 16], [17, 14]];
      for (const [x, y] of silver) put(g, x, y, '#c9d0da');
      for (const [x, y] of [[8, 11], [14, 9], [12, 15]]) put(g, x, y, '#f2f5f9');
      for (const [x, y] of [[7, 16], [8, 16], [17, 11], [11, 18]]) put(g, x, y, '#c27a4a'); // rust
      put(g, 8, 8, GLINT); put(g, 9, 7, GLINT);
    },
  },
  dark_crystal: {
    layers: [
      { poly: [[4, 20], [6, 16], [18, 16], [20, 20], [17, 22], [7, 22]], color: ['#7a7080', '#544b5c', '#342d3c'] },
      { poly: [[4, 18], [4, 12], [7, 8], [10, 12], [10, 18]], color: ['#b89cff', '#7448e8', '#4a28a8'], shade: 'gem' },
      { poly: [[14, 18], [14, 11], [17, 8], [20, 11], [20, 18]], color: ['#b89cff', '#7448e8', '#4a28a8'], shade: 'gem' },
      { poly: [[9, 19], [9, 7], [12, 2], [15, 7], [15, 19]], color: ['#d8c8ff', '#8a5cff', '#5530c0'], shade: 'gem' },
    ],
    deco(g) { put(g, 11, 5, GLINT); put(g, 11, 6, GLINT); put(g, 6, 11, '#e6dcff'); put(g, 16, 11, '#e6dcff'); },
    twinkle: [[12, 4], [17, 10]],
    glow: '123, 77, 255',
  },
  ember_coal: {
    layers: [{ poly: [[3, 14], [6, 8], [12, 5], [18, 7], [21, 12], [19, 19], [11, 21], [4, 19]], color: ['#55505c', '#322d36', '#1c181f'] }],
    deco(g) {
      const cracks = [[7, 12], [8, 13], [9, 13], [10, 14], [11, 14], [12, 15], [13, 15], [15, 9], [15, 10], [16, 11], [16, 12], [17, 13], [9, 18], [10, 17], [11, 17], [14, 17], [15, 18]];
      for (const [x, y] of cracks) put(g, x, y, '#ff8a2e');
      for (const [x, y] of [[9, 13], [10, 14], [16, 11], [11, 17]]) put(g, x, y, '#ffe08a'); // hot core
      put(g, 8, 8, '#8f8898'); put(g, 9, 7, '#8f8898'); put(g, 7, 9, '#6e6876');
    },
    glow: '255, 138, 46',
  },
  bone_silver: {
    layers: [{ poly: [[4, 15], [5, 10], [10, 6], [15, 5], [20, 8], [21, 14], [17, 20], [9, 21]], color: ['#f4f6fa', '#bcc4d2', '#7c8496'] }],
    deco(g) {
      // a little bone fossil set in the silver
      for (const [x, y] of [[9, 15], [10, 14], [11, 13], [12, 12], [13, 11], [14, 10]]) put(g, x, y, '#efe2c0');
      for (const [x, y] of [[8, 15], [9, 16], [14, 9], [15, 10]]) put(g, x, y, '#efe2c0');
      for (const [x, y] of [[8, 16], [15, 9]]) put(g, x, y, '#c9b98e');
      put(g, 8, 8, GLINT); put(g, 9, 8, GLINT); put(g, 7, 9, GLINT);
    },
  },
  bloodstone: {
    layers: [{ poly: [[5, 10], [9, 5], [15, 5], [19, 10], [16, 18], [12, 22], [8, 18]], color: ['#ff8a8a', '#c8262e', '#701018'], shade: 'gem' }],
    deco(g) {
      for (let x = 10; x <= 14; x++) put(g, x, 7, '#ffb0b0'); // table facet
      for (let x = 7; x <= 17; x++) put(g, x, 10, '#e8484e'); // girdle
      put(g, 13, 14, '#3e0a10'); put(g, 15, 12, '#3e0a10'); put(g, 10, 16, '#3e0a10');
      put(g, 9, 8, GLINT); put(g, 10, 8, GLINT); put(g, 8, 9, GLINT);
    },
    twinkle: [[11, 6], [16, 11]],
    glow: '200, 38, 46',
  },
  void_obsidian: {
    layers: [{ poly: [[4, 19], [7, 10], [13, 2], [19, 8], [20, 15], [14, 22]], color: ['#6a5890', '#2e2340', '#140e1c'], shade: 'gem' }],
    deco(g) {
      for (const [x, y] of [[8, 11], [9, 9], [10, 8], [11, 6], [12, 5]]) put(g, x, y, '#b48cff'); // sharp edge catching light
      for (const [x, y] of [[14, 12], [11, 16], [16, 16], [13, 19]]) put(g, x, y, '#e0d0ff'); // stars of the void
      put(g, 9, 10, GLINT);
    },
    twinkle: [[14, 12], [11, 16]],
    glow: '180, 140, 255',
  },
  soul_amber: {
    layers: [{
      mask: (x, y) => (x + 0.5 - 12) ** 2 + (y + 0.5 - 15) ** 2 <= 44 || (y >= 4 && y < 15 && Math.abs(x + 0.5 - 12) <= (y - 3) * 0.6),
      color: ['#ffd77a', '#f0a020', '#a8600e'],
    }],
    deco(g) {
      // the trapped soul: a pale wisp
      for (const [x, y] of [[11, 13], [12, 13], [10, 14], [11, 14], [12, 14], [13, 14], [11, 15], [12, 15], [13, 15], [12, 16], [13, 17]]) put(g, x, y, '#eafcff');
      put(g, 11, 14, '#5a8aa0'); put(g, 13, 14, '#5a8aa0'); // eyes
      put(g, 9, 11, GLINT); put(g, 9, 12, GLINT); put(g, 10, 10, GLINT);
    },
    twinkle: [[15, 18]],
    glow: '255, 190, 70',
  },
};

const grid = () => Array.from({ length: S }, () => Array(S).fill(null));
function put(g, x, y, c) { if (y >= 0 && y < S && x >= 0 && x < S) g[y][x] = c; }

/** Is the pixel centre inside the polygon (even-odd rule)? */
function inPoly(poly, px, py) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** One layer: an outline of ink on its border, shaded inside (rock: diagonal light; gem: facets left to right). */
function drawLayer(g, layer) {
  const inside = layer.mask ?? ((x, y) => inPoly(layer.poly, x + 0.5, y + 0.5));
  let minX = S, maxX = 0, minY = S, maxY = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inside(x, y)) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, hw = Math.max(1, (maxX - minX) / 2), hh = Math.max(1, (maxY - minY) / 2);
  const [light, mid, dark] = layer.color;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inside(x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inside(x + dx, y + dy))) { put(g, x, y, INK); continue; }
    if (layer.shade === 'gem') {
      const t = (x - minX) / Math.max(1, maxX - minX);
      put(g, x, y, t < 0.36 ? light : t > 0.64 ? dark : mid);
    } else {
      const d = (x - cx) / hw + (y - cy) / hh;
      put(g, x, y, d < -0.5 ? light : d > 0.55 ? dark : mid);
    }
  }
}

function draw(def) {
  const g = grid();
  def.layers.forEach((l) => drawLayer(g, l));
  def.deco(g);
  return g;
}

function runs(g) {
  const out = [];
  g.forEach((row, y) => {
    for (let x = 0; x < S;) {
      const c = row[x];
      let w = 1;
      while (x + w < S && row[x + w] === c) w++;
      if (c) out.push(<rect key={`${y}-${x}`} x={x} y={y} width={w} height={1} fill={c} />);
      x += w;
    }
  });
  return out;
}

export const hasOreSprite = (id) => !!ORES[id];

export default function OreSprite({ id, size = 28 }) {
  const def = ORES[id];
  const body = useMemo(() => (def ? runs(draw(def)) : null), [def]);
  if (!def) return null;
  return (
    <svg
      className={`farm-icon ore-sprite ${size < 24 ? 'tiny' : ''} ${def.glow ? 'glow' : ''}`}
      style={def.glow ? { '--ore-glow': `rgba(${def.glow}, 0.55)` } : undefined}
      viewBox={`0 0 ${S} ${S}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true"
    >
      {body}
      {(def.twinkle ?? []).map(([x, y], i) => (
        <rect key={i} className="ore-twinkle" x={x} y={y} width={1} height={1} fill={GLINT} style={{ animationDelay: `${i * 1.1}s` }} />
      ))}
    </svg>
  );
}
