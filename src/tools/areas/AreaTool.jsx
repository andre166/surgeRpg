/**
 * Area tool (dev only: npm run dev, then /tools/areas.html). Per map: the areas painted in the
 * map editor and the ones of the area content (src/content/areas/map<id>.json), their level and
 * the monsters met there, previewed at the area's level (core/encounters/areaMonsters.js).
 * Saving writes the content file through the dev server (scripts/areaToolServer.js).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import worldData from '../../data/world.json';
import enemyData from '../../data/enemies.json';
import catalog from '../../data/items.json';
import { hasMapArt, mapArtUrl } from '../../game/mapArt.js';
import { parseAreaLayer } from '../../core/world/areaLayer.js';
import { monsterIndex, describeMonster, describeEntry, expScaleNear, itemDropLevels } from '../../core/encounters/areaMonsters.js';
import { monsterSvg } from '../../ui/monsterArt.js';

const maps = worldData.maps;
const pools = enemyData.pools;
const INDEX = monsterIndex(maps, pools);
const DROP_LEVELS = itemDropLevels(maps, pools);
// every monster (sprite) with the levels the original uses it at, weakest first
const MONSTERS = [...INDEX.entries()]
  .map(([sprite, recs]) => ({ sprite, name: recs[0].entry.name, levels: [...new Set(recs.map((r) => r.level))] }))
  .sort((a, b) => a.levels[0] - b.levels[0] || a.name.localeCompare(b.name));
const ITEM_KEYS = ['weapons', 'armors', 'accessories'];
const itemName = (d) => catalog[ITEM_KEYS[d.type]]?.find((x) => x.id === d.itemId)?.name ?? '?';
// a drop more than this many times above the area's level gets a warning
const DROP_WARN_RATIO = 2;
const fmt = (v) => (v == null ? '—' : Math.round(v).toLocaleString('pt-BR'));
const hueColor = (id) => `hsl(${(id * 67) % 360} 70% 55%)`;

function Icon({ sprite, size = 32 }) {
  const svg = useMemo(() => monsterSvg(sprite), [sprite]);
  return svg ? <span className="icon" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="icon empty" style={{ width: size, height: size }}>?</span>;
}

/** One monster of the area at the area's level: chance, original level it comes from, stats, drops. */
function MonsterRow({ sprite, d, level, chance, weight, onWeight, onRemove, fallback }) {
  return (
    <tr className={fallback ? 'fallback' : ''}>
      <td><Icon sprite={sprite} /></td>
      <td>{d?.name ?? sprite}</td>
      <td>{onWeight ? <input type="number" min="0" className="small" value={weight} onChange={(e) => onWeight(Number(e.target.value))} /> : <span className="muted">{weight}</span>}</td>
      <td>{chance == null ? '—' : `${Math.round(chance * 100)}%`}</td>
      <td className="muted">LV {fmt(d?.fromLevel)}</td>
      <td>{fmt(d?.hp)}</td>
      <td>{fmt(d?.atk)}</td>
      <td>{fmt(d?.exp)}</td>
      <td>{fmt(d?.gold)}</td>
      <td>
        {(d?.drops ?? []).map((x) => {
          const lv = DROP_LEVELS.get(`${x.type}:${x.itemId}`);
          const high = lv > level * DROP_WARN_RATIO;
          return <div key={`${x.type}:${x.itemId}`} className={high ? 'warn' : ''} title={high ? `no original esse item cai a partir de LV ${fmt(lv)}` : ''}>{itemName(x)} {Math.round(x.chance * 1000) / 10}%{high ? ` ⚠ LV ${fmt(lv)}` : ''}</div>;
        })}
      </td>
      <td>{onRemove && <button onClick={onRemove}>✕</button>}</td>
    </tr>
  );
}

/** Editor grid of the map with the selected area lit. */
function MiniMap({ grid, colorOf, selected }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !grid) return;
    const { cols, rows, cells } = grid;
    c.width = cols;
    c.height = rows;
    const g = c.getContext('2d');
    for (let r = 0; r < rows; r += 1) {
      for (let col = 0; col < cols; col += 1) {
        const a = cells[r][col];
        g.globalAlpha = selected == null || a === selected ? 1 : 0.25;
        g.fillStyle = colorOf(a);
        g.fillRect(col, r, 1, 1);
      }
    }
  }, [grid, colorOf, selected]);
  return <canvas ref={ref} className="minimap" />;
}

