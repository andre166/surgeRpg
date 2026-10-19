import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, world, data } from '../stores/gameStore.js';
import { worldRegions, regionOf, regionSeen, mapSummary } from '../../core/world/worldMap.js';
import { areaAt } from '../../core/world/world.js';
import { mapSlimes, slimeDef } from '../../core/encounters/slimeBosses.js';
import { ownedCount } from '../../core/equipment/slots.js';
import { fmtShort } from './format.js';
import { useT } from '../i18n/index.js';
import PixelIcon, { HeroPortrait } from './PixelIcon.jsx';
import ItemIcon from './ItemIcon.jsx';

/** The regions never change: laid out once from world.json's neighbours. */
const REGIONS = worldRegions(world.maps);

/** Side of a room in px: the board fits the panel, between ROOM_MIN and ROOM_MAX. */
const ROOM_MIN = 40;
const ROOM_MAX = 84;

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/**
 * What a map holds for the run: its level range (areas in use, bosses, Slime Kings), the items
 * that can drop there in this mode, and its bosses / Slime Kings still standing.
 */
function roomInfo(mapId, run) {
  const map = world.map(mapId);
  if (!map) return null;
  const levelAt = (x, y) => areaAt(map, x, y)?.level ?? 0;
  const slimes = mapSlimes(map).map((s) => ({ id: s.id, level: slimeDef(data.bossData, s.id, levelAt(s.x, s.y))?.level ?? 0 }));
  const sum = mapSummary(map, { pools: data.enemyPools, bossData: data.bossData, hardMode: run.hardMode, slimes, areaLevelAt: levelAt });
  const bosses = (map.bosses ?? []).map((b) => b.id);
  return {
    ...sum,
    bosses,
    bossesLeft: bosses.filter((id) => !run.bossBeaten?.[id]),
    slimesLeft: slimes.map((s) => s.id).filter((id) => !run.slimesBeaten?.[id]),
  };
}

/** Map HUD button (a folded map icon) that opens the world map. */
export default function WorldMapButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="world-map-wrap">
      <button className="dock-btn dock-icon-only hud-big-icon" onClick={() => setOpen(true)} title={t('wmap.title')} aria-label={t('wmap.title')}>
        <span className="dock-icon"><PixelIcon name="worldMap" size={40} /></span>
      </button>
      {open && <WorldMap t={t} onClose={() => setOpen(false)} />}
    </div>
  );
}

/**
 * The world map: one board per region (tabs), each map entered a room on a parchment grid linked
 * to its neighbours by corridors. Picking a room shows its levels, bosses and possible drops.
 */
