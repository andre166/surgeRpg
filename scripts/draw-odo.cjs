/**
 * Draws Odo from scratch as 32x32 pixel art (shown at exactly 2x in game): a young bookish girl.
 * Dark hair in a bun with a pencil stuck through it, blunt bangs and two braids tied with red
 * ribbons, big round glasses, a green cardigan (Odo's colour, hue 113) over a white blouse with
 * a red bow, a navy plaid pleated skirt, white knee socks, brown shoes, and a thick red book.
 *
 * Sheet: 4 columns x 5 rows of 32x32 frames.
 *   rows 0-3  walk: front, right side, back, left side (left = mirrored right); 4 frames each
 *             (contact, passing, other contact, passing). The book swings with the stride.
 *   row 4     idle (front): calm breathing, a little book hug, and a blink behind the glasses.
 * Every frame gets an automatic dark outline and a soft baked shadow under the feet.
 *
 * Output: <outDir>/odo-walk.png + odo-walk.json, and <outDir>/odo.png
 * (the front idle frame at 4x, for menus and battle).
 *
 * Usage: npx electron scripts/draw-odo.cjs public/assets/heroes
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
  outline: '#1a1418',
  skin: ['#fbdcc0', '#eab08e', '#c07e5e'],
  blush: '#f4908c',
  hair: ['#6e4a3c', '#46291f', '#2a1711'],
  cardigan: ['#9bd27a', '#62a448', '#3e6e2e'],
  blouse: ['#fbf8ef', '#d8d2c2'],
  skirt: ['#4f5f94', '#35416c', '#232c4c'],
  sock: ['#f6f6f2', '#cfcfc8'],
  shoe: ['#6a3a24', '#3e2014'],
  red: ['#f06a6a', '#c83c46'],
  book: ['#cf4f46', '#92302c'],
  pages: '#f6eccc',
  gold: '#f0c24a',
  frame: '#43356e',
  lens: '#d6ecff',
  glint: '#ffffff',
  eye: '#2a1d22',
  pencil: ['#f4c83e', '#f29ab0', '#e8c49a'],
};

/** One frame: a 32x32 grid of colours. */
function frame() { return Array.from({ length: F }, () => Array(F).fill(null)); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < F) g[j][i] = c; }
function px(g, x, y, c) { if (g[y] && x >= 0 && x < F) g[y][x] = c; }
function mirror(g) { return g.map((row) => row.slice().reverse()); }

/* ---------- parts ---------- */

/** Bare hand (3x2). */
function hand(g, x, y) {
  rect(g, x, y, 3, 2, C.skin[1]); px(g, x, y, C.skin[0]);
}

/** Cardigan sleeve hanging from the shoulder: 3 wide, len tall, with a cuff. */
function sleeve(g, x, y, len, lit) {
  rect(g, x, y, 3, len, C.cardigan[1]);
  rect(g, lit ? x : x + 2, y, 1, len, lit ? C.cardigan[0] : C.cardigan[2]);
  rect(g, x, y + len - 1, 3, 1, C.cardigan[2]);
}

/** Thick book seen face-on: cover, spine on the left, page edges on the right, gold title. */
function bookFront(g, x, y) {
  rect(g, x, y, 4, 5, C.book[0]);
  rect(g, x, y, 1, 5, C.book[1]);
  rect(g, x + 3, y + 1, 1, 3, C.pages);
  rect(g, x + 1, y + 1, 2, 1, C.gold);
}

/** Book seen edge-on (side view): spine and a block of pages. */
function bookSide(g, x, y) {
  rect(g, x, y, 3, 5, C.pages);
  rect(g, x, y, 1, 5, C.book[1]);
  rect(g, x, y, 3, 1, C.book[0]); rect(g, x, y + 4, 3, 1, C.book[0]);
}

