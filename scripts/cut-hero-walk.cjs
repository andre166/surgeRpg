/**
 * Builds a walking atlas for each hero from its sprite sheet (art/heroes/<name>.png):
 * the first 4 sprites of the first 4 sprite rows (sheet order: front, side, back, other side),
 * each cut out with a transparent background and placed bottom-centred in equal cells.
 * Output: <outDir>/<name>-walk.png (4 columns x 4 rows) and <name>-walk.json ({ frameWidth, frameHeight }).
 *
 * Usage: npx electron scripts/cut-hero-walk.cjs art/heroes public/assets/heroes <name>
 * (no longer used for the shipped heroes, which are drawn as pixel art: scripts/draw-*.cjs;
 * running it would overwrite their art)
 */
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const [srcDir, outDir, ...names] = process.argv.slice(2);
const FG = 14; // colour distance that counts as sprite (background noise is under 5)
const BGTOL = 12; // background flood-fill tolerance
const COLS = 4;
const ROWS = 4;
// Weapon steadying: in some walk rows the weapon jumps between two poses on every frame, which
// reads as a flicker at walking speed. For those rows the weapon side of the cell (x < splitX)
// of each target frame is replaced by that of its source frame, aligned vertically, while the
// legs and body keep their own frames. Rows: 0 front, 1 side, 2 back, 3 other side.
const STEADY = {
  // warrior, front: the sword is up on frames 0/2 and swung down on 1/3
  warrior: [{ row: 0, splitX: 42, pairs: [[0, 1], [2, 3]] }],
};

/** Copies the x < splitX strip of frame `from` over frame `to` (same row), aligned in y. */
function steadyWeapon(atlas, AW, frameW, frameH, { row, splitX, pairs }) {
  const at = (c, x, y) => (((row * frameH + y) * AW) + c * frameW + x) * 4;
  for (const [from, to] of pairs) {
    // vertical offset that best lines the two bodies up just right of the cut
    let best = 0; let bestErr = Infinity;
    for (let dy = -4; dy <= 4; dy += 1) {
      let err = 0; let n = 0;
      for (let y = 0; y < frameH; y += 1) {
        const sy = y - dy;
        if (sy < 0 || sy >= frameH) continue;
        for (let x = splitX; x < splitX + 12; x += 1) {
          const a = at(from, x, sy); const b = at(to, x, y);
          if (atlas[a + 3] < 128 && atlas[b + 3] < 128) continue;
          err += Math.abs(atlas[a] - atlas[b]) + Math.abs(atlas[a + 1] - atlas[b + 1]) + Math.abs(atlas[a + 2] - atlas[b + 2]) + Math.abs(atlas[a + 3] - atlas[b + 3]);
          n += 1;
        }
      }
      if (n && err / n < bestErr) { bestErr = err / n; best = dy; }
    }
    for (let y = 0; y < frameH; y += 1) {
      const sy = y - best;
      for (let x = 0; x < splitX; x += 1) {
        const b = at(to, x, y);
        if (sy < 0 || sy >= frameH) { atlas[b + 3] = 0; continue; }
        atlas.copy(atlas, b, at(from, x, sy), at(from, x, sy) + 4);
      }
    }
  }
}

