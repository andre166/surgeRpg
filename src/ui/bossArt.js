/**
 * Pixel-art boss sprites (48x48, bigger and more detailed than the 32x32 monsters of
 * monsterArt.js), drawn in code for every map boss, event (rare) boss and slime king.
 *
 * A boss name is "<Name> the <Title>" (data/bosses.json): the title picks the silhouette
 * (Avatar: floating elemental, Eidolon: chained wraith, Matriarch: spider queen, Apex: maned
 * beast, Overlord: horned demon lord, Judge: masked judge with halo and sword, Idol: rune golem,
 * Arbiter: winged knight, Monarch: crowned dragon, Warden: knight with a tower shield, Keeper:
 * treant with a lantern, Patriarch: horned minotaur, Herald: phoenix, Sovereign: lich king,
 * Prime: cosmic eye), and the start of the name its element palette (Pyre fire, Umbra shadow,
 * Thal sea, Sol sun...). Later map bosses get a red then violet aura, event bosses a golden one.
 *
 * Keys are the battle / bestiary ids: `boss#<id>`, `event#<id>` and `slime#<id>`.
 */
import bossJson from '../data/bosses.json';
import { SLIME_IDS, slimeName } from '../core/encounters/slimeBosses.js';
import { withCustomBosses } from '../core/encounters/customBosses.js';

const bossData = withCustomBosses(bossJson);

export const BOSS_SIZE = 48;
const S = BOSS_SIZE;

/** Name start -> element palette [light, mid, dark, outline, glow]. */
const ELEMENTS = [
  ['Zeph', ['#e6fff6', '#9fe0cc', '#5a9e8e', '#163a34', '#ffffff']], // wind
  ['Ithil', ['#eef2ff', '#b4bfe6', '#6f7cb0', '#1c2242', '#cfe4ff']], // moon
  ['Molar', ['#e8c89a', '#b08a5a', '#7a5a34', '#2a1c0e', '#ffd86a']], // earth
  ['Nyx', ['#b49adc', '#7656b0', '#46307a', '#140c2a', '#e8c0ff']], // night
  ['Thal', ['#9ee4f0', '#3ea2c4', '#1e6488', '#0a2232', '#c8fff4']], // sea
  ['Gorrath', ['#e08a7a', '#a8443a', '#6e2420', '#240a08', '#ffcc4a']], // blood
  ['Pyre', ['#ffd27a', '#f07a2a', '#b03a14', '#300c04', '#fff0a0']], // fire
  ['Ferrum', ['#d4dae4', '#8e98a8', '#56606e', '#181c24', '#ff9a4a']], // iron
  ['Kaz', ['#c8f08a', '#7ab43a', '#467020', '#14240a', '#f0ff6a']], // venom
  ['Umbra', ['#8a7a9e', '#4e4062', '#2a2038', '#08060e', '#ff4a6a']], // shadow
  ['Lysa', ['#ffd0e8', '#e48ab8', '#a8507e', '#3a1028', '#fff0a8']], // arcane rose
  ['Cael', ['#d8f0ff', '#6eb4f0', '#2e70b8', '#0c2240', '#ffe27a']], // sky
  ['Vael', ['#a8f0c4', '#3eb47a', '#1e7448', '#08241a', '#e8ffb0']], // emerald
  ['Bran', ['#ffe0a0', '#e0a040', '#a0661c', '#321e06', '#fff6c8']], // amber
  ['Ouro', ['#fff0a0', '#e0b830', '#a07a14', '#302206', '#ffffff']], // gold
  ['Ravn', ['#8a9ac4', '#3e4a74', '#20284a', '#06080e', '#7ff0ff']], // raven
  ['Korm', ['#f0b088', '#c06a3e', '#84401e', '#2a1206', '#ffd06a']], // rust stone
  ['Ygg', ['#b8e08a', '#6a9a3e', '#3e6420', '#142208', '#ffe27a']], // world tree
  ['Tarn', ['#c4d4e0', '#7a94aa', '#4a6074', '#141e28', '#a0f0ff']], // lake
  ['Sol', ['#fff8d0', '#ffd25a', '#d8901e', '#3a2206', '#ffffff']], // sun
];
const FALLBACK = ['#d8d0e8', '#9a8ab8', '#5e4e80', '#1a1428', '#ffe27a'];

const BONE = ['#f6eedc', '#d8c8a4', '#a4946e'];
const GOLD = ['#fff2a0', '#f0c040', '#a8781a'];
const STEEL = ['#eef2f8', '#aeb8c8', '#6c788c'];
const BARK = ['#a87e52', '#7a5636', '#4e341e'];
const VOID = '#0c0814';
const WHITE = '#ffffff';

/* ---------- grid helpers (x mirrored around the centre: S - 1 - x) ---------- */

