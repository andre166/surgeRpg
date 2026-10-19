/**
 * Vite dev-server plugin for the area tool (tools/areas.html): reads and writes the area content
 * files (src/content/areas/map<id>.json). Only on `vite` (serve); builds never include it.
 *   GET  /__tools/areas/<mapId>  -> the file, or { map, areas: [] }
 *   POST /__tools/areas/<mapId>  <- { map, areas: [...] } (checked, then written pretty-printed)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROUTE = /^\/__tools\/areas\/(\d{1,3})$/;

/** The content as it is saved, or an error message. */
export function cleanAreaContent(mapId, body) {
  if (!body || typeof body !== 'object' || body.map !== mapId || !Array.isArray(body.areas)) return { error: 'expected { map, areas: [] } for this map' };
  const areas = [];
  const seen = new Set();
  for (const a of body.areas) {
    if (!Number.isInteger(a?.id) || a.id < 0 || a.id > 255 || seen.has(a.id)) return { error: `bad or repeated area id ${a?.id}` };
    seen.add(a.id);
    const out = { id: a.id };
    if (typeof a.name === 'string' && a.name.trim()) out.name = a.name.trim().slice(0, 40);
    const level = Number(a.level);
    if (a.level != null && a.level !== '') {
      if (!Number.isFinite(level) || level < 1) return { error: `area ${a.id}: level must be >= 1` };
      out.level = Math.round(level);
    }
    if (Array.isArray(a.monsters) && a.monsters.length) {
      out.monsters = a.monsters.map((m) => ({ sprite: String(m?.sprite ?? ''), weight: Math.max(0, Math.round(Number(m?.weight) || 0)) }));
      if (out.monsters.some((m) => !/^[\w-]{1,32}$/.test(m.sprite))) return { error: `area ${a.id}: bad monster sprite` };
    }
    if (Object.keys(out).length > 1) areas.push(out);
  }
  areas.sort((x, y) => x.id - y.id);
  return { content: { map: mapId, areas } };
}

export function areaToolServer(root) {
  const dir = path.join(root, 'src/content/areas');
  return {
    name: 'surge-area-tool',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = ROUTE.exec((req.url ?? '').split('?')[0]);
        if (!m) return next();
        const mapId = Number(m[1]);
        const file = path.join(dir, `map${mapId}.json`);
        const send = (status, obj) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };
        if (req.method === 'GET') {
          send(200, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { map: mapId, areas: [] });
          return undefined;
        }
        if (req.method !== 'POST') return send(405, { error: 'GET or POST' });
        let raw = '';
        req.on('data', (chunk) => {
          raw += chunk;
          if (raw.length > 1e6) req.destroy();
        });
        req.on('end', () => {
          let body;
          try {
            body = JSON.parse(raw);
          } catch {
            send(400, { error: 'invalid JSON' });
            return;
          }
          const r = cleanAreaContent(mapId, body);
          if (r.error) {
            send(400, { error: r.error });
            return;
          }
          fs.mkdirSync(dir, { recursive: true });
          if (r.content.areas.length) fs.writeFileSync(file, `${JSON.stringify(r.content, null, 2)}\n`);
          else if (fs.existsSync(file)) fs.rmSync(file);
          send(200, r.content);
        });
        return undefined;
      });
    },
  };
}
