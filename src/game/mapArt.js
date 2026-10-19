/**
 * Hand-made map backgrounds, drawn in the map editor and saved as JSON in public/assets/maps:
 *   - tilesets embedded as data URLs; tile layers are flat arrays of tile ids (-1 = empty),
 *     see mapArtTilesets. Every tile is drawn at the map's tile size, whatever its tileset's.
 *   - placed sprites (trees, bushes...) with their frames embedded in `spriteAssets`
 *     (editor export), anchored at the bottom-centre of their tile.
 *   - layers drawn in the editor's layer order (`layerStack`), hidden ones skipped.
 * The result is stretched over the whole map, so rules (areas, bosses, exits) keep the
 * original map size. Keys are map ids; maps without art keep the procedural terrain.
 */
import namedMaps from '../data/namedMaps.json';

const MAP_ART = {
  1: 'map1',
  2: 'map2',
  3: 'map3',
  4: 'map4',
  5: 'map5',
};
// maps with no original counterpart (src/data/namedMaps.json): their art is the file they are named after
for (const m of namedMaps.maps) MAP_ART[m.id] = m.art;

/** Pixel size of one map tile in the sprite art when the export does not say (editor's PACK_BASE_TILE). */
const DEFAULT_BASE_TILE = 32;

export const hasMapArt = (mapId) => Boolean(MAP_ART[mapId]);
export const mapArtKey = (mapId) => `map-art-${mapId}`;
export const mapArtTilesetKey = (mapId, firstGid) => `map-art-tiles-${mapId}-${firstGid}`;
export const mapArtSpriteKey = (mapId, asset, frame) => `map-art-sprite-${mapId}-${asset}-${frame}`;
export const mapArtUrl = (mapId) => (MAP_ART[mapId] ? `${import.meta.env.BASE_URL}assets/maps/${MAP_ART[mapId]}.json` : null);

/**
 * Layers bottom to top ({ id, kind, opacity }): the visible tile and sprite layers, and the area
 * layer (where the game draws the area borders and labels; kept even when hidden in the editor,
 * which hides only its overlay). Files without a layer stack have ground + decor.
 */
export function mapArtLayers(art) {
  const stack = Array.isArray(art?.layerStack) ? art.layerStack : [{ id: 'ground', kind: 'tile' }, { id: 'decor', kind: 'tile' }];
  return stack
    .filter((l) => l.kind === 'area' || (l.visible !== false && (l.kind === 'tile' || l.kind === 'sprite')))
    .map((l) => ({ id: l.id, kind: l.kind, opacity: l.opacity ?? 1 }));
}

/**
 * Tilesets used by the tile layers: [{ firstGid, dataUrl, tileW, tileH }]. Editor files from
 * version 4 have several (tile value = firstGid + index in that tileset); older files have a
 * single `tileset`, starting at 0. A tile belongs to the tileset with the highest firstGid <= it.
 */
export function mapArtTilesets(art) {
  const list = Array.isArray(art?.tilesets) ? art.tilesets : art?.tileset ? [{ ...art.tileset, firstGid: 0 }] : [];
  const sets = list
    .filter((t) => t.dataUrl)
    .map((t) => ({ firstGid: t.firstGid ?? 0, dataUrl: t.dataUrl, tileW: t.tileW ?? 32, tileH: t.tileH ?? 32 }))
    .sort((a, b) => a.firstGid - b.firstGid);
  const used = new Set();
  for (const layer of mapArtLayers(art)) {
    if (layer.kind !== 'tile') continue;
    for (const gid of art.layerData?.[layer.id] ?? []) {
      const set = tilesetOf(sets, gid);
      if (set) used.add(set);
    }
  }
  return sets.filter((t) => used.has(t));
}

/** Tileset of a tile id (sorted list), or null for empty tiles. */
export function tilesetOf(sets, gid) {
  if (gid < 0) return null;
  let found = null;
  for (const t of sets) if (t.firstGid <= gid) found = t;
  return found;
}

/**
 * Placed sprites with embedded frames, in the editor's depth order (lower on screen later):
 * [{ index, asset, frames: [{ w, h, duration }], x, y, w, h }] with x/y/w/h in art pixels and
 * index the position in art.sprites.
 */
export function mapArtSprites(art) {
  const assets = art?.spriteAssets ?? {};
  const ids = Object.keys(assets);
  const ts = art.tileSize ?? 32;
  return (art?.sprites ?? [])
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.y - b.s.y || a.s.x - b.s.x || a.i - b.i)
    .map(({ s, i }) => {
      const asset = assets[s.assetId];
      if (!asset?.frames?.length) return null;
      const scale = ts / (asset.baseTile || DEFAULT_BASE_TILE);
      const w = asset.frames[0].w * scale;
      const h = asset.frames[0].h * scale;
      return { index: i, asset: ids.indexOf(s.assetId), frames: asset.frames, x: (s.x + 0.5) * ts - w / 2, y: (s.y + 1) * ts - h, w, h };
    })
    .filter(Boolean);
}

/** Embedded sprite frames to load: [{ asset, frame, dataUrl }]. */
export function mapArtSpriteFrames(art) {
  return Object.values(art?.spriteAssets ?? {}).flatMap((a, asset) => (a.frames ?? []).map((f, frame) => ({ asset, frame, dataUrl: f.dataUrl })));
}
