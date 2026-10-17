/**
 * Pixel-art monster sprites (32x32) for every enemy of the game, drawn in code.
 *
 * Each sprite is listed in MONSTERS with its type (the last word of its name: Tyrant, Kraken,
 * Shade...), its adjective (the first word: Dim, Mossy, Pale...) and its rank, weakest first.
 * The type picks the silhouette, the adjective the palette, and the rank how menacing it looks:
 * the weakest are cozy (big shiny eyes, blush, a smile, sparkles); midway they get a neutral
 * stare and a fang; then angry brows, glowing eyes, fangs, horns and spikes. Past that (rank 20+)
 * they grow duskier and ember-lit, then get red, violet and finally golden auras (see TIERS).
 *
 * Battle and bestiary pass encounter keys (`<pool>#<index>`, see enemyPick.js); monsterSvg
 * resolves them to the sprite name through data/enemies.json. Bosses return null and keep the
 * procedural creature.
 */
import enemyData from '../data/enemies.json';
import worldData from '../data/world.json';

export const MONSTER_SIZE = 32;
const S = MONSTER_SIZE;

/** Area base HP per pool, for entries whose HP is a multiplier of it (endgame groups). */
const AREA_HP = {};
for (const map of worldData.maps) for (const area of map.areas) {
  for (const key of [area.pool, area.poolHard]) if (key && area.baseHp) AREA_HP[key] = Math.min(AREA_HP[key] ?? Infinity, area.baseHp);
}
/** sprite -> name, and sprite -> its lowest HP anywhere. */
const NAME_OF = {};
const HP_OF = {};
for (const [pool, list] of Object.entries(enemyData.pools)) for (const e of list) {
  const hp = e.hp ?? (AREA_HP[pool] ?? 0) * (e.hpMul ?? 1);
  if (!(e.sprite in HP_OF) || hp < HP_OF[e.sprite]) { HP_OF[e.sprite] = hp; NAME_OF[e.sprite] = e.name; }
}

/** Every enemy sprite, weakest (lowest HP) first; the index is the rank. */
export const MONSTER_ORDER = Object.keys(HP_OF).sort((a, b) => HP_OF[a] - HP_OF[b] || a.localeCompare(b));

/** Rank at which a monster has the first tier's most serious look (menace 1). */
const SERIOUS_RANK = 19;

/** Adjective -> [light, mid, dark, outline, accent]. */
const PALETTES = {
  Dim: ['#c4b4e4', '#8f7abd', '#5e4a8c', '#241a3a', '#ffd76a'],
  Timid: ['#ffd8e6', '#f4a6c2', '#c76f95', '#46203a', '#fff2a8'],
  Pale: ['#f2f8ff', '#cadcf0', '#91a9c6', '#2e3a54', '#8fd8ff'],
  Muddy: ['#c0946a', '#8c623c', '#5e3e22', '#24160c', '#a6d86a'],
  Dusty: ['#efdcae', '#cdb07c', '#98794a', '#3a2c1c', '#ff8a5c'],
  Mossy: ['#9fd47e', '#62a24c', '#3c6e30', '#18301a', '#f4e27a'],
  Hollow: ['#b3bbc8', '#76808f', '#4a5263', '#171b24', '#7ff0e0'],
  Lesser: ['#ffc794', '#f08c50', '#b45a2e', '#3c1c0c', '#ffe36a'],
  Ashen: ['#d8d2cc', '#a49b94', '#6e6560', '#26211e', '#ff8a4a'],
  Rusted: ['#e2a070', '#b4643a', '#7a3c22', '#2a140a', '#7fd0c0'],
  Amber: ['#ffe08a', '#f0a830', '#b06a14', '#3a2008', '#fff4c0'],
  Bristle: ['#c8a888', '#8c6c50', '#5a4230', '#221810', '#e8d8b8'],
  Thorned: ['#a8c870', '#6a8a3a', '#3e5a22', '#16220c', '#e84a6a'],
  Feral: ['#d8945a', '#a85a30', '#6e3418', '#2a1208', '#f4e4a0'],
  Sallow: ['#ece8a0', '#c4bc5c', '#8a8234', '#2e2a10', '#a0e070'],
  Brackish: ['#8cc4b0', '#4e8a7c', '#2e5a52', '#0e221e', '#d8f0a0'],
  Ironclad: ['#c4ccd8', '#8290a4', '#4e5a6e', '#161c26', '#ffcc4a'],
  Crimson: ['#ff8a8a', '#d63a4a', '#8a1a2a', '#2a060c', '#ffd84a'],
  Ember: ['#ffcc6a', '#f07a2a', '#b03a14', '#300c04', '#ffe8a0'],
  Howling: ['#d4e0f0', '#94a8c4', '#5a6c8a', '#1a2030', '#bff4ff'],
  Cinder: ['#8a8480', '#54504c', '#302c2a', '#0e0c0c', '#ff7a2a'],
  Gloom: ['#8a84c0', '#544e8a', '#302c5a', '#0e0c22', '#b8ff6a'],
  Venom: ['#c4f070', '#7ab83a', '#4a7a22', '#14220a', '#c06aff'],
  Frost: ['#f0fbff', '#b0e0f4', '#6aa8d0', '#1a3048', '#ffffff'],
  Abyssal: ['#5a7ac8', '#2e4a8a', '#1a2a5a', '#060a1e', '#4affe0'],
  Grave: ['#b4bca8', '#7a846c', '#4c5444', '#161a12', '#a0ff9a'],
  Hallowed: ['#fffbea', '#f0e2b0', '#c8b070', '#3a3018', '#ffe27a'],
  Obsidian: ['#6a5a84', '#3a3050', '#1e1830', '#06040c', '#c084ff'],
  Dread: ['#b45a6a', '#7a2a3a', '#4a1420', '#140408', '#ff4a3a'],
  Storm: ['#a8b8d0', '#6a7c98', '#3c4a62', '#10141e', '#fff06a'],
  Molten: ['#ffd06a', '#ff7a2a', '#c0300e', '#2a0804', '#fff2b0'],
  Blight: ['#b49ac0', '#7a5e8a', '#4a3858', '#160e1c', '#a8e04a'],
  Astral: ['#e0c8ff', '#a07ae8', '#5e3aa8', '#160a30', '#fff4a8'],
  Sovereign: ['#c8a0e0', '#8a4ab8', '#521e7a', '#18062a', '#ffd84a'],
  Eternal: ['#fffae0', '#f4d880', '#c09a30', '#3a2a08', '#ffffff'],
  Void: ['#6a4a8a', '#3a2258', '#1c0e30', '#040108', '#ff3ab0'],
  Omega: ['#ffb08a', '#f05a3a', '#a8261a', '#2a0604', '#ffe8a0'],
  Primordial: ['#8ad8b0', '#3a9a7a', '#1e5e4a', '#061a14', '#ffe27a'],
  Celestial: ['#e8f4ff', '#a8d0f8', '#6a98d8', '#16243e', '#ffe8a0'],
  Eclipse: ['#4a3a3a', '#2a1e20', '#140c0e', '#020102', '#ff9a2a'],
};

const EYE = '#1d1420';
const WHITE = '#ffffff';
const BLUSH = '#ff8fab';
const MOUTH = '#3a1424';
const FANG = '#fff6e0';
const TONGUE = '#ff7d9a';
const BONE = '#f4ecd8';
const GOLD = ['#ffe27a', '#d9a21e'];
const EAR_IN = '#e88aa0';

/** Eye glow of serious monsters: yellow, then red for the very strongest. */
const glow = (m) => (m < 0.85 ? '#ffd84a' : '#ff4a3a');

/* ---------- raster helpers (x mirrored around the centre line between columns 15 and 16) ---------- */

function grid() { return Array.from({ length: S }, () => Array(S).fill(null)); }
function put(g, x, y, c) { if (y >= 0 && y < S && x >= 0 && x < S) g[y][x] = c; }
function sym(g, x, y, c) { put(g, x, y, c); put(g, S - 1 - x, y, c); }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(g, i, j, c); }
function symRect(g, x, y, w, h, c) { rect(g, x, y, w, h, c); rect(g, S - x - w, y, w, h, c); }
function line(g, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    put(g, x0, y0, c);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function symLine(g, x0, y0, x1, y1, c) { line(g, x0, y0, x1, y1, c); line(g, S - 1 - x0, y0, S - 1 - x1, y1, c); }

/** Flat ellipse. */
function oval(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy <= 1) put(g, x, y, c);
  }
}

/** Ellipse shaded with light from the top left: highlight, mid tone, shadow (rows past yMax cut). */
function blob(g, cx, cy, rx, ry, p, yMax = S) {
  for (let y = Math.floor(cy - ry); y <= Math.min(yMax, Math.ceil(cy + ry)); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const v = dx * 0.45 + dy * 0.75;
    put(g, x, y, v < -0.5 ? p[0] : v > 0.42 ? p[2] : p[1]);
  }
}

/** Mixes hex colour a toward b by k (0..1). */
function mix(a, b, k) {
  const ch = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const hex = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k).toString(16).padStart(2, '0'));
  return `#${hex.join('')}`;
}

/** Crystal diamond of radius r centred on pixel column cx: lit left face, darker right face. */
function diamond(g, cx, cy, r, p) {
  for (let y = cy - r; y <= cy + r; y++) {
    const hw = r - Math.abs(y - cy);
    for (let x = cx - hw; x <= cx + hw; x++) put(g, x, y, x < cx ? p[0] : x === cx ? p[1] : p[2]);
  }
}

/** Topmost filled row of column x (or null). */
function topY(g, x) { for (let y = 0; y < S; y++) if (g[y][x]) return y; return null; }

/**
 * Face centred on the sprite: eyes `sp` pixels either side of the centre at row cy.
 * m < 1/3 cozy, m < 2/3 neutral, otherwise serious.
 */
function face(g, cy, sp, m, p, { noMouth = false, noBlush = false } = {}) {
  const lx = 16 - sp - 2;
  if (m < 0.34) {
    symRect(g, lx, cy - 1, 2, 3, EYE);
    sym(g, lx, cy - 1, WHITE);
    if (!noBlush) symRect(g, lx - 1, cy + 2, 2, 1, BLUSH);
    if (!noMouth) { sym(g, 15, cy + 3, MOUTH); sym(g, 14, cy + 2, MOUTH); }
  } else if (m < 0.67) {
    symRect(g, lx, cy, 2, 2, EYE);
    sym(g, lx, cy, WHITE);
    if (!noMouth) { rect(g, 15, cy + 3, 2, 1, MOUTH); put(g, 16, cy + 4, FANG); }
  } else {
    sym(g, lx, cy - 2, p[3]); sym(g, lx + 1, cy - 1, p[3]); // brows sloping in
    symRect(g, lx, cy, 2, 1, glow(m));
    sym(g, lx + 1, cy, EYE);
    if (!noMouth) { rect(g, 13, cy + 3, 6, 1, MOUTH); sym(g, 13, cy + 4, FANG); }
  }
}

