/**
 * Draws the thief from scratch as 32x32 pixel art (shown at exactly 2x in game), in the
 * look of the original: deep green hood with a shadowed face (only the eyes show) and a
 * bandit mask, a jagged green mantle over a lean leather jerkin with a bandolier, a belt
 * with a gold buckle, dark trousers, wrapped boots, and a dagger held in a reverse grip.
 *
 * Sheet: 4 columns x 5 rows of 32x32 frames.
 *   rows 0-3  walk: front, right side, back, left side (left = mirrored right); 4 frames each
 *             (contact, passing, other contact, passing). The cloak trails and flutters.
 *   row 4     idle (front): quick breathing, the cloak hem swaying, and a blink.
 * Every frame gets an automatic dark outline and a soft baked shadow under the feet.
 *
 * Output: <outDir>/thief-walk.png + thief-walk.json, and <outDir>/thief.png
 * (the front idle frame at 4x, for menus and battle).
 *
 * Usage: npx electron scripts/draw-thief.cjs public/assets/heroes
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
  outline: '#16181d',
  hood: ['#6c9f56', '#43773b', '#2b5227', '#183019'],
  leather: ['#b98250', '#875932', '#5a3a20'],
  cloth: ['#575d70', '#3b4052', '#262a36'],
  boot: ['#6e4c33', '#47311f', '#c9b48a'],
  gold: ['#ffe08a', '#e0a92e', '#9a6a14'],
  blade: ['#ffffff', '#cfd7e3', '#8e99ab'],
  face: '#0b0c10',
  eye: '#fff1a8',
  eyeShut: '#5e5838',
};

/** One frame: a 32x32 grid of colours. */
function frame() { return Array.from({ length: F }, () => Array(F).fill(null)); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < F) g[j][i] = c; }
function px(g, x, y, c) { if (g[y] && x >= 0 && x < F) g[y][x] = c; }
function mirror(g) { return g.map((row) => row.slice().reverse()); }

/* ---------- parts ---------- */

/** Hood seen from the front or back: a soft point on top, x0..x0+11, y0..y0+10. */
function hoodShell(g, x0, y0) {
  rect(g, x0 + 5, y0 - 1, 2, 1, C.hood[1]);
  rect(g, x0 + 3, y0, 6, 1, C.hood[1]);
  rect(g, x0 + 1, y0 + 1, 10, 1, C.hood[1]);
  rect(g, x0, y0 + 2, 12, 9, C.hood[1]);
  rect(g, x0 + 1, y0 + 2, 2, 7, C.hood[0]); // highlight (light from the top-left)
  rect(g, x0 + 4, y0, 2, 1, C.hood[0]);
  rect(g, x0 + 10, y0 + 2, 2, 9, C.hood[2]);
  rect(g, x0, y0 + 10, 12, 1, C.hood[2]);
}

/** Dagger in a reverse grip: fist (3x2) at x, y; the blade runs down and out (dir -1 / 1). */
function dagger(g, x, y, dir) {
  px(g, x + 1, y - 1, C.gold[1]); // pommel
  rect(g, x, y, 3, 2, C.leather[2]); px(g, x, y, C.leather[1]);
  rect(g, x, y + 2, 3, 1, C.gold[1]); px(g, x + (dir < 0 ? 0 : 2), y + 2, C.gold[0]);
  const bx = dir < 0 ? x : x + 2;
  for (let i = 0; i < 5; i++) px(g, bx + dir * i, y + 3 + i, i === 4 ? C.blade[1] : C.blade[0]);
  for (let i = 0; i < 4; i++) px(g, bx + dir * i, y + 4 + i, C.blade[2]);
}

/** Bare gloved hand (3x2) at the end of a sleeve. */
function glove(g, x, y) {
  rect(g, x, y, 3, 2, C.leather[2]); px(g, x, y, C.leather[1]);
}

/** Legs seen from the front/back: lift (0..2) raises a foot off the ground for the step. */
function legsFront(g, leftLift, rightLift) {
  for (const [x, lift] of [[12, leftLift], [17, rightLift]]) {
    const bx = x - (x < 15 ? 1 : 0);
    rect(g, x, 22, 3, 5 - lift, C.cloth[1]);
    rect(g, x, 22, 1, 4 - lift, C.cloth[0]);
    rect(g, bx, 26 - lift, 4, 3, C.boot[0]);
    rect(g, bx, 26 - lift, 4, 1, C.boot[2]); // wrapping
    rect(g, bx, 28 - lift, 4, 1, C.boot[1]);
  }
}