function WorldMap({ t, onClose }) {
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const view = useViewport();
  const currentId = run.map.id;
  const seen = profile?.mapsSeen ?? {};
  // regions with a room to show (entered at least once), lowest map first; the current one first open
  const known = REGIONS.filter((r) => r.maps.some((m) => m.id === currentId || seen[m.id]));
  const [regionId, setRegionId] = useState(() => regionOf(REGIONS, currentId)?.id ?? known[0]?.id);
  const [selected, setSelected] = useState(currentId);
  const region = REGIONS.find((r) => r.id === regionId) ?? known[0];
  const shown = regionSeen(region, seen, currentId);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // room side: the board fills the panel (the screen minus the modal / panel / board paddings,
  // and minus the header, tabs, info and drops in height)
  const room = Math.max(ROOM_MIN, Math.min(ROOM_MAX, Math.floor(Math.min((Math.min(view.w - 24, 900) - 64) / region.w, (view.h - 380) / region.h))));
  const pos = Object.fromEntries(region.maps.map((m) => [m.id, m]));
  const centre = (id) => [pos[id].x * room + room / 2, pos[id].y * room + room / 2];
  const info = selected != null && shown[selected] ? roomInfo(selected, run) : null;
  const level = (r) => (run.hardMode ? '? ? ?' : r[1] <= 0 ? '' : r[0] === r[1] ? `LV ${fmtShort(r[0])}` : `LV ${fmtShort(r[0])}–${fmtShort(r[1])}`);
  const lists = [data.catalog.weapons, data.catalog.armors, data.catalog.accessories];

  return createPortal(
    <div className="modal wmap-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); e.stopPropagation(); }}>
      <div className="wmap-panel" role="dialog" aria-label={t('wmap.title')}>
        <div className="wmap-head">
          <h2><PixelIcon name="worldMap" size={22} />{t('wmap.title')}</h2>
          <button className="btn small" onClick={onClose} aria-label={t('common.back')}>✕</button>
        </div>
        {known.length > 1 && (
          <div className="wmap-tabs" role="tablist">
            {known.map((r) => (
              <button key={r.id} role="tab" aria-selected={r.id === region.id} className={`tab ${r.id === region.id ? 'active' : ''}`} onClick={() => { setRegionId(r.id); setSelected(null); }}>
                {t('wmap.region', { n: REGIONS.indexOf(r) + 1 })}
                {regionOf(REGIONS, currentId) === r && <span className="wmap-here" aria-hidden="true"> ★</span>}
              </button>
            ))}
          </div>
        )}
        <div className="wmap-board-wrap">
          <div className="wmap-board" style={{ width: region.w * room, height: region.h * room, '--room': `${room}px` }}>
            {/* corridors between linked rooms, both entered */}
            <svg className="wmap-links" width={region.w * room} height={region.h * room} aria-hidden="true">
              {region.links.filter(([a, b]) => shown[a] && shown[b]).map(([a, b]) => {
                const [x1, y1] = centre(a);
                const [x2, y2] = centre(b);
                return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
              })}
            </svg>
            {region.maps.filter((m) => shown[m.id]).map((m) => {
              const here = m.id === currentId;
              const r = roomInfo(m.id, run);
              return (
                <button
                  key={m.id}
                  className={`wmap-room seen ${here ? 'here' : ''} ${selected === m.id ? 'sel' : ''} ${r?.bosses.length && !r.bossesLeft.length ? 'cleared' : ''}`}
                  style={{ left: m.x * room, top: m.y * room, width: room, height: room }}
                  onClick={() => setSelected(m.id)}
                  aria-label={t('best.map', { n: m.id })}
                >
                  <b className="wmap-num">{m.id}</b>
                  {room >= 56 && r && <span className="wmap-lv">{level(r.range)}</span>}
                  <span className="wmap-marks">
                    {here && <HeroPortrait index={run.characterIndex} size={Math.round(room * 0.3)} />}
                    {r?.bossesLeft.length > 0 && <PixelIcon name="skull" size={Math.round(room * 0.24)} />}
                    {r?.slimesLeft.length > 0 && <PixelIcon name="flask" size={Math.round(room * 0.24)} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {/* the room picked (or the current one): levels, bosses and what can drop there */}
        <div className="wmap-info">
          {info ? (
            <>
              <div className="wmap-info-line">
                <b>{t('best.map', { n: selected })}{selected === currentId ? ` · ${t('wmap.youAreHere')}` : ''}</b>
                <span>{level(info.range)}</span>
                {info.bosses.length > 0 && (
                  <span>{info.bosses.map((id) => `${info.bossesLeft.includes(id) ? '☠' : '✓'} ${data.bossData.mapBosses[id]?.name ?? `#${id}`}`).join(' · ')}</span>
                )}
                {info.slimesLeft.length > 0 && <span>{t('wmap.slime')}</span>}
              </div>
              <div className="wmap-drops">
                <span className="wmap-drops-title">{t('wmap.drops', { n: info.drops.length })}</span>
                {info.drops.length === 0 ? <span className="muted">{t('best.noDrops')}</span> : (
                  <ul>
                    {info.drops.map((d) => {
                      const item = lists[d.type]?.[d.itemId];
                      if (!item) return null;
                      // the run's inventory (cheats and drops change it; the profile only gets it at the end of the run)
                      const have = ownedCount(run.inventory, d.type, d.itemId) > 0;
                      // like the bestiary: an item not owned is a shadow, its name hidden
                      const known = have;
                      return (
                        <li key={`${d.type}:${d.itemId}`} className={`${have ? 'have' : ''} ${known ? '' : 'unknown'}`} title={known ? item.name : '????'}>
                          <ItemIcon item={item} size={20} unknown={!known} />
                          <span>{known ? item.name : '????'}</span>
                          {have && <span className="wmap-have" aria-label={t('wmap.owned')}>✓</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <span className="muted">{t('wmap.pick')}</span>
          )}
        </div>
        <div className="wmap-legend small">
          <span><HeroPortrait index={run.characterIndex} size={14} /> {t('wmap.legendYou')}</span>
          <span><PixelIcon name="skull" size={14} /> {t('wmap.legendBoss')}</span>
          <span><PixelIcon name="flask" size={14} /> {t('wmap.legendSlime')}</span>
          <span>✓ {t('wmap.owned')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