/* ---------- monsters: each draws into g and may return { float, after: [[x, y, colour]] } ---------- */

const DRAW = {
  /** Chubby little dinosaur wearing a crown; grows spikes, claws and horns. */
  Tyrant(g, p, m) {
    rect(g, 21, 22, 3, 2, p[2]); rect(g, 23, 20, 2, 3, p[2]); put(g, 24, 19, p[2]); // tail
    symRect(g, 10, 25, 4, 3, p[2]);
    if (m > 0.3) { sym(g, 10, 27, BONE); sym(g, 12, 27, BONE); }
    blob(g, 16, 18, 8, 8, p);
    oval(g, 16, 21.5, 4.5, 3.8, p[0]);
    symRect(g, 7, 19, 2, 2, p[1]);
    if (m > 0.3) sym(g, 7, 21, BONE);
    if (m >= 0.34) { sym(g, 8, 12, p[2]); sym(g, 7, 13, p[2]); sym(g, 8, 15, p[2]); sym(g, 7, 16, p[2]); }
    if (m >= 0.67) { sym(g, 10, 10, BONE); sym(g, 9, 9, BONE); sym(g, 9, 8, BONE); }
    rect(g, 12, 8, 8, 2, GOLD[0]); rect(g, 12, 9, 8, 1, GOLD[1]);
    sym(g, 12, 7, GOLD[0]); rect(g, 15, 6, 2, 2, GOLD[0]); rect(g, 15, 8, 2, 1, '#ff5d7a');
    face(g, 15, 2, m, p);
  },

  /** Round octopus head over curling tentacles that grow longer with menace. */
  Kraken(g, p, m) {
    const len = 6 + Math.round(Math.min(m, 1) * 3);
    for (const [x0, ph] of [[9, 0], [12, 1], [14, 2]]) {
      for (let i = 0; i < len; i++) {
        const dx = Math.round(Math.sin((i + ph) * 0.8) * 0.9);
        symRect(g, x0 + dx, 20 + i, 2, 1, p[1]);
        if (i % 2 === 1) sym(g, x0 + dx + 1, 20 + i, p[0]);
      }
    }
    blob(g, 16, 14, 7.5, 7.5, p);
    sym(g, 12, 9, p[2]); put(g, 18, 8, p[2]); put(g, 19, 10, p[2]);
    if (m > 0.4) { put(g, 14, 8, p[2]); sym(g, 10, 12, p[2]); }
    face(g, 15, 2, m, p);
    return { after: m < 0.34 ? [[25, 8, '#cdeeff'], [26, 6, '#cdeeff'], [24, 4, '#e6f7ff']] : [] };
  },

  /** Little ghost; the hem turns tattered and the arms clawed as it gets meaner. */
  Shade(g, p, m) {
    const tatter = m > 0.5;
    for (let x = 9; x <= 22; x++) {
      const bottom = tatter ? 23 + [0, 2, 1, 3][x % 4] : 24 + ((x >> 1) % 2);
      for (let y = 14; y <= bottom; y++) put(g, x, y, x <= 10 ? p[0] : x >= 20 ? p[2] : p[1]);
    }
    blob(g, 16, 13, 7, 7, p);
    symRect(g, 7, 16, 2, 2, p[1]);
    if (m > 0.6) { sym(g, 6, 18, p[2]); sym(g, 7, 18, p[2]); sym(g, 5, 19, p[3]); }
    face(g, 13, 2, m, p);
    return { float: true };
  },

  /** Round imp with bat wings, a pointed tail, and horns that grow with menace. */
  Imp(g, p, m) {
    const w = m > 0.5 ? 1 : 0;
    symRect(g, 6, 12, 3, 1, p[2]);
    symRect(g, 4 - w, 13, 5 + w, 3, p[2]);
    symRect(g, 5, 14, 3, 1, p[1]);
    sym(g, 4 - w, 16, p[2]); sym(g, 6, 16, p[2]); sym(g, 8, 16, p[2]);
    for (const [x, y] of [[21, 24], [22, 24], [23, 23], [24, 22], [24, 21], [24, 20], [23, 19], [25, 19], [24, 18]]) put(g, x, y, p[2]);
    symRect(g, 12, 25, 3, 2, p[2]);
    blob(g, 16, 19, 6.5, 6.5, p);
    sym(g, 9, 17, p[1]); sym(g, 8, 16, p[1]);
    const h = 1 + Math.round(Math.min(m, 1) * 3);
    for (let i = 0; i < h; i++) sym(g, 12 - (i > 1 ? 1 : 0), 13 - i, BONE);
    face(g, 18, 2, m, p);
  },

  /** Big round mouth on legs: a tongue and buck teeth when cozy, rows of teeth when not. */
  Devourer(g, p, m) {
    symRect(g, 10, 26, 3, 2, p[2]);
    blob(g, 16, 18, 9.5, 8.5, p);
    const open = Math.min(m, 1);
    oval(g, 16, 21, 5 + open * 2.5, 2.5 + open * 1.5, MOUTH);
    let top = 0, bottom = 0;
    for (let y = 0; y < S; y++) if (g[y][16] === MOUTH) { if (!top) top = y; bottom = y; }
    if (m < 0.34) {
      oval(g, 16, bottom - 0.5, 2.5, 1.2, TONGUE);
      rect(g, 15, top, 2, 1, FANG);
    } else {
      for (let x = 0; x < S; x++) {
        if (g[top][x] === MOUTH && x % 2 === 0) put(g, x, top, FANG);
        if (m >= 0.67 && g[bottom][x] === MOUTH && x % 2 === 1) put(g, x, bottom, FANG);
        if (m >= 0.67 && g[top + 1][x] === MOUTH && x % 4 === 0) put(g, x, top + 1, FANG);
      }
    }
    face(g, 13, 3, m, p, { noMouth: true });
  },

  /** Genie: round head with a topknot, crossed arms with gold bracelets, a wispy tail. */
  Djinn(g, p, m) {
    const ws = [8, 7, 6, 5, 4, 3, 2, 2, 1];
    const sh = [0, 0, 1, 1, 2, 3, 4, 5, 6];
    ws.forEach((w, i) => {
      const x = 16 - Math.floor(w / 2) + sh[i];
      rect(g, x, 20 + i, w, 1, p[1]); put(g, x, 20 + i, p[0]); put(g, x + w - 1, 20 + i, p[2]);
    });
    blob(g, 16, 18, 5.5, 4, p);
    rect(g, 11, 18, 10, 2, p[1]); rect(g, 11, 19, 10, 1, p[2]);
    sym(g, 11, 18, p[4]); sym(g, 11, 19, p[4]);
    blob(g, 16, 11, 5, 5, p);
    if (m < 0.5) { rect(g, 15, 3, 2, 3, p[2]); put(g, 17, 3, p[2]); put(g, 18, 2, p[2]); }
    else { rect(g, 15, 2, 2, 4, p[2]); put(g, 15, 1, p[4]); put(g, 16, 0, p[4]); sym(g, 12, 6, p[2]); sym(g, 11, 5, p[2]); }
    sym(g, 10, 13, p[4]);
    face(g, 11, 1, m, p);
    return { float: true };
  },

  /** Treasure chest with eyes on the lid: tongue out when cozy, teeth when not. */
  Mimic(g, p, m) {
    rect(g, 8, 17, 16, 9, p[1]); rect(g, 8, 17, 2, 9, p[0]); rect(g, 21, 17, 3, 9, p[2]);
    rect(g, 8, 21, 16, 1, p[2]);
    rect(g, 8, 10, 16, 5, p[1]); rect(g, 8, 10, 16, 1, p[0]); rect(g, 21, 10, 3, 5, p[2]);
    rect(g, 9, 15, 14, 2, MOUTH);
    for (const x of [8, 23]) { rect(g, x, 10, 1, 5, GOLD[1]); rect(g, x, 17, 1, 9, GOLD[1]); }
    rect(g, 8, 25, 16, 1, GOLD[1]);
    rect(g, 15, 17, 2, 3, GOLD[0]); put(g, 15, 18, GOLD[1]);
    if (m < 0.34) {
      rect(g, 17, 16, 3, 3, TONGUE); rect(g, 18, 19, 2, 1, TONGUE); put(g, 18, 17, '#e0587a');
    } else {
      for (let x = 9; x <= 22; x++) {
        if (x % 2 === 0) put(g, x, 15, FANG);
        if (m >= 0.67 && x % 2 === 1) put(g, x, 16, FANG);
      }
    }
    if (m >= 0.67) { symRect(g, 9, 26, 2, 2, p[2]); sym(g, 9, 27, BONE); }
    face(g, 12, 3, m, p, { noMouth: true });
  },

  /** Hooded seer floating over its robe, glowing eyes in the dark hood, holding an orb. */
  Oracle(g, p, m) {
    for (let y = 15; y <= 26; y++) {
      const hw = Math.round(4 + (y - 15) * 0.45);
      for (let x = 16 - hw; x < 16 + hw; x++) put(g, x, y, x < 16 - hw + 2 ? p[0] : x >= 16 + hw - 2 ? p[2] : p[1]);
    }
    for (let x = 7; x <= 24; x += 2) put(g, x, 27, p[1]);
    blob(g, 16, 11, 6.5, 6.5, p);
    rect(g, 15, 3, 2, 2, p[1]);
    oval(g, 16, 12, 3.6, 3.2, '#140c1c');
    const eye = m < 0.34 ? '#bff4ff' : m < 0.67 ? '#8fe8ff' : glow(m);
    symRect(g, 13, 12, 2, 1, eye);
    if (m >= 0.67) sym(g, 13, 11, p[2]);
    symRect(g, 12, 19, 2, 2, p[0]);
    oval(g, 16, 20, 2.6, 2.6, '#7fe0ff'); put(g, 15, 19, WHITE);
    return { float: true, after: [[6, 8, p[4]], [25, 10, p[4]], [5, 18, p[4]], [26, 21, p[4]]] };
  },

  /** Spider: jointed legs, a patterned abdomen, a cluster of eyes and little fangs. */
  Lurker(g, p, m) {
    for (let i = 0; i < 4; i++) {
      const sy = 15 + i * 2, kx = 7 - (i % 2), ky = 11 + i * 3, fx = 4 + i, fy = 27 - (i === 0 ? 2 : 0);
      symLine(g, 11, sy, kx, ky, p[2]);
      symLine(g, kx, ky, fx, fy, p[2]);
    }
    blob(g, 16, 13, 5.5, 4.5, p);
    rect(g, 15, 10, 2, 1, '#e0405a'); rect(g, 15, 12, 2, 1, '#e0405a'); put(g, 15, 11, '#e0405a'); put(g, 16, 11, '#e0405a');
    blob(g, 16, 19, 6, 5, p);
    face(g, 19, 2, m, p, { noMouth: true });
    sym(g, 14, 16, m >= 0.67 ? glow(m) : EYE);
    symRect(g, 14, 23, 1, 2, p[2]); sym(g, 14, 25, FANG);
  },

  /** Gaunt hound: tall ears, a mane of spikes, a long snout with fangs, clawed paws. */
  Stalker(g, p, m) {
    symRect(g, 10, 23, 2, 5, p[2]); symRect(g, 13, 23, 2, 5, p[1]);
    sym(g, 10, 27, BONE); sym(g, 13, 27, BONE);
    blob(g, 16, 20, 6.5, 5, p);
    symRect(g, 10, 4, 2, 5, p[2]); sym(g, 10, 3, p[2]); sym(g, 11, 6, EAR_IN);
    blob(g, 16, 12, 6, 5, p);
    for (const [x, y] of [[9, 14], [8, 16], [9, 18], [8, 20]]) sym(g, x, y, p[2]);
    rect(g, 14, 14, 4, 2, p[0]); rect(g, 15, 14, 2, 1, EYE);
    rect(g, 14, 16, 4, 1, MOUTH); sym(g, 14, 17, FANG);
    face(g, 11, 2, m, p, { noMouth: true, noBlush: true });
  },

  /** Big-eared gremlin with a tuft of hair and a wide toothy grin. */
  Gremlin(g, p, m) {
    symRect(g, 12, 26, 3, 2, p[2]); sym(g, 12, 27, BONE);
    blob(g, 16, 22, 5.5, 4.5, p);
    symRect(g, 9, 21, 2, 3, p[1]); sym(g, 9, 24, BONE);
    for (let i = 0; i < 7; i++) {
      const x = 9 - i, y0 = 12 - Math.floor(i / 3), h = Math.max(1, 4 - Math.floor(i / 2));
      for (let k = 0; k < h; k++) sym(g, x, y0 + k, p[1]);
      if (i >= 1 && i <= 4) sym(g, x, y0 + 1, EAR_IN);
    }
    blob(g, 16, 15, 6.5, 5.5, p);
    put(g, 15, 9, p[2]); put(g, 16, 8, p[2]); put(g, 17, 9, p[2]); put(g, 16, 9, p[2]);
    face(g, 14, 2, m, p, { noMouth: true });
    rect(g, 12, 18, 8, 1, MOUTH); sym(g, 11, 17, MOUTH);
    for (let x = 12; x < 20; x += 2) put(g, x, 18, FANG);
  },

  /** Stone guardian: blocky body with cracks, a glowing core and one eye in the visor slit. */
  Sentinel(g, p, m) {
    symRect(g, 11, 23, 4, 5, p[2]); symRect(g, 11, 23, 4, 1, p[1]);
    rect(g, 9, 12, 14, 11, p[1]); rect(g, 9, 12, 2, 11, p[0]); rect(g, 20, 12, 3, 11, p[2]);
    for (const [x, y] of [[12, 15], [13, 16], [13, 17], [12, 18], [19, 19], [18, 20]]) put(g, x, y, p[2]);
    symRect(g, 5, 11, 5, 4, p[1]); symRect(g, 5, 11, 5, 1, p[0]);
    symRect(g, 6, 15, 3, 7, p[2]); symRect(g, 5, 22, 5, 3, p[1]);
    rect(g, 11, 4, 10, 8, p[1]); rect(g, 11, 4, 10, 1, p[0]); rect(g, 11, 4, 1, 8, p[0]); rect(g, 19, 4, 2, 8, p[2]);
    rect(g, 12, 6, 8, 1, p[2]);
    rect(g, 12, 7, 8, 2, '#140c14');
    const eye = m >= 0.67 ? glow(m) : '#8fe8ff';
    rect(g, 15, 7, 2, 2, eye);
    rect(g, 15, 15, 2, 3, eye); put(g, 15, 15, WHITE);
    if (m >= 0.67) {
      // shoulder spikes and cracks glowing with the core
      for (const [x, y] of [[6, 10], [6, 9], [8, 10], [8, 9], [8, 8]]) sym(g, x, y, p[2]);
      for (const [x, y] of [[13, 16], [13, 17], [18, 20]]) put(g, x, y, eye);
      sym(g, 11, 3, p[2]); sym(g, 11, 2, p[2]);
    }
  },

  /** Hulking boar-bull: curled horns, tusks, a spiky mane and heavy clawed legs. */
  Ravager(g, p, m) {
    symRect(g, 8, 23, 4, 5, p[2]); sym(g, 8, 27, BONE); sym(g, 10, 27, BONE);
    blob(g, 16, 19, 10, 7, p);
    for (let x = 9; x <= 21; x += 3) { put(g, x, 12, p[2]); put(g, x + 1, 11, p[2]); }
    blob(g, 16, 17, 6, 5, p);
    rect(g, 13, 19, 6, 3, p[0]); put(g, 14, 20, EYE); put(g, 17, 20, EYE);
    for (const [x, y] of [[10, 13], [9, 12], [8, 11], [8, 10], [9, 9], [10, 9]]) sym(g, x, y, BONE);
    sym(g, 12, 21, BONE); sym(g, 12, 22, BONE); sym(g, 11, 20, BONE);
    face(g, 16, 2, m, p, { noMouth: true, noBlush: true });
  },

  /** Serpent coiled on the ground, neck raised, a frilled head and a forked tongue. */
  Wyrm(g, p, m) {
    rect(g, 24, 23, 3, 1, p[2]); put(g, 27, 22, p[2]); put(g, 28, 21, p[2]); // tail tip
    blob(g, 16, 24, 9, 3.5, p);
    for (let x = 9; x <= 22; x += 2) put(g, x, 26, p[0]);
    blob(g, 15, 19.5, 7, 3, p);
    for (let x = 10; x <= 20; x += 2) put(g, x, 21, p[0]);
    rect(g, 14, 11, 4, 8, p[1]); rect(g, 14, 11, 1, 8, p[0]); rect(g, 17, 11, 1, 8, p[2]);
    for (let y = 13; y <= 17; y += 2) rect(g, 15, y, 2, 1, p[0]);
    for (const [x, y] of [[10, 6], [9, 5], [9, 7], [8, 4], [8, 6], [10, 8]]) sym(g, x, y, p[2]);
    sym(g, 9, 6, p[4]);
    blob(g, 16, 9, 5.5, 4.5, p);
    face(g, 8, 2, m, p, { noMouth: true, noBlush: true });
    rect(g, 13, 12, 6, 1, MOUTH); sym(g, 13, 13, FANG);
    put(g, 16, 13, '#e0405a'); put(g, 16, 14, '#e0405a'); put(g, 15, 15, '#e0405a'); put(g, 17, 15, '#e0405a');
  },

  /** Winged armoured herald with a halo, a slit helm and a spear. */
  Archon(g, p, m) {
    for (let x = 3; x <= 8; x++) {
      const top = 6 + (x - 3), bottom = 14 + (x - 3);
      for (let y = top; y <= bottom; y++) sym(g, x, y, x % 2 ? p[1] : p[0]);
      sym(g, x, bottom + 1, p[2]);
    }
    for (let y = 13; y <= 27; y++) {
      const hw = Math.round(4 + (y - 13) * 0.18);
      for (let x = 16 - hw; x < 16 + hw; x++) put(g, x, y, x < 16 - hw + 2 ? p[0] : x >= 16 + hw - 2 ? p[2] : p[1]);
    }
    rect(g, 15, 14, 2, 13, GOLD[1]); rect(g, 11, 19, 10, 1, GOLD[0]);
    symRect(g, 9, 12, 3, 3, p[1]); symRect(g, 9, 12, 3, 1, GOLD[0]);
    line(g, 25, 4, 25, 27, '#7a5a3a'); put(g, 25, 2, BONE); rect(g, 24, 3, 3, 2, BONE); put(g, 25, 1, WHITE);
    rect(g, 23, 17, 3, 2, p[0]);
    rect(g, 12, 5, 8, 8, p[1]); rect(g, 12, 5, 8, 1, p[0]); rect(g, 12, 5, 1, 8, p[0]); rect(g, 18, 5, 2, 8, p[2]);
    rect(g, 13, 9, 6, 2, '#140c14');
    sym(g, 14, 9, glow(m));
    rect(g, 15, 5, 2, 4, GOLD[1]);
    rect(g, 12, 2, 8, 1, GOLD[0]); sym(g, 11, 3, GOLD[0]);
  },

  /** Tall wraith: spiked hood with glowing eyes, long clawed arms, a tattered floating robe. */
  Spectre(g, p, m) {
    for (let y = 12; y <= 27; y++) {
      const hw = Math.round(4 + (y - 12) * 0.35);
      for (let x = 16 - hw; x < 16 + hw; x++) {
        if (y > 23 && (x + (y >> 1)) % 3 === 0) continue; // ragged hem
        put(g, x, y, x < 16 - hw + 2 ? p[0] : x >= 16 + hw - 2 ? p[2] : p[1]);
      }
    }
    symLine(g, 11, 14, 6, 19, p[1]); symLine(g, 11, 15, 7, 19, p[2]);
    sym(g, 5, 20, BONE); sym(g, 6, 21, BONE); sym(g, 7, 21, BONE);
    for (const [x, y] of [[11, 5], [10, 4], [12, 4], [13, 3]]) sym(g, x, y, p[2]);
    blob(g, 16, 10, 6, 6, p);
    oval(g, 16, 11, 3.5, 3.5, '#0c0814');
    symRect(g, 13, 10, 2, 1, glow(m));
    sym(g, 14, 13, '#0c0814');
    return { float: true, after: [[6, 8, p[0]], [25, 6, p[0]], [27, 15, p[0]], [4, 14, p[0]]] };
  },

  /** Mushroom creature: a spotted cap over a pale stem with a face, puffing spores. */
  Spore(g, p, m) {
    const STEM = ['#f6ead2', '#dccaa8', '#ad9672'];
    symRect(g, 12, 25, 3, 2, STEM[2]);
    rect(g, 11, 14, 10, 11, STEM[1]); rect(g, 11, 14, 2, 11, STEM[0]); rect(g, 19, 14, 2, 11, STEM[2]);
    symRect(g, 9, 18, 2, 3, STEM[1]);
    blob(g, 16, 13, 11, 8.5, p, 12);
    rect(g, 7, 13, 18, 1, p[2]);
    for (const [x, y, r] of [[11, 8, 1], [19, 7, 1], [15, 6, 0], [22, 10, 0], [8, 11, 0], [16, 10, 0]]) {
      rect(g, x, y, r + 1, r + 1, STEM[0]);
    }
    face(g, 17, 2, m, p);
    const spore = p[4];
    return { after: [[4, 16, spore], [6, 20, spore], [26, 17, spore], [27, 22, spore], [24, 4, spore], [5, 5, spore]] };
  },

  /** Raider in a horned helm with a red bandana mask and an axe. */
  Marauder(g, p, m) {
    const LEATHER = ['#a07048', '#7a5236', '#4e3220'];
    symRect(g, 12, 22, 3, 4, '#4a3a30'); symRect(g, 11, 26, 4, 2, '#2e221c');
    rect(g, 10, 13, 12, 9, LEATHER[1]); rect(g, 10, 13, 2, 9, LEATHER[0]); rect(g, 20, 13, 2, 9, LEATHER[2]);
    for (let i = 0; i < 8; i++) put(g, 11 + i, 13 + i, LEATHER[2]);
    rect(g, 10, 20, 12, 1, '#2e221c'); rect(g, 15, 20, 2, 1, GOLD[0]);
    symRect(g, 7, 13, 3, 7, p[1]); symRect(g, 7, 13, 3, 2, '#8a8f9a'); symRect(g, 7, 20, 3, 2, p[0]);
    line(g, 25, 8, 25, 24, '#8a5a2a');
    rect(g, 26, 7, 2, 6, '#c8ced8'); put(g, 28, 8, '#c8ced8'); put(g, 28, 11, '#c8ced8'); rect(g, 26, 7, 1, 6, '#e8edf4');
    rect(g, 23, 18, 3, 2, p[0]);
    blob(g, 16, 9, 5, 5, p);
    rect(g, 11, 4, 10, 3, '#8a8f9a'); rect(g, 11, 4, 10, 1, '#c8ced8'); rect(g, 15, 4, 2, 4, '#6a6f7a');
    for (const [x, y] of [[10, 5], [9, 4], [9, 3], [10, 2]]) sym(g, x, y, BONE);
    rect(g, 12, 11, 8, 3, '#b8323a'); rect(g, 12, 11, 8, 1, '#d84a52');
    face(g, 9, 2, m, p, { noMouth: true, noBlush: true });
  },

  /** Crow herald: wide ragged wings, a feather crest, a hooked beak and talons. */
  Harbinger(g, p, m) {
    for (let x = 1; x <= 10; x++) {
      const top = 8 + Math.floor((10 - x) / 2), bottom = 19 - Math.floor((10 - x) / 3) + (x % 2);
      for (let y = top; y <= bottom; y++) sym(g, x, y, (y - top) % 3 === 2 ? p[1] : p[2]);
    }
    rect(g, 14, 24, 4, 3, p[2]);
    sym(g, 13, 25, GOLD[1]); sym(g, 13, 26, GOLD[1]); sym(g, 12, 27, GOLD[1]); sym(g, 14, 27, GOLD[1]);
    blob(g, 16, 18, 6, 7, p);
    oval(g, 16, 20, 3, 4, p[0]);
    blob(g, 16, 10, 5, 4.5, p);
    for (const [x, y] of [[15, 5], [14, 4], [15, 3], [13, 5]]) sym(g, x, y, p[2]);
    face(g, 9, 2, m, p, { noMouth: true, noBlush: true });
    rect(g, 15, 11, 2, 2, GOLD[0]); put(g, 16, 12, GOLD[1]); rect(g, 15, 13, 1, 1, GOLD[1]);
  },

  /** Young dragon: bat wings, horns, a snout with fangs, belly plates and a spiked tail. */
  Drake(g, p, m) {
    for (let x = 2; x <= 9; x++) {
      const top = 5 + Math.floor((x - 2) / 2), bottom = 16 + (x % 2);
      for (let y = top; y <= bottom; y++) sym(g, x, y, x % 3 === 2 || y === top ? p[2] : p[1]);
    }
    for (const [x, y] of [[21, 24], [22, 24], [23, 23], [24, 22], [25, 21], [26, 20]]) put(g, x, y, p[2]);
    put(g, 26, 19, BONE); put(g, 27, 20, BONE); put(g, 25, 20, BONE);
    symRect(g, 11, 24, 3, 4, p[2]); sym(g, 11, 27, BONE); sym(g, 13, 27, BONE);
    blob(g, 16, 20, 6, 6, p);
    for (let y = 16; y <= 24; y += 2) rect(g, 14, y, 4, 1, p[0]);
    for (const [x, y] of [[11, 7], [10, 6], [10, 5], [11, 4]]) sym(g, x, y, BONE);
    blob(g, 16, 10, 5.5, 5, p);
    rect(g, 13, 12, 6, 3, p[1]); rect(g, 13, 12, 6, 1, p[0]); put(g, 14, 13, EYE); put(g, 17, 13, EYE);
    face(g, 9, 2, m, p, { noMouth: true, noBlush: true });
    rect(g, 14, 15, 4, 1, MOUTH); sym(g, 14, 16, FANG);
  },

  /** Crystal paragon: faceted body with a gem core, floating shard shoulders and fists. */
  Paragon(g, p, m) {
    symRect(g, 12, 22, 3, 5, p[2]); sym(g, 13, 27, p[2]);
    for (let y = 9; y <= 22; y++) {
      const hw = Math.max(1, 7 - Math.abs(y - 15));
      for (let x = 16 - hw; x < 16 + hw; x++) put(g, x, y, x < 16 ? (y > 18 ? p[1] : p[0]) : y > 18 ? p[2] : p[1]);
    }
    for (let i = 0; i < 4; i++) { put(g, 12 + i, 12 + i, p[2]); put(g, 19 - i, 12 + i, p[0]); }
    rect(g, 15, 14, 2, 3, p[4]); put(g, 15, 14, WHITE);
    diamond(g, 7, 11, 2, p); diamond(g, 24, 11, 2, p);
    diamond(g, 6, 19, 2, p); diamond(g, 25, 19, 2, p);
    for (let y = 2; y <= 10; y++) {
      const hw = Math.max(0, 3 - Math.abs(y - 6));
      for (let x = 16 - hw - 1; x < 16 + hw + 1; x++) put(g, x, y, x < 16 ? p[0] : p[1]);
    }
    rect(g, 15, 0, 2, 2, p[0]); sym(g, 13, 2, p[0]);
    symRect(g, 14, 6, 1, 1, glow(m));
    return { after: [[3, 6, WHITE], [28, 15, WHITE], [4, 25, p[0]], [27, 4, p[0]]] };
  },

  /** Floating jellyfish: a frilled bell with a glowing heart and long wavy tendrils. */
  Jelly(g, p, m) {
    for (const [x0, ph] of [[11, 0], [13, 2], [15, 1], [16, 3], [18, 0], [20, 2]]) {
      for (let y = 17; y <= 27; y++) put(g, x0 + Math.round(Math.sin((y + ph) * 0.7)), y, y % 2 ? p[1] : p[0]);
    }
    blob(g, 16, 13, 8, 8, p, 15);
    for (let x = 8; x <= 23; x++) put(g, x, 16, x % 2 ? p[2] : p[1]);
    for (let x = 9; x <= 22; x += 2) put(g, x, 17, p[2]);
    oval(g, 16, 9, 2.5, 2, p[4]); put(g, 15, 8, WHITE);
    face(g, 13, 2, m, p, { noBlush: true });
    return { float: true };
  },

  /** Boulder golem: lumpy rock body, a small head, heavy fists and crystals growing on it. */
  Golem(g, p, m) {
    symRect(g, 10, 24, 5, 4, p[2]);
    symRect(g, 6, 14, 3, 6, p[1]);
    blob(g, 7, 13, 3, 3, p); blob(g, 25, 13, 3, 3, p);
    blob(g, 16, 18, 9, 7, p);
    for (const [x, y] of [[12, 16], [13, 17], [19, 15], [20, 16], [17, 21], [16, 22]]) put(g, x, y, p[2]);
    blob(g, 6, 22, 3.5, 3.5, p); blob(g, 26, 22, 3.5, 3.5, p);
    blob(g, 16, 9, 4.5, 4, p);
    for (const [x, y] of [[11, 12], [10, 11], [21, 13], [22, 12]]) put(g, x, y, p[4]);
    face(g, 9, 1, m, p);
  },

  /** Towering armoured colossus filling the frame: huge pauldrons, belt, a tiny slit helm. */
  Colossus(g, p, m) {
    symRect(g, 10, 24, 5, 4, p[2]);
    rect(g, 7, 12, 18, 12, p[1]); rect(g, 7, 12, 2, 12, p[0]); rect(g, 22, 12, 3, 12, p[2]);
    rect(g, 15, 12, 2, 9, p[2]);
    rect(g, 7, 21, 18, 2, '#4a3c30'); rect(g, 15, 21, 2, 2, GOLD[0]);
    symRect(g, 1, 15, 5, 7, p[2]); symRect(g, 1, 22, 5, 4, p[1]);
    blob(g, 5, 12, 5, 4, p); blob(g, 27, 12, 5, 4, p);
    rect(g, 13, 5, 6, 7, p[1]); rect(g, 13, 5, 6, 1, p[0]); rect(g, 17, 5, 2, 7, p[2]);
    rect(g, 14, 8, 4, 1, '#140c14'); sym(g, 14, 8, m >= 0.67 ? glow(m) : '#8fe8ff');
    rect(g, 15, 2, 2, 3, p[4]);
  },

  /** Little flame spirit with a bright core. */
  Wisp(g, p, m) {
    oval(g, 16, 18, 6.5, 6.5, p[1]);
    for (let y = 5; y <= 12; y++) { const w = Math.max(1, Math.round((y - 5) * 0.8)); rect(g, 16 - w, y, w * 2, 1, p[1]); }
    for (const [x, y] of [[11, 10], [11, 11], [10, 9], [21, 8], [21, 9], [20, 10]]) put(g, x, y, p[1]);
    oval(g, 16, 19, 4, 4.5, p[0]);
    for (let y = 11; y <= 15; y++) { const w = Math.max(1, Math.round((y - 11) * 0.7)); rect(g, 16 - w, y, w * 2, 1, p[0]); }
    face(g, 19, 2, m, p);
    return { float: true, after: [[6, 14, p[4]], [25, 12, p[4]], [8, 25, p[4]], [24, 26, p[4]]] };
  },

  /** Crouching stone gargoyle: raised wings, curled horns, clawed hands on its knees. */
  Gargoyle(g, p, m) {
    for (let x = 3; x <= 10; x++) {
      const top = 3 + Math.round((x - 3) * 1.2), bottom = 15 - Math.round((10 - x) * 0.4);
      for (let y = top; y <= bottom; y++) sym(g, x, y, x % 3 === 0 ? p[1] : p[2]);
    }
    symRect(g, 9, 22, 5, 4, p[1]); symRect(g, 8, 26, 5, 2, p[2]);
    sym(g, 8, 27, BONE); sym(g, 10, 27, BONE); sym(g, 12, 27, BONE);
    blob(g, 16, 19, 6, 6, p);
    symRect(g, 10, 20, 2, 5, p[2]); sym(g, 10, 25, BONE);
    for (const [x, y] of [[13, 17], [14, 18], [18, 21]]) put(g, x, y, p[2]);
    sym(g, 10, 10, p[1]); sym(g, 9, 9, p[1]);
    blob(g, 16, 11, 5, 4.5, p);
    for (const [x, y] of [[12, 7], [11, 6], [11, 5], [12, 4]]) sym(g, x, y, p[0]);
    face(g, 11, 2, m, p, { noBlush: true });
  },

  /** Clockwork automaton: boxy body with a brass gear, segmented arms, a screen face, an antenna. */
  Automaton(g, p, m) {
    const JOINT = '#3a3a44';
    symRect(g, 12, 23, 2, 3, JOINT); symRect(g, 11, 26, 4, 2, p[2]);
    rect(g, 9, 13, 14, 10, p[1]); rect(g, 9, 13, 2, 10, p[0]); rect(g, 20, 13, 3, 10, p[2]);
    for (const [x, y] of [[10, 14], [21, 14], [10, 21], [21, 21]]) put(g, x, y, p[4]);
    oval(g, 16, 18, 3.2, 3.2, GOLD[1]); oval(g, 16, 18, 1.6, 1.6, GOLD[0]);
    for (const [x, y] of [[15, 14], [16, 14], [15, 21], [16, 21], [12, 17], [12, 18], [19, 17], [19, 18]]) put(g, x, y, GOLD[1]);
    symRect(g, 6, 14, 3, 3, p[2]); symRect(g, 6, 17, 3, 1, JOINT); symRect(g, 6, 18, 3, 3, p[2]);
    sym(g, 6, 21, JOINT); sym(g, 8, 21, JOINT);
    rect(g, 15, 11, 2, 2, JOINT);
    rect(g, 11, 4, 10, 7, p[1]); rect(g, 11, 4, 10, 1, p[0]); rect(g, 19, 4, 2, 7, p[2]);
    rect(g, 12, 5, 8, 4, '#1a2028');
    face(g, 7, 2, m, p, { noMouth: true, noBlush: true });
    for (let x = 13; x <= 18; x += 2) put(g, x, 9, p[2]);
    rect(g, 15, 2, 2, 2, p[2]); rect(g, 15, 0, 2, 2, p[4]);
  },

  /** Centipede rearing up: segments arching behind a head with mandibles, legs on every segment. */
  Crawler(g, p, m) {
    const segs = [[16, 6, 3], [16, 9.5, 3.5], [16, 13, 4], [16, 16.5, 4.5]];
    for (const [cx, cy, r] of segs) {
      symLine(g, Math.round(cx - r), Math.round(cy), Math.round(cx - r - 3), Math.round(cy + 2), p[2]);
      blob(g, cx, cy, r + 0.5, r * 0.8, p);
      rect(g, 13, Math.round(cy + r * 0.7), 6, 1, p[2]);
    }
    symLine(g, 13, 19, 8, 15, p[2]);
    symLine(g, 10, 22, 6, 25, p[2]); symLine(g, 11, 24, 8, 27, p[2]);
    blob(g, 16, 22, 6, 4.5, p);
    for (const [x, y] of [[11, 25], [12, 26], [13, 26]]) sym(g, x, y, BONE);
    face(g, 21, 2, m, p, { noMouth: true });
  },

  /** Sea serpent rising from the waves: finned head, scaled neck, humps behind. */
  Leviathan(g, p, m) {
    blob(g, 6, 25, 3.5, 4, p, 25); blob(g, 26, 25, 3.5, 4, p, 25);
    rect(g, 13, 13, 6, 13, p[1]); rect(g, 13, 13, 1, 13, p[0]); rect(g, 18, 13, 1, 13, p[2]);
    rect(g, 15, 14, 2, 11, p[0]);
    for (let y = 15; y <= 24; y += 2) rect(g, 15, y, 2, 1, p[1]);
    for (const [x, y] of [[12, 15], [11, 15], [10, 16], [12, 18], [11, 18]]) sym(g, x, y, p[4]);
    for (let x = 11; x <= 20; x += 2) { put(g, x, 4, p[2]); put(g, x, 3, p[2]); }
    for (const [x, y] of [[9, 7], [8, 6], [7, 5], [9, 8], [8, 8]]) sym(g, x, y, p[4]);
    blob(g, 16, 9, 7, 5, p);
    face(g, 8, 2, m, p, { noMouth: true });
    rect(g, 12, 12, 8, 1, MOUTH); sym(g, 12, 13, FANG); sym(g, 14, 13, FANG);
    for (let x = 0; x < S; x++) {
      const crest = 25 + ((x >> 1) % 2);
      for (let y = crest; y <= 28; y++) put(g, x, y, y === crest ? '#8ac8ff' : y === crest + 1 ? '#4a8ad8' : '#2e5a9a');
      if ((x >> 1) % 2 === 0) put(g, x, crest, '#e8f6ff');
    }
  },

  /** Massive beast seen head on: nose horn, tusks, tiny eyes, a broad back with plates. */
  Behemoth(g, p, m) {
    symRect(g, 6, 22, 5, 6, p[2]); symRect(g, 11, 23, 4, 5, p[1]);
    for (const x of [6, 8, 11, 13]) sym(g, x, 27, BONE);
    blob(g, 16, 17, 13, 9, p);
    for (let x = 6; x <= 26; x += 4) { const t = topY(g, x); if (t != null) put(g, x, t - 1, p[2]); }
    for (const [x, y] of [[4, 13], [3, 14], [4, 15]]) sym(g, x, y, p[2]);
    blob(g, 16, 17, 6, 6, p);
    rect(g, 15, 12, 2, 4, BONE); put(g, 15, 11, BONE);
    put(g, 14, 20, EYE); put(g, 17, 20, EYE);
    for (const [x, y] of [[12, 21], [11, 22], [11, 23]]) sym(g, x, y, BONE);
    face(g, 15, 3, m, p, { noMouth: true, noBlush: true });
  },

  /** Crowned skeletal sorcerer in a hooded robe, holding an orb staff, magic in the other hand. */
  Lich(g, p, m) {
    for (let y = 13; y <= 27; y++) {
      const hw = Math.round(4 + (y - 13) * 0.3);
      for (let x = 16 - hw; x < 16 + hw; x++) {
        if (y === 27 && x % 2) continue;
        put(g, x, y, x < 16 - hw + 2 ? p[0] : x >= 16 + hw - 2 ? p[2] : p[1]);
      }
    }
    rect(g, 15, 14, 2, 12, p[4]);
    line(g, 6, 5, 6, 27, '#5a3a24');
    oval(g, 6, 4, 2.2, 2.2, p[4]); put(g, 5, 3, WHITE);
    rect(g, 5, 17, 3, 2, BONE); symRect(g, 9, 14, 3, 5, p[1]);
    rect(g, 23, 15, 3, 2, BONE);
    oval(g, 16, 9, 6, 6, p[2]);
    rect(g, 12, 5, 8, 7, BONE); rect(g, 18, 5, 2, 7, '#cfc4a8');
    rect(g, 13, 12, 6, 2, BONE); for (let x = 13; x <= 18; x += 2) put(g, x, 12, '#8a7a5a');
    symRect(g, 13, 7, 2, 2, '#140c14'); sym(g, 14, 8, glow(Math.max(m, 0.9)));
    put(g, 15, 10, '#5a4a3a'); put(g, 16, 10, '#5a4a3a');
    rect(g, 12, 4, 8, 1, GOLD[0]); sym(g, 12, 3, GOLD[0]); rect(g, 15, 2, 2, 2, GOLD[0]); rect(g, 15, 4, 2, 1, '#ff5d7a');
    return { after: [[25, 12, p[4]], [26, 13, p[4]], [24, 11, p[4]], [27, 10, p[4]]] };
  },

  /** Broad hound with a spiked collar, floppy ears and a drooling grin. */
  Hound(g, p, m) {
    symRect(g, 9, 22, 3, 6, p[2]); symRect(g, 13, 23, 2, 5, p[1]);
    sym(g, 9, 27, BONE); sym(g, 13, 27, BONE);
    blob(g, 16, 19, 8, 6, p);
    rect(g, 10, 15, 12, 2, '#3a2a2a'); for (const x of [11, 14, 17, 20]) put(g, x, 14, BONE);
    symRect(g, 8, 8, 3, 4, p[2]); sym(g, 7, 10, p[2]); sym(g, 7, 11, p[2]);
    blob(g, 16, 11, 6, 5, p);
    rect(g, 13, 13, 6, 3, p[0]); rect(g, 15, 13, 2, 1, EYE);
    rect(g, 14, 15, 4, 1, MOUTH); sym(g, 14, 16, FANG);
    if (m < 0.67) rect(g, 16, 16, 2, 2, TONGUE);
    face(g, 10, 2, m, p, { noMouth: true, noBlush: true });
  },

  /** Three-headed serpent on a coiled body. */
  Hydra(g, p, m) {
    symRect(g, 9, 26, 3, 2, p[2]);
    for (let k = 0; k < 2; k++) { line(g, 12 + k, 20, 7 + k, 10, p[1]); line(g, 19 - k, 20, 24 - k, 10, p[1]); }
    rect(g, 15, 9, 2, 12, p[1]); put(g, 15, 12, p[0]); put(g, 15, 15, p[0]); put(g, 15, 18, p[0]);
    blob(g, 16, 22, 9, 5.5, p);
    oval(g, 16, 24, 5, 2.5, p[0]);
    const eye = m >= 0.67 ? glow(m) : EYE;
    for (const [cx, cy] of [[16, 7], [7, 9], [25, 9]]) {
      blob(g, cx, cy, 3.5, 3, p);
      const l = Math.floor(cx) - 2, r = Math.floor(cx) + 1;
      put(g, l, cy - 1, eye); put(g, r, cy - 1, eye);
      if (m >= 0.67) { put(g, l + 1, cy - 2, p[3]); put(g, r - 1, cy - 2, p[3]); }
      rect(g, l, cy + 1, r - l + 1, 1, MOUTH); put(g, l, cy + 2, FANG); put(g, r, cy + 2, FANG);
      put(g, l, cy - 3, p[2]); put(g, r, cy - 3, p[2]);
    }
  },

  /** Muscular giant with a golden laurel, a white beard, chained wrists and glowing tattoos. */
  Titan(g, p, m) {
    symRect(g, 10, 23, 5, 5, p[2]);
    rect(g, 11, 21, 10, 4, '#7a5a3a'); rect(g, 11, 21, 10, 1, GOLD[1]);
    symRect(g, 4, 12, 4, 10, p[1]); symRect(g, 3, 22, 5, 4, p[1]);
    symRect(g, 4, 20, 4, 1, '#8a8f9a'); sym(g, 5, 21, '#8a8f9a');
    sym(g, 5, 15, p[4]); sym(g, 6, 16, p[4]); sym(g, 5, 17, p[4]);
    blob(g, 16, 16, 8, 6, p);
    rect(g, 15, 13, 2, 5, p[2]); put(g, 14, 18, p[2]); put(g, 17, 18, p[2]); put(g, 14, 20, p[2]); put(g, 17, 20, p[2]);
    blob(g, 16, 8, 4, 4, p);
    rect(g, 13, 10, 6, 3, '#ece6d8'); rect(g, 14, 13, 4, 1, '#ece6d8');
    face(g, 7, 1, m, p, { noMouth: true, noBlush: true });
    rect(g, 12, 4, 8, 1, GOLD[0]); sym(g, 12, 3, '#7ac04a'); sym(g, 14, 3, '#7ac04a');
  },

  /** Jailer knight with a tower shield, a cross-slit helm and a lantern. */
  Warden(g, p, m) {
    symRect(g, 12, 23, 3, 5, p[2]);
    rect(g, 9, 12, 14, 14, '#4a2a3a');
    rect(g, 11, 12, 10, 11, p[1]); rect(g, 11, 12, 2, 11, p[0]); rect(g, 19, 12, 2, 11, p[2]);
    rect(g, 22, 17, 3, 2, p[1]); put(g, 24, 19, '#3a3a44');
    rect(g, 23, 20, 3, 4, '#3a3a44'); put(g, 24, 21, '#ffd84a'); put(g, 24, 22, '#ffb03a');
    rect(g, 5, 13, 8, 13, p[2]); rect(g, 5, 13, 8, 1, GOLD[1]); rect(g, 5, 25, 8, 1, GOLD[1]);
    rect(g, 5, 13, 1, 13, GOLD[1]); rect(g, 12, 13, 1, 13, GOLD[1]);
    rect(g, 8, 17, 2, 5, p[4]); rect(g, 7, 18, 4, 1, p[4]);
    rect(g, 12, 4, 8, 8, p[1]); rect(g, 12, 4, 8, 1, p[0]); rect(g, 18, 4, 2, 8, p[2]);
    rect(g, 13, 7, 6, 1, '#140c14'); rect(g, 15, 7, 2, 4, '#140c14');
    sym(g, 14, 7, m >= 0.67 ? glow(m) : '#8fe8ff');
  },

  /** Crowned lizard king, low and wide, with a fan crest and a forked tongue. */
  Basilisk(g, p, m) {
    for (const [x, y] of [[21, 24], [23, 23], [25, 22], [26, 21], [27, 20], [28, 19], [22, 24], [24, 23]]) put(g, x, y, p[2]);
    symRect(g, 5, 22, 4, 3, p[2]); symRect(g, 4, 25, 4, 2, p[2]);
    sym(g, 4, 27, BONE); sym(g, 6, 27, BONE);
    blob(g, 16, 21, 9, 5, p);
    oval(g, 16, 23, 5, 2, p[0]);
    for (let i = -3; i <= 3; i++) line(g, 16 + (i < 0 ? -1 : 0), 11, 16 + i * 2, 4, i % 2 ? p[4] : p[2]);
    blob(g, 16, 13, 6, 4.5, p);
    rect(g, 14, 8, 4, 1, GOLD[0]); put(g, 14, 7, GOLD[0]); put(g, 17, 7, GOLD[0]);
    face(g, 13, 2, m, p, { noMouth: true, noBlush: true });
    rect(g, 12, 16, 8, 1, MOUTH); put(g, 16, 17, '#e0405a'); put(g, 15, 18, '#e0405a'); put(g, 17, 18, '#e0405a');
  },

  /** Thin insectoid killer with scythe-blade arms and spiked shoulders. */
  Reaver(g, p, m) {
    for (let k = 0; k < 2; k++) { symLine(g, 13 + k, 21, 11 + k, 24, p[2]); symLine(g, 11 + k, 24, 12 + k, 27, p[2]); }
    blob(g, 16, 17, 4.5, 6, p);
    for (const [x, y] of [[11, 11], [10, 10], [9, 9]]) sym(g, x, y, p[2]);
    symLine(g, 11, 12, 6, 15, p[2]); symLine(g, 11, 13, 6, 16, p[1]);
    symLine(g, 6, 15, 3, 3, '#e8edf4'); symLine(g, 7, 15, 4, 3, '#9aa4b4');
    blob(g, 16, 8, 3.5, 3.5, p);
    sym(g, 14, 11, BONE); sym(g, 13, 12, BONE);
    sym(g, 13, 4, p[2]); sym(g, 12, 3, p[2]);
    face(g, 8, 1, m, p, { noMouth: true, noBlush: true });
  },

  /** Pot-bellied ogre with a spiked club, a hair tuft and upward tusks. */
  Ogre(g, p, m) {
    rect(g, 24, 6, 4, 9, '#8a5a2a'); rect(g, 24, 6, 1, 9, '#a87440');
    put(g, 23, 8, BONE); put(g, 28, 10, BONE); put(g, 23, 12, BONE); put(g, 28, 7, BONE);
    rect(g, 25, 15, 2, 8, '#6a4020');
    symRect(g, 10, 23, 5, 5, p[2]);
    symRect(g, 5, 13, 4, 9, p[1]);
    blob(g, 16, 18, 9, 7, p);
    oval(g, 16, 20, 5, 4, p[0]);
    rect(g, 10, 23, 12, 2, '#7a5a3a');
    symRect(g, 4, 21, 5, 3, p[1]);
    sym(g, 10, 9, p[1]);
    blob(g, 16, 9, 5.5, 5, p);
    put(g, 16, 3, p[2]); put(g, 15, 4, p[2]); put(g, 17, 3, p[2]);
    face(g, 8, 2, m, p, { noMouth: true, noBlush: true });
    rect(g, 13, 12, 6, 1, MOUTH); sym(g, 13, 11, BONE);
  },

  /** Armoured battering ram of a knight: horned helm, spiked pauldrons, banded plate. */
  Juggernaut(g, p, m) {
    symRect(g, 8, 23, 6, 5, p[2]); symRect(g, 8, 23, 6, 2, p[1]);
    rect(g, 6, 13, 20, 11, p[1]); rect(g, 6, 13, 2, 11, p[0]); rect(g, 23, 13, 3, 11, p[2]);
    rect(g, 6, 16, 20, 1, p[2]); rect(g, 6, 20, 20, 1, p[2]);
    for (const x of [9, 13, 18, 22]) { put(g, x, 15, p[4]); put(g, x, 19, p[4]); }
    blob(g, 6, 12, 4, 3, p); blob(g, 26, 12, 4, 3, p);
    for (const [x, y] of [[5, 9], [5, 8], [7, 9], [7, 8], [7, 7], [3, 10]]) sym(g, x, y, BONE);
    rect(g, 11, 5, 10, 8, p[1]); rect(g, 11, 5, 10, 1, p[0]); rect(g, 19, 5, 2, 8, p[2]);
    rect(g, 15, 1, 2, 5, BONE); put(g, 15, 0, BONE);
    sym(g, 10, 6, BONE); sym(g, 9, 5, BONE); sym(g, 9, 4, BONE);
    symRect(g, 12, 9, 3, 1, m >= 0.67 ? glow(m) : '#8fe8ff');
  },

  /** Masked phantom in a flowing cloak: smiling mask when meek, a wide grin when not. */
  Phantom(g, p, m) {
    for (let y = 10; y <= 27; y++) {
      const hw = 5 + Math.floor((y - 10) * 0.35);
      for (let x = 16 - hw; x < 16 + hw; x++) {
        if (y > 24 && (x + y) % 3 === 0) continue;
        put(g, x, y, x < 16 - hw + 2 ? p[0] : x >= 16 + hw - 2 ? p[2] : p[1]);
      }
    }
    symRect(g, 7, 17, 2, 3, p[0]);
    blob(g, 16, 10, 6, 6, p);
    oval(g, 16, 12, 3.5, 4, '#f4f0e8');
    sym(g, 14, 11, m >= 0.67 ? glow(m) : EYE); sym(g, 13, 10, '#c8c0b0');
    if (m < 0.67) { sym(g, 14, 14, '#5a4a5a'); sym(g, 15, 15, '#5a4a5a'); }
    else { rect(g, 13, 14, 6, 1, MOUTH); for (let x = 13; x <= 18; x += 2) put(g, x, 14, FANG); sym(g, 13, 13, MOUTH); }
    sym(g, 13, 13, p[4]);
    return { float: true };
  },

  /** Bulb plant creature with two leaves and root feet; thorny when strong. */
  Sprout(g, p, m) {
    symRect(g, 11, 25, 2, 2, '#8a5a2a'); sym(g, 10, 27, '#8a5a2a'); sym(g, 12, 27, '#8a5a2a');
    blob(g, 16, 19, 7, 6.5, p);
    rect(g, 15, 9, 2, 4, '#4a8a2a');
    oval(g, 12, 8, 3.5, 2, '#7ac04a'); oval(g, 20, 8, 3.5, 2, '#7ac04a');
    put(g, 11, 8, '#4a8a2a'); put(g, 12, 8, '#4a8a2a'); put(g, 19, 8, '#4a8a2a'); put(g, 20, 8, '#4a8a2a');
    if (m >= 0.67) for (const [x, y] of [[8, 17], [7, 18], [8, 21], [7, 22], [10, 14]]) sym(g, x, y, p[2]);
    else { put(g, 16, 6, '#ff9ac0'); put(g, 15, 5, '#ff9ac0'); put(g, 17, 5, '#ff9ac0'); put(g, 16, 5, '#ffe27a'); }
    face(g, 19, 2, m, p);
  },

  /** Raptor: feathered crest, toothy snout, little clawed arms, sickle claws and a long tail. */
  Raptor(g, p, m) {
    for (let k = 0; k < 2; k++) line(g, 20, 20 + k, 29, 16 + k, p[2]);
    symRect(g, 11, 22, 3, 3, p[1]); symRect(g, 12, 25, 2, 2, p[2]);
    sym(g, 11, 27, BONE); sym(g, 13, 27, BONE); sym(g, 10, 25, BONE);
    blob(g, 16, 19, 5.5, 5, p);
    for (let i = 0; i < 3; i++) { put(g, 13 + i, 16 + i, p[2]); put(g, 17 + i, 16 + i, p[2]); }
    sym(g, 11, 19, p[2]); sym(g, 10, 20, BONE);
    rect(g, 15, 11, 3, 5, p[1]);
    blob(g, 16, 8, 4.5, 4, p);
    rect(g, 14, 10, 4, 3, p[1]); rect(g, 14, 12, 4, 1, MOUTH); sym(g, 14, 13, FANG);
    for (const [x, y] of [[15, 3], [14, 4], [13, 5]]) sym(g, x, y, p[4]);
    face(g, 7, 1, m, p, { noMouth: true, noBlush: true });
  },

  /** Undead knight: rusted plate, a ribcage showing, skull in an open helm, sword planted. */
  Revenant(g, p, m) {
    symRect(g, 12, 23, 3, 5, p[2]);
    for (let x = 9; x <= 22; x++) for (let y = 12; y <= 24 + (x % 3); y++) put(g, x, y, '#3a2a3a');
    rect(g, 11, 12, 10, 11, p[1]); rect(g, 11, 12, 2, 11, p[0]); rect(g, 19, 12, 2, 11, p[2]);
    rect(g, 14, 15, 4, 4, '#140c14'); rect(g, 14, 15, 4, 1, BONE); rect(g, 14, 17, 4, 1, BONE);
    symRect(g, 8, 13, 3, 8, p[2]);
    rect(g, 22, 15, 3, 2, p[1]); rect(g, 22, 17, 5, 1, GOLD[1]); rect(g, 24, 18, 1, 9, '#c8ced8'); put(g, 24, 14, GOLD[1]);
    rect(g, 12, 4, 8, 8, p[1]); rect(g, 12, 4, 8, 1, p[0]);
    rect(g, 13, 7, 6, 4, '#140c14');
    sym(g, 14, 8, glow(Math.max(m, 0.9))); rect(g, 14, 10, 4, 1, BONE);
    sym(g, 11, 4, p[2]); sym(g, 11, 3, p[2]);
  },

  /** Shadow wraith: smoky body trailing off, long arms reaching up, a spiked crown, chains. */
  Wraith(g, p, m) {
    for (let y = 19; y <= 28; y++) {
      const hw = Math.max(1, Math.round(6 - (y - 19) * 0.6)), off = Math.round(Math.sin(y * 0.9) * 1.5);
      for (let x = 16 - hw + off; x < 16 + hw + off; x++) if ((x * 7 + y * 3) % 5) put(g, x, y, y % 2 ? p[2] : p[1]);
    }
    symLine(g, 11, 14, 5, 7, p[2]); symLine(g, 12, 14, 6, 7, p[2]);
    for (const [x, y] of [[4, 6], [5, 5], [6, 5], [4, 7]]) sym(g, x, y, BONE);
    blob(g, 16, 16, 6, 5, p);
    for (let x = 10; x <= 22; x += 2) put(g, x, 18 + ((x >> 1) % 2), '#8a8f9a');
    blob(g, 16, 9, 4.5, 4.5, p);
    oval(g, 16, 10, 2.5, 2.5, '#0c0814');
    sym(g, 15, 10, glow(Math.max(m, 0.9)));
    for (const [x, y] of [[13, 4], [14, 3], [12, 5]]) sym(g, x, y, p[2]);
    return { float: true };
  },

  /** Lion-headed chimera with goat horns and a snake for a tail. */
  Chimera(g, p, m) {
    for (let k = 0; k < 2; k++) line(g, 22 + k, 22, 27 + k, 14, '#4a8a3a');
    oval(g, 27.5, 12, 2, 2, '#5aa04a'); put(g, 28, 11, m >= 0.67 ? glow(m) : EYE); put(g, 29, 13, '#e0405a');
    symRect(g, 9, 23, 4, 5, p[2]); sym(g, 9, 27, BONE); sym(g, 11, 27, BONE);
    blob(g, 16, 19, 8, 6, p);
    oval(g, 16, 12, 8, 7.5, p[2]);
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      put(g, Math.round(16 + Math.cos(ang) * 8.5 - 0.5), Math.round(12 + Math.sin(ang) * 8 - 0.5), p[2]);
    }
    for (const [x, y] of [[9, 5], [8, 4], [8, 3], [9, 2]]) sym(g, x, y, BONE);
    blob(g, 16, 12, 5, 4.5, p);
    rect(g, 14, 14, 4, 2, p[0]); put(g, 15, 14, EYE); put(g, 16, 14, EYE);
    face(g, 11, 2, m, p, { noMouth: true, noBlush: true });
    rect(g, 14, 16, 4, 1, MOUTH); sym(g, 14, 17, FANG);
  },

  /** Big demon: curled horns, bat wings, a muscular torso, hooves and an arrow tail. */
  Fiend(g, p, m) {
    for (let x = 2; x <= 9; x++) {
      const top = 4 + Math.floor((x - 2) / 2), bottom = 15 + (x % 2);
      for (let y = top; y <= bottom; y++) sym(g, x, y, x % 3 === 2 || y === top ? p[3] : p[2]);
    }
    for (const [x, y] of [[21, 24], [22, 25], [24, 25], [25, 24], [26, 23], [26, 22], [25, 21], [27, 21], [26, 20]]) put(g, x, y, p[2]);
    symRect(g, 11, 22, 3, 4, p[2]); symRect(g, 10, 26, 4, 2, '#2a1a1a');
    symRect(g, 6, 13, 3, 8, p[1]); sym(g, 6, 21, BONE); sym(g, 8, 21, BONE);
    blob(g, 16, 17, 7, 6, p);
    rect(g, 15, 14, 2, 4, p[2]); put(g, 14, 19, p[2]); put(g, 17, 19, p[2]);
    blob(g, 16, 9, 4.5, 4.5, p);
    for (const [x, y] of [[12, 6], [11, 5], [10, 4], [9, 4], [8, 5], [8, 6], [9, 7]]) sym(g, x, y, BONE);
    face(g, 9, 1, m, p, { noBlush: true });
  },

  /** Horned beetle: split shell with a shine, a rhino horn, six legs. */
  Beetle(g, p, m) {
    symLine(g, 10, 17, 5, 19, p[3]); symLine(g, 10, 20, 4, 23, p[3]); symLine(g, 11, 23, 6, 27, p[3]);
    blob(g, 16, 18, 8, 7.5, p);
    rect(g, 15, 12, 2, 13, p[2]);
    sym(g, 12, 13, p[0]); sym(g, 11, 14, p[0]); sym(g, 12, 14, p[0]);
    blob(g, 16, 9.5, 4.5, 3, p);
    rect(g, 15, 2, 2, 6, p[2]); put(g, 17, 2, p[2]); put(g, 17, 1, p[2]); put(g, 15, 1, p[1]);
    sym(g, 13, 10, m >= 0.67 ? glow(m) : EYE);
    if (m < 0.34) sym(g, 13, 9, WHITE);
    sym(g, 13, 12, BONE);
  },

  /** Six-winged seraph of light with a halo, eyes on its wings. */
  Seraph(g, p, m) {
    for (let k = 0; k < 3; k++) {
      symLine(g, 12, 8 + k, 3, 1 + k, k === 2 ? p[1] : p[0]);
      symLine(g, 11, 12 + k, 2, 11 + k, k === 2 ? p[1] : p[0]);
      symLine(g, 12, 16 + k, 4, 22 + k, k === 2 ? p[1] : p[0]);
    }
    sym(g, 6, 4, p[4]); sym(g, 5, 12, p[4]); sym(g, 7, 20, p[4]);
    for (let y = 10; y <= 24; y++) {
      const hw = Math.round(2 + (y - 10) * 0.15);
      for (let x = 16 - hw; x < 16 + hw; x++) put(g, x, y, x < 16 ? p[0] : p[1]);
    }
    blob(g, 16, 7, 3, 3, p);
    sym(g, 15, 7, m >= 0.67 ? glow(m) : WHITE);
    rect(g, 13, 2, 6, 1, GOLD[0]); sym(g, 12, 3, GOLD[0]);
    return { float: true };
  },

  /** Fat warty toad sitting with its eyes on top and a wide mouth. */
  Toad(g, p, m) {
    blob(g, 8, 23, 4, 4, p); blob(g, 24, 23, 4, 4, p);
    symRect(g, 11, 26, 3, 2, p[1]); sym(g, 11, 27, p[0]); sym(g, 13, 27, p[0]);
    blob(g, 16, 20, 9, 7, p);
    oval(g, 16, 23, 6, 3.5, p[0]);
    for (const [x, y] of [[9, 17], [22, 16], [11, 21], [21, 21], [8, 20]]) put(g, x, y, p[2]);
    blob(g, 11, 12, 3, 3, p); blob(g, 21, 12, 3, 3, p);
    face(g, 12, 3, m, p, { noMouth: true });
    rect(g, 9, 17, 14, 1, MOUTH);
    if (m < 0.34) sym(g, 9, 16, MOUTH); else sym(g, 8, 18, MOUTH);
  },

  /** Tiny glowing mote with a halo of sparks. */
  Mote(g, p, m) {
    blob(g, 16, 17, 5, 5, p);
    face(g, 17, 1, m, p);
    const ring = [];
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      ring.push([Math.round(16 + Math.cos(ang) * 8 - 0.5), Math.round(17 + Math.sin(ang) * 8 - 0.5), a % 2 ? p[4] : p[0]]);
    }
    return { float: true, after: ring };
  },
};

