/**
 * Generates the armor icons: one pixel-art PNG per armor of the catalog, drawn on a 32x32
 * grid and scaled 3x (96 px, like the weapon icons) into public/assets/items/armors/.
 *
 * An armor name is "<Material> <Type>" (src/data/items.json): the type picks the silhouette
 * and its parts (chain, rivets, quilting, plates, straps...), the material the palette and,
 * for themed materials, an emblem and an effect (sparkles, glowing cracks, scales).
 * The icon name is "<material>_<type>" (see src/ui/itemIcons.js).
 *
 * Usage: node scripts/build-armor-icons.mjs [contactSheet.png]
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/items/armors');
const N = 32;
const SCALE = 3;

/* ------------------------------------------------------------------ palettes */

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ramp = (...hs) => hs.map(hex);

const GOLD = ramp('#5c3c0c', '#b98522', '#f0c95a', '#fff1b0');
const BRASS = ramp('#4a3412', '#8e6a2c', '#c79a4c', '#ecd08e');
const DARKMETAL = ramp('#1c1e24', '#3a3e48', '#5e6470', '#8e95a2');
const LEATHER = ramp('#2e1a0e', '#5c3820', '#8a5a34', '#b4825a');

/** metal: 4 tones (dark..highlight); trim: 4 tones; cloth: 4 tones; gem colour; emblem; fx. */
const MATERIALS = {
  Copper: { metal: ramp('#4e2412', '#924a26', '#cc7840', '#f4b47c'), trim: BRASS, cloth: ramp('#3a1610', '#6e2a1c', '#9c4430', '#c46a4e'), gem: '#3fc6a0' },
  Bronze: { metal: ramp('#46300e', '#86601e', '#bf913e', '#ecd08a'), trim: DARKMETAL, cloth: ramp('#1e2a1a', '#3a5030', '#587a46', '#82a466'), gem: '#e04a3a' },
  Iron: { metal: ramp('#24272e', '#4c525c', '#7a828e', '#adb5c0'), trim: BRASS, cloth: ramp('#2a2018', '#4a3a2a', '#6c5840', '#907a5c'), gem: '#c0c8d0' },
  Steel: { metal: ramp('#2c3242', '#5e6982', '#94a1ba', '#dfe7f4'), trim: GOLD, cloth: ramp('#141c3a', '#243466', '#3a5096', '#6280c4'), gem: '#e8434a' },
  Silver: { metal: ramp('#454a5a', '#8b92a6', '#c6ccda', '#ffffff'), trim: ramp('#24345e', '#3e5ca0', '#6a90d8', '#b4ceff'), cloth: ramp('#2a1840', '#4a2c70', '#6e46a0', '#9a72cc'), gem: '#6fb6ff' },
  Cobalt: { metal: ramp('#121f48', '#284896', '#4a80d4', '#a0caff'), trim: ramp('#3c4250', '#7a8294', '#b8c0d0', '#f0f4ff'), cloth: ramp('#0e1838', '#1c306a', '#2c4c9e', '#4a70c8'), gem: '#ffd84a' },
  Mithral: { metal: ramp('#2a4658', '#5a8ea8', '#9cd0e2', '#eefcff'), trim: GOLD, cloth: ramp('#10303a', '#1e5464', '#2f7c90', '#56aabc'), gem: '#7fe3ff' },
  Obsidian: { metal: ramp('#0a0810', '#201a2e', '#3c3056', '#8a72bc'), trim: ramp('#3a1050', '#6a2090', '#a050d0', '#e0b0ff'), cloth: ramp('#140a10', '#2e1420', '#4a2032', '#6e3450'), gem: '#c27bff', fx: 'gloss' },
  Adamant: { metal: ramp('#12281f', '#2a5649', '#4c8f7c', '#a8e2cf'), trim: ramp('#2a2e34', '#565c66', '#8c94a0', '#d0d6de'), cloth: ramp('#20140c', '#3e2816', '#5e3e22', '#7e5a36'), gem: '#5fe0a0' },
  Starsteel: { metal: ramp('#121628', '#283354', '#4a5c90', '#acbcf2'), trim: ramp('#4a4e5e', '#8a90a6', '#c8ccdc', '#ffffff'), cloth: ramp('#0c0c20', '#1c1c40', '#2e2e62', '#484888'), gem: '#ffffff', fx: 'stars' },
  Sunforged: { metal: ramp('#5a3406', '#b07418', '#e8ae30', '#fff2a6'), trim: ramp('#c8c0a0', '#e8e2c8', '#fffbe8', '#ffffff'), cloth: ramp('#5a1408', '#962410', '#c8401a', '#ee6a30'), gem: '#ff7a2e', emblem: 'sun' },
  Voidglass: { metal: ramp('#100620', '#30145a', '#6232a8', '#d2a8ff'), trim: ramp('#0a0a12', '#20202e', '#38384c', '#5a5a74'), cloth: ramp('#08040e', '#180c26', '#2a163e', '#3e2258'), gem: '#ff5ce0', emblem: 'gem', fx: 'stars' },
  Flint: { metal: ramp('#2a2622', '#544e46', '#857c74', '#bab2a8'), trim: LEATHER, cloth: ramp('#1e2018', '#363a2c', '#505642', '#6e765c'), gem: '#e86a3a', fx: 'chips' },
  Moonlit: { metal: ramp('#222c48', '#52648a', '#98acd2', '#eef4ff'), trim: ramp('#4e5466', '#9aa2b8', '#d8dcea', '#ffffff'), cloth: ramp('#0e1430', '#1c2654', '#2e3c7e', '#4a5ca8'), gem: '#cfe6ff', emblem: 'moon' },
  Eternal: { metal: ramp('#5a4a2a', '#aa9a6a', '#e6dcbc', '#ffffff'), trim: GOLD, cloth: ramp('#3a3018', '#6a5a30', '#9a8648', '#c8b46a'), gem: '#5fe0d0', emblem: 'diamond' },
  Primal: { metal: ramp('#182c0e', '#36661e', '#64a438', '#b6e688'), trim: LEATHER, cloth: ramp('#1e140a', '#3a2814', '#5a3e1e', '#7c5a2c'), gem: '#ffd84a', emblem: 'leaf' },
  Omega: { metal: ramp('#240606', '#621212', '#a8281e', '#ff7448'), trim: ramp('#141014', '#2c262c', '#48404a', '#6c6270'), cloth: ramp('#0e0606', '#220c0c', '#381414', '#521e1e'), gem: '#ffb21e', emblem: 'omega', fx: 'cracks' },
  Dragonbone: { metal: ramp('#564630', '#a48e6a', '#dacaa0', '#fff6dc'), trim: ramp('#3a0c0c', '#7a1a16', '#b42e22', '#e2563c'), cloth: ramp('#3a0c0c', '#701812', '#a42a1e', '#d04a32'), gem: '#ff4a3a', fx: 'scales' },
  Aether: { metal: ramp('#0c3640', '#1c7484', '#44bcc8', '#c4fbff'), trim: ramp('#e0f4ff', '#f0faff', '#ffffff', '#ffffff'), cloth: ramp('#0a2a40', '#16486a', '#246c98', '#3c94c4'), gem: '#ffffff', fx: 'stars' },
  Astral: { metal: ramp('#0a0a2c', '#222266', '#4848b4', '#b0b0ff'), trim: GOLD, cloth: ramp('#0a0618', '#1a1034', '#2c1c56', '#422c7a'), gem: '#ffe680', emblem: 'star', fx: 'stars' },
};

