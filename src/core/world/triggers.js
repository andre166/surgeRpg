/**
 * Map triggers from the map editor's object layer. A trigger fires when the hero enters its
 * cell (once per entry: standing on it or arriving on it does not fire again).
 *
 * Teleport triggers come in two shapes, both accepted:
 *   - page transfer:  pages[0].transfer = { map, x, y, dir }
 *   - data JSON:      data = '{"map":"mapa2","dir":"left"}'
 * `map` empty = same map; otherwise a map name ending in its number ("mapa2", "map2", "2").
 * `x`/`y` are destination cells; without them the destination's spawn point is used.
 * `dir` is the direction the hero faces on arrival (up/down/left/right).
 *
 * Boss triggers (name "boss", data '{"boss":0}', optional "w"/"h" in map pixels) place a map
 * boss on their cell instead of the position in world.json; see parseBossTriggers. They are
 * not "enter the cell" triggers: the fight starts by touching the boss rectangle (bossTouch).
 * An optional "teleport" ('{"boss":"boss#2","teleport":"caverna_cristal"}') names the map the
 * hero is sent to after beating it, on that map's spawn point (session.js finishBattle).
 * The same trigger with a slime id ('{"boss":"slime#30"}') places a slime king (slimeBosses.js
 * SLIME_IDS); see parseSlimeTriggers.
 */

const DIRS = ['up', 'down', 'left', 'right'];

