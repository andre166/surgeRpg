/**
 * Cuts the first (front idle) frame out of each hero sprite sheet and makes the background
 * transparent. Sheets live in art/heroes, frames go to public/assets/heroes.
 * Usage: npx electron scripts/cut-hero-sprites.cjs art/heroes public/assets/heroes <name>
 * (no longer used for the shipped heroes, which are drawn as pixel art: scripts/draw-*.cjs;
 * running it would overwrite their art)
 */
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const [srcDir, outDir, ...names] = process.argv.slice(2);

function process1(name) {
  const img = nativeImage.createFromPath(path.join(srcDir, `${name}.png`));
  const { width: W, height: H } = img.getSize();
  const buf = img.toBitmap(); // BGRA
  const px = (x, y) => (y * W + x) * 4;
  // background = median of the four corners
  const corners = [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]].map(([x, y]) => [buf[px(x, y)], buf[px(x, y) + 1], buf[px(x, y) + 2]]);
  const bg = [0, 1, 2].map((c) => corners.map((k) => k[c]).sort((a, b) => a - b)[1]);
  const dist = (i) => Math.abs(buf[i] - bg[0]) + Math.abs(buf[i + 1] - bg[1]) + Math.abs(buf[i + 2] - bg[2]);
  const FG = 14; // colour distance that counts as sprite (background noise is under 5)
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) mask[y * W + x] = dist(px(x, y)) > FG ? 1 : 0;

  // connected components (8-neighbour), keep the big ones
  const label = new Int32Array(W * H).fill(-1);
  const comps = [];
  for (let start = 0; start < W * H; start += 1) {
    if (!mask[start] || label[start] !== -1) continue;
    const id = comps.length;
    const stack = [start];
    label[start] = id;
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
        if (mask[q] && label[q] === -1) { label[q] = id; stack.push(q); }
      }
    }
    comps.push({ minX, minY, maxX, maxY, area });
  }
  const big = comps.filter((c) => c.area > 1500);
  // first row of sprites, then the leftmost one
  const topY = Math.min(...big.map((c) => c.minY));
  const firstRow = big.filter((c) => c.minY < topY + (Math.min(...big.map((b) => b.maxY - b.minY)) * 0.6));
  // merge pieces that overlap horizontally with the leftmost sprite (weapon blades can be separate)
  const lead = firstRow.sort((a, b) => a.minX - b.minX)[0];
  const box = { ...lead };
  // small pieces (blades, sparks) close to the sprite belong to it
  for (const c of comps.filter((k) => k.area > 20 && k.area <= 1500)) {
    const overlapX = c.minX < lead.maxX + 30 && c.maxX > lead.minX - 30;
    const overlapY = c.minY < lead.maxY + 20 && c.maxY > lead.minY - 20;
    if (overlapX && overlapY) {
      box.minX = Math.min(box.minX, c.minX); box.minY = Math.min(box.minY, c.minY);
      box.maxX = Math.max(box.maxX, c.maxX); box.maxY = Math.max(box.maxY, c.maxY);
    }
  }
  // include the soft shadow under the feet: extend a bit downwards
  const pad = 10;
  const x0 = Math.max(0, box.minX - pad); const y0 = Math.max(0, box.minY - pad);
  const x1 = Math.min(W - 1, box.maxX + pad); const y1 = Math.min(H - 1, box.maxY + pad + 14);
  const w = x1 - x0 + 1; const h = y1 - y0 + 1;

  // transparent background: flood fill from the crop border over background-like pixels
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) buf.copy(out, y * w * 4, px(x0, y0 + y), px(x0, y0 + y) + w * 4);
  const BGTOL = 12;
  const seen = new Uint8Array(w * h);
  const q = [];
  const isBg = (i) => Math.abs(out[i] - bg[0]) + Math.abs(out[i + 1] - bg[1]) + Math.abs(out[i + 2] - bg[2]) <= BGTOL;
  for (let x = 0; x < w; x += 1) { q.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y += 1) { q.push(y * w, y * w + w - 1); }
  while (q.length) {
    const p = q.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!isBg(p * 4)) continue;
    out[p * 4 + 3] = 0;
    const x = p % w; const y = (p - x) / w;
    if (x > 0) q.push(p - 1); if (x < w - 1) q.push(p + 1); if (y > 0) q.push(p - w); if (y < h - 1) q.push(p + w);
  }
  // soften the remaining near-background halo (1px) by partial alpha
  const res = nativeImage.createFromBitmap(out, { width: w, height: h });
  fs.writeFileSync(path.join(outDir, `${name}.png`), res.toPNG());
  return { name, sheet: `${W}x${H}`, frame: { x: x0, y: y0, w, h }, bg };
}

app.whenReady().then(() => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const n of names) console.log(JSON.stringify(process1(n)));
  app.quit();
});