function grid() { return Array.from({ length: S }, () => Array(S).fill(null)); }
function put(g, x, y, c) { if (y >= 0 && y < S && x >= 0 && x < S) g[y][x] = c; }
function sym(g, x, y, c) { put(g, x, y, c); put(g, S - 1 - x, y, c); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(g, i, j, c); }
function symRect(g, x, y, w, h, c) { rect(g, x, y, w, h, c); rect(g, S - x - w, y, w, h, c); }
function line(g, x0, y0, x1, y1, c, t = 1) {
  // integer end points, or the walk below never reaches (x1, y1)
  [x0, y0, x1, y1] = [x0, y0, x1, y1].map(Math.round);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    rect(g, x0, y0, t, t, c);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function symLine(g, x0, y0, x1, y1, c, t = 1) { line(g, x0, y0, x1, y1, c, t); line(g, S - t - x0, y0, S - t - x1, y1, c, t); }
function oval(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) put(g, x, y, c);
  }
}
/** Hollow ellipse (ring) of thickness ~1. */
function ring(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    const d = dx * dx + dy * dy;
    if (d <= 1 && d > 0.72) put(g, x, y, c);
  }
}
/** Shaded ellipse, light from the top left: p[0] highlight, p[1] mid, p[2] shadow. */
function blob(g, cx, cy, rx, ry, p) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const v = dx * 0.45 + dy * 0.75;
    put(g, x, y, v < -0.5 ? p[0] : v > 0.42 ? p[2] : p[1]);
  }
}
/** Shaded box: lit left column, shadowed right columns and bottom row. */
function box(g, x, y, w, h, p) {
  rect(g, x, y, w, h, p[1]);
  rect(g, x, y, 1, h, p[0]); rect(g, x, y, w, 1, p[0]);
  rect(g, x + w - 2, y, 2, h, p[2]); rect(g, x, y + h - 1, w, 1, p[2]);
}
/** Trapezoid from half-width w0 at row y0 to w1 at row y1 (centred), shaded left to right. */
function trap(g, y0, y1, w0, w1, p) {
  for (let y = y0; y <= y1; y++) {
    const hw = Math.round(w0 + ((w1 - w0) * (y - y0)) / Math.max(1, y1 - y0));
    for (let x = 24 - hw; x < 24 + hw; x++) put(g, x, y, x < 24 - hw + 2 ? p[0] : x >= 24 + hw - 3 ? p[2] : p[1]);
  }
}
function mix(a, b, k) {
  const ch = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k).toString(16).padStart(2, '0')).join('')}`;
}
/** Glowing slanted eyes, `sp` px either side of the centre at row cy. */
function eyes(g, cy, sp, glow, brow) {
  const lx = 24 - sp - 3;
  symRect(g, lx, cy, 3, 2, glow);
  sym(g, lx + 2, cy + 1, WHITE);
  if (brow) { sym(g, lx - 1, cy - 2, brow); symRect(g, lx, cy - 1, 2, 1, brow); }
}
/** Small crown on a head whose top is row y. */
function crown(g, y, hw = 5) {
  rect(g, 24 - hw, y - 2, hw * 2, 2, GOLD[1]);
  rect(g, 24 - hw, y - 2, hw * 2, 1, GOLD[0]);
  for (let x = 24 - hw; x < 24 + hw; x += 3) { put(g, x, y - 3, GOLD[1]); put(g, x, y - 4, GOLD[0]); }
  put(g, 23, y - 1, '#e8434a'); put(g, 24, y - 1, '#e8434a');
}

/* ---------- silhouettes: each draws into g with palette p and variant v (0..2, from the name, so bosses
   sharing a title differ in a detail); may return { float: true } ---------- */

const DRAW = {
  Avatar(g, p, v) {
    // wisp tail, torso, arms of energy, head with a flame / wind crest, glowing core
    for (let y = 30; y <= 43; y++) { const hw = Math.max(1, Math.round(9 - (y - 30) * 0.62)); for (let x = 24 - hw; x < 24 + hw; x++) put(g, x, y, x < 24 - hw + 2 ? p[0] : x > 24 + hw - 3 ? p[2] : p[1]); }
    blob(g, 24, 24, 11, 9, p);
    blob(g, 10, 24, 4, 8, p); blob(g, 37, 24, 4, 8, p);
    oval(g, 9, 33, 3, 3, p[4]); oval(g, 38, 33, 3, 3, p[4]);
    blob(g, 24, 12, 7, 7, p);
    if (v === 0) for (const [x, h] of [[19, 4], [22, 6], [25, 7], [28, 4]]) line(g, x, 7, x + (x < 24 ? -1 : 1), 7 - h, p[4]);
    if (v === 1) { symLine(g, 19, 7, 15, 2, p[0], 2); symLine(g, 15, 2, 17, 0, p[0]); }
    if (v === 2) ring(g, 24, 6, 10, 2, p[4]);
    rect(g, 22, 22, 4, 5, p[4]); rect(g, 23, 21, 2, 7, p[4]); put(g, 23, 23, WHITE);
    eyes(g, 11, 2, p[4], p[3]);
    return { float: true };
  },
  Eidolon(g, p, v) {
    // tattered robe, deep hood with eyes in the dark, drooping sleeves with bony claws, chains
    trap(g, 14, 43, 9, 17, p);
    for (let x = 7; x < 41; x += 3) { put(g, x, 43, null); put(g, x + 1, 43, null); put(g, x, 42, null); }
    blob(g, 24, 12, 9, 9, p);
    oval(g, 24, 14, 5, 5, VOID);
    if (v === 2) { oval(g, 24, 14, 4, 4, BONE[0]); symRect(g, 21, 13, 2, 2, VOID); rect(g, 23, 17, 2, 1, VOID); sym(g, 21, 13, p[4]); }
    else eyes(g, 13, 1, p[4]);
    if (v === 1) { symLine(g, 18, 6, 14, 1, BONE[1], 2); }
    blob(g, 10, 27, 4, 9, p); blob(g, 37, 27, 4, 9, p);
    for (const x of [8, 10, 12]) { line(g, x, 35, x - 1, 38, BONE[1]); line(g, S - 1 - x, 35, S - x, 38, BONE[1]); }
    for (let x = 12; x < 36; x += 2) put(g, x, 30 + ((x / 2) % 2), x % 4 ? STEEL[1] : STEEL[2]);
    return { float: true };
  },
  Matriarch(g, p) {
    // spider queen: legs, big marked abdomen, thorax, crowned head with many eyes, fangs
    for (const [y0, x1, y1, x2, y2] of [[20, 6, 12, 2, 28], [23, 4, 18, 1, 34], [26, 5, 26, 2, 40], [28, 8, 32, 5, 44]]) {
      symLine(g, 17, y0, x1, y1, p[2], 2); symLine(g, x1, y1, x2, y2, p[2], 2);
    }
    blob(g, 24, 33, 14, 10, p);
    for (let i = 0; i < 4; i++) { rect(g, 22 - i, 29 + i, 4 + i * 2, 1, p[4]); rect(g, 22 - i, 37 - i, 4 + i * 2, 1, p[4]); }
    blob(g, 24, 21, 8, 6, p);
    blob(g, 24, 14, 6, 5, p);
    crown(g, 10, 5);
    for (const [x, y] of [[20, 13], [22, 12], [20, 15]]) { sym(g, x, y, p[4]); }
    sym(g, 22, 19, BONE[0]); sym(g, 22, 20, BONE[1]);
  },
  Apex(g, p, v) {
    // maned beast seen from the front: mane (or horns / a spiky crest), broad head, ears, jaws with fangs, chest, paws
    if (v === 0) for (let a = 0; a < 16; a++) {
      const t = (a / 16) * Math.PI * 2;
      line(g, 24 + Math.round(Math.cos(t) * 8), 18 + Math.round(Math.sin(t) * 7), 24 + Math.round(Math.cos(t) * 15), 18 + Math.round(Math.sin(t) * 13), a % 2 ? p[2] : p[4], 2);
    }
    blob(g, 24, 35, 13, 9, p);
    symRect(g, 13, 38, 6, 7, p[1]); symRect(g, 13, 43, 6, 2, p[2]);
    for (const x of [13, 15, 17]) sym(g, x, 44, BONE[0]);
    blob(g, 24, 18, 11, 9, p);
    symLine(g, 15, 11, 12, 4, p[1], 2); sym(g, 13, 6, p[0]);
    if (v === 1) { symLine(g, 17, 10, 11, 2, BONE[1], 2); symLine(g, 11, 2, 9, 0, BONE[0], 2); }
    if (v === 2) { for (let x = 18; x <= 30; x += 3) line(g, x, 10, x, 4, p[4], 2); line(g, 28, 13, 31, 19, p[3]); }
    eyes(g, 15, 3, p[4], p[3]);
    blob(g, 24, 23, 6, 4, [p[0], p[0], p[1]]);
    rect(g, 23, 20, 2, 2, p[3]);
    rect(g, 20, 25, 8, 2, VOID); sym(g, 20, 24, BONE[0]); sym(g, 21, 27, BONE[0]); sym(g, 20, 27, BONE[0]);
  },
  Overlord(g, p) {
    // cape, armoured legs and body, spiked pauldrons, dark helm with great horns, chest gem
    const cape = mix(p[2], '#5a0a14', 0.5);
    rect(g, 6, 14, 36, 31, cape); for (let x = 6; x < 42; x += 4) { put(g, x, 44, null); put(g, x + 1, 44, null); }
    symRect(g, 15, 34, 7, 11, p[2]); symRect(g, 15, 34, 2, 11, p[1]);
    blob(g, 24, 26, 12, 10, p);
    blob(g, 10, 18, 6, 5, p); blob(g, 37, 18, 6, 5, p);
    for (const x of [7, 10, 13]) { sym(g, x, 12, p[0]); sym(g, x, 13, p[1]); }
    blob(g, 24, 12, 6, 6, [p[1], p[2], p[3]]);
    symLine(g, 19, 8, 15, 3, BONE[1], 2); symLine(g, 15, 3, 13, 0, BONE[0], 2);
    eyes(g, 11, 1, p[4]);
    oval(g, 24, 25, 3, 3, p[4]); put(g, 23, 24, WHITE);
  },
  Judge(g, p) {
    // halo, flowing robe, pale mask with eye slits, a great sword held point-down
    ring(g, 24, 4, 9, 2, p[4]);
    trap(g, 16, 44, 8, 15, p);
    blob(g, 24, 13, 7, 7, p);
    oval(g, 24, 14, 5, 6, BONE[0]); rect(g, 27, 10, 2, 9, BONE[1]);
    symRect(g, 20, 13, 3, 1, VOID); symRect(g, 20, 14, 3, 1, p[4]);
    rect(g, 23, 18, 2, 1, BONE[2]);
    rect(g, 23, 24, 2, 21, STEEL[1]); rect(g, 23, 24, 1, 21, STEEL[0]); rect(g, 24, 42, 1, 3, STEEL[2]);
    rect(g, 19, 22, 10, 2, GOLD[1]); rect(g, 19, 22, 10, 1, GOLD[0]); rect(g, 23, 18, 2, 4, GOLD[2]);
    symRect(g, 19, 25, 4, 3, BONE[1]);
    return { float: true };
  },
  Idol(g, p) {
    // stone golem: blocky legs, body, arms and square head, carved glowing face, runes, cracks
    symRect(g, 14, 37, 8, 8, p[2]);
    box(g, 12, 16, 24, 22, p);
    box(g, 3, 17, 9, 18, p); box(g, 36, 17, 9, 18, p);
    box(g, 2, 33, 11, 7, p); box(g, 35, 33, 11, 7, p);
    box(g, 16, 3, 16, 14, p);
    symRect(g, 19, 8, 3, 2, p[4]); sym(g, 20, 8, WHITE);
    rect(g, 20, 12, 8, 2, VOID);
    for (const [x, y] of [[17, 21], [18, 22], [19, 21], [24, 24], [24, 25], [23, 26], [25, 26], [29, 21], [30, 22], [28, 22]]) put(g, x, y, p[4]);
    line(g, 15, 28, 19, 33, p[3]); line(g, 31, 18, 29, 24, p[3]); line(g, 27, 4, 29, 8, p[3]);
  },
  Arbiter(g, p) {
    // feathered wings, armoured body and legs, visored helm, halo, a spear
    for (let i = 0; i < 6; i++) {
      symLine(g, 17, 16 + i * 2, 2 + i * 2, 4 + i * 5, i % 2 ? p[0] : WHITE, 2);
    }
    symRect(g, 18, 35, 4, 10, p[2]);
    blob(g, 24, 26, 9, 11, p);
    rect(g, 23, 18, 2, 14, p[4]);
    blob(g, 24, 11, 6, 6, [STEEL[0], STEEL[1], STEEL[2]]);
    rect(g, 20, 11, 8, 2, VOID); rect(g, 21, 11, 6, 1, p[4]);
    ring(g, 24, 3, 7, 2, GOLD[0]);
    line(g, 38, 6, 38, 44, BARK[1]); rect(g, 37, 3, 3, 4, STEEL[0]); put(g, 38, 2, STEEL[0]);
    rect(g, 36, 24, 4, 3, STEEL[1]);
  },
  Monarch(g, p, v) {
    // bat wings, body with a lit belly, clawed legs, horned head with a crown, snout, eyes
    for (let y = 6; y <= 32; y++) {
      const reach = Math.round(15 - Math.abs(y - 16) * 0.55);
      for (let x = 17 - reach; x < 17; x++) { const c = (x - (17 - reach)) % 5 === 0 ? p[3] : p[2]; sym(g, x, y, c); }
    }
    symLine(g, 16, 16, 2, 6, p[1], 2);
    blob(g, 24, 30, 11, 12, p);
    for (let y = 24; y < 40; y += 3) rect(g, 21, y, 6, 2, p[4]);
    symRect(g, 15, 38, 6, 7, p[1]); for (const x of [15, 17, 19]) sym(g, x, 44, BONE[0]);
    blob(g, 24, 14, 8, 7, p);
    blob(g, 24, 19, 5, 3, p);
    sym(g, 22, 19, p[3]);
    if (v === 0) { symLine(g, 18, 9, 14, 4, BONE[1], 2); crown(g, 8, 4); }
    if (v === 1) { symLine(g, 19, 9, 13, 1, BONE[1], 2); symLine(g, 13, 1, 11, 0, BONE[0], 2); }
    if (v === 2) for (const x of [17, 20, 23, 26, 29]) line(g, x, 8, x + Math.sign(x - 23) * 2, 2, x === 23 ? GOLD[0] : BONE[1], 2);
    eyes(g, 13, 2, p[4], p[3]);
  },
  Warden(g, p, v) {
    // tower shield, armoured legs and body, great helm with a glowing slit and plume, mace
    symRect(g, 16, 35, 6, 10, p[2]); symRect(g, 16, 35, 2, 10, p[1]);
    blob(g, 25, 25, 11, 11, p);
    box(g, 18, 4, 13, 12, [STEEL[0], STEEL[1], STEEL[2]]);
    rect(g, 20, 9, 9, 2, VOID); rect(g, 21, 9, 7, 1, p[4]);
    for (let y = 0; y < 5; y++) rect(g, 23 - y, y, 3, 1, p[4]);
    rect(g, 3, 15, 15, 28, p[2]); rect(g, 3, 15, 15, 1, p[0]);
    rect(g, 3, 15, 1, 28, p[0]); rect(g, 16, 15, 2, 28, p[3]); rect(g, 3, 42, 15, 1, p[3]);
    rect(g, 5, 17, 11, 24, p[1]);
    // shield emblem and weapon by variant: cross + mace, sun disc + sword, chevrons + axe
    if (v === 0) { rect(g, 9, 22, 3, 14, p[4]); rect(g, 6, 27, 9, 3, p[4]); }
    if (v === 1) { ring(g, 10.5, 28.5, 4, 4, p[4]); oval(g, 10.5, 28.5, 2, 2, p[4]); }
    if (v === 2) for (let i = 0; i < 3; i++) { line(g, 6, 22 + i * 6, 10, 26 + i * 6, p[4], 2); line(g, 10, 26 + i * 6, 14, 22 + i * 6, p[4], 2); }
    if (v === 0) { rect(g, 38, 20, 3, 18, BARK[1]); box(g, 35, 12, 9, 9, [STEEL[0], STEEL[1], STEEL[2]]); for (const [x, y] of [[34, 15], [44, 15], [39, 11]]) put(g, x, y, STEEL[0]); }
    if (v === 1) { rect(g, 39, 4, 3, 26, STEEL[1]); rect(g, 39, 4, 1, 26, STEEL[0]); put(g, 40, 3, STEEL[0]); rect(g, 36, 30, 9, 2, GOLD[1]); rect(g, 39, 32, 3, 5, BARK[1]); }
    if (v === 2) { rect(g, 38, 12, 3, 26, BARK[1]); box(g, 41, 12, 5, 10, [STEEL[0], STEEL[1], STEEL[2]]); rect(g, 45, 13, 1, 8, STEEL[0]); }
  },
  Keeper(g, p) {
    // treant: roots, bark trunk with a carved face, leafy canopy in the element's colours, lantern
    for (const [x0, x1] of [[14, 6], [18, 12], [30, 36], [33, 42]]) line(g, x0, 40, x1, 45, BARK[2], 2);
    box(g, 14, 16, 20, 27, BARK);
    for (let y = 18; y < 42; y += 4) { put(g, 18, y, BARK[2]); put(g, 28, y + 2, BARK[2]); }
    blob(g, 24, 11, 17, 10, p);
    blob(g, 10, 15, 7, 6, p); blob(g, 38, 15, 7, 6, p);
    for (const [x, y] of [[16, 6], [30, 5], [22, 3], [36, 10], [11, 11]]) put(g, x, y, p[4]);
    symRect(g, 18, 23, 3, 2, p[4]); sym(g, 19, 23, WHITE);
    rect(g, 20, 29, 8, 3, VOID);
    line(g, 33, 24, 41, 20, BARK[1], 2); line(g, 41, 21, 41, 26, STEEL[2]);
    box(g, 39, 26, 5, 6, [GOLD[0], p[4], GOLD[2]]); put(g, 41, 28, WHITE);
  },
  Patriarch(g, p) {
    // minotaur elder: hooves, body, fists, head, great curled horns, beard, nose ring
    symRect(g, 15, 38, 6, 7, p[2]); symRect(g, 15, 43, 6, 2, VOID);
    blob(g, 24, 29, 13, 11, p);
    box(g, 6, 22, 6, 15, p); box(g, 36, 22, 6, 15, p);
    blob(g, 9, 37, 4, 3, p); blob(g, 38, 37, 4, 3, p);
    blob(g, 24, 15, 8, 8, p);
    for (let a = 0; a <= 10; a++) {
      const t = Math.PI * (0.9 + a * 0.12);
      const x = 12 + Math.round(Math.cos(t) * 6), y = 10 + Math.round(Math.sin(t) * 6);
      sym(g, x, y, a < 5 ? BONE[0] : BONE[1]); sym(g, x + 1, y, BONE[1]);
    }
    symLine(g, 17, 11, 12, 10, BONE[0], 2);
    eyes(g, 13, 2, p[4], p[3]);
    blob(g, 24, 19, 5, 3, [p[0], p[0], p[1]]);
    ring(g, 24, 22, 2, 2, GOLD[1]);
    for (let y = 23; y < 30; y++) rect(g, 24 - Math.max(1, 5 - (y - 23)), y, Math.max(2, (5 - (y - 23)) * 2), 1, p[0]);
  },
  Herald(g, p) {
    // phoenix: wings raised, body, fanned tail, crested head, golden beak
    for (let i = 0; i < 7; i++) symLine(g, 18, 24 - i, 2 + i, 3 + i * 3, i % 2 ? p[4] : p[0], 2);
    for (let i = 0; i < 5; i++) line(g, 24, 36, 16 + i * 4, 45, i % 2 ? p[4] : p[1], 2);
    blob(g, 24, 27, 8, 11, p);
    for (let y = 22; y < 36; y += 3) rect(g, 21, y, 6, 1, p[0]);
    blob(g, 24, 13, 5, 5, p);
    for (const [x, h] of [[21, 6], [24, 8], [27, 6]]) line(g, x, 9, x + (x - 24) / 2, 9 - h, p[4]);
    rect(g, 23, 15, 3, 2, GOLD[1]); put(g, 24, 17, GOLD[2]);
    eyes(g, 12, 0, p[4]);
    return { float: true };
  },
  Sovereign(g, p) {
    // lich king: robe, fur mantle, skull with burning eyes, jewelled crown, staff with an orb
    trap(g, 18, 44, 9, 15, p);
    for (let x = 13; x < 35; x += 2) put(g, x, 44, p[3]);
    blob(g, 24, 19, 12, 4, [BONE[0], BONE[1], BONE[2]]);
    blob(g, 24, 11, 6, 6, BONE);
    symRect(g, 20, 10, 3, 3, VOID); sym(g, 21, 11, p[4]);
    rect(g, 23, 14, 2, 1, VOID);
    for (let x = 20; x < 28; x += 2) put(g, x, 16, VOID);
    crown(g, 5, 6);
    put(g, 19, 3, '#5fe0d0'); put(g, 28, 3, '#5fe0d0');
    line(g, 39, 6, 39, 44, BARK[1], 2);
    oval(g, 40, 5, 3, 3, p[4]); put(g, 39, 4, WHITE);
    rect(g, 36, 25, 5, 3, BONE[1]);
  },
  Prime(g, p) {
    // cosmic eye: tentacles below, the orb with iris and slit pupil, a tilted ring, orbiting motes
    for (let i = 0; i < 5; i++) {
      let x = 14 + i * 5;
      for (let y = 32; y < 45; y++) { x += Math.round(Math.sin((y + i * 3) / 2.2)); rect(g, x, y, Math.max(1, 3 - Math.floor((y - 32) / 5)), 1, y % 3 ? p[2] : p[1]); }
    }
    blob(g, 24, 22, 14, 13, p);
    oval(g, 24, 22, 8, 7, WHITE);
    oval(g, 24, 22, 6, 6, p[4]);
    oval(g, 24, 22, 2, 5, VOID);
    put(g, 21, 19, WHITE); put(g, 22, 19, WHITE);
    ring(g, 24, 22, 22, 5, GOLD[1]);
    for (const [x, y] of [[4, 8], [43, 12], [6, 34], [41, 36]]) { put(g, x, y, p[4]); put(g, x + 1, y, WHITE); }
    return { float: true };
  },
  Slime(g, p, kind) {
    // slime king: big glossy slime with drips, a shine, a grumpy face and a jewelled crown;
    // `kind` (the colour of its name) adds the feature of each king (SLIME_FEATURES)
    const f = SLIME_FEATURES[kind] ?? {};
    f.back?.(g, p);
    blob(g, 24, 32, 18, 12, p);
    for (const x of [10, 16, 31, 37]) rect(g, x, 40, 2, 4, p[1]);
    f.body?.(g, p);
    oval(g, 16, 25, 4, 2, WHITE); put(g, 21, 24, WHITE);
    const eye = f.eye ?? VOID;
    symRect(g, 17, 30, 3, 4, eye); sym(g, 17, 30, WHITE);
    symLine(g, 16, 27, 20, 29, p[3]);
    rect(g, 21, 37, 6, 1, VOID); put(g, 21, 36, VOID); put(g, 26, 36, VOID);
    if (f.crown) f.crown(g, p); else crown(g, 21, 7);
    if (!f.crown) { put(g, 20, 17, '#5fe0d0'); put(g, 27, 17, '#6fb6ff'); }
    f.front?.(g, p);
  },
};

/** Per-king features of the slime kings, by the colour that starts their name. */
const SLIME_FEATURES = {
  // Azure: a water crest of droplets on the head and bubbles rising around it
  Azure: {
    front(g, p) {
      for (const [x, y, r] of [[6, 14, 2], [41, 10, 3], [4, 28, 1.6], [43, 24, 2], [9, 5, 1.4]]) { ring(g, x, y, r, r, p[0]); put(g, Math.round(x - r / 2), Math.round(y - r / 2), WHITE); }
      symRect(g, 21, 35, 1, 2, p[0]);
    },
    crown(g) {
      crown(g, 21, 7);
      for (const [x, y] of [[24, 11], [23, 12], [24, 12], [25, 12], [23, 13], [24, 13], [25, 13]]) put(g, x, y, '#6fd6ff');
      put(g, 24, 9, '#6fd6ff'); put(g, 23, 12, WHITE);
    },
  },
  // Crimson: horns, fangs and an angrier brow
  Crimson: {
    back(g) {
      symLine(g, 12, 24, 9, 16, BONE[1], 3); symLine(g, 9, 17, 8, 13, BONE[0], 2); sym(g, 8, 12, BONE[0]);
    },
    front(g, p) {
      symRect(g, 21, 38, 1, 2, WHITE); symLine(g, 15, 26, 20, 30, p[3]);
    },
  },
  // Amber: a beetle trapped in its body and long honey drips
  Amber: {
    body(g) {
      oval(g, 31, 36, 3, 2, '#5a3210'); rect(g, 31, 34, 1, 4, '#2e1a04');
      for (const [x, y] of [[28, 35], [28, 37], [34, 35], [34, 37], [30, 33], [32, 33]]) put(g, x, y, '#2e1a04');
      put(g, 30, 35, '#c08040');
    },
    front(g, p) {
      for (const x of [13, 22, 34]) { rect(g, x, 43, 2, 3, p[1]); put(g, x, 46, p[0]); }
    },
  },
  // Violet: a third eye, arcane runes floating around and a star on the crown
  Violet: {
    body(g) {
      oval(g, 24, 26, 2, 1.6, WHITE); put(g, 24, 26, '#2a0a48'); put(g, 23, 26, '#2a0a48');
    },
    front(g, p) {
      for (const [x, y] of [[5, 12], [42, 16], [7, 30], [40, 4]]) { put(g, x, y, p[4]); put(g, x - 1, y, p[0]); put(g, x + 1, y, p[0]); put(g, x, y - 1, p[0]); put(g, x, y + 1, p[0]); }
    },
    crown(g) {
      crown(g, 21, 7);
      for (const [x, y] of [[24, 12], [23, 13], [24, 13], [25, 13], [24, 14], [22, 13], [26, 13]]) put(g, x, y, '#ffe27a');
    },
  },
  // Obsidian: faceted rock skin with glowing cracks and glowing eyes
  Obsidian: {
    eye: '#ff5ad0',
    body(g, p) {
      line(g, 12, 33, 16, 37, p[4]); line(g, 16, 37, 14, 41, p[4]);
      line(g, 34, 34, 31, 39, p[4]); line(g, 31, 39, 35, 42, p[4]);
      line(g, 26, 22, 29, 26, p[0]);
    },
  },
  // Golden: a tall gem-studded crown and coins spilling at its base
  Golden: {
    crown(g) {
      crown(g, 21, 8);
      rect(g, 17, 14, 14, 3, GOLD[1]); rect(g, 17, 14, 14, 1, GOLD[0]);
      for (const x of [17, 21, 24, 27, 30]) { put(g, x, 13, GOLD[1]); put(g, x, 12, GOLD[0]); }
      put(g, 20, 18, '#e8434a'); put(g, 24, 15, '#6fb6ff'); put(g, 28, 18, '#5fe0d0'); put(g, 24, 18, '#e8434a');
    },
    front(g) {
      for (const [x, y] of [[5, 43], [9, 44], [38, 44], [42, 43], [40, 41]]) { rect(g, x, y, 3, 2, GOLD[1]); put(g, x, y, GOLD[0]); }
    },
  },
  // Frost: icicles hanging from it, snowflakes and an ice-crystal crown
  Frost: {
    front(g, p) {
      for (const [x, l] of [[12, 4], [18, 3], [27, 5], [34, 3]]) for (let i = 0; i < l; i++) put(g, x, 41 + i, i < l - 1 ? p[0] : WHITE);
      for (const [x, y] of [[6, 10], [42, 18], [5, 30]]) { put(g, x, y, WHITE); put(g, x - 1, y - 1, p[0]); put(g, x + 1, y + 1, p[0]); put(g, x + 1, y - 1, p[0]); put(g, x - 1, y + 1, p[0]); }
    },
    crown(g, p) {
      rect(g, 17, 19, 14, 2, p[0]);
      for (const [x, h] of [[18, 4], [21, 6], [24, 8], [27, 6], [30, 4]]) { rect(g, x - 1, 19 - h, 2, h, p[0]); put(g, x - 1, 19 - h, WHITE); }
    },
  },
  // Magma: lava cracks, smoke above and molten drips
  Magma: {
    body(g) {
      line(g, 10, 31, 17, 36, '#ffd040'); line(g, 17, 36, 15, 42, '#ff9a20');
      line(g, 37, 30, 31, 37, '#ffd040'); line(g, 31, 37, 33, 42, '#ff9a20');
    },
    front(g) {
      for (const [x, y, r] of [[13, 10, 2.2], [10, 5, 1.6], [36, 9, 2], [39, 4, 1.4]]) oval(g, x, y, r, r, 'rgba(90,80,80,0.55)');
      for (const x of [16, 31]) { rect(g, x, 43, 2, 2, '#ff9a20'); put(g, x, 45, '#ffd040'); }
    },
  },
  // Shadow: wisps rising from it and glowing red eyes
  Shadow: {
    eye: '#ff3a4a',
    back(g, p) {
      for (const [x0, top] of [[9, 14], [16, 8], [31, 9], [38, 15]]) {
        let x = x0;
        for (let y = 26; y > top; y--) { x += Math.round(Math.sin(y / 2)); rect(g, x, y, 2, 1, y < top + 4 ? p[2] : p[1]); }
      }
    },
  },
};

/* ---------- boss list ---------- */

const BOSSES = {};
const elementOf = (name) => (ELEMENTS.find(([root]) => name.startsWith(root)) ?? [null, FALLBACK])[1];
const titleOf = (name) => name.split(' ').pop();
/** Variant 0..2 from the name (stable). */
const variantOf = (name) => [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7) % 3;

for (const [id, b] of Object.entries(bossData.mapBosses)) {
  const n = Number(id);
  // Surge-only bosses (customBosses.js) have no aura, like the early original bosses at their levels
  const aura = b.custom ? null : n >= 20 ? 'violet' : n >= 10 ? 'red' : null;
  BOSSES[`boss#${id}`] = { name: b.name, type: titleOf(b.name), v: variantOf(b.name), palette: elementOf(b.name), aura };
}
for (const [id, e] of Object.entries(bossData.eventBosses)) {
  const line0 = e.normal ?? e.hard;
  if (!line0) continue;
  BOSSES[`event#${id}`] = { name: line0.name, type: titleOf(line0.name), v: variantOf(line0.name), palette: elementOf(line0.name), aura: 'gold' };
}
const SLIME_COLORS = {
  Emerald: ['#a8f0a0', '#4ec46a', '#22803e', '#0a2a14', '#ffffff'],
  Azure: ['#a8dcff', '#4a9ae8', '#2258a8', '#0a1a3a', '#ffffff'],
  Crimson: ['#ffa8a8', '#e04a4a', '#9a1e26', '#2a060a', '#ffffff'],
  Amber: ['#ffe2a0', '#f0a830', '#b06a10', '#2e1a04', '#ffffff'],
  Violet: ['#e0b8ff', '#a060e0', '#6a2aa8', '#1e0838', '#ffffff'],
  Obsidian: ['#7a7488', '#46404f', '#24202c', '#06040a', '#ff5ad0'],
  Golden: ['#fff6b0', '#f2c838', '#b88a10', '#302006', '#ffffff'],
  Frost: ['#f0fbff', '#a8e0f8', '#5aa8d8', '#0e2a40', '#ffffff'],
  Magma: ['#ffb070', '#e0502a', '#8a1e10', '#200604', '#ffe080'],
  Shadow: ['#8a7aa0', '#4a3a62', '#261c38', '#06040c', '#ff4a5a'],
  Prism: ['#fff0ff', '#e0a8f0', '#8a6ad8', '#1e1440', '#a0fff0'],
  Storm: ['#e0e8ff', '#8a9ad8', '#4a5a9e', '#10163a', '#fff27a'],
};
for (const id of SLIME_IDS) {
  const name = slimeName(id);
  const kind = name.split(' ')[0];
  // v carries the kind: Slime() draws that king's feature
  BOSSES[`slime#${id}`] = { name, type: 'Slime', v: kind, palette: SLIME_COLORS[kind] ?? SLIME_COLORS.Emerald, aura: null };
}