/* ---------- assembly ---------- */

/** sprite -> { type, adj, rank, numeral, name } for every monster, from its name in enemies.json. */
const MONSTERS = {};
/** encounter key (`<pool>#<index>`) -> sprite. */
const SPRITE_OF = {};
MONSTER_ORDER.forEach((sprite, rank) => {
  // "Dusty Djinn II": the roman numeral marks a stronger variant of the same type
  const words = NAME_OF[sprite].split(' ');
  const numeral = /^I+$/.test(words[words.length - 1]) ? words.pop().length : 1;
  MONSTERS[sprite] = { type: words[words.length - 1], adj: words[0], rank, numeral, name: NAME_OF[sprite] };
});
for (const [pool, list] of Object.entries(enemyData.pools)) list.forEach((e, i) => { SPRITE_OF[`${pool}#${i}`] = e.sprite; });

/**
 * Looks past the first tier's most serious (menace 1), by menace:
 *   1+   duskier palette and drifting embers;  1.5+ blood-red rim;
 *   4+   a red aura;  10+ violet (abyssal) aura and embers;  18+ golden (celestial) aura and sparks.
 */
const TIERS = [
  { from: 18, rim: '#6a4a08', aura: 'rgba(255,210,90,0.38)', embers: ['#ffe27a', '#ffffff'] },
  { from: 10, rim: '#3a0a6a', aura: 'rgba(150,70,255,0.34)', embers: ['#b06aff', '#ff5ad0'] },
  { from: 4, rim: '#8a0a1e', aura: 'rgba(210,30,40,0.30)', embers: ['#ff8a3a', '#ff3a3a'] },
  { from: 1.5, rim: '#8a0a1e', aura: null, embers: ['#ffb03a', '#ff5a3a'] },
  { from: 1, rim: null, aura: null, embers: ['#ffb03a', '#ffb03a'] },
];

