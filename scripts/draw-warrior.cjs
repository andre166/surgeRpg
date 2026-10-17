/**
 * Draws the warrior from scratch as pixel art in 32x32 frames (shown at exactly 2x in game; the
 * figure itself is ~22x28, about the mage's size on screen), in the
 * look of the original: steel helmet with a gold T visor and a red plume, red scarf, dark
 * plate, gold belt, blue heater shield with a gold cross, and a sword held upright.
 *
 * Sheet: 4 columns x 5 rows of 32x32 frames.
 *   rows 0-3  walk: front, right side, back, left side (left = mirrored right); 4 frames each
 *             (contact, passing, other contact, passing). The sword stays steady in hand.
 *   row 4     idle (front): breathing and a swaying plume.
 * Every frame gets an automatic dark outline and a soft baked shadow under the feet.
 *
 * Output: <outDir>/warrior-walk.png + warrior-walk.json, and <outDir>/warrior.png
 * (the front idle frame at 4x, for menus and battle).
 *
 * Usage: npx electron scripts/draw-warrior.cjs public/assets/heroes
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2];
const F = 32;
const COLS = 4;
const ROWS = 5;

// runs inside a blank page, drawing on a canvas
const DRAW = `(() => {
const F = ${F}, COLS = ${COLS}, ROWS = ${ROWS};
const C = {
  outline: '#1a1c24',
  steel: ['#e4e9f0', '#aab2bf', '#6f7887', '#4a5160'],
  gold: ['#ffe08a', '#e0a92e', '#9a6a14'],
  red: ['#ff7a68', '#d8342b', '#8c1b17'],
  plate: ['#66708a', '#434b5e', '#2a303e'],
  blue: ['#5a82d6', '#33539e', '#1e3266'],
  wood: ['#9a6a3c', '#6b4626', '#422a16'],
  boot: ['#5a4030', '#3a281c'],
  blade: ['#ffffff', '#cfd7e3', '#8e99ab'],
  visor: '#0d0f15',
};

/** One frame: a 32x32 grid of colours. */
function frame() { return Array.from({ length: F }, () => Array(F).fill(null)); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < F) g[j][i] = c; }
function px(g, x, y, c) { if (g[y] && x >= 0 && x < F) g[y][x] = c; }
function mirror(g) { return g.map((row) => row.slice().reverse()); }

/* ---------- parts ---------- */

/** Rounded helmet block with side shading: x0..x0+w-1, y0..y0+h-1. */
function helmetShell(g, x0, y0, w, h) {
  rect(g, x0 + 2, y0, w - 4, 1, C.steel[1]);
  rect(g, x0 + 1, y0 + 1, w - 2, 1, C.steel[1]);
  rect(g, x0, y0 + 2, w, h - 2, C.steel[1]);
  rect(g, x0 + 1, y0 + 1, 2, h - 2, C.steel[0]); // highlight (light from the top-left)
  rect(g, x0 + w - 2, y0 + 2, 2, h - 2, C.steel[2]);
  rect(g, x0, y0 + h - 1, w, 1, C.steel[3]);
}

function plume(g, cx, top, sway, len = 4) {
  for (let i = 0; i < len; i++) {
    const x = cx + Math.round(sway * (i / (len - 1)));
    rect(g, x - 1, top + len - 1 - i, 3, 1, i === len - 1 ? C.red[0] : C.red[1]);
    px(g, x + 1, top + len - 1 - i, C.red[2]);
  }
}

/** Upright sword: blade from yTip down to the guard at yGuard, grip and pommel below. */
function sword(g, x, yTip, yGuard, guard = 2) {
  px(g, x, yTip, C.blade[1]);
  rect(g, x - 1, yTip + 1, 1, yGuard - yTip - 1, C.blade[0]);
  rect(g, x, yTip + 1, 1, yGuard - yTip - 1, C.blade[1]);
  rect(g, x + 1, yTip + 2, 1, yGuard - yTip - 2, C.blade[2]);
  rect(g, x - guard, yGuard, guard * 2 + 1, 1, C.gold[1]);
  px(g, x - guard, yGuard, C.gold[0]); px(g, x + guard, yGuard, C.gold[2]);
  rect(g, x - 1, yGuard + 1, 2, 2, C.wood[1]);
  rect(g, x - 1, yGuard + 3, 2, 1, C.gold[1]);
}

/** Heater shield, front face: blue with a gold rim and cross. */
function shield(g, x0, y0) {
  const rows = [[1, 5], [0, 7], [0, 7], [0, 7], [0, 7], [0, 7], [0, 7], [0, 7], [1, 5], [1, 5], [2, 3], [3, 1]];
  rows.forEach(([dx, w], j) => {
    rect(g, x0 + dx, y0 + j, w, 1, C.gold[1]);
    if (w > 2) rect(g, x0 + dx + 1, y0 + j, w - 2, 1, j < 5 ? C.blue[0] : C.blue[1]);
  });
  rect(g, x0 + 1, y0 + 1, 5, 1, C.gold[0]);
  rect(g, x0 + 3, y0 + 2, 1, 7, C.gold[0]); // cross
  rect(g, x0 + 1, y0 + 4, 5, 1, C.gold[0]);
  rect(g, x0 + 6, y0 + 2, 1, 6, C.blue[2]);
}

