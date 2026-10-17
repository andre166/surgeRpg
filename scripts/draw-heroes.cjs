/**
 * Draws the remaining heroes as 32x32 pixel art (shown at exactly 2x in game), on the same
 * figure as scripts/draw-marin.cjs, each assembled from parts: hair style, headgear, face
 * details, outfit, sleeves, boots, an optional cape and the item in hand. Their eras alternate
 * prehistoric / futuristic / medieval in hero order (Wren, Lior, Bastian, Nell, Corvin, Elka,
 * Hollis, Petra, Dax, Yara).
 *
 * Sheet per hero: 4 columns x 5 rows of 32x32 frames.
 *   rows 0-3  walk: front, right side, back, left side (left = mirrored right); 4 frames each.
 *   row 4     idle (front): breathing, the item tapping (torch flame flickers) and a blink.
 * Every frame gets an automatic dark outline and a soft baked shadow under the feet.
 *
 * Output per hero: <outDir>/<name>-walk.png + <name>-walk.json and <outDir>/<name>.png
 * (front idle frame at 4x for menus and battle). Register new names in src/game/heroArt.js.
 *
 * Usage: npx electron scripts/draw-heroes.cjs public/assets/heroes [name ...]
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const [outDir, ...only] = process.argv.slice(2);

/* ------------------------------------------------------------------ palettes */

const P = {
  skinLight: ['#f8d3aa', '#e2a97a', '#b8774c'],
  skinRuddy: ['#f6c39c', '#dc9670', '#a8603e'],
  skinTan: ['#e3ad7c', '#c08456', '#8a5530'],
  skinBrown: ['#b97d52', '#935a35', '#643a1e'],
  skinDark: ['#8a5634', '#683c22', '#452512'],
  black: ['#4a4450', '#2c2832', '#18161c'],
  brown: ['#a8642f', '#7a4320', '#4e2912'],
  red: ['#e2733a', '#b84a22', '#7c2c12'],
  blond: ['#f6dc8a', '#d4ac4c', '#9a7428'],
  ginger: ['#e8904a', '#bc6228', '#7e3c14'],
  plum: ['#8a5aa8', '#5e3a7a', '#3a2250'],
  grey: ['#c8c8d0', '#9a9aa6', '#6a6a76'],
  fur: ['#d8b07a', '#a87e4c', '#6e4e2a'],
  furDark: ['#9a7650', '#6e5034', '#45301c'],
  hide: ['#c89664', '#9a6c40', '#664424'],
  leather: ['#a87444', '#744c28', '#472d16'],
  wood: ['#cf9a5c', '#9a6836', '#64401e'],
  stone: ['#c4c0b8', '#8e8a82', '#5e5a54'],
  bone: ['#f4ecd6', '#d6c8a4', '#a8987a'],
  steel: ['#e4e9f0', '#aab2bf', '#6f7887'],
  gunmetal: ['#7a8494', '#4e5664', '#2e343e'],
  white: ['#ffffff', '#d8e0ea', '#9aa6b8'],
  cyan: '#5ff0ff',
  magenta: '#ff4ae0',
  teal: '#3fffc0',
  charcoal: ['#4a4e5c', '#30333e', '#1c1e26'],
  orange: ['#ffa64a', '#e0761e', '#9c4c10'],
  blueTab: ['#5a82d6', '#33539e', '#1e3266'],
  green: ['#8ec85a', '#5c9a34', '#36621c'],
  crimson: ['#e05050', '#a82a2e', '#6a161c'],
  shirtGrey: ['#c8c4bc', '#9a958c', '#6a665e'],
  pantsBrown: ['#806048', '#5c4332', '#3e2c20'],
  pantsDark: ['#585e6e', '#3c4150', '#262a34'],
  gold: '#e6b84a',
  paintRed: '#c8322a',
  paintWhite: '#f4f0e6',
  feathers: ['#e84a3a', '#f4c040', '#3a9ae0'],
};

/** Hero configs: name (output file), hero index (src/data/characters.json) and parts. */
const HEROES = [
  { name: 'wren', index: 6, era: 'prehistoric', skin: P.skinTan, hair: P.black, hairStyle: 'wild', headgear: 'headband', band: P.leather, paint: 'stripes', paintColor: P.paintRed,
    outfit: 'fur', top: P.fur, arms: 'bare', legs: P.hide, feet: 'wrap', feetColor: P.furDark, item: 'spear' },
  { name: 'lior', index: 7, era: 'futuristic', skin: P.skinLight, hair: P.blond, hairStyle: 'short', headgear: 'visor', glow: P.cyan,
    outfit: 'suit', top: P.white, arms: 'suit', legs: P.white, feet: 'tech', feetColor: P.gunmetal, item: 'blaster', metal: P.gunmetal },
  { name: 'bastian', index: 8, era: 'medieval', skin: P.skinRuddy, hair: P.brown, hairStyle: 'short', beard: 'short', headgear: 'kettle',
    outfit: 'tabard', top: P.blueTab, mail: P.steel, trim: P.gold, arms: 'armored', legs: P.pantsDark, feet: 'boot', feetColor: P.leather, item: 'halberd', metal: P.steel },
  { name: 'nell', index: 9, era: 'prehistoric', skin: P.skinLight, hair: P.red, hairStyle: 'long', freckles: true, necklace: true,
    outfit: 'dress', top: P.hide, arms: 'bare', legs: P.hide, feet: 'wrap', feetColor: P.fur, item: 'club' },
  { name: 'corvin', index: 10, era: 'futuristic', skin: P.skinBrown, hair: P.black, hairStyle: 'short', headgear: 'helmet', glow: P.magenta,
    outfit: 'suit', top: P.charcoal, arms: 'suit', legs: P.charcoal, feet: 'tech', feetColor: P.black, item: 'blade', metal: P.gunmetal },
  { name: 'elka', index: 11, era: 'medieval', skin: P.skinLight, hair: P.blond, hairStyle: 'braid', cape: P.crimson,
    outfit: 'tunic', top: P.green, arms: 'cloth', sleeve: P.green, legs: P.pantsBrown, feet: 'boot', feetColor: P.leather, item: 'bow' },
  { name: 'hollis', index: 12, era: 'prehistoric', skin: P.skinDark, hair: P.grey, hairStyle: 'bald', beard: 'big', cape: P.furDark, shaggy: true,
    outfit: 'fur', top: P.furDark, arms: 'bare', legs: P.hide, feet: 'wrap', feetColor: P.furDark, item: 'axe' },
  { name: 'petra', index: 13, era: 'futuristic', skin: P.skinBrown, hair: P.plum, hairStyle: 'puffs', headgear: 'headset', glow: P.teal,
    outfit: 'jumpsuit', top: P.orange, arms: 'suit', legs: P.orange, feet: 'tech', feetColor: P.gunmetal, item: 'rifle', metal: P.gunmetal },
  { name: 'dax', index: 14, era: 'medieval', skin: P.skinRuddy, hair: P.ginger, hairStyle: 'bald', beard: 'braided',
    outfit: 'apron', top: P.shirtGrey, apron: P.leather, arms: 'cloth', sleeve: P.shirtGrey, legs: P.pantsBrown, feet: 'boot', feetColor: P.leather, item: 'hammer', metal: P.steel },
  { name: 'yara', index: 15, era: 'prehistoric', skin: P.skinBrown, hair: P.black, hairStyle: 'long', headgear: 'feathers', band: P.leather, paint: 'dots', paintColor: P.paintWhite, necklace: true,
    outfit: 'robe', top: P.hide, arms: 'bare', legs: P.hide, feet: 'wrap', feetColor: P.hide, item: 'torch' },
];

