/**
 * Draws Tamsin from scratch as 32x32 pixel art (shown at exactly 2x in game): an ordinary
 * medieval traveller. Neat blonde hair with a long braid, a knee-length green tunic (Tamsin's
 * colour, hue 90) tied with a rope belt, a short brown cape with the hood folded down and a
 * brass clasp, brown leggings, leather boots, and a small iron lantern carried in one hand.
 *
 * Sheet: 4 columns x 5 rows of 32x32 frames.
 *   rows 0-3  walk: front, right side, back, left side (left = mirrored right); 4 frames each
 *             (contact, passing, other contact, passing). The lantern swings with the stride.
 *   row 4     idle (front): calm breathing, the lantern flame flickering, and a blink.
 * Every frame gets an automatic dark outline and a soft baked shadow under the feet.
 *
 * Output: <outDir>/tamsin-walk.png + tamsin-walk.json, and <outDir>/tamsin.png
 * (the front idle frame at 4x, for menus and battle).
 *
 * Usage: npx electron scripts/draw-tamsin.cjs public/assets/heroes
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
  outline: '#1a1612',
  skin: ['#f6cfa4', '#dca478', '#b0724a'],
  blush: '#f09a80',
  hair: ['#fff0b0', '#e9c35c', '#b88a2e'],
  tunic: ['#a2d46c', '#6fa83c', '#487822'],
  cape: ['#a8774c', '#7a5230', '#4e331c'],
  rope: ['#f2e4b8', '#c2aa76'],
  pants: ['#7a6450', '#58483a', '#3c3128'],
  boot: ['#64462e', '#41291a'],
  iron: ['#9a9fac', '#626672', '#3c3f48'],
  flame: ['#fff8cc', '#ffd462', '#ff9c34'],
  brass: '#e6b84a',
  eye: '#2a1d16',
};

/** One frame: a 32x32 grid of colours. */
function frame() { return Array.from({ length: F }, () => Array(F).fill(null)); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < F) g[j][i] = c; }
function px(g, x, y, c) { if (g[y] && x >= 0 && x < F) g[y][x] = c; }
function mirror(g) { return g.map((row) => row.slice().reverse()); }

/* ---------- parts ---------- */

/** Lantern (4 wide, 6 tall) hanging from its ring at x+1, y; flick swaps the flame's glow. */
function lantern(g, x, y, flick) {
  px(g, x + 1, y, C.iron[1]); px(g, x + 2, y, C.iron[2]); // ring
  rect(g, x, y + 1, 4, 1, C.iron[1]); px(g, x, y + 1, C.iron[0]);
  rect(g, x, y + 2, 1, 3, C.iron[2]); rect(g, x + 3, y + 2, 1, 3, C.iron[2]);
  rect(g, x + 1, y + 2, 2, 3, flick ? C.flame[2] : C.flame[1]);
  rect(g, x + 1, y + 3, 2, 1, C.flame[0]);
  px(g, flick ? x + 2 : x + 1, y + 2, C.flame[0]);
  rect(g, x, y + 5, 4, 1, C.iron[1]);
}

/** Bare hand (3x2) gripping something. */
function hand(g, x, y) {
  rect(g, x, y, 3, 2, C.skin[1]); px(g, x, y, C.skin[0]);
}

/** Tunic sleeve of an arm hanging below the cape: 3 wide, len tall. */
function sleeve(g, x, y, len, lit) {
  rect(g, x, y, 3, len, C.tunic[1]);
  rect(g, lit ? x : x + 2, y, 1, len, lit ? C.tunic[0] : C.tunic[2]);
}

/** Braid hanging from (x, y) for len rows, tied with a green ribbon at the end. */
function braid(g, x, y, len) {
  for (let i = 0; i < len; i++) {
    px(g, x + (i % 2), y + i, C.hair[1]);
    px(g, x + 1 - (i % 2), y + i, C.hair[2]);
  }
  rect(g, x, y + len, 2, 1, C.tunic[0]);
  px(g, x, y + len + 1, C.hair[1]);
}

/** Legs seen from the front/back: lift (0..2) raises a foot off the ground for the step. */
function legsFront(g, leftLift, rightLift) {
  for (const [x, lift] of [[12, leftLift], [17, rightLift]]) {
    const bx = x - (x < 15 ? 1 : 0);
    rect(g, x, 24, 3, 3 - lift, C.pants[1]);
    rect(g, x, 24, 1, 2 - lift, C.pants[0]);
    rect(g, bx, 26 - lift, 4, 3, C.boot[0]);
    rect(g, bx, 26 - lift, 4, 1, C.cape[1]); // boot cuff
    rect(g, bx, 28 - lift, 4, 1, C.boot[1]);
  }
}

