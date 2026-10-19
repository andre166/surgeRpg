/**
 * Area content of the maps (src/content/areas/map<id>.json; core/encounters/areaMonsters.js),
 * bundled with the game. Edited by hand or with the area tool (npm run dev, then tools/areas.html).
 */
const files = import.meta.glob('../content/areas/*.json', { eager: true, import: 'default' });

const byMap = new Map();
for (const content of Object.values(files)) if (Number.isInteger(content?.map)) byMap.set(content.map, content);

/** Area content of a map, or null. */
export const areaContentFor = (mapId) => byMap.get(mapId) ?? null;
