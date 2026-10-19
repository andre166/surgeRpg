import React, { useEffect, useRef, useState } from 'react';
import { useGame, SCREEN } from '../stores/gameStore.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';
import Codex from './Codex.jsx';

/**
 * Map HUD "Menu" button: a dropdown with Bestiary, Codex (Codex.jsx, a modal), Options, Save & quit and End run. `inDock`
 * draws it as a bottom dock tile (icon over the label), its dropdown opening upwards.
 */
export default function GameMenu({ inDock = false }) {
  const t = useT();
  const openFromMap = useGame((s) => s.openFromMap);
  const persist = useGame((s) => s.persist);
  const go = useGame((s) => s.go);
  const abandon = useGame((s) => s.abandonRun);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [open, setOpen] = useState(false);
  const [codex, setCodex] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) { setConfirmEnd(false); return undefined; }
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const items = [
    { screen: SCREEN.BESTIARY, label: t('title.bestiary'), icon: 'blueBook' },
    { screen: SCREEN.OPTIONS, label: t('opt.title'), icon: 'cog' },
  ];

  return (
    <div className={`game-menu-wrap ${inDock ? 'in-dock' : ''}`} ref={ref}>
      {inDock ? (
        <button className={`dock-btn dock-menu ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open} title={t('map.menu')} aria-label={t('map.menu')}>
          <span className="dock-icon"><PixelIcon name="scroll" size={40} /></span>
          <span className="dock-label">{t('map.menu')}</span>
        </button>
      ) : (
        <button className={`btn small hud-btn ${open ? 'active' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
          <PixelIcon name="scroll" />{t('map.menu')} ▾
        </button>
      )}
      {open && (
        <div className="game-menu panel wood-pop" role="menu">
          {items.map((it) => (
            <button key={it.screen} className="btn small game-menu-item" role="menuitem" onClick={() => { setOpen(false); openFromMap(it.screen); }}>
              <PixelIcon name={it.icon} size={18} />
              <span>{it.label}</span>
              {it.badge && <span className="game-menu-badge">{it.badge}</span>}
            </button>
          ))}
          <button className="btn small game-menu-item" role="menuitem" onClick={() => { setOpen(false); setCodex(true); }}>
            <PixelIcon name="redBook" size={18} />
            <span>{t('codex.title')}</span>
          </button>
          <div className="game-menu-sep" />
          <button className="btn small game-menu-item" role="menuitem" onClick={async () => { setOpen(false); await persist(true); go(SCREEN.TITLE); }}>
            <PixelIcon name="floppy" size={18} />
            <span>{t('opt.saveQuit')}</span>
          </button>
          {!confirmEnd ? (
            <button className="btn small danger game-menu-item" role="menuitem" onClick={() => setConfirmEnd(true)}>
              <PixelIcon name="skull" size={18} />
              <span>{t('opt.endRun')}</span>
            </button>
          ) : (
            <button className="btn small danger game-menu-item" role="menuitem" onClick={() => { setOpen(false); abandon(); }}>
              <PixelIcon name="skull" size={18} />
              <span>{t('opt.confirmEnd')}</span>
            </button>
          )}
        </div>
      )}
      {codex && <Codex onClose={() => setCodex(false)} />}
    </div>
  );
}
