/**
 * Draws Marin from scratch as 32x32 pixel art (shown at exactly 2x in game): an ordinary RPG
 * villager setting out on the road. Open face with messy brown hair, an olive tunic (Marin's
 * colour, hue 68) over a cream shirt, a belt with a pouch and a satchel strapped across the
 * chest, brown trousers, leather boots, and a plain wooden walking stick.
 *
 * Sheet: 4 columns x 5 rows of 32x32 frames.
 *   rows 0-3  walk: front, right side, back, left side (left = mirrored right); 4 frames each
 *             (contact, passing, other contact, passing). The stick swings with the stride.
 *   row 4     idle (front): calm breathing, the stick tapping, and a blink.
 * Every frame gets an automatic dark outline and a soft baked shadow under the feet.
 *
 * Output: <outDir>/marin-walk.png + marin-walk.json, and <outDir>/marin.png
 * (the front idle frame at 4x, for menus and battle).
 *
 * Usage: npx electron scripts/draw-marin.cjs public/assets/heroes
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
  skin: ['#f8d3aa', '#e2a97a', '#b8774c'],
  blush: '#f09a80',
  hair: ['#a8642f', '#7a4320', '#4e2912'],
  tunic: ['#bccb5e', '#8f9f3a', '#617024'],
  shirt: ['#f4e9cc', '#d6c49c', '#a8946a'],
  leather: ['#a87444', '#744c28', '#472d16'],
  pants: ['#806048', '#5c4332', '#3e2c20'],
  boot: ['#64462e', '#41291a'],
  wood: ['#cf9a5c', '#9a6836', '#64401e'],
  brass: '#e6b84a',
  eye: '#2a1d16',
};

/** One frame: a 32x32 grid of colours. */
function frame() { return Array.from({ length: F }, () => Array(F).fill(null)); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < F) g[j][i] = c; }
function px(g, x, y, c) { if (g[y] && x >= 0 && x < F) g[y][x] = c; }
function mirror(g) { return g.map((row) => row.slice().reverse()); }

/* ---------- parts ---------- */

/** Wooden walking stick standing at column x, from top to the ground (y 28). */
function stick(g, x, top) {
  rect(g, x, top, 1, 29 - top, C.wood[1]);
  px(g, x, top, C.wood[0]); px(g, x, top + 1, C.wood[0]);
  px(g, x, 28, C.wood[2]);
  px(g, x, top + 6, C.wood[2]); // knot
}

/** Bare hand (3x2) gripping something. */
function hand(g, x, y) {
  rect(g, x, y, 3, 2, C.skin[1]); px(g, x, y, C.skin[0]);
}

/** Sleeve (shirt) of an arm hanging from the shoulder: 3 wide, len tall. */
function sleeve(g, x, y, len, lit) {
  rect(g, x, y, 3, len, C.shirt[1]);
  rect(g, lit ? x : x + 2, y, 1, len, lit ? C.shirt[0] : C.shirt[2]);
}

/** Legs seen from the front/back: lift (0..2) raises a foot off the ground for the step. */
function legsFront(g, leftLift, rightLift) {
  for (const [x, lift] of [[12, leftLift], [17, rightLift]]) {
    const bx = x - (x < 15 ? 1 : 0);
    rect(g, x, 23, 3, 4 - lift, C.pants[1]);
    rect(g, x, 23, 1, 3 - lift, C.pants[0]);
    rect(g, bx, 26 - lift, 4, 3, C.boot[0]);
    rect(g, bx, 26 - lift, 4, 1, C.leather[1]); // boot cuff
    rect(g, bx, 28 - lift, 4, 1, C.boot[1]);
  }
}

/** Tunic, shirt collar, satchel strap, belt with pouch (front). */
function bodyFront(g, dy) {
  rect(g, 11, 15 + dy, 10, 8 - dy, C.tunic[1]);
  rect(g, 11, 15 + dy, 1, 8 - dy, C.tunic[0]);
  rect(g, 20, 15 + dy, 1, 8 - dy, C.tunic[2]);
  // V collar with the shirt underneath
  rect(g, 14, 15 + dy, 4, 1, C.shirt[0]);
  rect(g, 15, 16 + dy, 2, 1, C.shirt[1]);
  // satchel strap from the left shoulder down to the right hip
  for (let i = 0; i < 5; i++) px(g, 12 + i * 2, 15 + dy + i, C.leather[2]), px(g, 13 + i * 2, 15 + dy + i, C.leather[2]);
  // belt, brass buckle, pouch on the right hip
  rect(g, 11, 20, 10, 1, C.leather[1]);
  px(g, 15, 20, C.brass); px(g, 16, 20, C.brass);
  rect(g, 18, 20, 2, 2, C.leather[0]); px(g, 19, 21, C.leather[2]);
  // tunic skirt hem
  rect(g, 11, 22, 10, 1, C.tunic[2]);
}