/** Shield seen from behind: wooden boards and a strap. */
function shieldBack(g, x0, y0) {
  const rows = [[1, 5], [0, 7], [0, 7], [0, 7], [0, 7], [0, 7], [0, 7], [0, 7], [1, 5], [1, 5], [2, 3], [3, 1]];
  rows.forEach(([dx, w], j) => {
    rect(g, x0 + dx, y0 + j, w, 1, C.gold[2]);
    if (w > 2) rect(g, x0 + dx + 1, y0 + j, w - 2, 1, (j + dx) % 3 ? C.wood[1] : C.wood[2]);
  });
  rect(g, x0 + 1, y0 + 4, 5, 1, C.boot[1]);
}

/** Legs seen from the front/back: lift (0..2) raises a foot off the ground for the step. */
function legsFront(g, leftLift, rightLift) {
  for (const [x, lift] of [[11, leftLift], [18, rightLift]]) {
    const bx = x - (x < 15 ? 1 : 0);
    rect(g, x, 23, 3, 3 - lift, C.plate[1]);
    px(g, x, 23, C.plate[0]);
    px(g, x + 1, 24 - Math.min(1, lift), C.steel[2]); // greave
    rect(g, bx, 26 - lift, 4, 2, C.boot[0]);
    rect(g, bx, 27 - lift, 4, 1, C.boot[1]);
  }
}

function bodyFront(g, dy) {
  // pauldrons, torso, scarf, belt and tabard
  rect(g, 10, 16 + dy, 12, 6, C.plate[1]);
  rect(g, 11, 17 + dy, 2, 4, C.plate[0]);
  rect(g, 19, 17 + dy, 2, 4, C.plate[2]);
  rect(g, 14, 18 + dy, 4, 1, C.plate[0]);
  rect(g, 8, 15 + dy, 3, 4, C.steel[1]); rect(g, 8, 15 + dy, 2, 2, C.steel[0]);
  rect(g, 21, 15 + dy, 3, 4, C.steel[1]); rect(g, 22, 16 + dy, 2, 3, C.steel[2]);
  rect(g, 11, 15 + dy, 10, 2, C.red[1]); rect(g, 11, 15 + dy, 3, 1, C.red[0]);
  rect(g, 10, 22, 12, 1, C.gold[1]); rect(g, 15, 22, 2, 1, C.gold[0]);
  rect(g, 12, 23, 8, 2, C.red[1]); rect(g, 13, 25, 6, 1, C.red[2]);
}

function helmetFront(g, dy, sway) {
  helmetShell(g, 10, 5 + dy, 12, 10);
  rect(g, 11, 9 + dy, 10, 1, C.gold[1]);
  rect(g, 11, 10 + dy, 10, 2, C.visor);
  rect(g, 15, 9 + dy, 2, 5, C.gold[1]); px(g, 15, 9 + dy, C.gold[0]);
  rect(g, 13, 13 + dy, 1, 1, C.steel[3]); rect(g, 18, 13 + dy, 1, 1, C.steel[3]); // breaths
  plume(g, 15, 2 + dy, sway, 3);
}

/* ---------- views ---------- */