/** Legs under the skirt (front/back): knee, knee sock, shoe; lift (0..2) raises a foot. */
function legsFront(g, leftLift, rightLift) {
  for (const [x, lift] of [[13, leftLift], [17, rightLift]]) {
    const sx = x - (x < 15 ? 1 : 0);
    rect(g, x, 24, 2, 1, C.skin[0]);
    if (lift < 2) rect(g, x, 25, 2, 2 - lift, C.sock[0]);
    px(g, x + 1, 25, C.sock[1]);
    rect(g, sx, 27 - lift, 3, 1, C.shoe[0]);
    rect(g, sx, 28 - lift, 3, 1, C.shoe[1]);
  }
}

/** Pleated plaid skirt (front and back look alike). */
function skirt(g) {
  rect(g, 11, 21, 10, 1, C.skirt[1]);
  rect(g, 10, 22, 12, 2, C.skirt[1]);
  rect(g, 10, 22, 12, 1, C.skirt[0]); // plaid band
  for (const x of [12, 15, 18, 21]) rect(g, x, 21, 1, 3, C.skirt[2]); // pleats
  px(g, 10, 23, C.skirt[2]);
}

/** Open cardigan over a white blouse with a red bow (front). */
function bodyFront(g, dy) {
  rect(g, 11, 15 + dy, 10, 6 - dy, C.cardigan[1]);
  rect(g, 11, 15 + dy, 1, 6 - dy, C.cardigan[0]);
  rect(g, 20, 15 + dy, 1, 6 - dy, C.cardigan[2]);
  rect(g, 15, 15 + dy, 2, 6 - dy, C.blouse[0]);
  px(g, 14, 15 + dy, C.blouse[0]); px(g, 17, 15 + dy, C.blouse[1]); // collar points
  px(g, 15, 16 + dy, C.red[0]); px(g, 16, 16 + dy, C.red[1]); // bow
  px(g, 14, 18, C.gold); px(g, 14, 20, C.gold); // buttons
}

/** Pencil stuck through the bun, poking out up-right, its sharpened tip out the other side. */
function pencil(g, x, y) {
  px(g, x, y, C.pencil[0]); px(g, x + 1, y - 1, C.pencil[0]); px(g, x + 2, y - 2, C.pencil[1]);
  px(g, x - 5, y + 1, C.pencil[2]);
}

/** Braid hanging at column x from row y, len rows, tied with a ribbon. */
function braid(g, x, y, len) {
  rect(g, x, y, 2, len, C.hair[1]);
  for (let i = 0; i < len; i++) px(g, x + (i % 2), y + i, C.hair[2]);
  rect(g, x, y + len, 2, 1, C.red[1]); px(g, x, y + len, C.red[0]);
  px(g, x, y + len + 1, C.hair[1]);
}

/** Big round glasses: a 4x3 round rim per eye (touching at the bridge), clear lenses, temples. */
function glassesFront(g, y, blink) {
  for (const [x0, eye] of [[12, 14], [16, 17]]) {
    // round rim: no corners, so the skin shows around it
    rect(g, x0 + 1, y - 1, 2, 1, C.frame); rect(g, x0 + 1, y + 1, 2, 1, C.frame);
    px(g, x0, y, C.frame); px(g, x0 + 3, y, C.frame);
    rect(g, x0 + 1, y, 2, 1, C.lens);
    px(g, eye, y, blink ? C.skin[2] : C.eye);
  }
  px(g, 13, y, C.glint); px(g, 18, y, C.glint);
  px(g, 11, y, C.frame); px(g, 20, y, C.frame);
}