/* ------------------------------------------------------------------ drawing (runs in the page) */

function drawAll(heroes, P) {
  const F = 32; const COLS = 4; const ROWS = 5;
  const OUTLINE = '#1a1612';
  const frame = () => Array.from({ length: F }, () => Array(F).fill(null));
  const rect = (g, x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < F) g[j][i] = c; };
  const px = (g, x, y, c) => { if (g[y] && x >= 0 && x < F) g[y][x] = c; };
  const mirror = (g) => g.map((row) => row.slice().reverse());

  /* ---------- items: col = column of the gripping hand, hy = hand top row, dir = outward side ---------- */
  function item(g, h, kind, col, hy, dir, tick) {
    const W = P.wood; const M = h.metal || P.steel; const glow = h.glow || P.cyan;
    if (kind === 'spear') {
      const top = hy - 12;
      rect(g, col, top, 1, 29 - top, W[1]); px(g, col, 28, W[2]);
      rect(g, col - 1, top - 1, 3, 2, P.stone[1]); px(g, col, top - 2, P.stone[0]); px(g, col, top - 3, P.stone[0]); px(g, col - 1, top - 1, P.stone[0]);
      px(g, col, top + 1, P.leather[1]); px(g, col, top + 2, P.leather[2]);
    } else if (kind === 'halberd') {
      const top = hy - 12;
      rect(g, col, top, 1, 29 - top, W[1]); px(g, col, 28, W[2]);
      px(g, col, top - 1, M[0]); px(g, col, top - 2, M[0]);
      const bx = dir < 0 ? col - 3 : col + 1;
      rect(g, bx, top + 1, 3, 4, M[1]); rect(g, dir < 0 ? bx : bx + 2, top + 1, 1, 4, M[0]);
      px(g, dir < 0 ? col + 1 : col - 1, top + 2, M[2]);
    } else if (kind === 'club') {
      rect(g, col, hy - 6, 1, 9, P.bone[1]);
      rect(g, col - 1, hy - 9, 3, 3, P.bone[0]); px(g, col + 1, hy - 7, P.bone[2]);
      px(g, col, hy + 3, P.bone[0]);
    } else if (kind === 'axe') {
      rect(g, col, hy - 7, 1, 10, W[1]);
      const bx = dir < 0 ? col - 3 : col + 1;
      rect(g, bx, hy - 8, 3, 4, P.stone[1]); rect(g, dir < 0 ? bx : bx + 2, hy - 8, 1, 4, P.stone[0]);
      px(g, col, hy - 6, P.leather[2]); px(g, col, hy - 5, P.leather[1]);
    } else if (kind === 'hammer') {
      rect(g, col, hy - 7, 1, 10, W[1]);
      rect(g, col - 2, hy - 10, 5, 3, M[1]); rect(g, col - 2, hy - 10, 5, 1, M[0]); px(g, col + 2, hy - 8, M[2]);
    } else if (kind === 'torch') {
      rect(g, col, hy - 5, 1, 8, W[1]); rect(g, col - 1, hy - 6, 3, 1, P.leather[1]);
      const sway = [0, 1, 0, -1][tick % 4];
      rect(g, col - 1, hy - 9, 3, 3, '#ff8a2a'); px(g, col, hy - 8, '#ffe066'); px(g, col, hy - 7, '#fff2b0');
      px(g, col + sway, hy - 10, '#ff8a2a'); px(g, col + sway, hy - 11, tick % 2 ? '#ffe066' : '#ff8a2a');
      if (tick % 2) px(g, col - sway, hy - 10, '#ffb84a');
    } else if (kind === 'blaster') {
      rect(g, col - 1, hy + 1, 3, 2, M[1]); px(g, col - 1, hy + 1, M[0]);
      rect(g, col, hy + 3, 1, 3, M[2]); px(g, col, hy + 6, glow);
      px(g, col + (dir < 0 ? -1 : 1), hy + 2, glow);
    } else if (kind === 'blade') {
      rect(g, col, hy - 1, 1, 4, M[1]); px(g, col - 1, hy - 1, M[0]); px(g, col + 1, hy - 1, M[0]);
      rect(g, col, hy - 12, 1, 11, glow);
      for (let y = hy - 11; y < hy - 1; y += 2) px(g, col, y, '#ffffff');
    } else if (kind === 'rifle') {
      rect(g, col - 1, hy - 6, 2, 11, M[1]); rect(g, col - 1, hy - 6, 1, 11, M[0]);
      rect(g, col - 1, hy - 10, 1, 4, M[2]); px(g, col - 1, hy - 11, glow);
      rect(g, col, hy - 4, 1, 6, glow);
      rect(g, col - 1, hy + 5, 2, 2, M[2]);
    } else if (kind === 'bow') {
      // the belly curves outward, the string stays straight through the hand
      for (let y = hy - 10; y <= hy + 7; y++) {
        const t = (y - (hy - 1.5)) / 8.5;
        const off = Math.round(2.6 * (1 - t * t));
        px(g, col + dir * off, y, Math.abs(t) > 0.85 ? W[2] : W[1]);
      }
      for (let y = hy - 9; y <= hy + 6; y++) if (g[y] && !g[y][col]) px(g, col, y, '#efe6cf');
    }
  }

  /* ---------- body parts ---------- */
  function sleeveRamp(h) {
    if (h.arms === 'bare') return h.skin;
    if (h.arms === 'armored') return h.mail || P.steel;
    if (h.arms === 'suit') return h.top;
    return h.sleeve || h.top;
  }
  function sleeve(g, h, x, y, len, lit) {
    const r = sleeveRamp(h);
    rect(g, x, y, 3, len, r[1]);
    rect(g, lit ? x : x + 2, y, 1, len, lit ? r[0] : r[2]);
    if (h.arms === 'armored') rect(g, x, y, 3, 1, r[0]);
    if (h.arms === 'suit' && h.glow) rect(g, x, y + len - 1, 3, 1, h.glow);
    if (h.arms === 'bare' && h.outfit === 'fur') px(g, x + 1, y + 1, h.skin[2]); // armband shading
  }
  function hand(g, h, x, y) {
    const r = h.arms === 'suit' || h.arms === 'armored' ? (h.metal || P.gunmetal) : h.skin;
    rect(g, x, y, 3, 2, h.arms === 'suit' || h.arms === 'armored' ? r[1] : r[1]); px(g, x, y, r[0]);
  }
  function feet(g, h, x, y) {
    const r = h.feetColor;
    rect(g, x, y, 4, 3, r[1]);
    if (h.feet === 'wrap') { rect(g, x, y, 4, 1, r[0]); px(g, x + 1, y + 1, r[2]); px(g, x + 3, y + 1, r[2]); }
    else if (h.feet === 'tech') { rect(g, x, y, 4, 1, r[0]); rect(g, x, y + 2, 4, 1, h.glow || P.cyan); }
    else { rect(g, x, y, 4, 1, P.leather[0]); rect(g, x, y + 2, 4, 1, r[2]); }
  }
  function legsFront(g, h, leftLift, rightLift) {
    for (const [x, lift] of [[12, leftLift], [17, rightLift]]) {
      const bx = x - (x < 15 ? 1 : 0);
      rect(g, x, 23, 3, 4 - lift, h.legs[1]);
      rect(g, x, 23, 1, 3 - lift, h.legs[0]);
      feet(g, h, bx, 26 - lift);
    }
  }

  function capeFront(g, h, dy) {
    if (!h.cape) return;
    rect(g, 9, 15 + dy, 14, 10, h.cape[2]);
    if (h.shaggy) for (let x = 9; x < 23; x += 2) px(g, x, 25, h.cape[2]);
  }
  function capeBack(g, h, sway) {
    if (!h.cape) return;
    const c = h.cape;
    rect(g, 10, 14, 12, 11, c[1]);
    rect(g, 10 + sway, 25, 12, 1, c[1]);
    rect(g, 10, 14, 2, 11, c[0]);
    for (const x of [13, 16, 19]) rect(g, x, 16, 1, 9, c[2]);
    if (h.shaggy) for (let x = 10; x < 22; x += 2) px(g, x + sway, 26, c[2]);
  }
  function capeSide(g, h, flutter) {
    if (!h.cape) return;
    for (let y = 14; y <= 25; y++) {
      const left = 12 - Math.floor((y - 14) / 3) - (y > 19 ? flutter : 0);
      rect(g, left, y, 15 - left, 1, y === 25 ? h.cape[2] : h.cape[1]);
    }
    if (h.shaggy) for (let x = 7; x < 14; x += 2) px(g, x - flutter, 26, h.cape[2]);
  }

  /** Outfit seen from the front (or back, with back = true). */
  function torso(g, h, dy, back) {
    const T = h.top;
    const fill = (c) => { rect(g, 11, 15 + dy, 10, 8 - dy, c[1]); rect(g, 11, 15 + dy, 1, 8 - dy, c[0]); rect(g, 20, 15 + dy, 1, 8 - dy, c[2]); };
    if (h.outfit === 'fur') {
      if (back) { fill(T); } else {
        rect(g, 11, 15 + dy, 10, 8 - dy, h.skin[0]); rect(g, 20, 15 + dy, 1, 8 - dy, h.skin[1]);
        for (let y = 15 + dy; y <= 22; y++) { const s = Math.max(11, 20 - (y - 15 - dy) * 2); rect(g, s, y, 21 - s, 1, T[1]); }
        rect(g, 20, 15 + dy, 1, 8 - dy, T[2]);
      }
      for (const [x, y] of [[18, 17], [14, 20], [17, 21], [12, 19]]) if (g[y + dy] && g[y + dy][x] === T[1]) px(g, x, y + dy, T[2]);
      for (let x = 11; x < 21; x += 2) px(g, x, 23, T[1]); // jagged hem
      rect(g, 11, 21, 10, 1, P.leather[2]);
      return;
    }
    if (h.outfit === 'dress' || h.outfit === 'robe') {
      fill(T);
      const len = h.outfit === 'robe' ? 4 : 3;
      rect(g, 10, 22, 12, len, T[1]); rect(g, 10, 22, 1, len, T[0]); rect(g, 21, 22, 1, len, T[2]);
      for (let x = 10; x < 22; x += 2) px(g, x, 22 + len, T[2]); // fringe
      rect(g, 11, 21, 10, 1, P.leather[2]);
      if (!back) { rect(g, 14, 15 + dy, 4, 1, h.skin[1]); } // neckline
      return;
    }
    if (h.outfit === 'suit' || h.outfit === 'jumpsuit') {
      fill(T);
      const glow = h.glow;
      if (h.outfit === 'suit') {
        rect(g, 10, 15 + dy, 2, 2, T[0]); rect(g, 20, 15 + dy, 2, 2, T[2]); // shoulder pads
        rect(g, 16, 16 + dy, 1, 5, glow);
        if (!back) { px(g, 13, 17 + dy, glow); px(g, 14, 17 + dy, glow); }
      } else {
        if (!back) {
          rect(g, 13, 15 + dy, 6, 1, T[0]); rect(g, 16, 16 + dy, 1, 6, T[2]);
          rect(g, 12, 18 + dy, 2, 2, T[2]); rect(g, 18, 18 + dy, 2, 2, T[2]);
          px(g, 12, 18 + dy, glow); px(g, 19, 18 + dy, glow);
        } else { rect(g, 12, 16 + dy, 8, 2, T[2]); px(g, 16, 16 + dy, glow); }
      }
      rect(g, 11, 21, 10, 1, P.gunmetal[2]); px(g, 15, 21, glow); px(g, 16, 21, glow);
      rect(g, 11, 22, 10, 1, T[2]);
      return;
    }
    if (h.outfit === 'tabard') {
      const M = h.mail;
      rect(g, 11, 15 + dy, 10, 8 - dy, M[1]);
      for (let y = 15 + dy; y < 23; y++) for (let x = 11; x < 21; x++) if ((x + y) % 2) px(g, x, y, M[2]);
      rect(g, 13, 15 + dy, 6, 9 - dy, T[1]); rect(g, 13, 15 + dy, 1, 9 - dy, T[0]); rect(g, 18, 15 + dy, 1, 9 - dy, T[2]);
      rect(g, 15, 17 + dy, 2, 3, h.trim); rect(g, 14, 18 + dy, 4, 1, h.trim); // cross
      rect(g, 11, 21, 10, 1, P.leather[1]); px(g, 15, 21, h.trim);
      return;
    }
    if (h.outfit === 'apron') {
      fill(T);
      const A = h.apron;
      if (!back) {
        rect(g, 12, 17 + dy, 8, 7 - dy, A[1]); rect(g, 12, 17 + dy, 1, 7 - dy, A[0]); rect(g, 19, 17 + dy, 1, 7 - dy, A[2]);
        px(g, 12, 15 + dy, A[1]); px(g, 12, 16 + dy, A[1]); px(g, 19, 15 + dy, A[1]); px(g, 19, 16 + dy, A[1]);
        rect(g, 14, 20, 4, 2, A[2]); rect(g, 12, 24, 8, 1, A[1]);
      } else {
        for (let i = 0; i < 6; i++) { px(g, 12 + i, 15 + dy + i, A[1]); px(g, 19 - i, 15 + dy + i, A[1]); }
        rect(g, 11, 21, 10, 1, A[2]);
      }
      return;
    }
    // tunic
    fill(T);
    if (!back) { rect(g, 14, 15 + dy, 4, 1, h.skin[1]); px(g, 15, 16 + dy, h.skin[1]); }
    rect(g, 11, 21, 10, 1, P.leather[1]); px(g, 15, 21, P.gold); px(g, 16, 21, P.gold);
    rect(g, 11, 22, 10, 1, T[2]);
  }

  function torsoSide(g, h) {
    const T = h.top;
    const fill = (c) => { rect(g, 13, 15, 7, 8, c[1]); rect(g, 13, 15, 1, 8, c[0]); rect(g, 18, 15, 2, 8, c[2]); };
    if (h.outfit === 'fur') {
      rect(g, 13, 15, 7, 8, h.skin[0]); rect(g, 18, 15, 2, 8, h.skin[1]);
      for (let y = 15; y <= 22; y++) { const s = Math.max(13, 19 - (y - 15)); rect(g, s, y, 20 - s, 1, T[1]); }
      rect(g, 13, 19, 3, 4, T[1]); px(g, 16, 20, T[2]); px(g, 18, 18, T[2]);
      for (let x = 13; x < 20; x += 2) px(g, x, 23, T[1]);
      rect(g, 13, 21, 7, 1, P.leather[2]);
    } else if (h.outfit === 'dress' || h.outfit === 'robe') {
      fill(T);
      const len = h.outfit === 'robe' ? 4 : 3;
      rect(g, 12, 22, 9, len, T[1]); rect(g, 19, 22, 2, len, T[2]);
      for (let x = 12; x < 21; x += 2) px(g, x, 22 + len, T[2]);
      rect(g, 13, 21, 7, 1, P.leather[2]);
    } else if (h.outfit === 'suit' || h.outfit === 'jumpsuit') {
      fill(T);
      rect(g, 17, 16, 1, 5, h.glow);
      if (h.outfit === 'jumpsuit') { rect(g, 14, 18, 2, 2, T[2]); px(g, 14, 18, h.glow); }
      rect(g, 13, 21, 7, 1, P.gunmetal[2]); px(g, 19, 21, h.glow);
    } else if (h.outfit === 'tabard') {
      const M = h.mail;
      rect(g, 13, 15, 7, 8, M[1]);
      for (let y = 15; y < 23; y++) for (let x = 13; x < 20; x++) if ((x + y) % 2) px(g, x, y, M[2]);
      rect(g, 16, 15, 4, 9, T[1]); rect(g, 19, 15, 1, 9, T[2]); px(g, 18, 18, h.trim);
      rect(g, 13, 21, 7, 1, P.leather[1]);
    } else if (h.outfit === 'apron') {
      fill(T);
      rect(g, 18, 17, 2, 8, h.apron[1]); px(g, 17, 16, h.apron[1]);
      rect(g, 13, 21, 5, 1, h.apron[2]);
    } else {
      fill(T);
      rect(g, 13, 21, 7, 1, P.leather[1]); px(g, 19, 21, P.gold);
      rect(g, 13, 22, 7, 1, T[2]);
    }
  }

  function necklace(g, h, dy) {
    if (!h.necklace) return;
    for (const [x, y] of [[13, 16], [14, 17], [16, 17], [18, 17], [19, 16]]) px(g, x, y + dy, P.bone[0]);
    px(g, 15, 17 + dy, P.leather[2]); px(g, 17, 17 + dy, P.leather[2]);
  }

  /* ---------- heads ---------- */
  function headFront(g, h, y, blink, tick) {
    const S = h.skin; const R = h.hair; const st = h.hairStyle;
    const full = h.headgear === 'helmet';
    if (!full) {
      if (st !== 'bald') {
        rect(g, 12, y, 8, 1, R[1]); rect(g, 11, y + 1, 10, 3, R[1]); rect(g, 10, y + 2, 12, 6, R[1]);
        rect(g, 12, y, 3, 1, R[0]); rect(g, 11, y + 1, 3, 1, R[0]); rect(g, 20, y + 3, 2, 5, R[2]);
        if (st === 'long' || st === 'braid') { rect(g, 10, y + 8, 2, 6, R[1]); rect(g, 20, y + 8, 2, 6, R[2]); px(g, 10, y + 8, R[0]); }
        if (st === 'braid') { rect(g, 20, y + 13, 2, 3, R[1]); px(g, 20, y + 14, P.leather[1]); px(g, 21, y + 14, P.leather[1]); }
        if (st === 'wild') for (const [x, dy2] of [[11, -1], [13, -2], [14, -1], [16, -2], [18, -1], [20, -1], [9, 3], [22, 4], [9, 6], [22, 7]]) px(g, x, y + dy2, R[1]);
        if (st === 'bun') { rect(g, 14, y - 3, 4, 3, R[1]); px(g, 14, y - 3, R[0]); px(g, 17, y - 1, R[2]); }
        if (st === 'puffs') { rect(g, 8, y, 3, 3, R[1]); px(g, 8, y, R[0]); rect(g, 21, y, 3, 3, R[2]); px(g, 11, y + 2, h.glow || P.gold); px(g, 20, y + 2, h.glow || P.gold); }
        if (st === 'short') { px(g, 14, y - 1, R[1]); px(g, 17, y - 1, R[1]); }
      } else {
        rect(g, 12, y + 1, 8, 2, S[0]); rect(g, 11, y + 2, 10, 2, S[0]); px(g, 13, y + 1, '#ffffff40');
        rect(g, 10, y + 5, 2, 3, R[1]); rect(g, 20, y + 5, 2, 3, R[2]);
      }
      // face
      rect(g, 12, y + 3, 8, 8, S[0]); rect(g, 19, y + 4, 1, 7, S[1]); rect(g, 13, y + 10, 6, 1, S[1]);
      if (st !== 'bald') {
        rect(g, 12, y + 3, 8, 1, R[1]);
        for (const x of [12, 14, 15, 18, 19]) px(g, x, y + 4, R[1]);
      } else { rect(g, 11, y + 3, 1, 2, S[0]); rect(g, 20, y + 3, 1, 2, S[1]); }
      px(g, 11, y + 6, S[1]); px(g, 20, y + 6, S[2]);
      if (blink) { rect(g, 13, y + 7, 2, 1, S[2]); rect(g, 17, y + 7, 2, 1, S[2]); }
      else { px(g, 14, y + 6, '#2a1d16'); px(g, 14, y + 7, '#2a1d16'); px(g, 17, y + 6, '#2a1d16'); px(g, 17, y + 7, '#2a1d16'); }
      if (st === 'bald') { rect(g, 13, y + 5, 2, 1, R[2]); rect(g, 17, y + 5, 2, 1, R[2]); } // brows
      px(g, 13, y + 8, '#f09a80'); px(g, 18, y + 8, '#f09a80');
      rect(g, 15, y + 9, 2, 1, S[2]);
      if (h.freckles) { px(g, 13, y + 8, S[2]); px(g, 18, y + 8, S[2]); px(g, 14, y + 8, '#f09a80'); px(g, 17, y + 8, '#f09a80'); }
      if (h.paint === 'stripes') { px(g, 13, y + 7, h.paintColor); px(g, 13, y + 8, h.paintColor); px(g, 18, y + 7, h.paintColor); px(g, 18, y + 8, h.paintColor); }
      if (h.paint === 'dots') { px(g, 13, y + 8, h.paintColor); px(g, 18, y + 8, h.paintColor); px(g, 16, y + 4, h.paintColor); }
      if (h.beard === 'short') { rect(g, 12, y + 8, 8, 3, R[1]); rect(g, 14, y + 8, 4, 1, R[2]); px(g, 15, y + 9, S[2]); px(g, 16, y + 9, S[2]); }
      if (h.beard === 'big') { rect(g, 11, y + 8, 10, 4, R[1]); rect(g, 12, y + 12, 8, 2, R[1]); rect(g, 13, y + 14, 6, 1, R[2]); rect(g, 14, y + 8, 4, 1, R[2]); px(g, 12, y + 9, R[0]); }
      if (h.beard === 'braided') { rect(g, 12, y + 8, 8, 3, R[1]); rect(g, 14, y + 8, 4, 1, R[2]); rect(g, 15, y + 11, 2, 4, R[1]); px(g, 15, y + 12, P.gold); px(g, 16, y + 12, P.gold); px(g, 13, y + 9, R[0]); }
      rect(g, 14, y + 11, 4, 1, S[1]);
    }
    // headgear
    const M = h.metal || P.steel;
    if (h.headgear === 'kettle') {
      rect(g, 11, y - 1, 10, 4, M[1]); rect(g, 12, y - 2, 8, 1, M[1]); rect(g, 12, y - 1, 3, 3, M[0]);
      rect(g, 9, y + 3, 14, 1, M[2]); rect(g, 10, y + 2, 12, 1, M[1]);
    } else if (h.headgear === 'visor') {
      rect(g, 11, y + 6, 10, 2, M[2]); rect(g, 12, y + 6, 8, 2, h.glow); px(g, 13, y + 6, '#ffffff'); px(g, 17, y + 6, '#ffffff');
    } else if (h.headgear === 'helmet') {
      const T = h.top;
      rect(g, 12, y - 1, 8, 1, T[1]); rect(g, 10, y, 12, 12, T[1]); rect(g, 11, y, 3, 5, T[0]); rect(g, 20, y + 1, 2, 10, T[2]);
      rect(g, 11, y + 5, 10, 3, h.glow); rect(g, 12, y + 5, 3, 1, '#ffffff'); rect(g, 11, y + 8, 10, 1, T[2]);
      rect(g, 13, y + 9, 6, 2, T[2]); px(g, 14, y + 10, h.glow); px(g, 17, y + 10, h.glow);
    } else if (h.headgear === 'headset') {
      rect(g, 11, y + 1, 10, 1, M[2]); rect(g, 10, y + 5, 2, 3, M[1]); rect(g, 20, y + 5, 2, 3, M[1]);
      px(g, 10, y + 6, h.glow); rect(g, 11, y + 8, 1, 1, M[2]); rect(g, 12, y + 9, 2, 1, M[2]); px(g, 14, y + 9, h.glow);
    } else if (h.headgear === 'headband') {
      rect(g, 10, y + 3, 12, 1, h.band[1]); px(g, 16, y + 3, P.bone[0]); px(g, 22, y + 4, h.band[1]); px(g, 23, y + 5, h.band[2]);
    } else if (h.headgear === 'feathers') {
      rect(g, 10, y + 2, 12, 1, h.band[1]);
      [11, 13, 15, 17, 19, 21].forEach((x, i) => { const c = P.feathers[i % 3]; rect(g, x, y - 3 + (i % 2), 1, 5 - (i % 2), c); px(g, x, y - 4 + (i % 2), '#ffffff'); });
    }
  }

  function headBack(g, h, y) {
    const S = h.skin; const R = h.hair; const st = h.hairStyle;
    const M = h.metal || P.steel;
    if (h.headgear === 'helmet') {
      const T = h.top;
      rect(g, 12, y - 1, 8, 1, T[1]); rect(g, 10, y, 12, 12, T[1]); rect(g, 11, y, 3, 8, T[0]); rect(g, 20, y + 1, 2, 10, T[2]);
      rect(g, 15, y + 1, 2, 9, T[2]); px(g, 16, y + 4, h.glow);
      rect(g, 14, y + 12, 4, 1, S[1]);
      return;
    }
    if (st !== 'bald') {
      rect(g, 12, y, 8, 1, R[1]); rect(g, 11, y + 1, 10, 3, R[1]); rect(g, 10, y + 2, 12, 8, R[1]);
      rect(g, 12, y, 3, 1, R[0]); rect(g, 11, y + 1, 3, 2, R[0]); rect(g, 20, y + 3, 2, 7, R[2]);
      for (const x of [11, 14, 17, 20]) px(g, x, y + 10, R[2]);
      if (st === 'long') { rect(g, 10, y + 10, 12, 4, R[1]); rect(g, 20, y + 10, 2, 4, R[2]); for (const x of [10, 13, 16, 19]) px(g, x, y + 14, R[1]); }
      if (st === 'braid') { rect(g, 15, y + 10, 2, 8, R[1]); for (let k = 11; k < 18; k += 2) px(g, 15, y + k, R[2]); px(g, 15, y + 16, P.leather[1]); px(g, 16, y + 16, P.leather[1]); }
      if (st === 'wild') for (const [x, dy2] of [[11, -1], [13, -2], [16, -2], [18, -1], [9, 3], [22, 4], [9, 7], [22, 8]]) px(g, x, y + dy2, R[1]);
      if (st === 'bun') { rect(g, 14, y - 3, 4, 3, R[1]); px(g, 14, y - 3, R[0]); px(g, 15, y - 1, P.gold); }
      if (st === 'puffs') { rect(g, 8, y, 3, 3, R[1]); px(g, 8, y, R[0]); rect(g, 21, y, 3, 3, R[2]); }
      if (st === 'short') { px(g, 14, y - 1, R[1]); px(g, 17, y - 1, R[1]); }
    } else {
      rect(g, 12, y, 8, 1, S[0]); rect(g, 11, y + 1, 10, 3, S[0]); rect(g, 10, y + 2, 12, 8, S[0]);
      rect(g, 20, y + 3, 2, 7, S[1]); rect(g, 11, y + 1, 3, 2, '#ffffff30');
      rect(g, 10, y + 5, 12, 4, R[1]); rect(g, 20, y + 5, 2, 4, R[2]);
      if (h.beard === 'big') { rect(g, 9, y + 9, 2, 3, R[1]); rect(g, 21, y + 9, 2, 3, R[2]); }
    }
    px(g, 10, y + 6, S[1]); px(g, 21, y + 6, S[2]);
    rect(g, 14, y + 11, 4, 1, S[1]);
    if (h.headgear === 'kettle') {
      rect(g, 11, y - 1, 10, 4, M[1]); rect(g, 12, y - 2, 8, 1, M[1]); rect(g, 12, y - 1, 3, 3, M[0]);
      rect(g, 9, y + 3, 14, 1, M[2]); rect(g, 10, y + 2, 12, 1, M[1]);
    } else if (h.headgear === 'visor') {
      rect(g, 10, y + 6, 12, 1, M[2]); px(g, 16, y + 6, h.glow);
    } else if (h.headgear === 'headset') {
      rect(g, 11, y + 1, 10, 1, M[2]); rect(g, 9, y + 5, 2, 3, M[1]); rect(g, 21, y + 5, 2, 3, M[1]);
    } else if (h.headgear === 'headband') {
      rect(g, 10, y + 3, 12, 1, h.band[1]); rect(g, 15, y + 4, 1, 3, h.band[1]); rect(g, 16, y + 4, 1, 2, h.band[2]);
    } else if (h.headgear === 'feathers') {
      rect(g, 10, y + 2, 12, 1, h.band[1]);
      [11, 13, 15, 17, 19, 21].forEach((x, i) => { const c = P.feathers[i % 3]; rect(g, x, y - 3 + (i % 2), 1, 5 - (i % 2), c); });
    }
  }

  function headSide(g, h, y, flutter) {
    const S = h.skin; const R = h.hair; const st = h.hairStyle;
    const M = h.metal || P.steel;
    if (h.headgear === 'helmet') {
      const T = h.top;
      rect(g, 12, y - 1, 8, 1, T[1]); rect(g, 11, y, 11, 12, T[1]); rect(g, 12, y, 4, 6, T[0]); rect(g, 11, y + 8, 4, 4, T[2]);
      rect(g, 17, y + 5, 5, 3, h.glow); rect(g, 18, y + 5, 2, 1, '#ffffff'); rect(g, 17, y + 9, 5, 2, T[2]);
      rect(g, 15, y + 12, 3, 2, S[1]);
      return;
    }
    if (st !== 'bald') {
      rect(g, 12, y, 8, 1, R[1]); rect(g, 11, y + 1, 10, 3, R[1]); rect(g, 11, y + 3, 6, 7, R[1]);
      rect(g, 12, y, 4, 1, R[0]); rect(g, 11, y + 1, 4, 2, R[0]); rect(g, 11, y + 7, 3, 3, R[2]);
      px(g, 10, y + 4, R[1]); px(g, 10, y + 6, R[2]);
      if (st === 'long') { rect(g, 11, y + 10, 4, 4, R[1]); px(g, 10 - flutter, y + 12, R[1]); }
      if (st === 'braid') { rect(g, 11, y + 10, 2, 7, R[1]); px(g, 11, y + 15, P.leather[1]); px(g, 12, y + 15, P.leather[1]); }
      if (st === 'wild') for (const [x, dy2] of [[12, -1], [14, -2], [17, -1], [9, 3], [9, 7], [10, 9]]) px(g, x, y + dy2, R[1]);
      if (st === 'bun') { rect(g, 10, y - 1, 3, 3, R[1]); px(g, 10, y - 1, R[0]); }
      if (st === 'puffs') { rect(g, 9, y, 3, 3, R[1]); px(g, 9, y, R[0]); px(g, 12, y + 2, h.glow || P.gold); }
    } else {
      rect(g, 12, y, 8, 1, S[0]); rect(g, 11, y + 1, 10, 3, S[0]); rect(g, 11, y + 3, 6, 7, S[0]); rect(g, 12, y + 1, 3, 2, '#ffffff30');
      rect(g, 11, y + 5, 4, 4, R[1]);
    }
    rect(g, 16, y + 3, 5, 7, S[0]); rect(g, 16, y + 9, 4, 1, S[1]);
    if (st !== 'bald') { rect(g, 16, y + 3, 5, 1, R[1]); px(g, 19, y + 4, R[1]); px(g, 17, y + 4, R[1]); }
    else rect(g, 18, y + 5, 3, 1, R[2]);
    px(g, 21, y + 6, S[1]);
    px(g, 15, y + 6, S[1]); px(g, 15, y + 7, S[2]);
    px(g, 19, y + 6, '#2a1d16'); px(g, 19, y + 7, '#2a1d16');
    px(g, 18, y + 8, h.freckles ? S[2] : '#f09a80');
    px(g, 20, y + 9, S[2]);
    if (h.paint) { px(g, 18, y + 7, h.paintColor); if (h.paint === 'stripes') px(g, 18, y + 8, h.paintColor); }
    if (h.beard === 'short') { rect(g, 16, y + 8, 5, 2, R[1]); px(g, 20, y + 8, R[2]); }
    if (h.beard === 'big') { rect(g, 15, y + 8, 6, 5, R[1]); rect(g, 16, y + 13, 4, 1, R[2]); }
    if (h.beard === 'braided') { rect(g, 16, y + 8, 5, 2, R[1]); rect(g, 19, y + 10, 2, 4, R[1]); px(g, 19, y + 11, P.gold); px(g, 20, y + 11, P.gold); }
    rect(g, 15, y + 10, 3, 2, S[1]);
    if (h.headgear === 'kettle') {
      rect(g, 12, y - 1, 9, 4, M[1]); rect(g, 13, y - 2, 7, 1, M[1]); rect(g, 13, y - 1, 3, 3, M[0]);
      rect(g, 10, y + 3, 13, 1, M[2]);
    } else if (h.headgear === 'visor') {
      rect(g, 16, y + 6, 6, 2, h.glow); px(g, 21, y + 6, '#ffffff'); rect(g, 13, y + 6, 3, 1, M[2]);
    } else if (h.headgear === 'headset') {
      rect(g, 12, y + 1, 8, 1, M[2]); rect(g, 14, y + 5, 2, 3, M[1]); px(g, 14, y + 6, h.glow);
      rect(g, 16, y + 8, 3, 1, M[2]); px(g, 19, y + 8, h.glow);
    } else if (h.headgear === 'headband') {
      rect(g, 11, y + 3, 10, 1, h.band[1]); px(g, 10, y + 4, h.band[1]); px(g, 9 - flutter, y + 5, h.band[2]);
    } else if (h.headgear === 'feathers') {
      rect(g, 11, y + 2, 10, 1, h.band[1]);
      [12, 14, 16, 18].forEach((x, i) => { rect(g, x, y - 3 + (i % 2), 1, 5 - (i % 2), P.feathers[i % 3]); px(g, x, y - 4 + (i % 2), '#ffffff'); });
    }
  }

  /* ---------- views ---------- */
  function front(h, phase, breathe = 0, tap = 0, blink = false, tick = phase) {
    const g = frame();
    const lifts = [[2, 0], [0, 0], [0, 2], [0, 0]][phase];
    const arm = phase % 2 === 1 ? 1 : 0;
    capeFront(g, h, breathe);
    legsFront(g, h, lifts[0], lifts[1]);
    torso(g, h, breathe, false);
    necklace(g, h, breathe);
    sleeve(g, h, 8, 15 + breathe, 4 + arm, true);
    item(g, h, h.item, 8, 19 + breathe + arm - tap, -1, tick);
    hand(g, h, 7, 19 + breathe + arm);
    sleeve(g, h, 21, 15 + breathe, 4 + arm, false);
    hand(g, h, 21, 19 + breathe + arm);
    headFront(g, h, 3 + breathe, blink, tick);
    return g;
  }
  function back(h, phase) {
    const g = frame();
    const lifts = [[0, 2], [0, 0], [2, 0], [0, 0]][phase];
    const arm = phase % 2 === 1 ? 1 : 0;
    legsFront(g, h, lifts[0], lifts[1]);
    torso(g, h, 0, true);
    capeBack(g, h, [-1, 0, 1, 0][phase]);
    sleeve(g, h, 8, 15, 4 + arm, true);
    hand(g, h, 8, 19 + arm);
    sleeve(g, h, 21, 15, 4 + arm, false);
    item(g, h, h.item, 23, 19 + arm, 1, phase);
    hand(g, h, 22, 19 + arm);
    headBack(g, h, 3);
    return g;
  }
  function side(h, phase) {
    const g = frame();
    const arm = phase % 2 === 1 ? 1 : 0;
    const flutter = [1, 0, 2, 0][phase];
    capeSide(g, h, flutter);
    const stride = [3, 0, -3, 0][phase];
    for (const [x, c] of [[15 - stride, h.legs[2]], [15 + stride, h.legs[1]]]) {
      rect(g, x, 23, 3, 4, c);
      feet(g, h, x, 26);
    }
    torsoSide(g, h);
    if (h.necklace) { px(g, 18, 16, P.bone[0]); px(g, 19, 17, P.bone[0]); }
    const reach = [1, 0, -1, 0][phase];
    sleeve(g, h, 16, 15 + arm, 4, true);
    item(g, h, h.item, 20 + reach, 19 + arm, 1, phase);
    hand(g, h, 18 + reach, 19 + arm);
    headSide(g, h, 3, flutter);
    return g;
  }

  function finish(g) {
    const out = g.map((row) => row.slice());
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      if (g[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = OUTLINE;
    }
    for (let x = 9; x < 23; x++) for (const y of [30, 31]) {
      const edge = x < 11 || x > 20 || y === 31;
      if (!out[y][x]) out[y][x] = edge ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.28)';
    }
    return out;
  }

  return heroes.map((h) => {
    const rows = [
      [0, 1, 2, 3].map((p) => front(h, p)),
      [0, 1, 2, 3].map((p) => side(h, p)),
      [0, 1, 2, 3].map((p) => back(h, p)),
      [0, 1, 2, 3].map((p) => mirror(side(h, p))),
      [[0, 0, false], [1, 0, false], [0, 1, false], [1, 0, true]].map(([b, t, k], i) => front(h, 1, b, t, k, i)),
    ];
    const sheet = document.createElement('canvas');
    sheet.width = F * COLS; sheet.height = F * ROWS;
    const sx = sheet.getContext('2d');
    rows.forEach((row, r) => row.forEach((g, c) => {
      finish(g).forEach((line, y) => line.forEach((col, x) => { if (col) { sx.fillStyle = col; sx.fillRect(c * F + x, r * F + y, 1, 1); } }));
    }));
    const big = document.createElement('canvas');
    big.width = F * 4; big.height = F * 4;
    const bx = big.getContext('2d');
    bx.imageSmoothingEnabled = false;
    bx.drawImage(sheet, 0, 4 * F, F, F, 0, 0, F * 4, F * 4);
    return { name: h.name, sheet: sheet.toDataURL('image/png'), portrait: big.toDataURL('image/png') };
  });
}

app.whenReady().then(async () => {
  const list = only.length ? HEROES.filter((h) => only.includes(h.name)) : HEROES;
  const w = new BrowserWindow({ show: false });
  await w.loadURL('about:blank');
  const out = await w.webContents.executeJavaScript(`(${drawAll.toString()})(${JSON.stringify(list)}, ${JSON.stringify(P)})`);
  fs.mkdirSync(outDir, { recursive: true });
  const save = (file, dataUrl) => fs.writeFileSync(path.join(outDir, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
  for (const { name, sheet, portrait } of out) {
    save(`${name}-walk.png`, sheet);
    save(`${name}.png`, portrait);
    fs.writeFileSync(path.join(outDir, `${name}-walk.json`), `${JSON.stringify({ frameWidth: 32, frameHeight: 32, columns: 4, rows: 5 }, null, 2)}\n`);
  }
  console.log(JSON.stringify(list.map((h) => `${h.index}:${h.name} (${h.era})`)));
  app.exit(0);
});
