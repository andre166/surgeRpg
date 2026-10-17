/**
 * Draws the mage from scratch as 32x32 pixel art (shown at exactly 2x in game), in the
 * look of the original: tall purple hat with a wide brim and a bent tip, a face in the
 * shadow of the brim with a grey beard, a red collar, a long purple robe with a belt and a
 * gold buckle, wide sleeves, and a wooden staff topped with a glowing cyan orb.
 *
 * Sheet: 4 columns x 5 rows of 32x32 frames.
 *   rows 0-3  walk: front, right side, back, left side (left = mirrored right); 4 frames each
 *             (contact, passing, other contact, passing). The feet peek out under the robe,
 *             the hem swings and the hat tip bobs.
 *   row 4     idle (front): breathing, the hat tip swaying and the orb pulsing.
 * Every frame gets an automatic dark outline and a soft baked shadow under the feet.
 *
 * Output: <outDir>/mage-walk.png + mage-walk.json, and <outDir>/mage.png
 * (the front idle frame at 4x, for menus and battle).
 *
 * Usage: npx electron scripts/draw-mage.cjs public/assets/heroes
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
  outline: '#17121f',
  purple: ['#b47fe2', '#8150bd', '#58308d', '#38195e'],
  red: ['#e85d4c', '#ad322b', '#6e1a18'],
  skin: ['#f3c595', '#cf9264', '#93603e'],
  beard: ['#f0f0f4', '#b4b4c2'],
  wood: ['#b07a40', '#7c522a', '#4e321a'],
  gold: ['#ffe08a', '#e0a92e', '#9a6a14'],
  orb: ['#f0ffff', '#78ecff', '#2aa8da', '#16699c'],
  boot: ['#5a4030', '#3a281c'],
  eye: '#1b1024',
};

/** One frame: a 32x32 grid of colours. */
function frame() { return Array.from({ length: F }, () => Array(F).fill(null)); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < F) g[j][i] = c; }
function px(g, x, y, c) { if (g[y] && x >= 0 && x < F) g[y][x] = c; }
function mirror(g) { return g.map((row) => row.slice().reverse()); }

/* ---------- parts ---------- */

/**
 * Pointed hat: brim on row 9 (+dy) from bx to bx+bw-1, the crown centred on cx; the tip bends
 * towards bend (-1 / 1) and sways by sway px.
 */
function hat(g, cx, bx, bw, dy, bend, sway) {
  // crown rows, bottom up: [left offset from cx, width]; the upper rows lean towards the bend
  const rows = [[-5, 10], [-4, 8], [-4, 7], [-3, 6], [-2, 4], [-1, 3], [0, 2]];
  rows.forEach(([dx, w], i) => {
    const y = 8 - i + dy;
    const lean = i < 3 ? 0 : bend * (i - 2) + (i >= 5 ? sway : 0);
    const x = cx + dx + lean;
    rect(g, x, y, w, 1, C.purple[1]);
    px(g, x + 1, y, C.purple[0]);
    if (w > 3) rect(g, x + w - 2, y, 2, 1, C.purple[2]);
  });
  const tip = cx + bend * 5 + sway;
  rect(g, tip + (bend > 0 ? 0 : -1), 1 + dy, 2, 1, C.purple[2]); // the tip folding over
  rect(g, cx - 5, 7 + dy, 10, 1, C.purple[3]); // band
  px(g, cx - 1, 7 + dy, C.gold[1]); px(g, cx, 7 + dy, C.gold[0]);
  // brim: lit on top, a dark underside that shades the face
  rect(g, bx + 1, 8 + dy, bw - 2, 1, C.purple[1]);
  rect(g, bx, 9 + dy, bw, 1, C.purple[2]);
  rect(g, bx + 1, 8 + dy, 3, 1, C.purple[0]);
  rect(g, bx + 2, 10 + dy, bw - 4, 1, C.purple[3]);
}

