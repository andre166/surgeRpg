/**
 * Draws the title screen ribbon as pixel art (128x40, shown scaled with nearest-neighbour):
 * a red ribbon with gold trim and stitching across the front, its swallowtail ends folding
 * behind it, in the colours of the key art (the hero's red cape, the gold of "RPG").
 * The text area is the front band: x 15..112, y 3..30 (see .tagline in src/ui/styles.css).
 *
 * Output: public/assets/ui/ribbon.png
 * Usage: node scripts/draw-ribbon.mjs [out.png]
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || path.join(ROOT, 'public/assets/ui/ribbon.png');
const W = 128;
const H = 40;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const C = {
  outline: hex('#2a140c'),
  red: [hex('#ee6a50'), hex('#c83c2c'), hex('#9c2a22'), hex('#741c18')],
  back: [hex('#a8302a'), hex('#7c201c'), hex('#561412')],
  fold: hex('#3e0e0c'),
  gold: [hex('#ffe490'), hex('#e8ae34'), hex('#a8741a')],
  goldBack: [hex('#d09430'), hex('#8e5e16')],
  stitch: hex('#f4c860'),
};

const px = Array.from({ length: H }, () => Array(W).fill(null));
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) px[y][x] = c; };

/* swallowtail ends, behind and lower than the band */
function tail(mirrored) {
  const top = 12; const bottom = 37; const mid = (top + bottom) / 2; const depth = 7;
  for (let y = top; y <= bottom; y++) {
    const notch = Math.round(depth - (Math.abs(y - mid) * depth) / ((bottom - top) / 2));
    for (let x = 1 + notch; x <= 21; x++) {
      let c = C.back[1];
      if (y <= top + 1) c = y === top ? C.goldBack[0] : C.goldBack[1];
      else if (y >= bottom - 1) c = C.goldBack[1];
      else if (y === top + 2) c = C.back[0];
      else if (y >= bottom - 3) c = C.back[2];
      set(mirrored ? W - 1 - x : x, y, c);
    }
  }
  // the fold where the band turns behind: a dark triangle under the band's end
  for (let y = 31; y <= 37; y++) for (let x = 15; x <= 21; x++) {
    if (x - 15 >= y - 31) set(mirrored ? W - 1 - x : x, y, C.fold);
  }
}
tail(false);
tail(true);

/* front band */
for (let y = 3; y <= 30; y++) for (let x = 15; x <= 112; x++) {
  let c;
  if (y === 3) c = C.gold[0];
  else if (y === 4) c = C.gold[1];
  else if (y === 29) c = C.gold[1];
  else if (y === 30) c = C.gold[2];
  else if (y === 5) c = C.red[0];
  else if (y >= 26) c = C.red[2];
  else c = C.red[1];
  // light from the top-left, darker towards the right end
  // dithered towards the right end so the shade has no hard edge
  if (c === C.red[1] && (x > 104 || (x > 97 && (x + y) % 2 === 0))) c = C.red[2];
  if (c === C.red[0] && x > 104) c = C.red[1];
  set(x, y, c);
}
// stitching just inside the trim
for (let x = 17; x <= 110; x += 3) { set(x, 6, C.stitch); set(x + 1, 6, C.stitch); set(x, 27, C.stitch); set(x + 1, 27, C.stitch); }
// a soft vertical fold shade near each end of the band
for (let y = 5; y <= 28; y++) { set(16, y, C.red[2]); set(111, y, C.red[3]); }

/* 1px outline around everything */
const out = px.map((row) => row.slice());
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (px[y][x]) continue;
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => px[y + dy]?.[x + dx])) out[y][x] = C.outline;
}
// band edge over the tails reads as a seam
for (let x = 15; x <= 112; x++) { if (out[31][x] && out[31][x] !== C.outline) out[31][x] = C.outline; }
for (let y = 3; y <= 30; y++) { out[y][14] = C.outline; out[y][113] = C.outline; }

/* PNG */
const CRC = new Uint32Array(256).map((_, n) => { let k = n; for (let i = 0; i < 8; i++) k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1; return k >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const raw = Buffer.alloc((W * 4 + 1) * H);
out.forEach((row, y) => row.forEach((c, x) => { if (c) raw.set(c, y * (W * 4 + 1) + 1 + x * 4); }));
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log(`ribbon ${W}x${H} -> ${path.relative(ROOT, OUT)}`);
