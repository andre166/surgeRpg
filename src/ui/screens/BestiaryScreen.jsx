import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGame, SCREEN, data, bestiary } from '../stores/gameStore.js';
import { dropsRevealed, dropRevealKills, whereRevealed } from '../../core/bestiary.js';
import { Creature } from '../components/Sprite.jsx';
import { fmt, fmtFull } from '../components/format.js';
import { ownedCount } from '../../core/equipment/slots.js';
import { useT } from '../i18n/index.js';
import { SANDBOX } from '../../config/sandbox.js';
import PixelIcon from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import { useCompact } from '../responsive.js';

/** Kinds drawn as regular monsters (the others with the boss look). */
const MONSTER_KINDS = new Set(['enemy', 'rare']);
const TABS = [
  { kind: 'enemy', label: 'best.enemies', icon: 'paw' },
  { kind: 'rare', label: 'best.rares', icon: 'orb' },
  { kind: 'boss', label: 'best.bosses', icon: 'skull' },
  { kind: 'slime', label: 'best.slimes', icon: 'flask' },
  { kind: 'event', label: 'best.events', icon: 'star' },
];

/** Bestiary: every enemy in the game; unseen ones stay hidden as "????". */
export default function BestiaryScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const go = useGame((s) => s.go);
  const run = useGame((s) => s.run);
  const mapReturn = useGame((s) => s.mapReturnScreen);
  const backToMap = useGame((s) => s.backToMap);
  const [kind, setKind] = useState('enemy');
  const [selKey, setSelKey] = useState(null);
  // sandbox cheat: preview every creature (sprite, name, stats) while on; view only, never saved
  const [peek, setPeek] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetBook = useGame((s) => s.resetBestiary);
  const showToast = useGame((s) => s.showToast);
  const compact = useCompact();
  const records = profile?.bestiary ?? {};

  const list = useMemo(() => bestiary.filter((e) => e.kind === kind), [kind]);
  if (!profile) return null;
  const seenCount = bestiary.filter((e) => records[e.key]?.seen > 0).length;
  const isKnown = (key) => peek || records[key]?.seen > 0;
  const selected = list.find((e) => e.key === selKey) ?? null;

  return (
    <div className="screen bestiary hero-screen wood-screen">
      <WoodBackdrop />
      <header className="hero-head">
        <h1><PixelIcon name="blueBook" size={24} />{t('best.title')}</h1>
        <div className="hero-chips">
          <span className="hero-chip"><PixelIcon name="paw" size={16} /><b>{seenCount} / {bestiary.length}</b></span>
        </div>
        {SANDBOX && (
          <button className={`btn small best-peek ${peek ? 'on' : ''}`} aria-pressed={peek} title={t('best.peekHint')} onClick={() => setPeek(!peek)}>
            <PixelIcon name="redBook" size={16} />{t('best.peek')} <span className="stats-auto-state">{peek ? t('common.on') : t('common.off')}</span>
          </button>
        )}
        {/* sandbox cheat: wipe the records (two clicks: the first one asks to confirm) */}
        {SANDBOX && (
          <button
            className={`btn small ${confirmReset ? 'danger' : ''}`}
            title={t('best.resetHint')}
            onClick={() => { if (!confirmReset) { setConfirmReset(true); return; } resetBook(); setConfirmReset(false); setSelKey(null); showToast(t('best.resetDone'), 1400); }}
            onBlur={() => setConfirmReset(false)}
          >
            {confirmReset ? t('best.resetConfirm') : t('best.reset')}
          </button>
        )}
      </header>
      <div className="tabs best-tabs">
        {TABS.map((tb) => (
          <button key={tb.kind} className={`tab ${kind === tb.kind ? 'active' : ''}`} onClick={() => { setKind(tb.kind); setSelKey(null); }}>
            <PixelIcon name={tb.icon} size={16} />
            <span className="best-tab-label">{t(tb.label)}</span>
            <span className="best-tab-count">({bestiary.filter((e) => e.kind === tb.kind && records[e.key]?.seen > 0).length}/{bestiary.filter((e) => e.kind === tb.kind).length})</span>
          </button>
        ))}
      </div>
      <div className="best-body">
        <VirtualGrid
          key={kind}
          items={list}
          minCell={compact ? 80 : 96}
          renderCell={(e, measure) => {
            const known = isKnown(e.key);
            return (
              <button key={e.key} ref={measure} className={`best-cell ${known ? '' : 'unknown'} ${selKey === e.key ? 'selected' : ''}`} onClick={() => setSelKey(e.key)}>
                <Creature sprite={e.key} size={56} boss={!MONSTER_KINDS.has(e.kind)} silhouette={!known} />
                <span>{known ? e.name : '????'}</span>
                {SANDBOX && <code className="best-id">{e.key}</code>}
              </button>
            );
          }}
        />
        {!compact && (
          <div className="panel px-card best-detail">
            {selected ? <Detail e={selected} rec={records[selected.key]} reveal={peek} profile={profile} t={t} /> : <p className="muted">{t('best.select')}</p>}
          </div>
        )}
      </div>
      {/* compact layout: the details open as a sheet over the grid instead of below it (no scrolling
          down to see them); it comes before the footer so Esc closes it first */}
      {compact && selected && (
        <div className="modal best-sheet-modal" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) setSelKey(null); }}>
          <div className="panel px-card best-detail best-sheet" role="dialog" aria-label={isKnown(selected.key) ? selected.name : '????'}>
            <button className="btn small best-sheet-close" data-escape onClick={() => setSelKey(null)} aria-label={t('common.back')}>✕</button>
            <Detail e={selected} rec={records[selected.key]} reveal={peek} profile={profile} t={t} />
          </div>
        </div>
      )}
      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape onClick={() => (run && mapReturn ? backToMap() : go(SCREEN.TITLE))}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}