/** Colours laid over the top edge of the silhouette per adjective (moss, frost, ash). */
const TOP_COAT = { Mossy: ['#d6ef7a', '#a6d44c'], Frost: ['#ffffff', '#dff4ff'], Ashen: ['#eeeae6', '#cfc8c2'] };

/** Numbered variants take a tint so they don't read as the original: II violet, III crimson. */
const NUMERAL_TINT = { 2: ['#7a3ac8', '#c79bff', '#e3c8ff'], 3: ['#c8203a', '#ff7a8a', '#ffc0c8'] };

/** Pixel grid of a monster (rows of colours or null). */
export function monsterGrid(sprite) {
  const def = MONSTERS[sprite];
  if (!def || !DRAW[def.type]) return null;
  // menace: 0 cozy .. 1 the first tier's most serious; stronger monsters go past 1
  const m = def.rank / SERIOUS_RANK;
  const tier = TIERS.find((t) => m >= t.from) ?? null;
  const base = PALETTES[def.adj] ?? PALETTES.Dim;
  // the strongest get a duskier palette (tones pulled toward the outline colour)
  const dusk = Math.min(0.32, Math.max(0, m - 0.6) * 0.55);
  const numeral = NUMERAL_TINT[Math.min(def.numeral, 3)];
  const tint = (c) => (numeral ? mix(c, numeral[0], 0.22) : c);
  const p = base.map((c, i) => (i < 3 ? tint(mix(c, base[3], dusk)) : c));
  const rim = tier?.rim ? mix(p[3], tier.rim, 0.55) : p[3];
  const g = grid();
  const info = DRAW[def.type](g, p, m) ?? {};
  const coat = TOP_COAT[def.adj];
  if (coat) {
    for (let x = 6; x < 26; x++) {
      const t = topY(g, x);
      if (t != null && x % 3 !== 0) put(g, x, t, coat[x % 2]);
    }
  }
  if (def.adj === 'Mossy' && m < 0.5) {
    const t = Math.min(topY(g, 15) ?? S, topY(g, 16) ?? S);
    put(g, 16, t - 1, '#4f8f2e'); put(g, 15, t - 2, '#8fd45a'); put(g, 17, t - 2, '#8fd45a'); put(g, 16, t - 2, '#4f8f2e');
  }
  if (def.adj === 'Thorned' || def.adj === 'Bristle') {
    for (let x = 7; x < 25; x += 3) { const t = topY(g, x); if (t != null && t > 0) put(g, x, t - 1, def.adj === 'Thorned' ? p[2] : p[0]); }
  }
  if (def.adj === 'Hallowed') {
    const t = Math.min(topY(g, 15) ?? S, topY(g, 16) ?? S);
    if (t >= 3) { rect(g, 13, t - 3, 6, 1, GOLD[0]); sym(g, 12, t - 2, GOLD[0]); }
  }
  // dark outline around the silhouette
  const out = g.map((row) => row.slice());
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) out[y][x] = rim;
  }
  // aura ring just outside the outline for the strongest
  if (tier?.aura) {
    const ring = out.map((row) => row.slice());
    for (let y = 0; y < 29; y++) for (let x = 0; x < S; x++) {
      if (out[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => out[y + dy]?.[x + dx])) ring[y][x] = tier.aura;
    }
    out.splice(0, S, ...ring);
  }
  // soft shadow on the ground (smaller and fainter under floating monsters)
  const [x0, x1, rows] = info.float ? [11, 20, [30]] : [9, 22, [29, 30]];
  for (let x = x0; x <= x1; x++) for (const y of rows) {
    const edge = x < x0 + 2 || x > x1 - 2 || y === 30;
    if (!out[y][x]) out[y][x] = info.float ? 'rgba(0,0,0,0.14)' : edge ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.28)';
  }
  // unoutlined extras: cozy sparkles, embers, runes, weather
  const extras = [...(info.after ?? [])];
  if (m < 0.25) extras.push([5, 5, '#fff4b8'], [4, 6, '#fff4b8'], [5, 6, WHITE], [6, 6, '#fff4b8'], [5, 7, '#fff4b8'], [26, 12, '#fff4b8']);
  if (tier) {
    // embers drifting around monsters past the first tier, more of them the stronger they are
    const spots = [[4, 4], [27, 6], [3, 13], [28, 12], [5, 21], [26, 24], [8, 2], [23, 2], [2, 26]];
    const n = Math.min(spots.length, Math.round((m - 1) * 8));
    spots.slice(0, n).forEach(([x, y], i) => extras.push([x, y, tier.embers[i % 2]]));
  }
  if (numeral) extras.push([4, 9, numeral[1]], [27, 10, numeral[1]], [5, 16, numeral[2]], [26, 18, numeral[2]]);
  if (def.adj === 'Dusty') extras.push([5, 10, '#f6e6b8'], [26, 8, '#f6e6b8'], [24, 16, '#e8d49c'], [7, 23, '#e8d49c']);
  if (def.adj === 'Frost') extras.push([4, 7, WHITE], [27, 9, WHITE], [6, 24, '#e6f8ff'], [25, 21, '#e6f8ff']);
  if (def.adj === 'Storm') extras.push([4, 8, '#fff06a'], [5, 9, '#fff06a'], [27, 5, '#fff06a'], [26, 6, '#fff06a']);
  if (def.adj === 'Venom' || def.adj === 'Blight') extras.push([5, 20, p[4]], [26, 18, p[4]], [24, 26, p[4]], [7, 26, p[4]]);
  for (const [x, y, c] of extras) if (x >= 0 && x < S && y >= 0 && y < S && !out[y][x]) out[y][x] = c;
  return out;
}

