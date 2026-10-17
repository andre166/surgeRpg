/**
 * Pixel-art sprites (32x32) of the farm stable creatures, drawn in code in a Lovecraftian
 * style: things from the Mythos tamed to work the farm. Keys are `stable:<creature id>`
 * (src/core/farm.js CREATURES); the ids stay as they were so saves keep working.
 *
 *   abyss_slug    Shoggoth Spawn: a bubbling protoplasm blob full of eyes and mouths
 *   grave_crow    Night-Gaunt: faceless horned flyer with bat wings and a barbed tail
 *   imp_alchemist Mi-Go: fungoid crustacean, pinkish brain-head, pincers holding a vial
 *   bog_toad      Spawn of Tsathoggua: squat furry toad-thing with sleepy eyes
 *   moon_moth     Moth of Leng: pale moth with eye-spots on its wings and a sickly glow
 *   specter_mole  Dhole: segmented burrowing worm with a ringed maw of teeth
 *   arcane_owl    Elder Thing: barrel body with ridges, a starfish head of eye-stalks
 */

export const STABLE_SIZE = 32;
const S = STABLE_SIZE;

const VOID = '#0a0610';
const WHITE = '#ffffff';
const EYE = '#f2ff9a';

/* ---------- grid helpers (x mirrored around the centre: S - 1 - x) ---------- */

function grid() { return Array.from({ length: S }, () => Array(S).fill(null)); }
function put(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < S && x >= 0 && x < S) g[y][x] = c; }
function sym(g, x, y, c) { put(g, x, y, c); put(g, S - 1 - x, y, c); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(g, i, j, c); }
function symRect(g, x, y, w, h, c) { rect(g, x, y, w, h, c); rect(g, S - x - w, y, w, h, c); }
function line(g, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) put(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
}
function symLine(g, x0, y0, x1, y1, c) { line(g, x0, y0, x1, y1, c); line(g, S - 1 - x0, y0, S - 1 - x1, y1, c); }
function oval(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) put(g, x, y, c);
  }
}
/** Shaded ellipse: light top-left, dark bottom-right (palette p = [light, mid, dark]). */
function blob(g, cx, cy, rx, ry, p) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const v = dx * 0.45 + dy * 0.75;
    put(g, x, y, v < -0.45 ? p[0] : v > 0.4 ? p[2] : p[1]);
  }
}
/** A small eye: white with a slit pupil (or a glowing dot when `glow`). */
function eye(g, x, y, glow = false) {
  if (glow) { put(g, x, y, EYE); put(g, x + 1, y, EYE); return; }
  put(g, x, y, WHITE); put(g, x + 1, y, WHITE); put(g, x, y + 1, WHITE); put(g, x + 1, y + 1, VOID);
}

/* ---------- the creatures: each draws into g and returns its outline colour ---------- */

