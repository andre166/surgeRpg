import React, { useMemo } from 'react';

/**
 * Farm plot sprite in pixel art (32x32), in the spirit of Legend of Mana's orchard: soft pastel
 * colours, warm brown outlines, a fluffy tilled mound, and produce that grows a little face
 * when it is ready to pick.
 *
 * Stages from the growth progress: seed (a crack and a speck of green), sprout, growing (the
 * plant fills out, produce still small) and ready (full produce with a face, sparkles).
 * Layers are separate SVG groups so CSS can animate them (.crop-sway, .crop-eyes, ...):
 * the plant sways in the breeze, ready produce hops and blinks, sparkles twinkle and, while
 * growing, little motes of life drift up. `delay` offsets the loops so plots don't move in sync.
 */
const S = 32;
const INK = '#4a3020';
const EYE = '#3b2418';
const BLUSH = '#ff9fb0';
const MOUTH = '#b8475a';

/** Leaf greens, stem, and the produce palette [light, mid, dark] per crop. */
const CROPS = {
  shade_herb: { kind: 'herb', leaf: ['#c8f08c', '#8fd068', '#52984a'], fruit: ['#d6f59a', '#9ad86e', '#5aa04e'] },
  bloodroot: { kind: 'root', leaf: ['#b8e88a', '#7cc35e', '#478a44'], fruit: ['#ffb0a0', '#ef6a5e', '#b23a40'] },
  ruin_bloom: { kind: 'flower', leaf: ['#b8e88a', '#7cc35e', '#478a44'], fruit: ['#f0c8ff', '#c48cf0', '#8a56c4'], heart: ['#fff2a8', '#ffd45e'] },
  pale_mushroom: { kind: 'mushroom', fruit: ['#fff6e2', '#f0dcb8', '#c8aa80'], stem: ['#fffaf0', '#eadfca'] },
  moon_cap: { kind: 'mushroom', glow: true, fruit: ['#c8e4ff', '#88b4ff', '#5878d8'], stem: ['#f2f6ff', '#d4ddf2'] },
  abyss_truffle: { kind: 'truffle', fruit: ['#a890c8', '#6e5a94', '#463862'] },
};
const SOIL = ['#c08a5c', '#9a6a44', '#74492c'];

/* ---------- raster helpers ---------- */
const grid = () => Array.from({ length: S }, () => Array(S).fill(null));
function put(g, x, y, c) { if (y >= 0 && y < S && x >= 0 && x < S) g[y][x] = c; }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(g, i, j, c); }
function sym(g, x, y, c) { put(g, x, y, c); put(g, S - 1 - x, y, c); }
/** Ellipse shaded from the top left (light / mid / dark); rows past yMax are cut. */
function blob(g, cx, cy, rx, ry, p, yMax = S) {
  for (let y = Math.floor(cy - ry); y <= Math.min(yMax, Math.ceil(cy + ry)); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const v = dx * 0.45 + dy * 0.75;
    put(g, x, y, v < -0.45 ? p[0] : v > 0.45 ? p[2] : p[1]);
  }
}
/** Dark warm outline around everything drawn in the layer. */
function outline(g, c = INK) {
  const out = g.map((r) => r.slice());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = c;
  }
  return out;
}
/** Leaf: a little teardrop going out from (x, y) towards direction dir (-1 left, 1 right). */
function leaf(g, x, y, dir, len, p) {
  for (let i = 0; i < len; i++) {
    const w = i === 0 || i === len - 1 ? 1 : 2;
    rect(g, dir > 0 ? x + i : x - i, y - Math.floor(i / 2) - (w - 1), 1, w, i < len / 2 ? p[1] : p[0]);
  }
  put(g, dir > 0 ? x + 1 : x - 1, y, p[2]);
}

/* ---------- layers ---------- */

function soil(planted) {
  const g = grid();
  blob(g, 16, 26, 13, 4.5, SOIL);
  // furrows and crumbs
  for (const x of [8, 12, 20, 24]) { put(g, x, 25, SOIL[2]); put(g, x + 1, 26, SOIL[2]); }
  for (const [x, y] of [[6, 27], [25, 27], [11, 28], [21, 28]]) put(g, x, y, SOIL[0]);
  if (planted) { rect(g, 14, 24, 4, 1, SOIL[2]); put(g, 13, 23, SOIL[0]); put(g, 18, 23, SOIL[0]); }
  return outline(g);
}