const cache = new Map();

/** SVG of the monster drawn for an encounter key or sprite name, or null if it has no art. */
export function monsterSvg(key) {
  const sprite = SPRITE_OF[key] ?? key;
  if (cache.has(sprite)) return cache.get(sprite);
  const g = monsterGrid(sprite);
  let svg = null;
  if (g) {
    let rects = '';
    g.forEach((row, y) => {
      for (let x = 0; x < S;) {
        const c = row[x];
        let w = 1;
        while (x + w < S && row[x + w] === c) w++;
        if (c) rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
        x += w;
      }
    });
    svg = `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${rects}</svg>`;
  }
  cache.set(sprite, svg);
  return svg;
}

/** Names of the monsters with art, weakest first (for tests and tools). */
export const monsterNames = () => MONSTER_ORDER.map((s) => MONSTERS[s]?.name);

/** Type word of every monster (for tests). */
export const monsterTypes = () => [...new Set(MONSTER_ORDER.map((s) => MONSTERS[s].type))];

/** True when a type has a drawing. */
export const hasMonsterType = (type) => !!DRAW[type];

const imageCache = new Map();
const rgbaCache = new Map();

/** '#rrggbb' or 'rgba(r,g,b,a)' -> [r, g, b, a 0..255] (cached: the palette is small). */
function rgba(c) {
  let v = rgbaCache.get(c);
  if (!v) {
    if (c[0] === '#') v = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).concat(255);
    else {
      const n = c.slice(c.indexOf('(') + 1, -1).split(',').map(Number);
      v = [n[0], n[1], n[2], Math.round((n[3] ?? 1) * 255)];
    }
    rgbaCache.set(c, v);
  }
  return v;
}