/** Knee-length tunic flaring at the hem, with a rope belt (knot on the front or not). */
function tunic(g, x0, w, dy, knot) {
  rect(g, x0, 15 + dy, w, 7 - dy, C.tunic[1]);
  rect(g, x0 - 1, 22, w + 2, 3, C.tunic[1]);
  rect(g, x0, 15 + dy, 1, 7 - dy, C.tunic[0]); rect(g, x0 - 1, 22, 1, 2, C.tunic[0]);
  rect(g, x0 + w - 1, 15 + dy, 1, 7 - dy, C.tunic[2]); rect(g, x0 + w, 22, 1, 3, C.tunic[2]);
  rect(g, x0 - 1, 24, w + 2, 1, C.tunic[2]); // hem
  rect(g, x0, 20, w, 1, C.rope[1]);
  for (let x = x0; x < x0 + w; x += 2) px(g, x, 20, C.rope[0]); // twisted rope
  if (knot != null) { px(g, knot, 20, C.rope[0]); px(g, knot, 21, C.rope[1]); px(g, knot + 1, 21, C.rope[0]); px(g, knot, 22, C.rope[1]); }
}

/** Short cape over the shoulders seen from the front, the hood folded around the neck. */
function capeFront(g, dy) {
  rect(g, 9, 15 + dy, 14, 3, C.cape[1]);
  rect(g, 10, 18 + dy, 2, 1, C.cape[1]); rect(g, 20, 18 + dy, 2, 1, C.cape[1]);
  rect(g, 9, 15 + dy, 2, 2, C.cape[0]);
  rect(g, 21, 15 + dy, 2, 3, C.cape[2]);
  // the cape is open at the front over the tunic
  rect(g, 14, 16 + dy, 4, 2, C.tunic[1]);
  rect(g, 11, 14 + dy, 10, 1, C.cape[0]); // hood folded down
  rect(g, 15, 15 + dy, 2, 1, C.brass); // clasp
}

/** Head from the front: blonde hair parted in the middle, open face; blink closes the eyes. */
function headFront(g, dy, blink) {
  const y = 3 + dy;
  rect(g, 12, y, 8, 1, C.hair[1]);
  rect(g, 11, y + 1, 10, 3, C.hair[1]);
  rect(g, 10, y + 2, 12, 2, C.hair[1]);
  rect(g, 12, y, 3, 1, C.hair[0]); rect(g, 11, y + 1, 3, 2, C.hair[0]);
  rect(g, 15, y, 1, 3, C.hair[2]); // parting
  // face
  rect(g, 12, y + 3, 8, 8, C.skin[0]);
  rect(g, 19, y + 4, 1, 7, C.skin[1]);
  rect(g, 13, y + 10, 6, 1, C.skin[1]);
  // hair sweeping down from the parting to both sides of the face
  rect(g, 12, y + 3, 3, 1, C.hair[1]); rect(g, 17, y + 3, 3, 1, C.hair[1]);
  px(g, 12, y + 4, C.hair[1]); px(g, 19, y + 4, C.hair[1]);
  rect(g, 10, y + 4, 2, 7, C.hair[1]); px(g, 10, y + 4, C.hair[0]);
  rect(g, 20, y + 4, 2, 7, C.hair[2]);
  // eyes, cheeks, a small smile
  if (blink) { rect(g, 13, y + 7, 2, 1, C.skin[2]); rect(g, 17, y + 7, 2, 1, C.skin[2]); }
  else { px(g, 14, y + 6, C.eye); px(g, 14, y + 7, C.eye); px(g, 17, y + 6, C.eye); px(g, 17, y + 7, C.eye); }
  px(g, 13, y + 8, C.blush); px(g, 18, y + 8, C.blush);
  rect(g, 15, y + 9, 2, 1, C.skin[2]);
  // the braid comes over the shoulder on screen right
  braid(g, 20, y + 11, 6);
}

/* ---------- views ---------- */