const AURAS = {
  red: { aura: 'rgba(210,30,40,0.30)', embers: ['#ff8a3a', '#ff3a3a'] },
  violet: { aura: 'rgba(150,70,255,0.34)', embers: ['#b06aff', '#ff5ad0'] },
  gold: { aura: 'rgba(255,210,90,0.38)', embers: ['#ffe27a', '#ffffff'] },
};

/** Every boss key with art (for tests and tools). */
export const bossKeys = () => Object.keys(BOSSES);

/** True when the battle / bestiary key has boss art. */
export const hasBossArt = (key) => !!BOSSES[key] && !!DRAW[BOSSES[key].type];

/** Pixel grid of a boss (rows of colours or null). */
export function bossGrid(key) {
  const def = BOSSES[key];
  const draw = def && DRAW[def.type];
  if (!draw) return null;
  const p = def.palette;
  const g = grid();
  const info = draw(g, p, def.v) ?? {};
  // dark outline around the silhouette
  const out = g.map((row) => row.slice());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = p[3];
  }
  const tier = def.aura ? AURAS[def.aura] : null;
  if (tier) {
    const halo = out.map((row) => row.slice());
    for (let y = 0; y < S - 3; y++) for (let x = 0; x < S; x++) {
      if (out[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => out[y + dy]?.[x + dx])) halo[y][x] = tier.aura;
    }
    out.splice(0, S, ...halo);
  }
  // soft ground shadow (smaller and fainter under floating bosses)
  const [x0, x1, rows] = info.float ? [16, 31, [46]] : [11, 36, [45, 46]];
  for (let x = x0; x <= x1; x++) for (const y of rows) {
    const edge = x < x0 + 2 || x > x1 - 2 || y === 46;
    if (!out[y][x]) out[y][x] = info.float ? 'rgba(0,0,0,0.14)' : edge ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.28)';
  }
  if (tier) {
    const spots = [[3, 4], [44, 6], [2, 20], [45, 18], [4, 34], [43, 32], [10, 1], [37, 1]];
    spots.forEach(([x, y], i) => { if (!out[y][x]) out[y][x] = tier.embers[i % 2]; });
  }
  return out;
}

const imageCache = new Map();
const rgbaCache = new Map();
function rgba(c) {
  let v = rgbaCache.get(c);
  if (!v) {
    if (c[0] === '#') v = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).concat(255);
    else {
      const n = c.slice(c.indexOf('(') + 1, -1).split(',').map(Number);
      v = [n[0], n[1], n[2], Math.round((n[3] ?? 1) * 255)];
    }
    rgbaCache.set(c, v);
  }
  return v;
}

/**
 * Pixels of the boss as ImageData (browser only), for a small canvas scaled up crisply.
 * `silhouette` gives the unknown-creature shadow (black at 45%). Cached; null without art.
 */
export function bossPixels(key, silhouette = false) {
  const id = silhouette ? `${key}#silhouette` : key;
  if (imageCache.has(id)) return imageCache.get(id);
  const g = typeof ImageData !== 'undefined' ? bossGrid(key) : null;
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