const DRAW = {
  abyss_slug(g) {
    // Shoggoth spawn: iridescent black-green protoplasm, eyes and toothy mouths opening all over
    const p = ['#5e8a6a', '#2e4a3c', '#16241e'];
    blob(g, 16, 21, 12, 8, p);
    blob(g, 11, 15, 6, 5, p); blob(g, 21, 14, 5, 5, p); blob(g, 16, 11, 4, 4, p);
    for (const [x, y] of [[6, 27], [12, 28], [20, 28], [26, 27]]) rect(g, x, y, 2, 2, p[1]); // pseudopods
    for (const [x, y] of [[9, 14], [20, 12], [15, 10], [13, 19], [22, 18], [7, 21], [18, 23]]) eye(g, x, y);
    put(g, 25, 22, '#c8f0a0'); put(g, 11, 12, '#c8f0a0'); // iridescent sheen
    put(g, 18, 9, '#a8d4ff'); put(g, 24, 13, '#a8d4ff');
    rect(g, 10, 24, 5, 1, VOID); for (const x of [10, 12, 14]) put(g, x, 23, WHITE); // a mouth
    rect(g, 19, 21, 3, 1, VOID); put(g, 20, 20, WHITE);
    return '#06100a';
  },
  grave_crow(g) {
    // Night-gaunt: faceless black flyer, curved horns, leathery bat wings, barbed tail
    const skin = ['#4a4458', '#2a2636', '#16131e'];
    // bat wings: a membrane between the shoulder, the tip (2, 4) and a scalloped lower edge
    for (let y = 4; y <= 19; y++) {
      const left = Math.round(2 + (y - 4) * 0.25);
      const right = Math.round(4 + (y - 4) * 0.6);
      const bottom = y > 15 && (y - 15) * 2 > (13 - right);
      if (!bottom) symRect(g, left, y, Math.max(1, right - left + 1), 1, (y + left) % 4 ? skin[1] : skin[2]);
    }
    for (const [x1, y1] of [[2, 4], [3, 10], [4, 15], [6, 19]]) symLine(g, 13, 12, x1, y1, skin[0]); // finger bones
    for (const y of [11, 16, 20]) sym(g, 4 + (y - 11) * 0.3, y, skin[2]); // scallops
    blob(g, 16, 17, 4, 7, skin); // body
    blob(g, 16, 9, 3, 3.5, skin); // featureless head
    symLine(g, 14, 7, 11, 2, '#5a5468'); sym(g, 12, 1, '#7a7488'); // horns
    line(g, 16, 23, 19, 28, skin[1]); line(g, 19, 28, 23, 27, skin[1]); // tail
    put(g, 24, 26, '#7a7488'); put(g, 24, 28, '#7a7488'); put(g, 25, 27, '#7a7488'); // barb
    symLine(g, 15, 23, 13, 28, skin[1]); sym(g, 12, 29, skin[1]); // clawed feet
    return '#05040a';
  },
  imp_alchemist(g) {
    // Mi-Go: pale pink fungoid crustacean, a ridged brain-like head, pincers and a glowing vial
    const shell = ['#f0b8c8', '#c47a96', '#7e4060'];
    const head = ['#ffd8e4', '#e8a0bc', '#a8607e'];
    blob(g, 16, 20, 7, 6, shell);
    for (const y of [17, 20, 23]) line(g, 10, y, 22, y, shell[2]); // segments
    blob(g, 16, 10, 6, 5, head);
    for (const [x0, x1, y] of [[12, 15, 8], [17, 20, 9], [13, 18, 11], [12, 16, 13]]) line(g, x0, y, x1, y, head[2]); // brain folds
    symLine(g, 9, 19, 4, 14, shell[1]); symRect(g, 2, 11, 3, 3, shell[1]); sym(g, 2, 10, shell[0]); // pincer arms
    rect(g, 26, 14, 3, 5, '#7ae0c8'); rect(g, 26, 13, 3, 1, '#d8fff4'); put(g, 27, 12, '#a8a8b8'); // vial
    put(g, 27, 16, WHITE);
    for (const x of [10, 13, 19, 22]) line(g, x, 25, x - 1 + (x > 16 ? 2 : 0), 29, shell[2]); // legs
    symLine(g, 6, 16, 3, 18, '#d8a8c0'); // membranous wing stubs
    return '#2a0c1a';
  },
  bog_toad(g) {
    // spawn of Tsathoggua: squat, furry, bat-eared toad-thing, half-closed sleepy eyes
    const fur = ['#7a6a9a', '#4e4068', '#2c2440'];
    blob(g, 16, 21, 12, 8, fur);
    blob(g, 16, 13, 9, 6, fur);
    symLine(g, 9, 9, 6, 3, fur[1]); symLine(g, 10, 9, 8, 4, fur[0]); // bat ears
    for (const [x, y] of [[8, 18], [12, 22], [19, 24], [23, 19], [16, 17], [10, 26], [22, 26]]) put(g, x, y, fur[0]); // fur tufts
    symRect(g, 10, 12, 4, 2, '#e8d070'); symRect(g, 10, 12, 4, 1, fur[2]); // drowsy lids
    symRect(g, 11, 13, 2, 1, VOID);
    rect(g, 11, 17, 10, 1, VOID); put(g, 10, 16, VOID); put(g, 21, 16, VOID); // wide mouth
    symRect(g, 5, 26, 5, 3, fur[1]); symRect(g, 4, 28, 6, 1, fur[2]); // splayed feet
    return '#0e0a18';
  },
  moon_moth(g) {
    // moth of Leng: pale wings with staring eye-spots, a thin glowing body, feathery antennae
    const wing = ['#f0ecd8', '#c8c0a0', '#8a8266'];
    for (const [cx, cy, rx, ry] of [[9, 12, 7, 7], [10, 22, 5, 5]]) { blob(g, cx, cy, rx, ry, wing); blob(g, S - 1 - cx + 1, cy, rx, ry, wing); }
    for (const [cx, cy] of [[9, 12], [10, 22]]) { // eye-spots
      oval(g, cx, cy, 3, 3, '#6a3a5a'); oval(g, cx, cy, 2, 2, '#e8d070'); oval(g, cx, cy, 1, 1.2, VOID);
      oval(g, S - cx, cy, 3, 3, '#6a3a5a'); oval(g, S - cx, cy, 2, 2, '#e8d070'); oval(g, S - cx, cy, 1, 1.2, VOID);
    }
    rect(g, 15, 9, 2, 17, '#b8f0a0'); rect(g, 15, 9, 1, 17, '#e8ffd0'); // glowing body
    rect(g, 15, 7, 2, 2, '#d8ffc0'); eye(g, 15, 7, true);
    symLine(g, 15, 6, 11, 1, '#c8c0a0'); for (const y of [2, 4]) sym(g, 12, y, '#c8c0a0'); // antennae
    for (const [x, y] of [[3, 3], [28, 5], [4, 29]]) put(g, x, y, '#d8ffc0'); // dust motes
    return '#2a2418';
  },
  specter_mole(g) {
    // dhole: pale segmented burrowing worm rising from the earth, a ringed maw of teeth
    const worm = ['#d8d0bc', '#a09880', '#625a48'];
    rect(g, 4, 27, 24, 3, '#4a3a28'); rect(g, 6, 26, 20, 1, '#6a5438'); // churned earth
    for (let i = 0; i < 6; i++) { // body segments, curving up
      const cx = 16 + Math.round(Math.sin(i * 0.7) * 3), cy = 25 - i * 3;
      blob(g, cx, cy, 6 - i * 0.35, 2.4, worm);
      line(g, cx - 4, cy + 2, cx + 4, cy + 2, worm[2]);
    }
    const hx = 16 + Math.round(Math.sin(5 * 0.7) * 3), hy = 8;
    oval(g, hx, hy, 6, 5, worm[1]);
    oval(g, hx, hy, 4.5, 3.6, '#3a0c14'); oval(g, hx, hy, 2.6, 2, VOID); // maw
    for (let a = 0; a < 10; a++) { const t = (a / 10) * Math.PI * 2; put(g, hx + Math.cos(t) * 3.8, hy + Math.sin(t) * 3, WHITE); } // teeth
    for (const [x, y] of [[3, 24], [27, 23], [6, 22]]) put(g, x, y, '#6a5438'); // flying dirt
    return '#1a140c';
  },
  arcane_owl(g) {
    // Elder Thing: ridged barrel body, five-pointed starfish head of red eye-stalks, folded wings
    const hide = ['#8ac0b0', '#4e8478', '#2a5048'];
    blob(g, 16, 20, 7, 8, hide);
    for (const x of [12, 16, 20]) line(g, x, 13, x, 27, hide[2]); // ridges
    symLine(g, 9, 16, 4, 24, '#6a9a8e'); symLine(g, 9, 18, 6, 26, '#6a9a8e'); // fan wings
    oval(g, 16, 9, 3, 2.5, hide[1]); // neck bulb
    for (let a = 0; a < 5; a++) { // starfish head: five eye-stalks
      const t = -Math.PI / 2 + (a / 5) * Math.PI * 2;
      const ex = 16 + Math.cos(t) * 6, ey = 8 + Math.sin(t) * 5;
      line(g, 16, 8, ex, ey, hide[0]);
      put(g, ex, ey, '#ff4a5a'); put(g, ex + 1, ey, '#ff9aa0');
    }
    for (const x of [11, 14, 18, 21]) line(g, x, 27, x + (x < 16 ? -1 : 1), 30, hide[2]); // tentacle feet
    return '#08161a';
  },
};