/** Head from the front: messy hair, open face; blink closes the eyes. */
function headFront(g, dy, blink) {
  const y = 3 + dy;
  // hair mass
  rect(g, 12, y, 8, 1, C.hair[1]);
  rect(g, 11, y + 1, 10, 3, C.hair[1]);
  rect(g, 10, y + 2, 12, 6, C.hair[1]);
  rect(g, 12, y, 3, 1, C.hair[0]); rect(g, 11, y + 1, 3, 1, C.hair[0]);
  rect(g, 20, y + 3, 2, 5, C.hair[2]);
  px(g, 14, y - 1, C.hair[1]); px(g, 17, y - 1, C.hair[1]); // stray tufts
  // face
  rect(g, 12, y + 3, 8, 8, C.skin[0]);
  rect(g, 19, y + 4, 1, 7, C.skin[1]);
  rect(g, 13, y + 10, 6, 1, C.skin[1]);
  // ragged fringe over the forehead
  rect(g, 12, y + 3, 8, 1, C.hair[1]);
  px(g, 12, y + 4, C.hair[1]); px(g, 14, y + 4, C.hair[1]); px(g, 15, y + 4, C.hair[1]); px(g, 18, y + 4, C.hair[1]); px(g, 19, y + 4, C.hair[1]);
  // ears
  px(g, 11, y + 6, C.skin[1]); px(g, 20, y + 6, C.skin[2]);
  // eyes, cheeks, mouth
  if (blink) { rect(g, 13, y + 7, 2, 1, C.skin[2]); rect(g, 17, y + 7, 2, 1, C.skin[2]); }
  else { px(g, 14, y + 6, C.eye); px(g, 14, y + 7, C.eye); px(g, 17, y + 6, C.eye); px(g, 17, y + 7, C.eye); }
  px(g, 13, y + 8, C.blush); px(g, 18, y + 8, C.blush);
  rect(g, 15, y + 9, 2, 1, C.skin[2]);
  // neck
  rect(g, 14, y + 11, 4, 1, C.skin[1]);
}

/* ---------- views ---------- */