function parseData(data) {
  if (!data || typeof data !== 'string') return {};
  try {
    const v = JSON.parse(data);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/**
 * Size of the bosses placed by triggers against their original rectangle (world.json): half,
 * so they take less room on the hand-made maps. The boss art and circle follow the rectangle.
 * A trigger's own w/h is used as given.
 */
export const BOSS_MAP_SCALE = 0.5;

/** Boss rectangle when neither the trigger nor world.json gives one (map 1's first boss, scaled). */
export const DEFAULT_BOSS_SIZE = Object.freeze({ w: 188 * BOSS_MAP_SCALE, h: 112 * BOSS_MAP_SCALE });

/** Trigger that places a map boss: named "boss" or with a "boss" key in its data JSON. */
export function isBossTrigger(p) {
  if (p?.type !== 'trigger') return false;
  return /^\s*boss\s*$/i.test(p.name ?? '') || 'boss' in parseData(p.data);
}

const cellNumber = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Math.floor(Number(v)));

/** Teleport triggers of a map art JSON: [{ cell, col, row, map, x, y, dir }]. */
export function parseTriggers(art) {
  const width = art?.width ?? 0;
  const out = [];
  for (const p of art?.objectProps ?? []) {
    if (p?.type !== 'trigger' || !Number.isInteger(p.index)) continue;
    if (isBossTrigger(p)) continue;
    const transfer = (p.pages ?? []).map((pg) => pg?.transfer).find(Boolean);
    const data = parseData(p.data);
    const t = transfer ?? data;
    const isTeleport = Boolean(transfer) || /teleport|transfer/i.test(p.name ?? '') || 'map' in data || 'x' in data;
    if (!isTeleport) continue;
    out.push({
      cell: p.index,
      col: p.index % width,
      row: Math.floor(p.index / width),
      map: String(t.map ?? '').trim(),
      x: cellNumber(t.x),
      y: cellNumber(t.y),
      dir: DIRS.includes(t.dir) ? t.dir : null,
    });
  }
  return out;
}

/** Spawn cell of a map art JSON ({ col, row }) or null. */
export function spawnCell(art) {
  const width = art?.width ?? 0;
  const p = (art?.objectProps ?? []).find((o) => o?.type === 'spawn' && Number.isInteger(o.index));
  return p && width ? { col: p.index % width, row: Math.floor(p.index / width) } : null;
}

/**
 * Map id a trigger points to: a named map's editor file ("entrada_castelo", resolved by
 * `world.mapIdByName`), else its trailing number; the current map when empty.
 */
export function triggerMapId(trigger, currentMapId, world = null) {
  if (!trigger.map) return currentMapId;
  const named = world?.mapIdByName?.(trigger.map);
  if (named != null) return named;
  const m = /(\d+)\s*$/.exec(trigger.map);
  return m ? Number(m[1]) : null;
}

/** Art cell under a map position (x, y) of a w x h map drawn with cols x rows cells. */
export function cellAt(x, y, cols, rows, w, h) {
  const col = Math.floor((x / w) * cols);
  const row = Math.floor((y / h) * rows);
  if (col < 0 || row < 0 || col >= cols || row >= rows) return -1;
  return row * cols + col;
}

/** Map position of the centre of a cell. */
export function cellCentre(col, row, cols, rows, w, h) {
  return { x: ((col + 0.5) * w) / cols, y: ((row + 0.5) * h) / rows };
}

const positive = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

/**
 * Map bosses placed by boss triggers, in the shape of world.json's map.bosses:
 * [{ id, x, y, w, h, scale }] with x/y the centre of the trigger cell in map pixels.
 * Size: the trigger's w/h, else that boss's rectangle in world.json (defaultBosses) times
 * BOSS_MAP_SCALE, else DEFAULT_BOSS_SIZE. Invalid ids (not a whole number >= 0, or not in opts.validIds) and
 * repeated ids (the first one stays) are skipped.
 */
/**
 * Boss id of a trigger's data: a number (0, "0") or the bestiary id ("boss#0"); NaN when invalid.
 */
export function bossIdOf(raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return NaN;
  const m = /^\s*(?:boss\s*#\s*)?(\d+)\s*$/i.exec(raw);
  return m ? Number(m[1]) : NaN;
}

/** Slime id of a trigger's data ("slime#30"); NaN when it is not one. */
export function slimeIdOf(raw) {
  const m = typeof raw === 'string' ? /^\s*slime\s*#\s*(\d+)\s*$/i.exec(raw) : null;
  return m ? Number(m[1]) : NaN;
}

/**
 * Slime kings placed by boss triggers with a slime id: [{ id, x, y, w, h }] with x/y the
 * centre of the trigger cell in map pixels. Size: the trigger's w/h, else `defaultSize`. Ids
 * not in opts.validIds and repeated ids (the first one stays) are skipped.
 */
export function parseSlimeTriggers(art, map, defaultSize, { validIds = null } = {}) {
  const cols = art?.width ?? 0;
  const rows = art?.height ?? 0;
  if (!cols || !rows || !map) return [];
  const out = [];
  for (const p of art?.objectProps ?? []) {
    if (!Number.isInteger(p?.index) || !isBossTrigger(p)) continue;
    const data = parseData(p.data);
    const id = slimeIdOf(data.boss);
    if (!Number.isInteger(id) || (validIds && !validIds.has(id)) || out.some((s) => s.id === id)) continue;
    const { x, y } = cellCentre(p.index % cols, Math.floor(p.index / cols), cols, rows, map.w, map.h);
    out.push({ id, x, y, w: positive(data.w) ?? defaultSize.w, h: positive(data.h) ?? defaultSize.h });
  }
  return out;
}

export function parseBossTriggers(art, map, defaultBosses = [], { validIds = null } = {}) {
  const cols = art?.width ?? 0;
  const rows = art?.height ?? 0;
  if (!cols || !rows || !map) return [];
  const out = [];
  for (const p of art?.objectProps ?? []) {
    if (!Number.isInteger(p?.index) || !isBossTrigger(p)) continue;
    const data = parseData(p.data);
    const id = bossIdOf(data.boss);
    if (!Number.isInteger(id) || id < 0) continue;
    if (validIds && !validIds.has(id)) continue;
    if (out.some((b) => b.id === id)) continue;
    const def = defaultBosses.find((b) => b.id === id);
    const { x, y } = cellCentre(p.index % cols, Math.floor(p.index / cols), cols, rows, map.w, map.h);
    out.push({
      id,
      x,
      y,
      w: positive(data.w) ?? (def ? def.w * BOSS_MAP_SCALE : DEFAULT_BOSS_SIZE.w),
      h: positive(data.h) ?? (def ? def.h * BOSS_MAP_SCALE : DEFAULT_BOSS_SIZE.h),
      scale: def?.scale ?? 1,
      // '{"boss":"boss#2","teleport":"caverna_cristal"}': beating it sends the hero to that map's spawn
      ...(typeof data.teleport === 'string' && data.teleport.trim() && { teleport: data.teleport.trim() }),
    });
  }
  return out;
}

/**
 * Sprites (editor sprite layer) that stand on a boss trigger and so represent that boss:
 * Map<sprite index in art.sprites, boss id>. A sprite stands on the trigger when it is in the
 * trigger's column and its anchor (bottom) cell is the trigger cell or the one just below it.
 * The map scene hides them once the boss is beaten, like the boss circle.
 */
export function bossSprites(art) {
  const width = art?.width ?? 0;
  const owners = new Map();
  if (!width) return owners;
  for (const p of art?.objectProps ?? []) {
    if (!Number.isInteger(p?.index) || !isBossTrigger(p)) continue;
    const id = bossIdOf(parseData(p.data).boss);
    if (!Number.isInteger(id) || id < 0) continue;
    const col = p.index % width;
    const row = Math.floor(p.index / width);
    (art.sprites ?? []).forEach((s, i) => {
      if (s?.x === col && (s.y === row || s.y === row + 1) && !owners.has(i)) owners.set(i, id);
    });
  }
  return owners;
}
