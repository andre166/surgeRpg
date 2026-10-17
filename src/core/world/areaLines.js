/**
 * Area border lines coloured by how the area level compares with the hero level.
 * Ports of StageMap_MakeMap.as (TekiseiLvLineColor, GetLineColorNum, byougahoukou)
 * and the drawing loop of StageMapVar.as.
 */

/** TekiseiLvLineColor: 0-5 easier than the hero (dark → light blue), 6 = right level, 7-12 harder (gold → dark red). */
export const AREA_LINE_COLORS = [
  0x192029, 0x192029, 0x35464d, 0x4d6d7a, 0x6ea1b7, 0x6ea1b7, 0x90e0ff,
  0xad9b4f, 0xd08810, 0xb85a0a, 0xaa3307, 0x9e1d04, 0x900000,
];

/** GetLineColorNum(areaLevel, heroLevel): index into AREA_LINE_COLORS. Hard mode is always 9. */
export function areaLineColorIndex(areaLevel, heroLevel, hardMode = false) {
  const a = areaLevel;
  const p = heroLevel;
  if (hardMode) return 9;
  if (a >= p * 0.9 && a <= p * 1.1) return 6;
  if (a <= p) {
    if (a <= p * 0.5 - 15) return 0;
    if (a <= p * 0.58 - 12) return 1;
    if (a <= p * 0.66 - 9) return 2;
    if (a <= p * 0.74 - 6) return 3;
    if (a <= p * 0.82 - 3) return 4;
    if (a <= p * 0.9) return 5;
    return 0;
  }
  if (a >= p * 1.4 + 50) return 12;
  if (a >= p * 1.3 + 38) return 11;
  if (a >= p * 1.2 + 25) return 10;
  if (a >= p * 1.15 + 16) return 9;
  if (a >= p * 1.1 + 8) return 8;
  if (a >= p * 1.05 + 1) return 7;
  return 0;
}

export function areaLineColor(areaLevel, heroLevel, hardMode = false) {
  return AREA_LINE_COLORS[areaLineColorIndex(areaLevel, heroLevel, hardMode)];
}

const TOP = 0;
const RIGHT = 1;
const BOTTOM = 2;
const LEFT = 3;

/**
 * Line segments drawn inside one grid cell (byougahoukou), `inset` pixels from the
 * cell edges. A side is drawn where the neighbour belongs to another area or the map ends.
 * End adjustment per side: 0 = both ends overshoot (join the next cell's line),
 * 1 = end inset, -1 = start inset, 2 = both inset (closed corners).
 */
function cellSides(t, r, b, l) {
  const n = t + r + b + l;
  if (n === 4) return [[TOP, 2], [RIGHT, 2], [BOTTOM, 2], [LEFT, 2]];
  if (n === 3) {
    if (t + r + b === 3) return [[TOP, 1], [RIGHT, 2], [BOTTOM, 1]];
    if (r + b + l === 3) return [[RIGHT, 1], [BOTTOM, 2], [LEFT, 1]];
    if (b + l + t === 3) return [[BOTTOM, -1], [LEFT, 2], [TOP, -1]];
    return [[LEFT, -1], [TOP, 2], [RIGHT, -1]];
  }
  if (n === 2) {
    if (t + r === 2) return [[TOP, 1], [RIGHT, -1]];
    if (r + b === 2) return [[RIGHT, 1], [BOTTOM, 1]];
    if (b + l === 2) return [[BOTTOM, -1], [LEFT, 1]];
    if (l + t === 2) return [[LEFT, -1], [TOP, -1]];
    if (t + b === 2) return [[TOP, 0], [BOTTOM, 0]];
    return [[RIGHT, 0], [LEFT, 0]];
  }
  if (t) return [[TOP, 0]];
  if (r) return [[RIGHT, 0]];
  if (b) return [[BOTTOM, 0]];
  if (l) return [[LEFT, 0]];
  return [];
}

function segment(c, r, cw, ch, side, mode, inset) {
  const near = inset;
  let s = -inset; // start offset along the side
  let e = -inset; // end offset (subtracted from the far end)
  if (mode === -1) s = inset;
  else if (mode === 1) e = inset;
  else if (mode === 2) { s = inset; e = inset; }
  const x0 = c * cw;
  const y0 = r * ch;
  if (side === TOP) return [x0 + s, y0 + near, x0 + cw - e, y0 + near];
  if (side === RIGHT) return [x0 + cw - near, y0 + s, x0 + cw - near, y0 + ch - e];
  if (side === BOTTOM) return [x0 + s, y0 + ch - near, x0 + cw - e, y0 + ch - near];
  return [x0 + near, y0 + s, x0 + near, y0 + ch - e];
}

/**
 * All border segments of a map grid, grouped with the area index that owns them.
 * @returns {Array<{ area:number, x1:number, y1:number, x2:number, y2:number }>}
 */
export function areaBorderSegments(cells, cw, ch, inset) {
  const rows = cells.length;
  const cols = cells[0].length;
  const out = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const a = cells[r][c];
      const t = r === 0 || cells[r - 1][c] !== a ? 1 : 0;
      const b = r === rows - 1 || cells[r + 1][c] !== a ? 1 : 0;
      const l = c === 0 || cells[r][c - 1] !== a ? 1 : 0;
      const rt = c === cols - 1 || cells[r][c + 1] !== a ? 1 : 0;
      for (const [side, mode] of cellSides(t, rt, b, l)) {
        const [x1, y1, x2, y2] = segment(c, r, cw, ch, side, mode, inset);
        out.push({ area: a, x1, y1, x2, y2 });
      }
    }
  }
  return out;
}