export default function AreaTool() {
  const [mapId, setMapId] = useState(1);
  const [art, setArt] = useState(null);
  const [content, setContent] = useState({ map: 1, areas: [] });
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [nearOnly, setNearOnly] = useState(true);

  const base = maps.find((m) => m.id === mapId);

  // load the editor art and the content file of the map
  useEffect(() => {
    let live = true;
    setStatus('carregando…');
    const artReq = hasMapArt(mapId) ? fetch(new URL(mapArtUrl(mapId), `${location.origin}/`)).then((r) => r.json()) : Promise.resolve(null);
    Promise.all([artReq, fetch(`/__tools/areas/${mapId}`).then((r) => r.json())])
      .then(([a, c]) => {
        if (!live) return;
        setArt(a);
        setContent(c);
        setDirty(false);
        setSelected(0);
        setStatus('');
      })
      .catch((e) => live && setStatus(`erro ao carregar: ${e.message}`));
    return () => {
      live = false;
    };
  }, [mapId]);

  const layer = useMemo(() => (art ? parseAreaLayer(art, base, maps) : null), [art, base]);
  const grid = layer?.grid ?? base.grid;
  const painted = useMemo(() => new Set(grid.cells.flat()), [grid]);
  const editorAreas = useMemo(() => new Map((art?.areas ?? []).filter((a) => Number.isInteger(a?.id)).map((a) => [a.id, a])), [art]);
  const baseAreas = layer?.areas ?? base.areas;
  const contentOf = (id) => content.areas.find((a) => a.id === id);

  const ids = useMemo(() => {
    const s = new Set([...baseAreas.map((a) => a.id), ...painted, ...editorAreas.keys(), ...content.areas.map((a) => a.id)]);
    return [...s].sort((a, b) => a - b);
  }, [baseAreas, painted, editorAreas, content]);

  const info = (id) => {
    const c = contentOf(id);
    const b = baseAreas[id];
    const level = Number(c?.level) > 0 ? Number(c.level) : b?.level ?? editorAreas.get(id)?.level ?? 1;
    const own = (c?.monsters ?? []).length > 0;
    return {
      id,
      name: c?.name || editorAreas.get(id)?.name || `Área ${id}`,
      color: editorAreas.get(id)?.color || hueColor(id),
      level,
      own,
      expScale: own ? expScaleNear(maps, level) : b?.expScale ?? expScaleNear(maps, level),
      // the area whose enemies it keeps when it has none of its own (area 0 for new ids)
      source: b ?? baseAreas[0],
      fallsBack: !b,
      painted: painted.has(id),
      content: c,
    };
  };
  const cur = info(selected);
  const colorOf = useMemo(() => (id) => editorAreas.get(id)?.color || hueColor(id), [editorAreas]);

  const update = (fn) => {
    setContent((prev) => {
      const areas = prev.areas.slice();
      const i = areas.findIndex((a) => a.id === selected);
      const next = fn(i >= 0 ? { ...areas[i] } : { id: selected });
      if (i >= 0) areas[i] = next;
      else areas.push(next);
      return { ...prev, areas };
    });
    setDirty(true);
  };
  const setField = (k, v) => update((a) => ({ ...a, [k]: v }));
  const monsters = cur.content?.monsters ?? [];
  const setMonsters = (list) => setField('monsters', list);
  const totalWeight = monsters.reduce((s, m) => s + (Number(m.weight) || 0), 0);

  const newArea = () => {
    const id = Math.max(-1, ...ids) + 1;
    setContent((prev) => ({ ...prev, areas: [...prev.areas, { id, name: `Área ${id}`, level: cur.level, monsters: [] }] }));
    setSelected(id);
    setDirty(true);
  };
  const clearArea = () => {
    setContent((prev) => ({ ...prev, areas: prev.areas.filter((a) => a.id !== selected) }));
    setDirty(true);
  };

  const save = async () => {
    setStatus('salvando…');
    const r = await fetch(`/__tools/areas/${mapId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) });
    const body = await r.json();
    if (!r.ok) {
      setStatus(`erro: ${body.error}`);
      return;
    }
    setContent(body);
    setDirty(false);
    setStatus(`salvo em src/content/areas/map${mapId}.json`);
  };

  const warnings = (a) => {
    const w = [];
    if (!a.painted) w.push(art ? 'não está pintada no editor: o jogador nunca entra nela' : 'este mapa não tem arte do editor: só ids do world.json existem nele');
    if (a.painted && !a.own && a.fallsBack) w.push('sem monstros próprios e sem área original com este id: usa os monstros da área 0 do original');
    if (a.content?.monsters?.some((m) => !(Number(m.weight) > 0))) w.push('monstro com peso 0 (nunca aparece)');
    if (a.content?.monsters && !a.own) w.push('lista de monstros vazia: usa os do original');
    return w;
  };

  const candidates = MONSTERS.filter((m) => {
    if (search && !`${m.name} ${m.sprite}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (nearOnly && !m.levels.some((l) => l >= cur.level / 2 && l <= cur.level * 2)) return false;
    return true;
  }).slice(0, 80);

  // the original's enemies the area keeps: its pool and weights, made for the source area's level
  const src = cur.source;
  const fallbackPool = !cur.own && src ? (pools[src.pool] ?? []) : [];
  const fallbackWeights = fallbackPool.map((_, i) => src?.weights?.[i] ?? 10);
  const fallbackTotal = fallbackWeights.reduce((a, b) => a + b, 0);
  const fallbackRec = (e, i) => ({ key: `${src.pool}#${i}`, entry: e, level: src.poolLevel ?? src.level, baseHp: src.baseHp, baseAtk: src.baseAtk });

  return (
    <div className="tool">
      <header>
        <h1>Áreas</h1>
        <label>
          Mapa{' '}
          <select value={mapId} onChange={(e) => (!dirty || confirm('Descartar as mudanças não salvas?')) && setMapId(Number(e.target.value))}>
            {maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
                {hasMapArt(m.id) ? ' · editor' : ''}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" disabled={!dirty} onClick={save}>Salvar</button>
        <span className="status">{dirty ? 'mudanças não salvas · ' : ''}{status}</span>
      </header>

      <main>
        <aside>
          <MiniMap grid={grid} colorOf={colorOf} selected={selected} />
          <ul className="areas">
            {ids.map((id) => {
              const a = info(id);
              return (
                <li key={id} className={id === selected ? 'on' : ''} onClick={() => setSelected(id)}>
                  <i style={{ background: a.color }} />
                  <span className="grow">{a.id} · {a.name}</span>
                  <b>LV {fmt(a.level)}</b>
                  <small>{a.own ? `${a.content.monsters.length} monstros` : 'original'}{warnings(a).length ? ' ⚠' : ''}</small>
                </li>
              );
            })}
          </ul>
          <button onClick={newArea}>+ Nova área</button>
        </aside>

        <section className="editor">
          <div className="row">
            <label>Nome <input value={cur.content?.name ?? ''} placeholder={cur.name} onChange={(e) => setField('name', e.target.value)} /></label>
            <label>Nível <input type="number" min="1" value={cur.content?.level ?? ''} placeholder={String(cur.level)} onChange={(e) => setField('level', e.target.value === '' ? undefined : Number(e.target.value))} /></label>
            <span className="muted">EXP ×{cur.expScale === -2 ? 'fixa' : cur.expScale} · {cur.painted ? 'pintada no editor' : 'não pintada'}</span>
            {cur.content && <button onClick={clearArea}>Voltar ao original</button>}
          </div>
          {warnings(cur).map((w) => <p key={w} className="warn">⚠ {w}</p>)}

          <h2>Monstros {cur.own ? '' : <span className="muted">(nenhum próprio: valem os do original ({src?.pool}), reescalados para LV {fmt(cur.level)}; adicione um abaixo para trocar)</span>}</h2>
          <table>
            <thead>
              <tr><th /><th>Monstro</th><th>Peso</th><th>Chance</th><th>Base</th><th>HP</th><th>ATK</th><th>EXP</th><th>Ouro</th><th>Drops</th><th /></tr>
            </thead>
            <tbody>
              {monsters.map((m, i) => (
                <MonsterRow
                  key={`${m.sprite}-${i}`}
                  sprite={m.sprite}
                  d={describeMonster(maps, pools, m.sprite, cur.level, cur.expScale)}
                  level={cur.level}
                  weight={m.weight}
                  chance={totalWeight ? (Number(m.weight) || 0) / totalWeight : null}
                  onWeight={(w) => setMonsters(monsters.map((x, j) => (j === i ? { ...x, weight: w } : x)))}
                  onRemove={() => setMonsters(monsters.filter((_, j) => j !== i))}
                />
              ))}
              {fallbackPool.map((e, i) => (
                <MonsterRow
                  key={`f${i}`}
                  fallback
                  sprite={e.sprite}
                  d={describeEntry(maps, pools, fallbackRec(e, i), cur.level, cur.expScale)}
                  level={cur.level}
                  weight={fallbackWeights[i]}
                  chance={fallbackTotal ? fallbackWeights[i] / fallbackTotal : null}
                />
              ))}
            </tbody>
          </table>

          <h2>Adicionar monstro</h2>
          <div className="row">
            <input placeholder="buscar nome ou sprite" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label><input type="checkbox" checked={nearOnly} onChange={(e) => setNearOnly(e.target.checked)} /> só os do original entre LV {fmt(cur.level / 2)} e {fmt(cur.level * 2)}</label>
          </div>
          <div className="picker">
            {candidates.map((m) => (
              <button key={m.sprite} title={`${m.sprite} · no original em LV ${m.levels.map(fmt).join(', ')}`} onClick={() => setMonsters([...monsters, { sprite: m.sprite, weight: 10 }])}>
                <Icon sprite={m.sprite} size={40} />
                <span>{m.name}</span>
                <small>LV {fmt(m.levels[0])}{m.levels.length > 1 ? `–${fmt(m.levels[m.levels.length - 1])}` : ''}</small>
              </button>
            ))}
            {!candidates.length && <p className="muted">Nenhum monstro com esse filtro.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