/** Cloak hanging behind the body (shows at the sides); the hem sways by sway px. */
function cloakBehind(g, dy, sway) {
  rect(g, 9, 15 + dy, 14, 8, C.hood[2]);
  rect(g, 9 + sway, 23, 14, 2, C.hood[2]);
  for (const x of [9, 12, 16, 20]) px(g, x + sway, 25, C.hood[3]); // ragged hem
}

/** Jagged mantle over the shoulders. */
function mantle(g, x0, w, dy, front = true) {
  rect(g, x0 + 1, 13 + dy, w - 2, 1, C.hood[1]);
  rect(g, x0, 14 + dy, w, 3, C.hood[1]);
  if (front) rect(g, x0, 14 + dy, 3, 2, C.hood[0]);
  rect(g, x0 + w - 3, 14 + dy, 3, 3, C.hood[2]);
  for (let x = x0 + 1; x < x0 + w - 1; x += 3) px(g, x, 17 + dy, C.hood[2]); // points
}

function bodyFront(g, dy) {
  // lean leather jerkin with a bandolier, belt and a short skirt
  rect(g, 11, 16 + dy, 10, 6, C.leather[1]);
  rect(g, 11, 16 + dy, 1, 6, C.leather[0]);
  rect(g, 20, 16 + dy, 1, 6, C.leather[2]);
  for (let i = 0; i < 6; i++) rect(g, 12 + i, 16 + dy + i, 2, 1, C.leather[2]);
  px(g, 15, 19 + dy, C.gold[1]); // bandolier buckle
  rect(g, 11, 22, 10, 1, C.leather[2]);
  rect(g, 15, 22, 2, 1, C.gold[1]); px(g, 15, 22, C.gold[0]);
  rect(g, 12, 23, 8, 1, C.leather[1]);
}

function hoodFront(g, dy, blink) {
  hoodShell(g, 10, 3 + dy);
  // the face lies in deep shadow: only the eyes catch the light; a mask covers the rest
  rect(g, 13, 7 + dy, 6, 1, C.face);
  rect(g, 12, 8 + dy, 8, 4, C.face);
  rect(g, 13, 6 + dy, 6, 1, C.hood[0]); // rim of the opening
  const eye = blink ? C.eyeShut : C.eye;
  rect(g, 13, 9 + dy, 2, 1, eye); rect(g, 17, 9 + dy, 2, 1, eye);
  rect(g, 12, 11 + dy, 8, 2, C.hood[3]);
  rect(g, 12, 11 + dy, 8, 1, C.hood[2]);
}

/* ---------- views ---------- */