const OUTLINE = hex('#0e0c10');

/* ------------------------------------------------------------------ drawing */

// regions
const METAL = 1; const TRIM = 2; const CLOTH = 3; const LEATH = 4; const GEM = 5; const VOID = 6; const LACE = 7;
// textures
const T_CHAIN = 1; const T_RIVET = 2; const T_QUILT = 3; const T_SEG = 4; const T_RIDGE = 5; const T_FOLD = 6;

function canvas() {
  return { reg: new Uint8Array(N * N), tex: new Uint8Array(N * N) };
}
const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

/** Even-odd test on pixel centres; points in grid units (0..32). */
function poly(c, pts, reg, tex = 0) {
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
    const px = x + 0.5; const py = y + 0.5;
    let inPoly = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
      const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inPoly = !inPoly;
    }
    if (inPoly) { c.reg[y * N + x] = reg; c.tex[y * N + x] = tex; }
  }
}
/** Symmetric polygon: `half` runs down the left side, from the top centre line to the bottom centre line. */
const mpoly = (c, half, reg, tex) => poly(c, [...half, ...half.slice().reverse().map(([x, y]) => [N - x, y])], reg, tex);
function rect(c, x0, y0, x1, y1, reg, tex = 0, onlyOver = false) {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
    if (!inside(x, y) || (onlyOver && !c.reg[y * N + x])) continue;
    c.reg[y * N + x] = reg; c.tex[y * N + x] = tex;
  }
}
const mrect = (c, x0, y0, x1, y1, reg, tex, onlyOver) => { rect(c, x0, y0, x1, y1, reg, tex, onlyOver); rect(c, N - 1 - x1, y0, N - 1 - x0, y1, reg, tex, onlyOver); };
function ellipse(c, cx, cy, rx, ry, reg, tex = 0, onlyOver = false) {
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
    const dx = (x + 0.5 - cx) / rx; const dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1 || (onlyOver && !c.reg[y * N + x])) continue;
    c.reg[y * N + x] = reg; c.tex[y * N + x] = tex;
  }
}
const mellipse = (c, cx, cy, rx, ry, reg, tex, onlyOver) => { ellipse(c, cx, cy, rx, ry, reg, tex, onlyOver); ellipse(c, N - cx, cy, rx, ry, reg, tex, onlyOver); };
const set = (c, x, y, reg, tex = 0) => { if (inside(x, y)) { c.reg[y * N + x] = reg; c.tex[y * N + x] = tex; } };
const mset = (c, x, y, reg, tex) => { set(c, x, y, reg, tex); set(c, N - 1 - x, y, reg, tex); };
/** Neck opening: dark inside of the armor, only over what is already drawn. */
const neck = (c, ry = 1.8, rx = 3.2, cy = 4.2) => ellipse(c, 16, cy, rx, ry, VOID, 0, true);
/** Diagonal 1px strap from (x0,y0) to (x1,y1), `w` px thick. */
function strap(c, x0, y0, x1, y1, w, reg, tex = 0) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps); const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    for (let k = 0; k < w; k += 1) set(c, x + k, y, reg, tex);
  }
}

