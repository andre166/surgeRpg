import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../stores/gameStore.js';
import { POTIONS, ROOM_POTIONS, ELIXIRS, itemCount } from '../../core/farm.js';
import { inSecretRoom } from '../../core/session/session.js';
import { effectText, usableOnMap } from './farmText.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';
import FarmIcon from './FarmIcon.jsx';

/** Map HUD button (a potion) that opens the potion / elixir menu; a badge with how many can be used. */
export default function PotionButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const farm = useGame((s) => s.profile?.farm);
  const run = useGame((s) => s.run);
  // threshold potions only count inside a secret room, where they can be drunk
  const ready = [...POTIONS, ...ROOM_POTIONS, ...ELIXIRS].filter((d) => usableOnMap(d) && (d.effect?.kind !== 'roomBattles' || (inSecretRoom(run) && !run.roomPotionUsed))).reduce((n, d) => n + itemCount(farm, d.id), 0);
  return (
    <div className="potion-wrap">
      <button className="dock-btn dock-icon-only hud-big-icon" onClick={() => setOpen(true)} title={t('pot.title')} aria-label={t('pot.title')}>
        <span className="dock-icon"><PixelIcon name="potion" size={40} /></span>
        {ready > 0 && <span className="hud-icon-badge">{ready > 99 ? '99+' : ready}</span>}
      </button>
      {open && <PotionMenu t={t} onClose={() => setOpen(false)} />}
    </div>
  );
}

/**
 * Potions and elixirs of the storehouse, used on the run from the map: BP potions, the fortune
 * brew (a bonus in every area of the map), elixirs (a buff for some battles); the healing potion
 * only shows (it is drunk in a boss battle). The elixirs running are listed at the bottom.
 */
function PotionMenu({ t, onClose }) {
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const useItem = useGame((s) => s.useFarmItem);
  const toast = useGame((s) => s.showToast);
  const farm = profile?.farm;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const bpFull = run.battlesUsed <= 0;
  const row = (d) => {
    const n = itemCount(farm, d.id);
    const usable = usableOnMap(d);
    // a BP potion with the BP full would be wasted
    const blocked = !usable ? t('pot.inBattle') : n < 1 ? null : d.effect?.kind === 'bp' && bpFull ? t('pot.bpFull') : d.effect?.kind === 'roomBattles' && !inSecretRoom(run) ? t('pot.roomOnly') : d.effect?.kind === 'roomBattles' && run.roomPotionUsed ? t('pot.roomUsed') : null;
    return (
      <li key={d.id} className={`pot-row ${n ? '' : 'empty'}`}>
        <FarmIcon id={d.id} size={28} />
        <div className="pot-body">
          <b>{t(`farm.item.${d.id}`)}</b>
          <span className="small">{effectText(t, d)}</span>
          {blocked && <span className="small muted">{blocked}</span>}
        </div>
        <b className="pot-count">x{n}</b>
        <button
          className="btn tiny"
          disabled={n < 1 || !!blocked}
          onClick={() => { useItem(d.id); toast(t('farm.used', { name: t(`farm.item.${d.id}`) }), 1200); }}
        >
          {t('farm.use')}
        </button>
      </li>
    );
  };

  return createPortal(
    <div className="modal pot-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); e.stopPropagation(); }}>
      <div className="pot-panel" role="dialog" aria-label={t('pot.title')}>
        <div className="wmap-head">
          <h2><PixelIcon name="potion" size={22} />{t('pot.title')}</h2>
          <button className="btn small" onClick={onClose} aria-label={t('common.back')}>✕</button>
        </div>
        <div className="pot-lists">
          <section>
            <h3>{t('farm.group.potions')}</h3>
            <ul>{POTIONS.map(row)}</ul>
          </section>
          <section>
            <h3>{t('farm.group.roomPotions')}</h3>
            <ul>{ROOM_POTIONS.map(row)}</ul>
          </section>
          <section>
            <h3>{t('farm.group.elixirs')}</h3>
            <ul>{ELIXIRS.map(row)}</ul>
          </section>
          {run.buffs?.length > 0 && (
            <section>
              <h3>{t('farm.activeBuffs')}</h3>
              <ul className="pot-buffs">
                {run.buffs.map((b) => (
                  <li key={b.id}><FarmIcon id={b.id} size={20} /><b>{t(`farm.item.${b.id}`)}</b><span className="small">{t('farm.fx.battles', { n: b.battlesLeft })}</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <p className="small muted">{t('pot.hint')}</p>
      </div>
    </div>,
    document.body,
  );
}