/**
 * Pixels of the monster as ImageData (browser only), for drawing on a small canvas: one element
 * instead of hundreds of SVG rects, and no image encoding, so long lists like the bestiary stay
 * light. `silhouette` gives the unknown-creature shadow (black at 45%). Cached per sprite; null
 * for monsters without art.
 */
export function monsterPixels(key, silhouette = false) {
  const sprite = SPRITE_OF[key] ?? key;
  const id = silhouette ? `${sprite}#silhouette` : sprite;
  if (imageCache.has(id)) return imageCache.get(id);
  const g = typeof ImageData !== 'undefined' ? monsterGrid(sprite) : null;
  let img = null;
  if (g) {
    img = new ImageData(S, S);
    g.forEach((row, y) => row.forEach((c, x) => {
      if (!c) return;
      const [r, gr, b, a] = rgba(c);
      const o = (y * S + x) * 4;
      if (silhouette) img.data[o + 3] = Math.round(a * 0.45);
      else { img.data[o] = r; img.data[o + 1] = gr; img.data[o + 2] = b; img.data[o + 3] = a; }
    }));
  }
  imageCache.set(id, img);
  return img;
}

/** True when the encounter key or sprite has pixel art. */
export const hasMonsterArt = (key) => !!MONSTERS[SPRITE_OF[key] ?? key] && !!DRAW[MONSTERS[SPRITE_OF[key] ?? key].type];