/* torso silhouettes (half outlines, left side) */
const SLEEVELESS = [[16, 3], [12.5, 3], [8, 4.6], [5.4, 7], [5.6, 10], [8.6, 12.6], [9, 18], [9.6, 22.5], [8.6, 27.5], [16, 27.5]];
const SHORT_SLEEVES = [[16, 3], [12.5, 3], [8, 4.4], [4.6, 6.2], [2.4, 12.4], [6.6, 13.4], [8.4, 11.6], [9, 18], [9.6, 22.5], [8.6, 27.5], [16, 27.5]];
const LONG_SLEEVES = [[16, 3], [12.5, 3], [8, 4.4], [4.6, 6.2], [1.6, 18.4], [5.2, 19], [8.2, 11.8], [9, 18], [9.6, 22.5], [8.6, 27.5], [16, 27.5]];

/** Each type draws into a canvas; the shading, textures, outline and emblem come afterwards. */
const TYPES = {
  Tunic(c) {
    mpoly(c, LONG_SLEEVES, CLOTH);
    // V collar, sleeve cuffs, belt with buckle
    poly(c, [[13, 3], [19, 3], [16, 8.5]], VOID);
    strap(c, 13, 3, 16, 9, 1, TRIM); strap(c, 18, 3, 15, 9, 1, TRIM);
    poly(c, [[1.6, 17.4], [5.6, 18], [5.2, 19.2], [1.4, 18.6]], TRIM); poly(c, [[30.4, 17.4], [26.4, 18], [26.8, 19.2], [30.6, 18.6]], TRIM);
    rect(c, 9, 19, 22, 20, LEATH, 0, true);
    rect(c, 15, 18, 17, 21, TRIM); set(c, 16, 19, VOID); set(c, 16, 20, VOID);
    rect(c, 9, 26, 22, 27, TRIM, 0, true);
  },
  Jerkin(c) {
    mpoly(c, SLEEVELESS, LEATH);
    neck(c);
    // lacing down the front, studded shoulders, hem trim
    for (let y = 6; y <= 24; y += 1) set(c, 16, y, VOID);
    for (let y = 7; y <= 23; y += 3) { set(c, 15, y, LACE); set(c, 17, y, LACE); set(c, 16, y + 1, LACE); }
    mrect(c, 7, 5, 11, 7, METAL, T_RIVET, true);
    rect(c, 9, 26, 22, 27, TRIM, 0, true);
    mset(c, 12, 15, METAL); mset(c, 12, 20, METAL);
  },
  Vest(c) {
    mpoly(c, SLEEVELESS, CLOTH, T_QUILT);
    // high padded collar, metal buttons, side panels
    mpoly(c, [[16, 2.4], [11, 2.6], [10.4, 5.6], [13, 6.2], [16, 6]], TRIM);
    neck(c, 1.4, 2.6, 3.6);
    rect(c, 16, 7, 16, 26, VOID, 0, true);
    for (let y = 9; y <= 24; y += 4) set(c, 17, y, METAL);
    rect(c, 9, 26, 22, 27, TRIM, 0, true);
  },
  Harness(c) {
    mpoly(c, SHORT_SLEEVES, CLOTH);
    neck(c);
    // crossed straps, central ring, one shoulder plate, belt
    strap(c, 7, 6, 22, 22, 2, LEATH); strap(c, 23, 6, 8, 22, 2, LEATH);
    ellipse(c, 16, 14, 2.4, 2.4, TRIM); set(c, 16, 14, VOID); set(c, 15, 14, VOID); set(c, 16, 13, VOID); set(c, 15, 13, VOID);
    poly(c, [[3.6, 6.4], [9.4, 4.2], [11, 7.6], [4.4, 10.6]], METAL);
    poly(c, [[3.8, 9], [10.4, 6.6], [10.8, 7.8], [4.4, 10.6]], TRIM);
    rect(c, 9, 22, 22, 23, LEATH, 0, true); rect(c, 15, 21, 17, 24, METAL);
  },
  Mail(c) {
    mpoly(c, SHORT_SLEEVES, METAL, T_CHAIN);
    neck(c);
    // leather collar band, sleeve and hem bands
    mpoly(c, [[16, 2.6], [12, 2.6], [8, 4.4], [9, 5.6], [12.6, 5.2], [16, 5.4]], LEATH);
    neck(c, 1.4, 2.8, 3.8);
    poly(c, [[2.4, 11.4], [6.9, 12.4], [6.6, 13.4], [2.4, 12.6]], TRIM); poly(c, [[29.6, 11.4], [25.1, 12.4], [25.4, 13.4], [29.6, 12.6]], TRIM);
    rect(c, 9, 26, 22, 27, TRIM, 0, true);
  },
  Hauberk(c) {
    mpoly(c, [[16, 3], [12.5, 3], [8, 4.4], [4.6, 6.2], [1.6, 18.4], [5.2, 19], [8.2, 11.8], [9, 18], [9.4, 21], [7.4, 30], [16, 30]], METAL, T_CHAIN);
    // coif-like collar, split skirt, belt
    mpoly(c, [[16, 1.8], [11.4, 2.2], [9.4, 5.6], [12.8, 6.6], [16, 6.6]], METAL, T_CHAIN);
    neck(c, 1.6, 2.6, 3.6);
    poly(c, [[15.4, 26.4], [16.6, 26.4], [17, 30], [15, 30]], 0);
    rect(c, 9, 20, 22, 21, LEATH, 0, true); rect(c, 15, 19, 17, 22, TRIM); set(c, 16, 20, VOID);
    poly(c, [[1.6, 17.4], [5.6, 18], [5.2, 19.2], [1.4, 18.6]], TRIM); poly(c, [[30.4, 17.4], [26.4, 18], [26.8, 19.2], [30.6, 18.6]], TRIM);
  },
  Brigandine(c) {
    mpoly(c, SLEEVELESS, CLOTH, T_RIVET);
    neck(c);
    // small shoulder plates, front opening, hem
    mpoly(c, [[11, 3.6], [7.6, 4.6], [5, 7], [5.4, 9.6], [8.4, 8.6], [11.4, 6]], METAL);
    rect(c, 16, 6, 16, 26, VOID, 0, true);
    rect(c, 9, 26, 22, 27, TRIM, 0, true);
  },
  Cuirass(c) {
    mpoly(c, [[16, 3], [12.5, 3], [8.6, 4.4], [6.6, 6.8], [7, 10.4], [9.2, 12.6], [9.4, 18], [10, 22.6], [16, 24]], METAL, T_RIDGE);
    neck(c);
    // rolled neck edge, straps under the arms, waist lame
    mpoly(c, [[16, 2.2], [12.2, 2.4], [10.6, 4], [12.6, 4.6], [16, 5]], TRIM);
    neck(c, 1.2, 2.6, 3.2);
    mrect(c, 6, 11, 8, 13, LEATH);
    mpoly(c, [[16, 22], [10, 21.4], [9.6, 24.6], [16, 26.4]], METAL);
    mpoly(c, [[16, 22], [10, 21.4], [10, 22.4], [16, 23]], TRIM);
  },
  Plate(c) {
    mpoly(c, [[16, 3], [12.5, 3], [8.6, 4.4], [6.6, 6.8], [7, 10.4], [9.2, 12.6], [9.4, 18], [10, 22], [16, 22.6]], METAL, T_RIDGE);
    // tassets (faulds), gorget, layered pauldrons
    mpoly(c, [[16, 21.6], [9.6, 21.2], [8.6, 29], [12.6, 29.6], [15, 26], [16, 26]], METAL, T_SEG);
    rect(c, 15, 26, 16, 30, 0); rect(c, 16, 26, 16, 30, 0);
    mpoly(c, [[16, 1.6], [11.6, 2], [10.8, 5], [16, 5.6]], METAL, T_SEG);
    neck(c, 1.2, 2.6, 3.2);
    mellipse(c, 7, 7.4, 5.6, 4.6, METAL);
    mellipse(c, 6.4, 10, 4.6, 2.6, METAL, T_SEG);
    mpoly(c, [[2, 7.6], [12.4, 4.6], [12.6, 5.6], [2.2, 8.8]], TRIM);
  },
  Carapace(c) {
    mpoly(c, [[16, 3], [12.5, 3], [9, 4.6], [7, 7.6], [7.6, 12], [9, 18], [10.4, 24], [13, 28.6], [16, 29.4]], METAL, T_SEG);
    neck(c);
    // spiked shoulders and a dark spine
    mpoly(c, [[11, 4], [6, 5.4], [1.4, 3], [3.6, 7.4], [1.6, 11], [6.8, 10.6], [9.6, 8.4]], METAL, T_SEG);
    mpoly(c, [[6.4, 5.6], [3.6, 0.8], [8.4, 4.6]], TRIM);
    rect(c, 16, 7, 16, 28, VOID, 0, true);
    for (let y = 9; y <= 27; y += 4) mset(c, 13, y, GEM);
  },
  Bulwark(c) {
    mpoly(c, [[16, 3], [12.5, 3], [8.4, 4.4], [7, 7], [7.4, 12], [8.8, 18], [9, 23], [8, 29.4], [16, 29.4]], METAL, T_RIDGE);
    // tall gorget, huge round pauldrons, riveted edges, plate skirt
    mpoly(c, [[16, 0.8], [11, 1.2], [10.4, 5.4], [16, 6]], METAL, T_SEG);
    neck(c, 1.4, 2.8, 2.6);
    mellipse(c, 6.2, 8.6, 6, 5.4, METAL, T_SEG);
    mellipse(c, 6.2, 8.6, 6, 5.4, TRIM, 0, true);
    mellipse(c, 6.4, 8.4, 5, 4.4, METAL, T_RIVET, true);
    mpoly(c, [[16, 22.4], [9, 22], [8, 29.4], [16, 29.4]], METAL, T_SEG);
    rect(c, 9, 21, 22, 22, TRIM, 0, true);
    for (let y = 8; y <= 20; y += 3) { mset(c, 10, y, TRIM); }
  },
  Aegis(c) {
    // cape behind, plate with a big chest emblem, winged pauldrons
    mpoly(c, [[16, 8], [9.6, 8], [6.6, 16], [4.6, 30], [16, 30]], CLOTH, T_FOLD);
    mpoly(c, [[16, 3], [12.5, 3], [8.6, 4.4], [6.6, 6.8], [7, 10.4], [9.2, 12.6], [9.4, 18], [10, 23], [11, 27.4], [16, 28.4]], METAL, T_RIDGE);
    neck(c);
    mpoly(c, [[16, 2.2], [12.2, 2.4], [10.6, 4], [12.6, 4.6], [16, 5]], TRIM);
    neck(c, 1.2, 2.6, 3.2);
    mpoly(c, [[11, 4.4], [6.6, 4.4], [1, 2], [2.6, 5.8], [0.8, 7], [3.4, 9.2], [2, 11], [6.4, 11], [9.6, 8.8]], TRIM);
    ellipse(c, 16, 13.4, 4.4, 4.4, TRIM);
    ellipse(c, 16, 13.4, 3.2, 3.2, METAL);
    rect(c, 10, 22, 21, 23, TRIM, 0, true);
  },
};

