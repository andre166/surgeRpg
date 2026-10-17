/**
 * Cuts an icon sheet (icons in rows on a flat dark background) into one transparent PNG per
 * icon, in reading order (row by row, left to right), named after the given names.
 * Each icon is centred in a square of SIZE px.
 *
 * Usage: npx electron scripts/cut-icon-sheet.cjs <sheet.png> <outDir> name1 name2 ...
 */
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const [sheet, outDir, ...names] = process.argv.slice(2);
const FG = 14; // colour distance that counts as icon (background noise is under 5)
const BGTOL = 12; // background flood-fill tolerance
const SIZE = 96;

function run() {
  const img = nativeImage.createFromPath(sheet);
  const { width: W, height: H } = img.getSize();
  const buf = img.toBitmap(); // BGRA
  const px = (x, y) => (y * W + x) * 4;
  const corners = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]].map(([x, y]) => [buf[px(x, y)], buf[px(x, y) + 1], buf[px(x, y) + 2]]);
  const bg = [0, 1, 2].map((c) => corners.map((k) => k[c]).sort((a, b) => a - b)[1]);
  const dist = (b, i) => Math.abs(b[i] - bg[0]) + Math.abs(b[i + 1] - bg[1]) + Math.abs(b[i + 2] - bg[2]);

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
  // icons = big components; small pieces nearby (sparks, drips, flames) join the closest icon
  let big = comps.filter((c) => c.area > 800).map((c) => ({ ...c }));
  // big pieces very close to each other are one icon (e.g. twin daggers)
  // side by side in the same row: the vertical ranges overlap by more than half, small horizontal gap
  const sameIcon = (a, b) => {
    const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
    const gapX = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
    return overlapY > 0.5 * Math.min(a.maxY - a.minY, b.maxY - b.minY) && gapX < 25;
  };
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < big.length; i += 1) {
      for (let j = i + 1; j < big.length; j += 1) {
        if (sameIcon(big[i], big[j])) {
          const a = big[i]; const b = big[j];
          big[i] = { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY), area: a.area + b.area };
          big = big.filter((_, k) => k !== j);
          merged = true;
          break outer;
        }
      }
    }
  }
  for (const c of comps.filter((k) => k.area > 8 && k.area <= 800)) {
    const cx = (c.minX + c.maxX) / 2; const cy = (c.minY + c.maxY) / 2;
    let best = null; let bestD = Infinity;
    for (const b of big) {
      const dx = Math.max(b.minX - cx, 0, cx - b.maxX); const dy = Math.max(b.minY - cy, 0, cy - b.maxY);
      const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best && bestD < 40) {
      best.minX = Math.min(best.minX, c.minX); best.minY = Math.min(best.minY, c.minY);
      best.maxX = Math.max(best.maxX, c.maxX); best.maxY = Math.max(best.maxY, c.maxY);
    }
  }
  // reading order: rows by vertical centre, then left to right
  big.sort((a, b) => (a.minY + a.maxY) / 2 - (b.minY + b.maxY) / 2);
  const rows = [];
  for (const b of big) {
    const cy = (b.minY + b.maxY) / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < 70);
    if (row) row.items.push(b); else rows.push({ cy, items: [b] });
  }
  const icons = rows.flatMap((r) => r.items.sort((a, b) => a.minX - b.minX));
  if (icons.length !== names.length) throw new Error(`found ${icons.length} icons, got ${names.length} names`);

  fs.mkdirSync(outDir, { recursive: true });
  icons.forEach((b, i) => {
    const pad = 4;
    const side = Math.max(b.maxX - b.minX, b.maxY - b.minY) + 1 + pad * 2;
    const x0 = Math.round((b.minX + b.maxX) / 2 - side / 2); const y0 = Math.round((b.minY + b.maxY) / 2 - side / 2);
    const cut = Buffer.alloc(side * side * 4); // transparent outside the sheet
    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        const sx = x0 + x; const sy = y0 + y;
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        // only pixels of this icon's box (neighbours stay out)
        if (sx < b.minX - pad || sx > b.maxX + pad || sy < b.minY - pad || sy > b.maxY + pad) continue;
        buf.copy(cut, (y * side + x) * 4, px(sx, sy), px(sx, sy) + 4);
      }
    }
    // transparent background: flood fill from the border over background-like pixels
    const seen = new Uint8Array(side * side);
    const q = [];
    for (let k = 0; k < side; k += 1) q.push(k, (side - 1) * side + k, k * side, k * side + side - 1);
    while (q.length) {
      const p = q.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      if (cut[p * 4 + 3] !== 0 && dist(cut, p * 4) > BGTOL) continue;
      cut[p * 4 + 3] = 0;
      const x = p % side; const y = (p - x) / side;
      if (x > 0) q.push(p - 1); if (x < side - 1) q.push(p + 1); if (y > 0) q.push(p - side); if (y < side - 1) q.push(p + side);
    }
    // transparent pixels must be black (premultiplied alpha), or resizing smears the background in
    for (let k = 0; k < side * side; k += 1) if (cut[k * 4 + 3] === 0) { cut[k * 4] = 0; cut[k * 4 + 1] = 0; cut[k * 4 + 2] = 0; }
    const icon = nativeImage.createFromBitmap(cut, { width: side, height: side }).resize({ width: SIZE, height: SIZE, quality: 'best' });
    fs.writeFileSync(path.join(outDir, `${names[i]}.png`), icon.toPNG());
  });
  return icons.length;
}

app.whenReady().then(() => {
  console.log(JSON.stringify({ icons: run() }));
  app.quit();
});
