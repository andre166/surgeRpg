import React, { useMemo } from 'react';

/**
 * Relics in pixel art (24x24), drawn like the mine materials (OreSprite): layers (a polygon or a
 * mask) with an ink outline, shaded as stone or as a cut gem, then their details, a glint, a few
 * twinkling pixels and a glow. `shadow` draws the bare silhouette, for a relic not found yet.
 *
 *   drowned_idol           - squat soapstone idol: a tentacled head, folded wings, on a plinth
 *   elder_sign             - grey stone disc carved with a star and a flaming eye
 *   silver_key             - ornate silver key with a violet gem in its bow
 *   shining_trapezohedron  - black gem of impossible facets in an open bronze box
 */
const S = 24;
const INK = '#2a1c14';
const GLINT = '#ffffff';
const SHADOW = '#140e0b';

const grid = () => Array.from({ length: S }, () => Array(S).fill(null));
function put(g, x, y, c) { if (y >= 0 && y < S && x >= 0 && x < S) g[y][x] = c; }
const dots = (g, list, c) => list.forEach(([x, y]) => put(g, x, y, c));

/** Is the pixel centre inside the polygon (even-odd rule)? */
function inPoly(poly, px, py) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Fills a polygon with one colour (details over the layers, no outline). */
function fill(g, poly, c) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inPoly(poly, x + 0.5, y + 0.5)) put(g, x, y, c);
}

/** One layer: ink on its border, shaded inside (stone: diagonal light; gem: facets left to right). */
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

const SOAPSTONE = ['#a9d4a0', '#5f9466', '#2f5838'];
const STONE = ['#c9c2b4', '#8f887b', '#5a544b'];
const SILVER = ['#f4f6fa', '#b8c0ce', '#717a8c'];
const BRONZE = ['#e2b56a', '#a06e2c', '#5e3a14'];