/* ------------------------------------------------------------------ emblems (drawn over the chest) */

const EMBLEMS = {
  sun: ['..y..', 'y.y.y', '.yyy.', 'yyGyy', '.yyy.', 'y.y.y', '..y..'],
  moon: ['.ww..', 'ww...', 'w....', 'w....', 'ww...', '.ww..'],
  diamond: ['..G..', '.GwG.', 'GwGGG', '.GGG.', '..G..'],
  leaf: ['...gg', '..ggg', '.gGg.', 'gGg..', 'g....'],
  omega: ['.yyy.', 'y...y', 'y...y', '.y.y.', 'yy.yy'],
  star: ['..y..', '..y..', 'yyGyy', '.yyy.', '.y.y.'],
  gem: ['.GG.', 'GwGG', 'GGGG', '.GG.'],
};

/* ------------------------------------------------------------------ render */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function render(c, mat, seed) {
  const pal = {
    [METAL]: mat.metal, [TRIM]: mat.trim, [CLOTH]: mat.cloth,
    [LEATH]: mat.leather ?? LEATHER.map((col, k) => mix(col, mat.cloth[k], 0.3)),
    [LACE]: ramp('#8a7a5a', '#c8b88a', '#efe2b8', '#fff8dc'),
  };
  const px = new Uint8Array(N * N * 4);
  const reg = (x, y) => (inside(x, y) ? c.reg[y * N + x] : 0);
  // vertical extent for the top-down light
  let top = N; let bottom = 0;
  for (let i = 0; i < N * N; i += 1) if (c.reg[i]) { top = Math.min(top, (i / N) | 0); bottom = Math.max(bottom, (i / N) | 0); }
  const h = Math.max(1, bottom - top);

  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
    const i = y * N + x; const r = c.reg[i]; const o = i * 4;
    if (!r) {
      // outline around the shape
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reg(x + dx, y + dy));
      if (near) { px.set([...OUTLINE, 255], o); }
      continue;
    }
    if (r === VOID) { px.set([...mix(OUTLINE, (pal[METAL] ?? mat.metal)[0], 0.35), 255], o); continue; }
    if (r === GEM) { px.set([...hex(mat.gem), 255], o); continue; }
    // light from the top-left: horizontal gradient, a little vertical, rim light / edge shade
    let t = 1.75 - ((x + 0.5 - 16) / 16) * 1.1 - ((y - top) / h) * 0.7;
    const up = reg(x, y - 1); const left = reg(x - 1, y); const right = reg(x + 1, y); const down = reg(x, y + 1);
    if (!up || up === VOID) t += 0.9;
    if (!left) t += 0.5;
    if (!right) t -= 0.8;
    if (!down) t -= 0.7;
    if ((up && up !== r) || (left && left !== r)) t += 0.35;
    if ((right && right !== r && right !== VOID) || (down && down !== r && down !== VOID)) t -= 0.6;
    const tex = c.tex[i];
    if (tex === T_CHAIN) t += ((x + (y % 2)) % 2 === 0) ? -0.9 : 0.25;
    if (tex === T_RIVET) {
      if (x % 4 === 1 && y % 4 === 1) { px.set([...(r === METAL ? mat.metal[3] : mat.trim[3]), 255], o); continue; }
      if (x % 4 === 1 && y % 4 === 2) t -= 1;
    }
    if (tex === T_QUILT && ((x + y) % 5 === 0 || (x - y + 40) % 5 === 0)) t -= 0.9;
    if (tex === T_SEG) { const k = (y - top) % 4; if (k === 0) t -= 1.2; else if (k === 1) t += 0.6; }
    if (tex === T_RIDGE && (x === 15 || x === 16)) t += x === 15 ? 1.1 : -0.3;
    if (tex === T_FOLD && x % 3 === 0) t -= 0.8;
    if (mat.fx === 'scales' && r === METAL && ((x + (((y / 2) | 0) % 2) * 2) % 4 === 0) && y % 2 === 0) t -= 0.9;
    if (mat.fx === 'chips' && r === METAL && hash(x, y, seed) > 0.9) t -= 0.8;
    if (r === CLOTH) t = 1.5 + (t - 1.5) * 0.75;
    const ramp4 = pal[r] ?? mat.metal;
    let col = ramp4[clamp(Math.round(t), 0, 3)];
    if (mat.fx === 'gloss' && r === METAL && (x - y + 64) % 9 === 0 && t > 1) col = mat.metal[3];
    if (mat.fx === 'cracks' && r === METAL && hash((x / 2) | 0, y, seed) > 0.86 && hash(x, (y / 3) | 0, seed + 7) > 0.5) col = hex('#ffb040');
    if (mat.fx === 'stars' && r !== LEATH && hash(x, y, seed + 3) > 0.972) col = [255, 255, 255];
    px.set([...col, 255], o);
  }
  return px;
}