const GRID_GAP = 6;
const OVERSCAN_ROWS = 2;

/**
 * Virtualized grid (hundreds of entries): only the rows in view, plus a couple either side, are
 * mounted. Columns fit `minCell`-wide cells like `repeat(auto-fill, minmax(minCell, 1fr))`; the
 * row height is measured from a rendered cell (cells keep a single-line label so rows are even).
 */
function VirtualGrid({ items, minCell, renderCell }) {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [scrollTop, setScrollTop] = useState(0);
  const [rowH, setRowH] = useState(minCell);
  useLayoutEffect(() => {
    const el = ref.current;
    const fit = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const measure = useCallback((el) => {
    if (el && el.offsetHeight > 0) setRowH((h) => (Math.abs(el.offsetHeight - h) > 0.5 ? el.offsetHeight : h));
  }, []);
  const cols = Math.max(1, Math.floor((box.w + GRID_GAP) / (minCell + GRID_GAP)));
  const rows = Math.ceil(items.length / cols);
  const stride = rowH + GRID_GAP;
  const first = Math.max(0, Math.floor(scrollTop / stride) - OVERSCAN_ROWS);
  const last = Math.min(rows, Math.ceil((scrollTop + (box.h || 600)) / stride) + OVERSCAN_ROWS);
  return (
    <div className="best-grid" ref={ref} onScroll={(ev) => setScrollTop(ev.currentTarget.scrollTop)}>
      <div className="best-grid-space" style={{ height: Math.max(0, rows * stride - GRID_GAP) }}>
        <div className="best-grid-rows" style={{ transform: `translateY(${first * stride}px)`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: GRID_GAP }}>
          {items.slice(first * cols, last * cols).map((item, i) => renderCell(item, i === 0 ? measure : undefined))}
        </div>
      </div>
    </div>
  );
}

function Detail({ e, rec: saved, reveal = false, profile, t }) {
  // items owned now: the run's inventory during a run (drops and cheats change it), else the profile's
  const inventory = useGame((s) => s.run?.inventory) ?? profile.inventory;
  const rec = saved ?? { seen: 0, defeated: 0 };
  const known = reveal || rec.seen > 0;
  if (!known) {
    return (
      <>
        <div className="best-portrait unknown"><Creature sprite={e.key} size={140} boss={!MONSTER_KINDS.has(e.kind)} silhouette /></div>
        <h2>????</h2>
        <SandboxId e={e} />
        <p className="muted small">{t('best.unknown')}</p>
      </>
    );
  }
  const lists = [data.catalog.weapons, data.catalog.armors, data.catalog.accessories];
  const drops = e.drops.filter(Boolean);
  return (
    <>
      <div className="best-portrait"><Creature sprite={e.key} size={140} boss={!MONSTER_KINDS.has(e.kind)} /></div>
      <h2>{e.name}</h2>
      <SandboxId e={e} />
      <div className="stat-lines small">
        <span>{t('stat.hp')}</span><b>{fmt(e.hp)}</b>
        <span>{t('stat.atk')}</span><b>{fmt(e.atk)}</b>
        <span>{t('best.gold')}</span><b>{fmt(e.gold)} G</b>
        {e.kind === 'slime' && <><span>SK</span><b className="glow">+1</b></>}
        <span>{t('best.seen')}</span><b>{fmtFull(rec.seen)}</b>
        <span>{t('best.defeated')}</span><b>{fmtFull(rec.defeated)}</b>
      </div>
      {/* where it lives shows once it has been beaten at least once */}
      {reveal || whereRevealed(rec) ? <Where e={e} t={t} /> : <p className="muted small">🔒 {t('best.whereLocked')}</p>}
      <h2 className="best-sub">{t('best.drops')}</h2>
      {/* the drops stay hidden until the creature has been beaten enough times (core/bestiary.js) */}
      {!reveal && !dropsRevealed(e, rec) ? (
        <div className="best-drops-locked small">
          <span>🔒 {t('best.dropsLocked', { n: dropRevealKills(e) })}</span>
          <div className="bar farm-bar"><div className="fill" style={{ width: `${Math.min(1, rec.defeated / dropRevealKills(e)) * 100}%` }} /></div>
          <span className="muted">{fmtFull(Math.min(rec.defeated, dropRevealKills(e)))} / {dropRevealKills(e)}</span>
        </div>
      ) : drops.length === 0 ? <p className="muted small">{t('best.noDrops')}</p> : (
        <ul className="best-drops small">
          {drops.map((d, i) => {
            const item = lists[d.type]?.[d.itemId];
            const have = ownedCount(inventory, d.type, d.itemId) > 0;
            return <li key={i}>{have && item ? item.name : '????'} <span className="muted">· {Math.round(d.chance * 1000) / 10}%</span></li>;
          })}
        </ul>
      )}
    </>
  );
}

/** Sandbox only: the enemy id (battle / save key; map bosses also show the number used by boss triggers). */
function SandboxId({ e }) {
  if (!SANDBOX) return null;
  return <p className="small">ID <code className="best-id">{e.key}</code></p>;
}

function Where({ e, t }) {
  if (e.kind === 'event') return <p className="small">{t('best.whereEvent')}</p>;
  if (e.kind === 'rare') return <p className="small">{t('best.whereRare', { rooms: e.maps.map((m) => t(m === 13 ? 'best.whiteRoom' : 'best.blackRoom')).join(', ') })}{e.hard ? ` · ${t('best.hardOnly')}` : ''}</p>;
  const lv = e.levels.length ? (e.levels.length === 1 ? `LV ${fmtFull(e.levels[0])}` : `LV ${fmtFull(e.levels[0])}–${fmtFull(e.levels[e.levels.length - 1])}`) : '';
  return (
    <p className="small">
      {t('best.where')} {e.maps.map((m) => t('best.map', { n: m })).join(', ')}{lv ? ` · ${lv}` : ''}{e.hard ? ` · ${t('best.hardOnly')}` : ''}
    </p>
  );
}