/** Face on produce centred on (cx, cy): eyes go in their own layer so they can blink. */
function face(g, eyes, cx, cy, { sleepy = false } = {}) {
  if (sleepy) { rect(eyes, cx - 3, cy, 2, 1, EYE); rect(eyes, cx + 1, cy, 2, 1, EYE); }
  else { rect(eyes, cx - 2, cy - 1, 1, 2, EYE); rect(eyes, cx + 1, cy - 1, 1, 2, EYE); }
  put(g, cx - 4, cy + 1, BLUSH); put(g, cx + 3, cy + 1, BLUSH);
  put(g, cx - 1, cy + 2, MOUTH); put(g, cx, cy + 2, MOUTH);
}

function plant(crop, stage) {
  const d = CROPS[crop];
  const g = grid();
  const eyes = grid();
  const L = d.leaf ?? ['#b8e88a', '#7cc35e', '#478a44'];
  const F = d.fruit;
  if (stage === 0) {
    // seed: a speck of green poking out of the mound
    put(g, 16, 22, L[1]); put(g, 15, 21, L[0]); put(g, 17, 21, L[1]);
    return { g: outline(g), eyes };
  }
  if (d.kind === 'herb' || d.kind === 'root' || d.kind === 'flower') {
    const top = stage === 1 ? 18 : stage === 2 ? 14 : 12;
    rect(g, 15, top, 2, 24 - top, L[2]); put(g, 15, top, L[1]);
    const pairs = stage === 1 ? [[20, 3]] : stage === 2 ? [[21, 4], [17, 4]] : [[21, 5], [17, 5], [14, 4]];
    for (const [y, len] of pairs) { leaf(g, 14, y, -1, len, L); leaf(g, 17, y, 1, len, L); }
    if (d.kind === 'herb' && stage === 3) {
      blob(g, 16, 17, 7, 5.5, F);
      for (const x of [10, 13, 19, 22]) put(g, x, 12 + (x % 3), F[0]);
      face(g, eyes, 16, 17);
    }
    if (d.kind === 'root') {
      if (stage >= 2) blob(g, 16, stage === 3 ? 21 : 22, stage === 3 ? 6 : 3.5, stage === 3 ? 4.5 : 2.5, F, 24);
      if (stage === 3) face(g, eyes, 16, 20);
    }
    if (d.kind === 'flower') {
      if (stage === 2) blob(g, 16, 12, 2.5, 3, F);
      if (stage === 3) {
        for (const [px, py] of [[16, 6], [11, 9], [21, 9], [12, 14], [20, 14]]) blob(g, px, py, 3.2, 3.2, F);
        blob(g, 16, 10.5, 4, 3.6, [d.heart[0], d.heart[1], d.heart[1]]);
        face(g, eyes, 16, 10);
      }
    }
    return { g: outline(g), eyes };
  }
  if (d.kind === 'mushroom') {
    if (stage === 1) { blob(g, 16, 22, 3, 2, F, 22); rect(g, 15, 23, 2, 1, d.stem[1]); }
    if (stage === 2) {
      rect(g, 11, 20, 2, 3, d.stem[1]); blob(g, 12, 20, 3.5, 2.5, F, 20);
      rect(g, 18, 19, 3, 4, d.stem[0]); blob(g, 19.5, 18, 5, 3.5, F, 18);
    }
    if (stage === 3) {
      rect(g, 22, 20, 2, 3, d.stem[1]); blob(g, 23, 20, 3.5, 2.5, F, 20); // little companion
      rect(g, 12, 15, 8, 9, d.stem[0]); rect(g, 18, 15, 2, 9, d.stem[1]);
      blob(g, 16, 14, 10, 7, F, 14);
      for (const [x, y] of [[11, 10], [19, 9], [15, 8], [22, 12]]) { put(g, x, y, '#ffffff'); put(g, x + 1, y, F[0]); }
      face(g, eyes, 16, 19);
    }
    return { g: outline(g), eyes };
  }
  // truffle: grows up out of the mound
  if (stage === 1) { rect(g, 14, 23, 4, 1, F[2]); put(g, 15, 22, F[1]); }
  if (stage === 2) blob(g, 16, 23, 4, 2.5, F, 23);
  if (stage === 3) {
    blob(g, 16, 20, 7, 5.5, F, 24);
    for (const [x, y] of [[12, 17], [18, 16], [20, 19], [14, 21]]) put(g, x, y, F[0]);
    face(g, eyes, 16, 20, { sleepy: true });
    for (const [x, y] of [[10, 24], [21, 24]]) put(g, x, y, SOIL[1]); // soil crumbs on it
  }
  return { g: outline(g), eyes };
}