function front(phase, breathe = 0, flick = false, blink = false) {
  const g = frame();
  // contact frames lift one foot; the arms dip a pixel on the passing frames
  const lifts = [[2, 0], [0, 0], [0, 2], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  const swing = [-1, 0, 1, 0][phase];
  legsFront(g, lifts[0], lifts[1]);
  tunic(g, 11, 10, breathe, 13);
  // lantern in the screen-left hand, the other hand free
  sleeve(g, 8, 17 + breathe, 2 + arm, true);
  hand(g, 8, 19 + breathe + arm);
  lantern(g, 7 + swing, 21 + breathe + arm, flick);
  sleeve(g, 21, 17 + breathe, 2 + arm, false);
  hand(g, 21, 19 + breathe + arm);
  capeFront(g, breathe);
  headFront(g, breathe, blink);
  return g;
}

function back(phase) {
  const g = frame();
  const lifts = [[0, 2], [0, 0], [2, 0], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  const swing = [1, 0, -1, 0][phase];
  legsFront(g, lifts[0], lifts[1]);
  tunic(g, 11, 10, 0, null);
  // free hand on screen left, the lantern hand on screen right (seen from behind)
  sleeve(g, 8, 17, 2 + arm, true);
  hand(g, 8, 19 + arm);
  sleeve(g, 21, 17, 2 + arm, false);
  hand(g, 21, 19 + arm);
  lantern(g, 21 + swing, 21 + arm, phase % 2 === 1);
  // the cape covers the back, the hood bunched up below the neck
  rect(g, 9, 15, 14, 4, C.cape[1]);
  rect(g, 10, 19, 12, 2, C.cape[1]);
  rect(g, 9, 15, 2, 3, C.cape[0]);
  rect(g, 20, 15, 3, 4, C.cape[2]); rect(g, 20, 19, 2, 2, C.cape[2]);
  rect(g, 12, 14, 8, 3, C.cape[0]); rect(g, 13, 15, 6, 1, C.cape[2]);
  // head from behind: all hair, the braid down the middle of the back
  rect(g, 12, 3, 8, 1, C.hair[1]);
  rect(g, 11, 4, 10, 3, C.hair[1]);
  rect(g, 10, 5, 12, 9, C.hair[1]);
  rect(g, 12, 3, 3, 1, C.hair[0]); rect(g, 11, 4, 3, 2, C.hair[0]);
  rect(g, 20, 6, 2, 8, C.hair[2]);
  rect(g, 15, 5, 1, 8, C.hair[2]); // plaited lines converging on the braid
  braid(g, 15, 14, 6);
  return g;
}

function side(phase) {
  // facing right
  const g = frame();
  const arm = phase % 2 === 1 ? 1 : 0;
  // legs: the stride opens and closes; the far leg is a shade darker
  const stride = [3, 0, -3, 0][phase];
  for (const [x, c] of [[15 - stride, C.pants[2]], [15 + stride, C.pants[1]]]) {
    rect(g, x, 24, 3, 3, c);
    rect(g, x, 26, 4, 3, C.boot[0]);
    rect(g, x, 26, 4, 1, C.cape[1]);
    rect(g, x, 28, 4, 1, C.boot[1]);
  }
  tunic(g, 13, 7, 0, null);
  // the cape hangs down the back and lifts a little with each step
  const flap = [1, 0, 1, 0][phase];
  rect(g, 11, 15, 6, 4, C.cape[1]);
  rect(g, 11 - flap, 19, 4, 2, C.cape[2]);
  rect(g, 11, 15, 2, 4, C.cape[2]);
  rect(g, 11, 14, 4, 2, C.cape[0]); // hood
  // near arm swinging the lantern forward and back with the stride
  const reach = [1, 0, -1, 0][phase];
  sleeve(g, 16, 17 + arm, 2, true);
  hand(g, 16 + reach, 19 + arm);
  lantern(g, 16 + reach * 2, 21 + arm, phase % 2 === 1);
  // head in profile: hair at the back and on top, the braid hanging behind, face to the right
  rect(g, 12, 3, 8, 1, C.hair[1]);
  rect(g, 11, 4, 10, 3, C.hair[1]);
  rect(g, 11, 6, 6, 7, C.hair[1]);
  rect(g, 12, 3, 4, 1, C.hair[0]); rect(g, 11, 4, 4, 2, C.hair[0]);
  rect(g, 11, 10, 3, 3, C.hair[2]);
  braid(g, 11, 13, 5);
  rect(g, 16, 6, 5, 7, C.skin[0]);
  rect(g, 16, 12, 4, 1, C.skin[1]);
  rect(g, 16, 6, 5, 1, C.hair[1]); px(g, 16, 7, C.hair[1]); // hair swept back from the brow
  px(g, 21, 9, C.skin[1]); // nose
  px(g, 19, 9, C.eye); px(g, 19, 10, C.eye);
  px(g, 18, 11, C.blush);
  px(g, 20, 12, C.skin[2]);
  rect(g, 16, 13, 2, 1, C.skin[1]); // neck
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
  [0, 1, 2, 3].map((p) => front(p, 0, p % 2 === 1)),
  [0, 1, 2, 3].map((p) => side(p)),
  [0, 1, 2, 3].map((p) => back(p)),
  [0, 1, 2, 3].map((p) => mirror(side(p))),
  // idle, feet planted: calm breaths (down 1 px), the lantern flickers, and a blink
  [[0, false, false], [0, true, false], [1, false, false], [1, true, true]].map(([b, f, k]) => front(1, b, f, k)),
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
  save('tamsin-walk.png', sheet);
  save('tamsin.png', portrait);
  fs.writeFileSync(path.join(outDir, 'tamsin-walk.json'), `${JSON.stringify({ frameWidth: F, frameHeight: F, columns: COLS, rows: ROWS }, null, 2)}\n`);
  console.log(JSON.stringify({ frame: F, columns: COLS, rows: ROWS, out: outDir }));
  app.exit(0);
});
