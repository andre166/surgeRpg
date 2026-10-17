import React, { useMemo } from 'react';

/**
 * Potions and elixirs in pixel art (24x24), matching the crop sprites (CropSprite.jsx): pastel
 * liquids in glass with a white glint, warm brown outlines. Potions are corked bottles; elixirs
 * are ornate vials with golden caps. Each has its own shape and a detail (a heart bubble, a leaf
 * label, stars, a flame, a rune, a star of insight). Two bubbles rise in the liquid
 * (.pot-bubble, animated in CSS; hidden on tiny icons).
 */
const S = 24;
const INK = '#4a3020';
const GLASS = '#e6f3fb';
const GLINT = '#ffffff';
const CORK = ['#e2b07a', '#a8743e'];
const GOLD = ['#ffe27a', '#d9a21e'];

/**
 * Per item: body mask (inside the glass), liquid top row, liquid [light, mid, dark], and the
 * extras drawn over it (neck, cap, detail).
 */
const POTIONS = {
  healing_potion: {
    body: (x, y) => (x + 0.5 - 12) ** 2 + (y + 0.5 - 15) ** 2 <= 49,
    liquid: 13, color: ['#ffb0c0', '#f0607a', '#b83a58'],
    deco(g) {
      rect(g, 10, 5, 4, 4, GLASS); cork(g, 9, 2, 6);
      for (const [x, y] of [[11, 16], [13, 16], [10, 17], [11, 17], [12, 17], [13, 17], [14, 17], [11, 18], [12, 18], [13, 18], [12, 19]]) put(g, x, y, '#ffd6de'); // heart
    },
    bubbles: [[9, 18], [15, 15]],
  },
  vigor_tonic: {
    body: (x, y) => x >= 8 && x <= 15 && y >= 9 && y <= 21 && !((x === 8 || x === 15) && (y === 9 || y === 21)),
    liquid: 11, color: ['#c8f08c', '#7cc35e', '#478a44'],
    deco(g) {
      rect(g, 10, 5, 4, 4, GLASS); cork(g, 9, 2, 6);
      rect(g, 9, 14, 6, 4, '#fff2d6'); // label
      put(g, 11, 16, '#5aa04e'); put(g, 12, 15, '#7cc35e'); put(g, 13, 15, '#7cc35e'); put(g, 12, 16, '#5aa04e');
    },
    bubbles: [[10, 19], [14, 12]],
  },
  ruin_draught: {
    body: (x, y) => y >= 9 && y <= 21 && Math.abs(x + 0.5 - 12) <= 2 + (y - 9) * 0.55,
    liquid: 14, color: ['#e6c4ff', '#b07cf0', '#7a4cc0'],
    deco(g) {
      rect(g, 10, 4, 4, 5, GLASS); cork(g, 9, 2, 6);
      for (const [x, y] of [[9, 18], [14, 16], [12, 19], [16, 19]]) put(g, x, y, '#fff6c8'); // stars
      put(g, 14, 17, '#fff6c8'); put(g, 13, 16, '#fff6c8'); put(g, 15, 16, '#fff6c8');
    },
    bubbles: [[11, 17], [13, 20]],
  },
  fury_elixir: {
    body: (x, y) => y >= 8 && y <= 21 && Math.abs(x + 0.5 - 12) <= 7 - Math.abs(y - 14.5) * 0.9,
    liquid: 9, color: ['#ffc08a', '#ff7a3d', '#c0401e'],
    deco(g) {
      rect(g, 9, 5, 6, 2, GOLD[1]); rect(g, 9, 5, 6, 1, GOLD[0]); rect(g, 10, 7, 4, 1, GOLD[1]);
      put(g, 12, 2, '#ffd45e'); put(g, 11, 3, '#ff7a3d'); put(g, 12, 3, '#ffd45e'); put(g, 13, 3, '#ff7a3d'); put(g, 12, 4, '#ff7a3d'); put(g, 11, 4, '#c0401e'); put(g, 13, 4, '#c0401e'); // flame
      for (let y = 10; y <= 19; y++) put(g, 12, y, '#ffb070'); // facet
    },
    bubbles: [[10, 16], [14, 13]],
  },
  stoneskin_elixir: {
    body: (x, y) => x >= 6 && x <= 17 && y >= 10 && y <= 21 && !((x === 6 || x === 17) && (y === 10 || y === 21)),
    liquid: 12, color: ['#e2e8f2', '#9aa6ba', '#646e82'],
    deco(g) {
      rect(g, 7, 6, 10, 3, GOLD[1]); rect(g, 7, 6, 10, 1, GOLD[0]); rect(g, 9, 9, 6, 1, GOLD[1]);
      put(g, 12, 4, GOLD[1]); put(g, 12, 5, GOLD[1]); put(g, 11, 5, GOLD[0]);
      for (const [x, y] of [[12, 14], [11, 15], [13, 15], [12, 16], [12, 17], [11, 18], [13, 18]]) put(g, x, y, GOLD[0]); // rune
    },
    bubbles: [[8, 19], [16, 15]],
  },
  insight_elixir: {
    body: (x, y) => ((x + 0.5 - 12) ** 2 + (y + 0.5 - 16) ** 2 <= 36) || (y >= 8 && y < 16 && Math.abs(x + 0.5 - 12) <= (y - 8) * 0.75),
    liquid: 12, color: ['#c8e4ff', '#5aa9ff', '#2f68c0'],
    deco(g) {
      rect(g, 10, 5, 4, 2, GOLD[1]); rect(g, 10, 5, 4, 1, GOLD[0]);
      put(g, 12, 2, GOLD[0]); put(g, 11, 3, GOLD[0]); put(g, 12, 3, GOLD[1]); put(g, 13, 3, GOLD[0]); put(g, 12, 4, GOLD[1]); // star topper
      put(g, 12, 7, GLASS); put(g, 11, 7, GLASS);
      for (const [x, y] of [[12, 15], [11, 16], [12, 16], [13, 16], [12, 17]]) put(g, x, y, '#ffffff'); // star of insight
    },
    bubbles: [[9, 18], [15, 17]],
    glow: true,
  },
};

