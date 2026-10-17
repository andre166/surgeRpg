/**
 * Hero art, drawn as pixel art by scripts/draw-warrior.cjs, draw-thief.cjs, draw-mage.cjs,
 * draw-marin.cjs, draw-tamsin.cjs, draw-odo.cjs and draw-heroes.cjs (heroes 6-15):
 *   - <name>.png       front idle frame at 4x, used by the UI;
 *   - <name>-walk.png  walking atlas: rows down, right, up, left, plus an idle row (idleRow);
 *                      32x32 frames shown at exactly 2x with nearest-neighbour scaling (pixel: true).
 * Art cut from hand-made sheets (art/heroes, scripts/cut-hero-sprites.cjs / cut-hero-walk.cjs)
 * also works: frame sizes come from the generated <name>-walk.json, scaled smoothly.
 * Heroes without art keep the procedural sprite. Keys are hero indexes (0 = first hero).
 */
const HERO_ART = {
  // walkFrames: frames of each walking row to use;
  // walkRows (optional): per-direction frame list overriding that, e.g. { down: [0, 2] }
  // idleRow (optional): sheet row with a front-facing idle loop; pixel: crisp pixel-art scaling
  0: { name: 'thief', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  1: { name: 'warrior', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  2: { name: 'mage', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  3: { name: 'marin', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  4: { name: 'tamsin', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  5: { name: 'odo', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  // drawn by scripts/draw-heroes.cjs (eras alternate prehistoric / futuristic / medieval)
  6: { name: 'wren', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  7: { name: 'lior', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  8: { name: 'bastian', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  9: { name: 'nell', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  10: { name: 'corvin', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  11: { name: 'elka', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  12: { name: 'hollis', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  13: { name: 'petra', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  14: { name: 'dax', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
  15: { name: 'yara', walk: { frameWidth: 32, frameHeight: 32 }, walkFrames: 4, idleRow: 4, pixel: true },
};

/** Walking atlas layout: 4 columns, one row per direction. */
export const WALK_COLUMNS = 4;
export const WALK_DIRECTIONS = ['down', 'right', 'up', 'left'];

const base = () => `${import.meta.env.BASE_URL}assets/heroes/`;

export function heroArtUrl(index) {
  const a = HERO_ART[index];
  return a ? `${base()}${a.name}.png` : null;
}

export const heroArtKey = (index) => `hero-art-${index}`;

/** Walking atlas of a hero ({ key, url, frameWidth, frameHeight, frames }) or null. */
export function heroWalk(index) {
  const a = HERO_ART[index];
  return a ? { key: `hero-walk-${index}`, url: `${base()}${a.name}-walk.png`, ...a.walk, frames: a.walkFrames, rows: a.walkRows ?? {}, idleRow: a.idleRow ?? null, pixel: !!a.pixel } : null;
}

/** True for heroes drawn as pixel art (scale them with nearest-neighbour, never blur). */
export const heroArtPixel = (index) => !!HERO_ART[index]?.pixel;

export const heroWalkAnimKey = (index, dir) => `hero-walk-${index}-${dir}`;

export const HERO_ART_INDEXES = Object.keys(HERO_ART).map(Number);