function front(phase, breathe = 0, tap = 0, blink = false) {
  const g = frame();
  // contact frames lift one foot; the arms dip a pixel on the passing frames
  const lifts = [[2, 0], [0, 0], [0, 2], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  legsFront(g, lifts[0], lifts[1]);
  bodyFront(g, breathe);
  // stick in the screen-left hand, the other hand free
  sleeve(g, 8, 15 + breathe, 4 + arm, true);
  stick(g, 8, 10 + breathe + arm - tap);
  hand(g, 7, 19 + breathe + arm);
  sleeve(g, 21, 15 + breathe, 4 + arm, false);
  hand(g, 21, 19 + breathe + arm);
  headFront(g, breathe, blink);
  return g;
}

function back(phase) {
  const g = frame();
  const lifts = [[0, 2], [0, 0], [2, 0], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  legsFront(g, lifts[0], lifts[1]);
  // tunic from behind, belt, the satchel resting on the left hip (screen right)
  rect(g, 11, 15, 10, 8, C.tunic[1]);
  rect(g, 11, 15, 1, 8, C.tunic[0]);
  rect(g, 20, 15, 1, 8, C.tunic[2]);
  for (let i = 0; i < 5; i++) px(g, 19 - i * 2, 15 + i, C.leather[2]), px(g, 18 - i * 2, 15 + i, C.leather[2]);
  rect(g, 11, 20, 10, 1, C.leather[1]);
  rect(g, 11, 22, 10, 1, C.tunic[2]);
  rect(g, 17, 19, 4, 3, C.leather[1]); rect(g, 17, 19, 4, 1, C.leather[0]); px(g, 19, 20, C.brass);
  // free hand on screen left, the stick hand on screen right (seen from behind)
  sleeve(g, 8, 15, 4 + arm, true);
  hand(g, 8, 19 + arm);
  sleeve(g, 21, 15, 4 + arm, false);
  stick(g, 23, 10 + arm);
  hand(g, 22, 19 + arm);
  // head from behind: all hair, ears peeking out
  rect(g, 12, 3, 8, 1, C.hair[1]);
  rect(g, 11, 4, 10, 3, C.hair[1]);
  rect(g, 10, 5, 12, 8, C.hair[1]);
  rect(g, 12, 3, 3, 1, C.hair[0]); rect(g, 11, 4, 3, 2, C.hair[0]);
  rect(g, 20, 6, 2, 7, C.hair[2]);
  for (const x of [11, 14, 17, 20]) px(g, x, 13, C.hair[2]); // ragged nape
  px(g, 14, 2, C.hair[1]); px(g, 17, 2, C.hair[1]);
  px(g, 10, 9, C.skin[1]); px(g, 21, 9, C.skin[2]);
  rect(g, 14, 14, 4, 1, C.skin[1]);
  return g;
}

function side(phase) {
  // facing right
  const g = frame();
  const arm = phase % 2 === 1 ? 1 : 0;
  // legs: the stride opens and closes; the far leg is a shade darker
  const stride = [3, 0, -3, 0][phase];
  for (const [x, c] of [[15 - stride, C.pants[2]], [15 + stride, C.pants[1]]]) {
    rect(g, x, 23, 3, 4, c);
    rect(g, x, 26, 4, 3, C.boot[0]);
    rect(g, x, 26, 4, 1, C.leather[1]);
    rect(g, x, 28, 4, 1, C.boot[1]);
  }
  // satchel on the back hip, tunic, belt
  rect(g, 11, 18, 3, 4, C.leather[1]); rect(g, 11, 18, 3, 1, C.leather[0]); px(g, 12, 19, C.brass);
  rect(g, 13, 15, 7, 8, C.tunic[1]);
  rect(g, 13, 15, 1, 8, C.tunic[0]);
  rect(g, 18, 15, 2, 8, C.tunic[2]);
  for (let i = 0; i < 5; i++) px(g, 14 + i, 15 + i, C.leather[2]); // strap
  rect(g, 13, 20, 7, 1, C.leather[1]); px(g, 19, 20, C.brass);
  rect(g, 13, 22, 7, 1, C.tunic[2]);
  // near arm swinging the stick forward and back with the stride
  const reach = [1, 0, -1, 0][phase];
  sleeve(g, 16, 15 + arm, 4, true);
  stick(g, 20 + reach, 11 + arm);
  hand(g, 18 + reach, 19 + arm);
  // head in profile: hair at the back and on top, face and nose to the right
  rect(g, 12, 3, 8, 1, C.hair[1]);
  rect(g, 11, 4, 10, 3, C.hair[1]);
  rect(g, 11, 6, 6, 7, C.hair[1]);
  rect(g, 12, 3, 4, 1, C.hair[0]); rect(g, 11, 4, 4, 2, C.hair[0]);
  rect(g, 11, 10, 3, 3, C.hair[2]);
  px(g, 10, 7, C.hair[1]); px(g, 10, 9, C.hair[2]); // tufts at the back
  rect(g, 16, 6, 5, 7, C.skin[0]);
  rect(g, 16, 12, 4, 1, C.skin[1]);
  rect(g, 16, 6, 5, 1, C.hair[1]); px(g, 19, 7, C.hair[1]); px(g, 17, 7, C.hair[1]); // fringe
  px(g, 21, 9, C.skin[1]); // nose
  px(g, 15, 9, C.skin[1]); px(g, 15, 10, C.skin[2]); // ear
  px(g, 19, 9, C.eye); px(g, 19, 10, C.eye);
  px(g, 18, 11, C.blush);
  px(g, 20, 12, C.skin[2]);
  rect(g, 15, 13, 3, 2, C.skin[1]); // neck
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
  // idle, feet planted: slow breaths (down 1 px), the stick tapping the ground, and a blink
  [[0, 0, false], [1, 0, false], [0, 1, false], [1, 0, true]].map(([b, t, k]) => front(1, b, t, k)),
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
  save('marin-walk.png', sheet);
  save('marin.png', portrait);
  fs.writeFileSync(path.join(outDir, 'marin-walk.json'), `${JSON.stringify({ frameWidth: F, frameHeight: F, columns: COLS, rows: ROWS }, null, 2)}\n`);
  console.log(JSON.stringify({ frame: F, columns: COLS, rows: ROWS, out: outDir }));
  app.exit(0);
});
