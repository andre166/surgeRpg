import React, { useState } from 'react';
import { useGame, data } from '../stores/gameStore.js';
import {
  CHEAT_TOGGLES, cheatGold, cheatMaxStats, cheatDie, cheatLevels, cheatStatPoints, cheatRestoreBp, cheatUnlockSlots, cheatLockSlots, cheatSets, cheatAllItems, cheatToggle,
} from '../../core/session/cheats.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';

const ACTIONS = [
  { label: 'cheat.gold100k', icon: 'coins', fn: (r) => cheatGold(r, 100000) },
  { label: 'cheat.gold10m', icon: 'coins', fn: (r) => cheatGold(r, 10000000) },
  { label: 'cheat.lv10', icon: 'stats', fn: (r, s) => cheatLevels(r, 10, s) },
  { label: 'cheat.lv100', icon: 'stats', fn: (r, s) => cheatLevels(r, 100, s) },
  { label: 'cheat.lv1000', icon: 'stats', fn: (r, s) => cheatLevels(r, 1000, s) },
  { label: 'cheat.statPts', icon: 'heart', fn: (r) => cheatStatPoints(r, 100) },
  { label: 'cheat.restoreBp', icon: 'swords', fn: (r) => cheatRestoreBp(r) },
  { label: 'cheat.allItems', icon: 'helmet', fn: (r) => cheatAllItems(r, data.catalog) },
  { label: 'cheat.maxStats', icon: 'shield', fn: (r) => cheatMaxStats(r) },
];

const TOGGLES = [
  { key: CHEAT_TOGGLES.INFINITE_BP, label: 'cheat.infiniteBp' },
  { key: CHEAT_TOGGLES.NO_ENCOUNTERS, label: 'cheat.noEncounters' },
];