function front(phase, breathe = 0, sway = 0) {
  const g = frame();
  // contact frames lift one foot; the arms dip a pixel on the passing frames
  const lifts = [[2, 0], [0, 0], [0, 2], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  legsFront(g, lifts[0], lifts[1]);
  bodyFront(g, breathe);
  // sword arm (screen left): gauntlet holding the sword upright
  rect(g, 8, 18 + breathe + arm, 3, 3, C.plate[1]);
  sword(g, 9, 10 + breathe + arm, 20 + breathe + arm);
  rect(g, 8, 21 + breathe + arm, 3, 2, C.steel[1]); px(g, 8, 21 + breathe + arm, C.steel[0]);
  // shield arm (screen right)
  shield(g, 20, 16 + breathe + arm);
  helmetFront(g, breathe, sway);
  return g;
}

function back(phase) {
  const g = frame();
  const lifts = [[0, 2], [0, 0], [2, 0], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  legsFront(g, lifts[0], lifts[1]);
  // back of the plate and a red cape-like scarf tail
  rect(g, 10, 16, 12, 6, C.plate[1]);
  rect(g, 11, 17, 2, 4, C.plate[0]);
  rect(g, 19, 17, 2, 4, C.plate[2]);
  rect(g, 15, 16, 2, 6, C.plate[2]);
  rect(g, 8, 15, 3, 4, C.steel[1]); rect(g, 21, 15, 3, 4, C.steel[1]); rect(g, 22, 16, 2, 3, C.steel[2]);
  rect(g, 11, 15, 10, 2, C.red[1]); rect(g, 14, 17, 4, 3, C.red[1]); rect(g, 15, 20, 2, 1, C.red[2]);
  rect(g, 10, 22, 12, 1, C.gold[2]);
  rect(g, 12, 23, 8, 2, C.red[2]);
  // shield on the back of the left arm (screen left now), sword on screen right
  shieldBack(g, 6, 16 + arm);
  sword(g, 23, 10 + arm, 20 + arm);
  rect(g, 21, 18 + arm, 3, 3, C.plate[1]);
  rect(g, 21, 21 + arm, 3, 2, C.steel[1]);
  // helmet from behind: no visor, a gold ridge, the plume on top
  helmetShell(g, 10, 5, 12, 10);
  rect(g, 15, 5, 2, 9, C.gold[1]); px(g, 15, 5, C.gold[0]);
  plume(g, 15, 2, 0, 3);
  return g;
}

function side(phase) {
  // facing right
  const g = frame();
  const arm = phase % 2 === 1 ? 1 : 0;
  // shield slung on the far arm, behind the body: only its rim shows at the back
  rect(g, 9, 16 + arm, 3, 10, C.gold[2]);
  rect(g, 10, 17 + arm, 2, 8, C.wood[1]);
  // legs: the stride opens and closes; the far leg is a shade darker
  const stride = [3, 0, -3, 0][phase];
  for (const [x, c] of [[15 - stride, C.plate[2]], [15 + stride, C.plate[1]]]) {
    rect(g, x, 22, 3, 5, c);
    rect(g, x, 26, 5, 2, C.boot[0]);
    rect(g, x, 27, 5, 1, C.boot[1]);
  }
  // torso, scarf (its tail flying back), belt, tabard, pauldron
  rect(g, 12, 15, 9, 7, C.plate[1]);
  rect(g, 12, 16, 2, 5, C.plate[0]);
  rect(g, 19, 16, 2, 5, C.plate[2]);
  rect(g, 13, 15, 7, 2, C.red[1]); rect(g, 10, 15, 3, 2, C.red[2]);
  rect(g, 12, 22, 9, 1, C.gold[1]);
  rect(g, 13, 23, 7, 2, C.red[1]);
  rect(g, 14, 14, 5, 4, C.steel[1]); rect(g, 14, 14, 2, 2, C.steel[0]);
  // near arm forward, holding the sword upright in front of the body
  rect(g, 18, 17 + arm, 3, 3, C.plate[1]);
  sword(g, 22, 10 + arm, 20 + arm);
  rect(g, 21, 21 + arm, 3, 2, C.steel[1]); px(g, 21, 21 + arm, C.steel[0]);
  // helmet in profile: visor and gold band on the front (right) side
  helmetShell(g, 12, 5, 10, 10);
  rect(g, 17, 9, 5, 1, C.gold[1]);
  rect(g, 18, 10, 4, 2, C.visor);
  rect(g, 20, 9, 1, 5, C.gold[1]);
  plume(g, 15, 2, -3, 3);
  return g;
}

/* ---------- outline, shadow, sheet ---------- */

function finish(g) {
  const out = g.map((row) => row.slice());
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = C.outline;
  }
  // soft shadow under the feet (behind everything)
  for (let x = 9; x < 23; x++) for (const y of [29, 30]) {
    const edge = x < 11 || x > 20 || y === 30;
    if (!out[y][x]) out[y][x] = edge ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.28)';
  }
  return out;
}

const rows = [
  [0, 1, 2, 3].map((p) => front(p)),
  [0, 1, 2, 3].map((p) => side(p)),
  [0, 1, 2, 3].map((p) => back(p)),
  [0, 1, 2, 3].map((p) => mirror(side(p))),
  // idle, feet planted: the plume sways and the body breathes (down 1 px on the out-breath)
  [[0, 0], [0, 2], [1, 0], [0, -2]].map(([b, s]) => front(1, b, s)),
];

const sheet = document.createElement('canvas');
sheet.width = F * COLS; sheet.height = F * ROWS;
const sx = sheet.getContext('2d');
rows.forEach((row, r) => row.forEach((g, c) => {
  const f = finish(g);
  f.forEach((line, y) => line.forEach((col, x) => { if (col) { sx.fillStyle = col; sx.fillRect(c * F + x, r * F + y, 1, 1); } }));
}));
// menu / battle portrait: the first idle frame at 4x, crisp
const big = document.createElement('canvas');
big.width = F * 4; big.height = F * 4;
const bx = big.getContext('2d');
bx.imageSmoothingEnabled = false;
bx.drawImage(sheet, 0, 4 * F, F, F, 0, 0, F * 4, F * 4);
return { sheet: sheet.toDataURL('image/png'), portrait: big.toDataURL('image/png') };
})()`;

app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false });
  await w.loadURL('about:blank');
  const { sheet, portrait } = await w.webContents.executeJavaScript(DRAW);
  fs.mkdirSync(outDir, { recursive: true });
  const save = (file, dataUrl) => fs.writeFileSync(path.join(outDir, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
  save('warrior-walk.png', sheet);
  save('warrior.png', portrait);
  fs.writeFileSync(path.join(outDir, 'warrior-walk.json'), `${JSON.stringify({ frameWidth: F, frameHeight: F, columns: COLS, rows: ROWS }, null, 2)}\n`);
  console.log(JSON.stringify({ frame: F, columns: COLS, rows: ROWS, out: outDir }));
  app.exit(0);
});