/** Head from the front: bun, blunt bangs, round glasses, braids. */
function headFront(g, dy, blink) {
  const y = 3 + dy;
  // bun with the pencil
  rect(g, 14, y - 2, 4, 2, C.hair[1]); px(g, 14, y - 2, C.hair[0]); px(g, 17, y - 1, C.hair[2]);
  pencil(g, 18, y - 2);
  // hair mass
  rect(g, 12, y, 8, 1, C.hair[1]);
  rect(g, 11, y + 1, 10, 2, C.hair[1]);
  rect(g, 10, y + 2, 12, 5, C.hair[1]);
  rect(g, 12, y, 3, 1, C.hair[0]); rect(g, 11, y + 1, 3, 1, C.hair[0]);
  // face
  rect(g, 12, y + 3, 8, 8, C.skin[0]);
  rect(g, 19, y + 4, 1, 7, C.skin[1]);
  rect(g, 13, y + 10, 6, 1, C.skin[1]);
  // blunt bangs
  rect(g, 12, y + 3, 8, 1, C.hair[1]);
  for (const x of [12, 13, 15, 16, 18, 19]) px(g, x, y + 4, C.hair[1]);
  glassesFront(g, y + 6, blink);
  px(g, 13, y + 8, C.blush); px(g, 18, y + 8, C.blush);
  px(g, 15, y + 9, C.skin[2]); px(g, 16, y + 9, C.skin[2]);
  rect(g, 14, y + 11, 4, 1, C.skin[1]); // neck
  braid(g, 10, y + 7, 6);
  braid(g, 20, y + 7, 6);
}

/* ---------- views ---------- */