/** Staff: shaft at x (2 px wide) from yTop to the ground, the orb in a wooden claw above. */
function staff(g, x, yTop, glow) {
  rect(g, x, yTop, 1, 29 - yTop, C.wood[0]);
  rect(g, x + 1, yTop, 1, 29 - yTop, C.wood[2]);
  rect(g, x - 1, yTop - 1, 4, 1, C.wood[1]); // claw
  px(g, x - 2, yTop - 3, C.wood[1]); px(g, x - 2, yTop - 2, C.wood[1]);
  px(g, x + 3, yTop - 3, C.wood[2]); px(g, x + 3, yTop - 2, C.wood[2]);
  const oy = yTop - 5;
  rect(g, x, oy, 2, 1, C.orb[1]);
  rect(g, x - 1, oy + 1, 4, 2, C.orb[1]);
  rect(g, x, oy + 3, 2, 1, C.orb[2]);
  px(g, x + 2, oy + 2, C.orb[3]); px(g, x + 1, oy + 3, C.orb[3]);
  px(g, x, oy + 1, C.orb[0]);
  if (glow) { px(g, x - 1, oy + 1, C.orb[0]); px(g, x + 1, oy + 1, C.orb[0]); px(g, x, oy + 2, C.orb[0]); }
}

/** Long robe from row 14 (+dy) down to the hem on row 26, flaring out; the hem swings by sway px. */
function robe(g, x0, w, dy, sway, front) {
  for (let y = 14 + dy; y <= 26; y++) {
    const flare = Math.floor((y - 14) / 5);
    const s = y >= 23 ? sway : 0;
    const x = x0 - flare + s;
    const ww = w + flare * 2;
    rect(g, x, y, ww, 1, y === 26 ? C.purple[3] : C.purple[1]);
    if (y < 26) { px(g, x, y, C.purple[0]); rect(g, x + ww - 2, y, 2, 1, C.purple[2]); }
  }
  if (front) {
    // the robe opens below the belt
    for (let y = 21; y <= 25; y++) rect(g, x0 + w / 2 - 1 + (y >= 23 ? sway : 0), y, 2, 1, C.purple[3]);
  } else {
    rect(g, x0 + w / 2 - 1, 15 + dy, 1, 11, C.purple[2]); // seam down the back
  }
}

function belt(g, x0, w, dy, buckle) {
  rect(g, x0, 19 + dy, w, 1, C.wood[1]);
  if (buckle != null) { rect(g, buckle, 19 + dy, 2, 1, C.gold[1]); px(g, buckle, 19 + dy, C.gold[0]); }
}

/** Feet peeking out under the hem: lift (0..1) tucks one up under the robe for the step. */
function feetFront(g, leftLift, rightLift) {
  for (const [x, lift] of [[11, leftLift], [17, rightLift]]) {
    rect(g, x, 27 - lift, 4, 2, C.boot[0]);
    rect(g, x, 28 - lift, 4, 1, C.boot[1]);
  }
}

/** Wide sleeve hanging from the shoulder at x (4 px wide), cuff on the bottom row. */
function sleeve(g, x, y, len) {
  rect(g, x, y, 4, len, C.purple[1]);
  rect(g, x - 1, y + len - 2, 5, 2, C.purple[1]);
  rect(g, x - 1, y + len - 1, 5, 1, C.purple[3]);
  px(g, x, y, C.purple[0]);
}

/* ---------- views ---------- */