/** Cheat button + dropdown for the map HUD; `iconOnly`: just the book icon, like the class above the set switcher. */
export default function CheatMenu({ iconOnly = false }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [confirmDie, setConfirmDie] = useState(false);
  const run = useGame((s) => s.run);
  const applyCheat = useGame((s) => s.applyCheat);
  const extraStatPoints = useGame((s) => s.heroStats)()?.modifiers.extraStatPoints ?? 0;
  const showToast = useGame((s) => s.showToast);
  const grantTp = useGame((s) => s.grantTalentPoints);
  const grantEchoes = useGame((s) => s.grantAllEchoes);
  const cheatFarm = useGame((s) => s.cheatFarm);
  const cheatMaxOres = useGame((s) => s.cheatMaxOres);
  const cheatMaxBase = useGame((s) => s.cheatMaxBaseLevel);
  const cheatPlots = useGame((s) => s.cheatPlots);
  const cheatFarmUnlocks = useGame((s) => s.cheatFarmUnlocks);
  const cheatAccountUnlocks = useGame((s) => s.cheatAccountUnlocks);
  const revealBook = useGame((s) => s.revealBestiary);
  if (!run) return null;

  const unlockRows = [
    { label: 'cheat.u.plots', icon: 'sprout', set: (all) => cheatPlots(all) },
    { label: 'cheat.u.crops', icon: 'sprout', set: (all) => cheatFarmUnlocks(['crops'], all) },
    { label: 'cheat.u.mine', icon: 'pickaxe', set: (all) => cheatFarmUnlocks(['veins'], all) },
    { label: 'cheat.u.lab', icon: 'flask', set: (all) => cheatFarmUnlocks(['elixirs', 'potions'], all) },
    { label: 'cheat.u.stable', icon: 'paw', set: (all) => cheatFarmUnlocks(['stalls'], all) },
    { label: 'cheat.u.slots', icon: 'chest', set: (all) => applyCheat(all ? cheatUnlockSlots : cheatLockSlots) },
    { label: 'cheat.u.sets', icon: 'helmet', set: (all) => applyCheat((r) => cheatSets(r, all)) },
    { label: 'cheat.u.echoes', icon: 'orb', set: (all) => cheatAccountUnlocks(['echoRarities'], all) },
    { label: 'cheat.u.talents', icon: 'tree', set: (all) => cheatAccountUnlocks(['talentTiers'], all) },
    { label: 'cheat.u.forge', icon: 'forge', set: (all) => cheatAccountUnlocks(['relicSlots'], all) },
    { label: 'cheat.u.classes', icon: 'star', set: (all) => cheatAccountUnlocks(['classes'], all) },
  ];

  function act(a) {
    applyCheat((r) => a.fn(r, extraStatPoints));
    showToast(t('cheat.toast', { name: t(a.label) }), 1200);
  }

  return (
    <div className={`cheat-wrap ${iconOnly ? 'icon-only' : ''}`}>
      {iconOnly ? (
        <button className={`dock-btn dock-icon-only cheat-btn ${open ? 'on' : ''}`} onClick={() => { setOpen(!open); setConfirmDie(false); }} title={t('cheat.button')} aria-label={t('cheat.button')} aria-expanded={open}>
          <span className="dock-icon"><PixelIcon name="redBook" size={40} /></span>
        </button>
      ) : (
        <button className={`btn small hud-btn cheat-btn ${open ? 'on' : ''}`} onClick={() => { setOpen(!open); setConfirmDie(false); }}><PixelIcon name="redBook" />{t('cheat.button')}</button>
      )}
      {open && (
        <div className="cheat-menu panel wood-pop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="cheat-head">
            <b><PixelIcon name="redBook" size={18} />{t('cheat.title')}</b>
            <button className="btn small cheat-close" onClick={() => setOpen(false)} aria-label="✕">✕</button>
          </div>
          <div className="cheat-grid">
            {ACTIONS.map((a) => (
              <button key={a.label} className="btn small cheat-item" onClick={() => act(a)}><PixelIcon name={a.icon} size={16} />{t(a.label)}</button>
            ))}
            <button className="btn small cheat-item" onClick={() => { grantTp(100); showToast(t('cheat.toast', { name: t('cheat.tp') }), 1200); }}><PixelIcon name="tree" size={16} />{t('cheat.tp')}</button>
            <button className="btn small cheat-item" onClick={() => { grantEchoes(); showToast(t('cheat.toast', { name: t('cheat.echoes') }), 1200); }}><PixelIcon name="orb" size={16} />{t('cheat.echoes')}</button>
            <button className="btn small cheat-item" onClick={() => { revealBook(); showToast(t('cheat.toast', { name: t('cheat.bestiary') }), 1200); }}><PixelIcon name="blueBook" size={16} />{t('cheat.bestiary')}</button>
            <button className="btn small cheat-item" onClick={() => { cheatFarm(); showToast(t('cheat.toast', { name: t('cheat.farm') }), 1200); }}><PixelIcon name="sprout" size={16} />{t('cheat.farm')}</button>
            <button className="btn small cheat-item" onClick={() => { cheatMaxOres(); showToast(t('cheat.toast', { name: t('cheat.maxOres') }), 1200); }}><PixelIcon name="pickaxe" size={16} />{t('cheat.maxOres')}</button>
            <button className="btn small cheat-item" onClick={() => { cheatMaxBase(); showToast(t('cheat.toast', { name: t('cheat.maxBase') }), 1200); }}><PixelIcon name="stats" size={16} />{t('cheat.maxBase')}</button>
          </div>
          <div className="cheat-sep" />
          {/* unlocks bought with gold + base level: everything bought or nothing bought, per area */}
          <b className="small">{t('cheat.unlocks')}</b>
          {unlockRows.map((u) => (
            <div key={u.label} className="cheat-unlock-row">
              <span className="cheat-unlock-name"><PixelIcon name={u.icon} size={16} />{t(u.label)}</span>
              <button className="btn tiny" onClick={() => { u.set(true); showToast(t('cheat.toast', { name: `${t(u.label)}: ${t('cheat.unlockAll')}` }), 1200); }}>{t('cheat.unlockAll')}</button>
              <button className="btn tiny" onClick={() => { u.set(false); showToast(t('cheat.toast', { name: `${t(u.label)}: ${t('cheat.unlockNone')}` }), 1200); }}>{t('cheat.unlockNone')}</button>
            </div>
          ))}
          <div className="cheat-sep" />
          {TOGGLES.map((tg) => (
            <label key={tg.key} className="cheat-toggle">
              <input type="checkbox" checked={!!run.cheats?.[tg.key]} onChange={() => applyCheat((r) => cheatToggle(r, tg.key))} />
              <span>{t(tg.label)}</span>
            </label>
          ))}
          <div className="cheat-sep" />
          {!confirmDie ? (
            <button className="btn small danger cheat-item" onClick={() => setConfirmDie(true)}><PixelIcon name="skull" size={16} />{t('cheat.die')}</button>
          ) : (
            <button className="btn small danger cheat-item" onClick={() => { setOpen(false); applyCheat(cheatDie); }}><PixelIcon name="skull" size={16} />{t('cheat.confirmDie')}</button>
          )}
          <p className="small muted">{t('cheat.note')}</p>
        </div>
      )}
    </div>
  );
}