function front(phase, breathe = 0, hug = 0, blink = false) {
  const g = frame();
  // contact frames lift one foot; the arms dip a pixel on the passing frames
  const lifts = [[2, 0], [0, 0], [0, 2], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  legsFront(g, lifts[0], lifts[1]);
  skirt(g);
  bodyFront(g, breathe);
  // free arm on screen left, the book in the screen-right hand
  sleeve(g, 8, 15 + breathe, 4 + arm, true);
  hand(g, 8, 19 + breathe + arm);
  sleeve(g, 21, 15 + breathe, 3 + arm, false);
  bookFront(g, 21 - hug, 18 + breathe + arm - hug);
  hand(g, 20 - hug, 19 + breathe + arm - hug);
  headFront(g, breathe, blink);
  return g;
}

function back(phase) {
  const g = frame();
  const lifts = [[0, 2], [0, 0], [2, 0], [0, 0]][phase];
  const arm = phase % 2 === 1 ? 1 : 0;
  legsFront(g, lifts[0], lifts[1]);
  skirt(g);
  // cardigan from behind, ribbed hem
  rect(g, 11, 15, 10, 6, C.cardigan[1]);
  rect(g, 11, 15, 1, 6, C.cardigan[0]);
  rect(g, 20, 15, 1, 6, C.cardigan[2]);
  rect(g, 11, 20, 10, 1, C.cardigan[2]);
  // seen from behind the book is on screen left, the free hand on screen right
  sleeve(g, 8, 15, 3 + arm, true);
  bookFront(g, 7, 18 + arm);
  hand(g, 9, 19 + arm);
  sleeve(g, 21, 15, 4 + arm, false);
  hand(g, 21, 19 + arm);
  // head from behind: bun, pencil, full hair with a parting, braids over the shoulders
  rect(g, 14, 1, 4, 2, C.hair[1]); px(g, 14, 1, C.hair[0]);
  pencil(g, 18, 1);
  rect(g, 12, 3, 8, 1, C.hair[1]);
  rect(g, 11, 4, 10, 3, C.hair[1]);
  rect(g, 10, 5, 12, 8, C.hair[1]);
  rect(g, 12, 3, 3, 1, C.hair[0]); rect(g, 11, 4, 3, 2, C.hair[0]);
  rect(g, 20, 6, 2, 7, C.hair[2]);
  px(g, 15, 5, C.hair[2]); px(g, 15, 6, C.hair[2]); px(g, 16, 7, C.hair[2]);
  px(g, 10, 9, C.frame); px(g, 21, 9, C.frame); // glasses temples
  rect(g, 14, 13, 4, 1, C.skin[1]);
  braid(g, 11, 12, 4);
  braid(g, 19, 12, 4);
  return g;
}

function side(phase) {
  // facing right
  const g = frame();
  const arm = phase % 2 === 1 ? 1 : 0;
  // legs: the stride opens and closes; the far leg is a shade darker
  const stride = [3, 0, -3, 0][phase];
  for (const [x, far] of [[15 - stride, true], [15 + stride, false]]) {
    rect(g, x, 24, 2, 1, far ? C.skin[1] : C.skin[0]);
    rect(g, x, 25, 2, 2, far ? C.sock[1] : C.sock[0]);
    rect(g, x, 27, 3, 1, C.shoe[0]);
    rect(g, x, 28, 3, 1, C.shoe[1]);
  }
  // skirt and cardigan, the blouse and bow peeking out in front
  rect(g, 12, 21, 8, 1, C.skirt[1]);
  rect(g, 11, 22, 10, 2, C.skirt[1]);
  rect(g, 11, 22, 10, 1, C.skirt[0]);
  for (const x of [13, 16, 19]) rect(g, x, 21, 1, 3, C.skirt[2]);
  rect(g, 13, 15, 7, 6, C.cardigan[1]);
  rect(g, 13, 15, 1, 6, C.cardigan[0]);
  rect(g, 18, 15, 2, 6, C.cardigan[2]);
  rect(g, 19, 15, 1, 3, C.blouse[0]); px(g, 20, 16, C.red[1]);
  // near arm carrying the book, swinging a little with the stride
  const reach = [1, 0, -1, 0][phase];
  sleeve(g, 15, 15 + arm, 4, true);
  bookSide(g, 16 + reach, 18 + arm);
  hand(g, 15 + reach, 19 + arm);
  // head in profile: pencil through the bun, hair, bangs, a round lens, braid behind
  rect(g, 11, 2, 6, 1, C.pencil[0]); px(g, 11, 2, C.pencil[2]); px(g, 16, 2, C.pencil[1]);
  rect(g, 12, 1, 4, 2, C.hair[1]); px(g, 12, 1, C.hair[0]);
  rect(g, 12, 3, 8, 1, C.hair[1]);
  rect(g, 11, 4, 10, 3, C.hair[1]);
  rect(g, 11, 6, 6, 7, C.hair[1]);
  rect(g, 12, 3, 4, 1, C.hair[0]); rect(g, 11, 4, 4, 2, C.hair[0]);
  rect(g, 11, 10, 3, 3, C.hair[2]);
  rect(g, 16, 6, 5, 7, C.skin[0]);
  rect(g, 16, 12, 4, 1, C.skin[1]);
  rect(g, 16, 6, 5, 1, C.hair[1]); px(g, 16, 7, C.hair[1]); px(g, 18, 7, C.hair[1]); px(g, 20, 7, C.hair[1]);
  px(g, 19, 8, C.frame); px(g, 19, 10, C.frame); px(g, 18, 9, C.frame); px(g, 20, 9, C.frame); px(g, 19, 9, C.eye);
  px(g, 17, 9, C.frame); px(g, 16, 9, C.frame); // temple to the ear
  px(g, 15, 10, C.skin[1]); // ear
  px(g, 21, 10, C.skin[1]); // nose
  px(g, 19, 11, C.blush);
  px(g, 20, 12, C.skin[2]);
  rect(g, 15, 13, 3, 2, C.skin[1]); // neck
  braid(g, 11, 13, 4);
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
  // idle, feet planted: slow breaths, hugging the book up a pixel, and a blink behind the glasses
  [[0, 0, false], [1, 0, false], [0, 1, false], [1, 0, true]].map(([b, h, k]) => front(1, b, h, k)),
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
  save('odo-walk.png', sheet);
  save('odo.png', portrait);
  fs.writeFileSync(path.join(outDir, 'odo-walk.json'), `${JSON.stringify({ frameWidth: F, frameHeight: F, columns: COLS, rows: ROWS }, null, 2)}\n`);
  console.log(JSON.stringify({ frame: F, columns: COLS, rows: ROWS, out: outDir }));
  app.exit(0);
});