function front(phase, breathe = 0, sway = null, glow = false) {
  const g = frame();
  // contact frames tuck one foot up under the robe; the arms dip a pixel on the passing frames
  const lifts = [[1, 0], [0, 0], [0, 1], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  feetFront(g, lifts[0], lifts[1]);
  robe(g, 10, 12, breathe, [1, 0, -1, 0][phase]);
  belt(g, 10, 12, breathe, 15);
  // red collar and the beard over it
  rect(g, 10, 13 + breathe, 12, 2, C.red[1]); rect(g, 10, 13 + breathe, 3, 1, C.red[0]); rect(g, 20, 13 + breathe, 2, 2, C.red[2]);
  // empty hand on screen left, the staff in the hand on screen right
  sleeve(g, 7, 15 + breathe, 6 + arm);
  rect(g, 7, 21 + breathe + arm, 2, 2, C.skin[1]); px(g, 7, 21 + breathe + arm, C.skin[0]);
  staff(g, 25, 8 + breathe + arm, glow);
  sleeve(g, 21, 15 + breathe, 5 + arm);
  rect(g, 24, 19 + breathe + arm, 3, 2, C.skin[1]); px(g, 24, 19 + breathe + arm, C.skin[0]);
  // face in the shade of the brim, a long beard
  rect(g, 12, 10 + breathe, 8, 4, C.skin[1]);
  rect(g, 12, 10 + breathe, 8, 1, C.skin[2]);
  px(g, 14, 11 + breathe, C.eye); px(g, 17, 11 + breathe, C.eye);
  rect(g, 15, 12 + breathe, 2, 1, C.skin[0]); // nose
  rect(g, 12, 13 + breathe, 8, 2, C.beard[0]);
  rect(g, 13, 15 + breathe, 6, 1, C.beard[0]);
  rect(g, 14, 16 + breathe, 4, 1, C.beard[1]);
  rect(g, 15, 17 + breathe, 2, 1, C.beard[1]);
  rect(g, 18, 13 + breathe, 2, 2, C.beard[1]);
  hat(g, 16, 7, 18, breathe, 1, sway ?? phase % 2); // the tip lags a step behind
  return g;
}

function back(phase) {
  const g = frame();
  const lifts = [[0, 1], [0, 0], [1, 0], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  feetFront(g, lifts[0], lifts[1]);
  robe(g, 10, 12, 0, [-1, 0, 1, 0][phase], false);
  belt(g, 10, 12, 0, null);
  rect(g, 10, 13, 12, 2, C.red[1]); rect(g, 10, 13, 3, 1, C.red[0]);
  // staff on screen left (seen from behind), empty hand on screen right
  staff(g, 5, 8 + arm, false);
  sleeve(g, 7, 15, 5 + arm);
  rect(g, 5, 19 + arm, 3, 2, C.skin[1]);
  sleeve(g, 21, 15, 6 + arm);
  rect(g, 23, 21 + arm, 2, 2, C.skin[1]);
  // long grey hair under the hat
  rect(g, 12, 10, 8, 4, C.beard[1]);
  rect(g, 13, 10, 2, 3, C.beard[0]);
  rect(g, 13, 14, 6, 1, C.beard[1]);
  hat(g, 16, 7, 18, 0, -1, 0);
  return g;
}

function side(phase) {
  // facing right
  const g = frame();
  const arm = phase % 2 === 1 ? 1 : 0;
  // feet under the hem: the stride opens and closes; the far foot is a shade darker
  const stride = [3, 0, -3, 0][phase];
  rect(g, 13 - stride, 27, 4, 2, C.boot[1]);
  rect(g, 14 + stride, 27, 4, 2, C.boot[0]); rect(g, 14 + stride, 28, 4, 1, C.boot[1]);
  robe(g, 11, 9, 0, [-1, 0, -1, 0][phase], false);
  belt(g, 11, 9, 0, 18);
  rect(g, 12, 13, 8, 2, C.red[1]); rect(g, 12, 13, 2, 1, C.red[0]);
  // hair at the back of the head, the face in profile, the beard pointing forward
  rect(g, 12, 10, 3, 4, C.beard[1]);
  rect(g, 15, 10, 5, 4, C.skin[1]);
  rect(g, 15, 10, 5, 1, C.skin[2]);
  px(g, 18, 11, C.eye);
  px(g, 20, 12, C.skin[0]); px(g, 20, 11, C.skin[1]); // nose
  rect(g, 16, 13, 4, 2, C.beard[0]);
  rect(g, 17, 15, 3, 1, C.beard[0]);
  rect(g, 18, 16, 2, 1, C.beard[1]);
  // near arm forward, holding the staff upright in front
  const sx = 22 + [1, 0, -1, 0][phase];
  staff(g, sx, 8 + arm, false);
  sleeve(g, 15, 15, 5 + arm);
  rect(g, sx - 1, 18 + arm, 3, 2, C.skin[1]); px(g, sx - 1, 18 + arm, C.skin[0]);
  hat(g, 15, 8, 16, 0, -1, [0, 1, 0, 1][phase]);
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
  for (let x = 8; x < 24; x++) for (const y of [30, 31]) {
    const edge = x < 10 || x > 21 || y === 31;
    if (!out[y][x]) out[y][x] = edge ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.28)';
  }
  return out;
}

const rows = [
  [0, 1, 2, 3].map((p) => front(p)),
  [0, 1, 2, 3].map((p) => side(p)),
  [0, 1, 2, 3].map((p) => back(p)),
  [0, 1, 2, 3].map((p) => mirror(side(p))),
  // idle, feet planted: the body breathes (down 1 px), the hat tip sways and the orb pulses
  [[0, 0, false], [0, 1, true], [1, 0, true], [0, -1, false]].map(([b, s, o]) => front(1, b, s, o)),
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
  save('mage-walk.png', sheet);
  save('mage.png', portrait);
  fs.writeFileSync(path.join(outDir, 'mage-walk.json'), `${JSON.stringify({ frameWidth: F, frameHeight: F, columns: COLS, rows: ROWS }, null, 2)}\n`);
  console.log(JSON.stringify({ frame: F, columns: COLS, rows: ROWS, out: outDir }));
  app.exit(0);
});