function front(phase, breathe = 0, sway = 0, blink = false) {
  const g = frame();
  // contact frames lift one foot; the arms dip a pixel on the passing frames
  const lifts = [[2, 0], [0, 0], [0, 2], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  cloakBehind(g, breathe, sway || [1, 0, -1, 0][phase]);
  legsFront(g, lifts[0], lifts[1]);
  bodyFront(g, breathe);
  // dagger arm (screen left), blade down and out; empty hand on the other side
  rect(g, 7, 16 + breathe, 3, 4 + arm, C.leather[1]); px(g, 7, 16 + breathe, C.leather[0]);
  dagger(g, 6, 20 + breathe + arm, -1);
  rect(g, 22, 16 + breathe, 3, 4 + arm, C.leather[1]); rect(g, 24, 16 + breathe, 1, 4 + arm, C.leather[2]);
  glove(g, 22, 20 + breathe + arm);
  mantle(g, 8, 16, breathe);
  hoodFront(g, breathe, blink);
  return g;
}

function back(phase) {
  const g = frame();
  const lifts = [[0, 2], [0, 0], [2, 0], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  const sway = [-1, 0, 1, 0][phase];
  legsFront(g, lifts[0], lifts[1]);
  // empty hand on screen left, the dagger hand on screen right (seen from behind)
  rect(g, 7, 16, 3, 4 + arm, C.leather[1]);
  glove(g, 7, 20 + arm);
  rect(g, 22, 16, 3, 4 + arm, C.leather[1]); rect(g, 24, 16, 1, 4 + arm, C.leather[2]);
  dagger(g, 23, 20 + arm, 1);
  // the cloak covers the whole back, with folds and a ragged hem
  rect(g, 10, 15, 12, 8, C.hood[1]);
  rect(g, 10 + sway, 23, 12, 2, C.hood[1]);
  rect(g, 10, 15, 2, 8, C.hood[0]);
  for (const x of [13, 16, 19]) rect(g, x, 17, 1, 6, C.hood[2]);
  for (const x of [10, 13, 16, 19]) px(g, x + sway, 25, C.hood[2]);
  mantle(g, 8, 16, 0, false);
  // hood from behind: a seam down the middle and the point drooping onto the mantle
  hoodShell(g, 10, 3);
  rect(g, 16, 4, 1, 9, C.hood[2]);
  rect(g, 15, 13, 2, 2, C.hood[1]); px(g, 16, 14, C.hood[2]);
  return g;
}

function side(phase) {
  // facing right
  const g = frame();
  const arm = phase % 2 === 1 ? 1 : 0;
  const flutter = [1, 0, 2, 0][phase];
  // cloak trailing behind, flaring out towards the hem
  for (let y = 14; y <= 25; y++) {
    const left = 12 - Math.floor((y - 14) / 3) - (y > 19 ? flutter : 0);
    rect(g, left, y, 15 - left, 1, y === 25 ? C.hood[3] : C.hood[2]);
  }
  // legs: the stride opens and closes; the far leg is a shade darker
  const stride = [3, 0, -3, 0][phase];
  for (const [x, c] of [[15 - stride, C.cloth[2]], [15 + stride, C.cloth[1]]]) {
    rect(g, x, 22, 3, 5, c);
    rect(g, x, 26, 4, 3, C.boot[0]);
    rect(g, x, 26, 4, 1, C.boot[2]);
    rect(g, x, 28, 4, 1, C.boot[1]);
  }
  // jerkin, belt, skirt
  rect(g, 13, 15, 7, 7, C.leather[1]);
  rect(g, 18, 15, 2, 7, C.leather[2]);
  rect(g, 13, 22, 7, 1, C.leather[2]); px(g, 19, 22, C.gold[1]);
  rect(g, 13, 23, 6, 1, C.leather[1]);
  // near arm forward, the dagger held low in front
  rect(g, 16, 16 + arm, 3, 4, C.leather[1]); px(g, 16, 16 + arm, C.leather[0]);
  dagger(g, 18, 20 + arm, 1);
  mantle(g, 11, 10, 0);
  // hood in profile: the point trails back, the face opening on the front (right) side
  rect(g, 12, 3, 7, 1, C.hood[1]);
  rect(g, 11, 4, 10, 1, C.hood[1]);
  rect(g, 11, 5, 11, 8, C.hood[1]);
  rect(g, 12, 4, 3, 7, C.hood[0]);
  rect(g, 11, 12, 11, 1, C.hood[2]);
  rect(g, 9 - flutter, 5, 2, 1, C.hood[2]); rect(g, 10, 4, 1, 1, C.hood[1]); // trailing point
  rect(g, 17, 6, 1, 7, C.hood[0]); // rim of the opening
  rect(g, 18, 7, 4, 4, C.face);
  rect(g, 20, 9, 2, 1, C.eye);
  rect(g, 18, 11, 4, 2, C.hood[3]);
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
  for (let x = 9; x < 23; x++) for (const y of [30, 31]) {
    const edge = x < 11 || x > 20 || y === 31;
    if (!out[y][x]) out[y][x] = edge ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.28)';
  }
  return out;
}

const rows = [
  [0, 1, 2, 3].map((p) => front(p)),
  [0, 1, 2, 3].map((p) => side(p)),
  [0, 1, 2, 3].map((p) => back(p)),
  [0, 1, 2, 3].map((p) => mirror(side(p))),
  // idle, feet planted: quick breaths (down 1 px), the cloak hem sways, and a blink
  [[0, 0, false], [1, 1, false], [0, 0, false], [1, -1, true]].map(([b, s, k]) => front(1, b, s, k)),
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
  save('thief-walk.png', sheet);
  save('thief.png', portrait);
  fs.writeFileSync(path.join(outDir, 'thief-walk.json'), `${JSON.stringify({ frameWidth: F, frameHeight: F, columns: COLS, rows: ROWS }, null, 2)}\n`);
  console.log(JSON.stringify({ frame: F, columns: COLS, rows: ROWS, out: outDir }));
  app.exit(0);
});
