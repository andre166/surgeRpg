/**
 * Area layer of the map editor: the editor paints each art cell with an area id and keeps a
 * table of areas with their recommended level. It replaces the world.json area grid of the map:
 *   - art.layerData.area: width * height area ids (index = row * width + col), -1 = not painted
 *   - art.areas: [{ id, ref?, level?, name?, color? }] (name and color are editor-only).
 *     `id` is the area index on this map (the painted value); `ref` = "map:area" picks the
 *     world.json area it plays like (enemy pool, EXP...), on this map or another one
 *     ("7:6" = area 6 of map 7). Without `ref` it is area `id` of this map.
 * See world.setMapAreas.
 */
/** Area of the cells the editor left unpainted (-1) or painted with an unknown id. */
export const DEFAULT_AREA = 0;

/**
 * Grid and areas of a map from its art's area layer, in the shape of world.json
 * ({ grid: { cols, rows, cells }, areas }), or null when the layer is missing or empty.
 * `map` is the world.json map. Once a layer has any painted cell, the map's areas come only from
 * the editor: cells not painted (-1) or painted with an id that is not one of its areas are
 * DEFAULT_AREA (the original grid is not used). Each area takes the world.json data (enemy pool,
 * EXP...) of its `ref` (`maps`: the world.json maps, to look other maps up), else of this map's
 * area with the same id, with the editor's level when given and the level label moved to where
 * the area now is. Ids past this map's areas add areas (the list stays indexed by id).
 */
export function parseAreaLayer(art, map, maps = []) {
  const cols = art?.width ?? 0;
  const rows = art?.height ?? 0;
  const data = art?.layerData?.area;
  if (!map || !cols || !rows || !Array.isArray(data) || data.length !== cols * rows) return null;
  if (!data.some((v) => Number.isInteger(v) && v >= 0)) return null;

  const entries = new Map(); // id -> { level, source }
  for (const a of Array.isArray(art.areas) ? art.areas : []) {
    if (!Number.isInteger(a?.id) || a.id < 0 || entries.has(a.id)) continue;
    const level = Number(a?.level);
    entries.set(a.id, { level: Number.isFinite(level) && level > 0 ? level : null, source: refArea(a.ref, maps) });
  }
  const count = Math.max(map.areas.length, ...[...entries.keys()].map((id) => id + 1));

  const valid = (v) => Number.isInteger(v) && v >= 0 && v < count;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    const line = [];
    for (let col = 0; col < cols; col += 1) {
      const v = data[row * cols + col];
      line.push(valid(v) ? v : DEFAULT_AREA);
    }
    cells.push(line);
  }

  const labels = areaRegionLabels(cells);
  const areas = [];
  for (let id = 0; id < count; id += 1) {
    const entry = entries.get(id);
    const base = entry?.source?.area ?? map.areas[id] ?? map.areas[DEFAULT_AREA];
    areas.push({
      ...base,
      id,
      level: entry?.level ?? base.level,
      // the level its enemies were made for (editorMap.js rescales them when it differs)
      poolLevel: base.level,
      label: labels.get(id)?.[0] ?? [-1, -1],
      // every separate region of the area gets its own level label (the map scene draws them all)
      labels: labels.get(id) ?? [],
      ...(entry?.source && { source: entry.source.ref }),
    });
  }
  return { grid: { cols, rows, cells }, areas };
}

/** world.json area of a "map:area" reference ({ ref, area }), or null when it does not exist. */
export function refArea(ref, maps) {
  const m = /^\s*(\d+)\s*:\s*(\d+)\s*$/.exec(typeof ref === 'string' ? ref : '');
  if (!m) return null;
  const area = maps.find((x) => x.id === Number(m[1]))?.areas[Number(m[2])];
  return area ? { ref: `${Number(m[1])}:${Number(m[2])}`, area } : null;
}

/** Connected regions smaller than this many cells get no label of their own (slivers between areas). */
export const MIN_LABEL_CELLS = 16;

/**
 * Label positions of each area of a grid, in percent of the map ([x, y], like world.json): one
 * per connected region of the area (largest region first; regions under MIN_LABEL_CELLS are
 * skipped, except the largest), at the cell of the region closest to its centre.
 */
export function areaRegionLabels(cells) {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const seen = new Uint8Array(rows * cols);
  const regions = new Map(); // area -> [region cells]
  for (let start = 0; start < rows * cols; start += 1) {
    if (seen[start]) continue;
    const area = cells[Math.floor(start / cols)][start % cols];
    const region = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      region.push(i);
      const r = Math.floor(i / cols);
      const c = i % cols;
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const n = nr * cols + nc;
        if (seen[n] || cells[nr][nc] !== area) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    if (!regions.has(area)) regions.set(area, []);
    regions.get(area).push(region);
  }
  const centreCell = (region) => {
    let sx = 0;
    let sy = 0;
    for (const i of region) {
      sx += (i % cols) + 0.5;
      sy += Math.floor(i / cols) + 0.5;
    }
    const cx = sx / region.length;
    const cy = sy / region.length;
    let pick = region[0];
    let dist = Infinity;
    for (const i of region) {
      const d = ((i % cols) + 0.5 - cx) ** 2 + (Math.floor(i / cols) + 0.5 - cy) ** 2;
      if (d < dist) {
        dist = d;
        pick = i;
      }
    }
    return [(((pick % cols) + 0.5) / cols) * 100, ((Math.floor(pick / cols) + 0.5) / rows) * 100];
  };
  const labels = new Map();
  for (const [area, list] of regions) {
    // stable sort: equal sizes keep the scan order (top to bottom, left to right)
    const sorted = [...list].sort((a, b) => b.length - a.length);
    labels.set(area, sorted.filter((r, i) => i === 0 || r.length >= MIN_LABEL_CELLS).map(centreCell));
  }
  return labels;
}

/** Main label position of each area: the one of its largest connected region (areaRegionLabels). */
export function areaLabels(cells) {
  const labels = new Map();
  for (const [area, list] of areaRegionLabels(cells)) labels.set(area, list[0]);
  return labels;
}