const RELIC_ART = {
  drowned_idol: {
    layers: [
      { poly: [[4, 19], [20, 19], [21, 23], [3, 23]], color: ['#7d8a80', '#4f5a52', '#2e3630'] }, // plinth
      { poly: [[7, 13], [2, 6], [3, 13], [6, 18]], color: ['#7fb07a', '#46744c', '#24442b'] }, // left wing
      { poly: [[17, 13], [22, 6], [21, 13], [18, 18]], color: ['#7fb07a', '#46744c', '#24442b'] }, // right wing
      { poly: [[7, 19], [7, 14], [9, 11], [15, 11], [17, 14], [17, 19]], color: SOAPSTONE }, // squatting body
      { mask: (x, y) => ((x + 0.5 - 12) / 4.6) ** 2 + ((y + 0.5 - 7) / 4.2) ** 2 <= 1, color: SOAPSTONE }, // head
    ],
    deco(g) {
      // tentacles hanging over the chest, curling at the tips
      dots(g, [[9, 10], [9, 11], [9, 12], [8, 13], [11, 11], [11, 12], [11, 13], [11, 14], [10, 15], [13, 11], [13, 12], [13, 13], [13, 14], [14, 15], [15, 10], [15, 11], [15, 12], [16, 13]], '#2f5838');
      dots(g, [[8, 14], [10, 16], [14, 16], [17, 14]], '#5f9466');
      dots(g, [[10, 6], [14, 6]], '#e8ff7a'); // the eyes, faintly lit
      dots(g, [[10, 7], [14, 7]], '#9ccf4a');
      dots(g, [[9, 21], [12, 21], [15, 21]], '#22291f'); // glyphs on the plinth
      put(g, 10, 4, GLINT); put(g, 11, 4, GLINT);
    },
    twinkle: [[10, 6], [14, 6]],
    glow: '130, 220, 140',
  },
  elder_sign: {
    layers: [
      { mask: (x, y) => (x + 0.5 - 12) ** 2 + (y + 0.5 - 12) ** 2 <= 10.4 ** 2, color: STONE },
    ],
    deco(g) {
      // the carved five-pointed star (outer radius 8, inner 3.4), then the eye and its flame
      const star = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3.4 : 8.2;
        return [12 + r * Math.cos(a), 12.4 + r * Math.sin(a)];
      });
      fill(g, star, '#2e2a24');
      const inner = star.map(([x, y]) => [12 + (x - 12) * 0.62, 12.4 + (y - 12.4) * 0.62]);
      fill(g, inner, '#a39c8e');
      // the eye, and the flame rising from it
      dots(g, [[10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [10, 14], [11, 14], [12, 14], [13, 14], [14, 14]], '#ffd27a');
      dots(g, [[11, 13], [12, 13], [13, 13]], '#c0301a');
      dots(g, [[12, 13]], '#3a0a06');
      dots(g, [[12, 7], [12, 8], [11, 9], [12, 9], [13, 9], [11, 10], [12, 10], [13, 10], [12, 11]], '#ff8a2e');
      dots(g, [[12, 9], [12, 10]], '#ffe08a');
      dots(g, [[6, 5], [7, 4], [5, 7]], '#e6e0d2'); // light on the rim
    },
    twinkle: [[12, 8]],
    glow: '255, 170, 60',
  },
  silver_key: {
    layers: [
      { poly: [[9, 11], [11, 9], [21, 19], [19, 21]], color: SILVER }, // shaft
      { poly: [[15, 19], [17, 17], [20, 20], [19, 21], [18, 22], [17, 22]], color: SILVER }, // first tooth
      { poly: [[13, 17], [14, 16], [16, 18], [13, 21], [11, 19]], color: SILVER }, // second tooth
      { mask: (x, y) => { const d = (x + 0.5 - 7.5) ** 2 + (y + 0.5 - 7.5) ** 2; return d <= 5.6 ** 2 && d >= 2.4 ** 2; }, color: SILVER }, // the bow
    ],
    deco(g) {
      dots(g, [[7, 7], [8, 7], [7, 8], [8, 8]], '#9a6cff'); // a violet gem in the bow
      dots(g, [[7, 7]], '#e0d0ff');
      dots(g, [[4, 5], [5, 4], [3, 7], [12, 11], [14, 13], [16, 15]], GLINT);
      dots(g, [[11, 3], [3, 11]], '#d8dee8'); // filigree
    },
    twinkle: [[7, 7], [16, 15]],
    glow: '190, 200, 255',
  },
  shining_trapezohedron: {
    layers: [
      { poly: [[3, 15], [21, 15], [19, 23], [5, 23]], color: BRONZE }, // the box
      { poly: [[12, 1], [18, 7], [16, 15], [12, 18], [8, 15], [6, 7]], color: ['#6a5880', '#2c2038', '#110a18'], shade: 'gem' },
    ],
    deco(g) {
      // facets veined with red light, burning brighter at the heart
      dots(g, [[12, 3], [12, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 11], [12, 12], [12, 13], [12, 14], [12, 15], [12, 16]], '#8a1e34');
      dots(g, [[8, 7], [9, 7], [10, 7], [14, 7], [15, 7], [16, 7], [9, 13], [10, 14], [15, 13], [14, 14]], '#8a1e34');
      dots(g, [[11, 9], [12, 9], [13, 9], [11, 10], [12, 10], [13, 10]], '#d02a4a');
      dots(g, [[12, 9], [12, 10]], '#ff6a7a');
      dots(g, [[6, 18], [9, 18], [12, 18], [15, 18], [18, 18]], '#f2d08a'); // hieroglyphs on the box
      dots(g, [[7, 20], [11, 20], [13, 20], [17, 20]], '#7a4a1a');
      put(g, 9, 4, '#b8a8d8'); put(g, 8, 5, '#b8a8d8');
    },
    twinkle: [[12, 9], [9, 4]],
    glow: '208, 42, 74',
  },
};

function draw(def) {
  const g = grid();
  def.layers.forEach((l) => drawLayer(g, l));
  def.deco(g);
  return g;
}

function runs(g, shadow) {
  const out = [];
  g.forEach((row, y) => {
    for (let x = 0; x < S;) {
      const c = row[x];
      let w = 1;
      while (x + w < S && (shadow ? !!row[x + w] === !!c : row[x + w] === c)) w++;
      if (c) out.push(<rect key={`${y}-${x}`} x={x} y={y} width={w} height={1} fill={shadow ? SHADOW : c} />);
      x += w;
    }
  });
  return out;
}

export const hasRelicSprite = (id) => !!RELIC_ART[id];

export default function RelicSprite({ id, size = 48, shadow = false }) {
  const def = RELIC_ART[id];
  const body = useMemo(() => (def ? runs(draw(def), shadow) : null), [def, shadow]);
  if (!def) return null;
  const glow = !shadow && def.glow;
  return (
    <svg
      className={`relic-sprite ${shadow ? 'shadow' : ''} ${glow ? 'glow' : ''}`}
      style={glow ? { '--relic-glow': `rgba(${def.glow}, 0.6)` } : undefined}
      viewBox={`0 0 ${S} ${S}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true"
    >
      {body}
      {!shadow && (def.twinkle ?? []).map(([x, y], i) => (
        <rect key={i} className="relic-twinkle" x={x} y={y} width={1} height={1} fill={GLINT} style={{ animationDelay: `${i * 1.3}s` }} />
      ))}
    </svg>
  );
}