function stampEmblem(px, c, mat, type) {
  if (!mat.emblem) return;
  const e = EMBLEMS[mat.emblem];
  const w = e[0].length; const hgt = e.length;
  // centre of the chest (Aegis: inside its medallion)
  const cy = type === 'Aegis' ? 13 : type === 'Tunic' || type === 'Harness' ? 13 : 12;
  const x0 = Math.round(16 - w / 2); const y0 = Math.round(cy - hgt / 2);
  const colors = { y: mat.trim[2], G: hex(mat.gem), w: mat.trim[3], g: mix(hex(mat.gem), [60, 200, 80], 0.6) };
  if (mat.emblem === 'leaf') { colors.g = hex('#7fe35a'); colors.G = hex('#2f9a3a'); }
  if (mat.emblem === 'omega') colors.y = hex('#ffb040');
  e.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === '.') return;
    const x = x0 + dx; const y = y0 + dy;
    if (!inside(x, y) || !c.reg[y * N + x]) return;
    px.set([...colors[ch], 255], (y * N + x) * 4);
  }));
}

/* ------------------------------------------------------------------ PNG */

const CRC = new Uint32Array(256).map((_, n) => { let k = n; for (let i = 0; i < 8; i += 1) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1; return k >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function upscale(px, s) {
  const W = N * s; const out = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y += 1) for (let x = 0; x < W; x += 1) out.set(px.subarray(((((y / s) | 0) * N) + ((x / s) | 0)) * 4, ((((y / s) | 0) * N) + ((x / s) | 0)) * 4 + 4), (y * W + x) * 4);
  return out;
}

/* ------------------------------------------------------------------ main */

/** "<Material> <Type>" -> { material, type } (the same parse as src/ui/itemIcons.js). */
export function armorParts(name) {
  const words = name.replace(/[+]/g, ' ').split(/\s+/).filter(Boolean);
  return { material: words.find((w) => MATERIALS[w]), type: words.find((w) => TYPES[w]) };
}

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/items.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
const made = new Map();
for (const item of catalog.armors) {
  const { material, type } = armorParts(item.name);
  if (!material || !type) throw new Error(`armor without material/type: ${item.name}`);
  const name = `${material}_${type}`.toLowerCase();
  if (made.has(name)) continue;
  const c = canvas();
  TYPES[type](c);
  const px = render(c, MATERIALS[material], name.length * 31 + material.length);
  stampEmblem(px, c, MATERIALS[material], type);
  made.set(name, px);
  fs.writeFileSync(path.join(OUT, `${name}.png`), png(upscale(px, SCALE), N * SCALE, N * SCALE));
}
console.log(`armor icons: ${made.size} (${catalog.armors.length} armors) -> ${path.relative(ROOT, OUT)}`);

// optional contact sheet (review aid): 8 icons per row on a dark background
const sheet = process.argv[2];
if (sheet) {
  const cols = 8; const cell = 32 * 3 + 8; const list = [...made.values()];
  const W = cols * cell; const H = Math.ceil(list.length / cols) * cell;
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i += 1) out.set([22, 25, 37, 255], i * 4);
  list.forEach((px, k) => {
    const big = upscale(px, 3); const ox = (k % cols) * cell + 4; const oy = ((k / cols) | 0) * cell + 4;
    for (let y = 0; y < 96; y += 1) for (let x = 0; x < 96; x += 1) {
      const s = (y * 96 + x) * 4; if (!big[s + 3]) continue;
      out.set(big.subarray(s, s + 4), ((oy + y) * W + ox + x) * 4);
    }
  });
  fs.writeFileSync(sheet, png(out, W, H));
  console.log(`contact sheet: ${sheet}`);
}