const grid = () => Array.from({ length: S }, () => Array(S).fill(null));
function put(g, x, y, c) { if (y >= 0 && y < S && x >= 0 && x < S) g[y][x] = c; }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(g, i, j, c); }
function cork(g, x, y, w) { rect(g, x, y, w, 3, CORK[1]); rect(g, x, y, w, 1, CORK[0]); put(g, x + 1, y + 1, CORK[0]); }
function outline(g) {
  const out = g.map((r) => r.slice());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = INK;
  }
  return out;
}

/** The bottle: glass above the liquid line, liquid shaded left to right, a glint, then the extras. */
function draw(def) {
  const g = grid();
  let minX = S, maxX = 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (def.body(x, y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!def.body(x, y)) continue;
    if (y < def.liquid) { put(g, x, y, GLASS); continue; }
    const t = (x - minX) / Math.max(1, maxX - minX);
    put(g, x, y, y === def.liquid ? def.color[0] : t < 0.28 ? def.color[0] : t > 0.72 ? def.color[2] : def.color[1]);
  }
  // glint on the glass, upper left
  let gx = minX + 1, gy = 0;
  for (let y = 0; y < S; y++) if (def.body(gx, y)) { gy = y + 1; break; }
  put(g, gx, gy, GLINT); put(g, gx, gy + 1, GLINT); put(g, gx + 1, gy - 1 >= 0 && def.body(gx + 1, gy - 1) ? gy - 1 : gy, GLINT);
  def.deco(g);
  return outline(g);
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

export const hasPotionSprite = (id) => !!POTIONS[id];

export default function PotionSprite({ id, size = 28 }) {
  const def = POTIONS[id];
  const body = useMemo(() => (def ? runs(draw(def)) : null), [def]);
  if (!def) return null;
  return (
    <svg
      className={`farm-icon potion-sprite ${size < 24 ? 'tiny' : ''} ${def.glow ? 'glow' : ''}`}
      viewBox={`0 0 ${S} ${S}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true"
    >
      {body}
      {def.bubbles.map(([x, y], i) => (
        <rect key={i} className="pot-bubble" x={x} y={y} width={1} height={1} fill="#ffffff" style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
    </svg>
  );
}