function build(name) {
  const img = nativeImage.createFromPath(path.join(srcDir, `${name}.png`));
  const { width: W, height: H } = img.getSize();
  const buf = img.toBitmap(); // BGRA
  const px = (x, y) => (y * W + x) * 4;
  const corners = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]].map(([x, y]) => [buf[px(x, y)], buf[px(x, y) + 1], buf[px(x, y) + 2]]);
  const bg = [0, 1, 2].map((c) => corners.map((k) => k[c]).sort((a, b) => a - b)[1]);
  const dist = (b, i) => Math.abs(b[i] - bg[0]) + Math.abs(b[i + 1] - bg[1]) + Math.abs(b[i + 2] - bg[2]);

  // connected components of sprite pixels
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) mask[i] = dist(buf, i * 4) > FG ? 1 : 0;
  const label = new Int32Array(W * H).fill(-1);
  const comps = [];
  for (let start = 0; start < W * H; start += 1) {
    if (!mask[start] || label[start] !== -1) continue;
    const stack = [start];
    label[start] = comps.length;
    let minX = W; let minY = H; let maxX = 0; let maxY = 0; let area = 0;
    while (stack.length) {
      const p = stack.pop();
      const x = p % W; const y = (p - x) / W;
      area += 1;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (mask[q] && label[q] === -1) { label[q] = comps.length; stack.push(q); }
      }
    }
    comps.push({ minX, minY, maxX, maxY, area });
  }
  const big = comps.filter((c) => c.area > 1500);
  const small = comps.filter((c) => c.area > 20 && c.area <= 1500);
  // each sprite = a big component + nearby small pieces (blades, sparks)
  const sprites = big.map((b) => {
    const box = { ...b };
    for (const c of small) {
      if (c.minX < b.maxX + 30 && c.maxX > b.minX - 30 && c.minY < b.maxY + 20 && c.maxY > b.minY - 20) {
        box.minX = Math.min(box.minX, c.minX); box.minY = Math.min(box.minY, c.minY);
        box.maxX = Math.max(box.maxX, c.maxX); box.maxY = Math.max(box.maxY, c.maxY);
      }
    }
    return box;
  });
  // group into rows by the feet line (maxY)
  sprites.sort((a, b) => a.maxY - b.maxY);
  const rows = [];
  for (const s of sprites) {
    const row = rows.find((r) => Math.abs(r.feet - s.maxY) < 60);
    if (row) row.items.push(s); else rows.push({ feet: s.maxY, items: [s] });
  }
  rows.sort((a, b) => a.feet - b.feet);
  const picked = rows.slice(0, ROWS).map((r) => r.items.sort((a, b) => a.minX - b.minX).slice(0, COLS));
  if (picked.length < ROWS || picked.some((r) => r.length < COLS)) throw new Error(`${name}: could not find ${ROWS}x${COLS} walking frames`);

  const pad = 6;
  const frameW = Math.max(...picked.flat().map((s) => s.maxX - s.minX + 1)) + pad * 2;
  const frameH = Math.max(...picked.flat().map((s) => s.maxY - s.minY + 1)) + pad * 2 + 12; // room for the shadow
  const atlas = Buffer.alloc(frameW * COLS * frameH * ROWS * 4); // transparent
  const AW = frameW * COLS;

  picked.forEach((row, r) => row.forEach((s, c) => {
    const x0 = Math.max(0, s.minX - pad); const y0 = Math.max(0, s.minY - pad);
    const x1 = Math.min(W - 1, s.maxX + pad); const y1 = Math.min(H - 1, s.maxY + pad + 12);
    const w = x1 - x0 + 1; const h = y1 - y0 + 1;
    const cut = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y += 1) buf.copy(cut, y * w * 4, px(x0, y0 + y), px(x0, y0 + y) + w * 4);
    // transparent background: flood fill from the crop border
    const seen = new Uint8Array(w * h);
    const q = [];
    for (let x = 0; x < w; x += 1) q.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y += 1) q.push(y * w, y * w + w - 1);
    while (q.length) {
      const p = q.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      if (dist(cut, p * 4) > BGTOL) continue;
      cut[p * 4 + 3] = 0;
      const x = p % w; const y = (p - x) / w;
      if (x > 0) q.push(p - 1); if (x < w - 1) q.push(p + 1); if (y > 0) q.push(p - w); if (y < h - 1) q.push(p + w);
    }
    // place bottom-centred in the cell (feet aligned across frames)
    const ox = c * frameW + Math.floor((frameW - w) / 2);
    const oy = r * frameH + (frameH - h);
    for (let y = 0; y < h; y += 1) cut.copy(atlas, ((oy + y) * AW + ox) * 4, y * w * 4, (y + 1) * w * 4);
  }));

  for (const fix of STEADY[name] ?? []) steadyWeapon(atlas, AW, frameW, frameH, fix);

  const out = nativeImage.createFromBitmap(atlas, { width: AW, height: frameH * ROWS });
  fs.writeFileSync(path.join(outDir, `${name}-walk.png`), out.toPNG());
  fs.writeFileSync(path.join(outDir, `${name}-walk.json`), JSON.stringify({ frameWidth: frameW, frameHeight: frameH, columns: COLS, rows: ROWS }, null, 2) + '\n');
  return { name, frameW, frameH, rows: rows.length };
}

app.whenReady().then(() => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const n of names) console.log(JSON.stringify(build(n)));
  app.quit();
});