/** Sparkles of ready produce (moon caps also glow); motes that drift up while growing. */
function extras(crop, stage) {
  const d = CROPS[crop];
  if (stage === 3) {
    const c = d.glow ? '#e4f2ff' : '#fff6c8';
    return [[5, 8, c], [26, 6, c], [27, 16, c], [4, 18, c]];
  }
  if (stage >= 1) return [[9, 18, '#e8ffd0'], [23, 15, '#e8ffd0']];
  return [];
}

/** One <rect> per horizontal run of a colour. */
function runs(g, key) {
  const out = [];
  g.forEach((row, y) => {
    for (let x = 0; x < S;) {
      const c = row[x];
      let w = 1;
      while (x + w < S && row[x + w] === c) w++;
      if (c) out.push(<rect key={`${key}${y}-${x}`} x={x} y={y} width={w} height={1} fill={c} />);
      x += w;
    }
  });
  return out;
}

/** Growth stage from the progress (0..1) and readiness. */
export function cropStage(progress, ready) {
  if (ready) return 3;
  return progress < 0.2 ? 0 : progress < 0.55 ? 1 : 2;
}

export const hasCropItem = (id) => !!CROPS[id];

/** Harvested produce as an item icon (storehouse, recipe costs): the ripe plant without the
    mound, face included, cropped to its own square; static, no sway or sparkles. */
const ITEM_CACHE = new Map();
export function CropItem({ crop, size = 28 }) {
  if (!CROPS[crop]) return null;
  if (!ITEM_CACHE.has(crop)) {
    const p = plant(crop, 3);
    const g = p.g.map((row, y) => row.map((c, x) => p.eyes[y][x] ?? c));
    let minX = S, maxX = 0, minY = S, maxY = 0;
    g.forEach((row, y) => row.forEach((c, x) => { if (c) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); } }));
    const side = Math.max(maxX - minX, maxY - minY) + 1;
    const box = [(minX + maxX + 1 - side) / 2, (minY + maxY + 1 - side) / 2, side, side].join(' ');
    ITEM_CACHE.set(crop, { box, rects: runs(g, 'i') });
  }
  const { box, rects } = ITEM_CACHE.get(crop);
  return (
    <svg className={`farm-icon crop-item ${CROPS[crop].glow ? 'glow' : ''}`} viewBox={box} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}

export default function CropSprite({ crop = null, progress = 0, ready = false, size = 56, delay = 0 }) {
  const stage = crop ? cropStage(progress, ready) : -1;
  const layers = useMemo(() => {
    if (!crop || !CROPS[crop]) return { soil: runs(soil(false), 's') };
    const p = plant(crop, stage);
    return { soil: runs(soil(true), 's'), plant: runs(p.g, 'p'), eyes: runs(p.eyes, 'e'), extras: extras(crop, stage) };
  }, [crop, stage]);
  const kind = crop ? CROPS[crop]?.kind : null;
  return (
    <svg
      className={`crop-sprite stage-${stage} ${kind ? `kind-${kind}` : ''} ${crop && CROPS[crop]?.glow ? 'glow' : ''}`}
      viewBox={`0 0 ${S} ${S}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true"
      style={{ '--d': `${delay}s` }}
    >
      <g className="crop-soil">{layers.soil}</g>
      {layers.plant && (
        <g className="crop-sway">
          <g className="crop-hop">
            {layers.plant}
            <g className="crop-eyes">{layers.eyes}</g>
          </g>
        </g>
      )}
      {layers.extras?.map(([x, y, c], i) => (
        <rect key={i} className={stage === 3 ? 'crop-spark' : 'crop-mote'} x={x} y={y} width={1} height={1} fill={c} style={{ animationDelay: `calc(var(--d) + ${i * 0.45}s)` }} />
      ))}
    </svg>
  );
}