/** True when the sprite key is a stable creature with art. */
export const hasStableArt = (key) => typeof key === 'string' && key.startsWith('stable:') && !!DRAW[key.slice(7)];

/** Every stable sprite key (for tests and tools). */
export const stableKeys = () => Object.keys(DRAW).map((id) => `stable:${id}`);

/** Pixel grid of a stable creature: the drawing, a dark outline, and a soft ground shadow. */
export function stableGrid(key) {
  const draw = hasStableArt(key) ? DRAW[key.slice(7)] : null;
  if (!draw) return null;
  const g = grid();
  const outline = draw(g);
  const out = g.map((row) => row.slice());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = outline;
  }
  for (let x = 8; x <= 23; x++) if (!out[31][x]) out[31][x] = 'rgba(0,0,0,0.22)';
  return out;
}

const imageCache = new Map();
function rgba(c) {
  if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).concat(255);
  const n = c.slice(c.indexOf('(') + 1, -1).split(',').map(Number);
  return [n[0], n[1], n[2], Math.round((n[3] ?? 1) * 255)];
}

/** Pixels as ImageData (browser only), cached; `silhouette` gives the 45% black shadow. */
export function stablePixels(key, silhouette = false) {
  const id = silhouette ? `${key}#silhouette` : key;
  if (imageCache.has(id)) return imageCache.get(id);
  const g = typeof ImageData !== 'undefined' ? stableGrid(key) : null;
  let img = null;
  if (g) {
    img = new ImageData(S, S);
    g.forEach((row, y) => row.forEach((c, x) => {
      if (!c) return;
      const [r, gr, b, a] = rgba(c);
      const o = (y * S + x) * 4;
      if (silhouette) img.data[o + 3] = Math.round(a * 0.45);
      else { img.data[o] = r; img.data[o + 1] = gr; img.data[o + 2] = b; img.data[o + 3] = a; }
    }));
  }
  imageCache.set(id, img);
  return img;
}
