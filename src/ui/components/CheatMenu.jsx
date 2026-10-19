import React, { useState } from 'react';
import { useGame, data, world } from '../stores/gameStore.js';
import {
  CHEAT_TOGGLES, cheatGold, cheatMaxStats, cheatDie, cheatLevels, cheatStatPoints, cheatRestoreBp, cheatUnlockSlots, cheatLockSlots, cheatSets, cheatAllItems, cheatToggle, cheatRespawnBosses, cheatRemoveItems,
} from '../../core/session/cheats.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';
import { TALENT_TIER_KINDS, SUBCLASS_KINDS } from '../../core/progression/unlocks.js';

const ACTIONS = [
  { label: 'cheat.gold100k', icon: 'coins', fn: (r) => cheatGold(r, 100000) },
  { label: 'cheat.gold10m', icon: 'coins', fn: (r) => cheatGold(r, 10000000) },
  { label: 'cheat.lv10', icon: 'stats', fn: (r, s) => cheatLevels(r, 10, s) },
  { label: 'cheat.lv100', icon: 'stats', fn: (r, s) => cheatLevels(r, 100, s) },
  { label: 'cheat.lv1000', icon: 'stats', fn: (r, s) => cheatLevels(r, 1000, s) },
  { label: 'cheat.statPts', icon: 'heart', fn: (r) => cheatStatPoints(r, 100) },
  { label: 'cheat.restoreBp', icon: 'swords', fn: (r) => cheatRestoreBp(r) },
  { label: 'cheat.allItems', icon: 'helmet', fn: (r) => cheatAllItems(r, data.catalog) },
  { label: 'cheat.removeItems', icon: 'helmet', fn: (r) => cheatRemoveItems(r) },
  { label: 'cheat.maxStats', icon: 'shield', fn: (r) => cheatMaxStats(r) },
  { label: 'cheat.respawnBosses', icon: 'skull', fn: (r) => cheatRespawnBosses(r, world.map(r.map.id)) },
];

const TOGGLES = [
  { key: CHEAT_TOGGLES.INFINITE_BP, label: 'cheat.infiniteBp' },
  { key: CHEAT_TOGGLES.NO_ENCOUNTERS, label: 'cheat.noEncounters' },
  { key: CHEAT_TOGGLES.ALWAYS_DROP, label: 'cheat.alwaysDrop' },
];

/**
 * Cheat button + dropdown for the map HUD; `iconOnly`: just the book icon, like the class above the set switcher.
 * `global`: the title screen's menu, account cheats only (no run needed; run cheats, toggles and dying hidden).
 */
export default function CheatMenu({ iconOnly = false, global = false }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [confirmDie, setConfirmDie] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const cheatResetAccount = useGame((s) => s.cheatResetAccount);
  const run = useGame((s) => s.run);
  const applyCheat = useGame((s) => s.applyCheat);
  const extraStatPoints = useGame((s) => s.heroStats)()?.modifiers.extraStatPoints ?? 0;
  const showToast = useGame((s) => s.showToast);
  const cheatTp = useGame((s) => s.cheatTpLevel);
  const cheatEchoes = useGame((s) => s.cheatEchoes);
  const cheatRelics = useGame((s) => s.cheatRelics);
  const cheatEchoLevels = useGame((s) => s.cheatEchoLevels);
  const cheatShards = useGame((s) => s.cheatShards);
  const cheatEmblems = useGame((s) => s.cheatEmblems);
  const cheatPassiveShards = useGame((s) => s.cheatPassiveShards);
  const cheatFarm = useGame((s) => s.cheatFarm);
  const cheatMaxOres = useGame((s) => s.cheatMaxOres);
  const cheatAddOres = useGame((s) => s.cheatAddOres);
  const cheatMaxBase = useGame((s) => s.cheatMaxBaseLevel);
  const cheatResetBase = useGame((s) => s.cheatResetBaseLevel);
  const cheatBossWin = useGame((s) => s.cheatBossWin);
  const cheatAllBossWins = useGame((s) => s.cheatAllBossWins);
  const bossWins = useGame((s) => s.profile?.bossWins) ?? {};
  const cheatPlots = useGame((s) => s.cheatPlots);
  const cheatFarmUnlocks = useGame((s) => s.cheatFarmUnlocks);
  const cheatCreatures = useGame((s) => s.cheatCreatures);
  const cheatAccountUnlocks = useGame((s) => s.cheatAccountUnlocks);
  const revealBook = useGame((s) => s.revealBestiary);
  const markSavedRunCheated = useGame((s) => s.markSavedRunCheated);
  if (!run && !global) return null;

  // account cheats: they change the profile, so they work from the title too
  const accountActions = [
    { label: 'cheat.maxBase', icon: 'stats', fn: () => cheatMaxBase() },
    { label: 'cheat.resetBase', icon: 'stats', fn: () => cheatResetBase() },
    { label: 'cheat.tp', icon: 'slimeKing', fn: () => cheatTp(true) },
    { label: 'cheat.tpReset', icon: 'slimeKing', fn: () => cheatTp(false) },
    { label: 'cheat.echoes', icon: 'orb', fn: () => cheatEchoes(true) },
    { label: 'cheat.echoMax', icon: 'orb', fn: () => cheatEchoLevels(true) },
    { label: 'cheat.echoReset', icon: 'orb', fn: () => cheatEchoLevels(false) },
    { label: 'cheat.shards', icon: 'abyssEye', fn: () => cheatShards(50) },
    { label: 'cheat.emblems', icon: 'swords', fn: () => cheatEmblems(20) },
    { label: 'cheat.passiveShards', icon: 'star', fn: () => cheatPassiveShards(30) },
    { label: 'cheat.bestiary', icon: 'blueBook', fn: () => revealBook() },
    { label: 'cheat.farm', icon: 'sprout', fn: () => cheatFarm() },
    { label: 'cheat.addOres', icon: 'pickaxe', fn: () => cheatAddOres() },
    { label: 'cheat.maxOres', icon: 'pickaxe', fn: () => cheatMaxOres() },
  ];
  // the toast, and from the title the saved run is flagged as cheated like a loaded one would be
  const done = (name) => {
    if (global) markSavedRunCheated();
    showToast(t('cheat.toast', { name }), 1200);
  };

  const unlockRows = [
    { label: 'cheat.u.plots', icon: 'sprout', set: (all) => cheatPlots(all) },
    { label: 'cheat.u.crops', icon: 'sprout', set: (all) => cheatFarmUnlocks(['crops'], all) },
    { label: 'cheat.u.mine', icon: 'pickaxe', set: (all) => cheatFarmUnlocks(['veins'], all) },
    { label: 'cheat.u.lab', icon: 'flask', set: (all) => cheatFarmUnlocks(['elixirs', 'potions', 'roomPotions', 'labSlots'], all) },
    { label: 'cheat.u.stable', icon: 'paw', set: (all) => cheatFarmUnlocks(['stalls'], all) },
    { label: 'cheat.u.creatures', icon: 'paw', set: (all) => cheatCreatures(all) },
    { label: 'cheat.u.slots', icon: 'chest', runOnly: true, set: (all) => applyCheat(all ? cheatUnlockSlots : cheatLockSlots) },
    { label: 'cheat.u.sets', icon: 'helmet', runOnly: true, set: (all) => applyCheat((r) => cheatSets(r, all)) },
    { label: 'cheat.u.echoes', icon: 'orb', set: (all) => cheatEchoes(all) },
    { label: 'cheat.u.relics', icon: 'forge', set: (all) => cheatRelics(all) },
    { label: 'cheat.u.talents', icon: 'tree', set: (all) => cheatAccountUnlocks(TALENT_TIER_KINDS, all) },
    { label: 'cheat.u.classes', icon: 'star', set: (all) => cheatAccountUnlocks(['classes', ...SUBCLASS_KINDS], all) },
  ].filter((u) => !(global && u.runOnly));
  // first row: runs every row below (each store action reads the latest state, so they chain)
  unlockRows.unshift({ label: 'cheat.u.everything', icon: 'star', set: (all) => unlockRows.slice(1).forEach((u) => u.set(all)) });

  function act(a) {
    applyCheat((r) => a.fn(r, extraStatPoints));
    showToast(t('cheat.toast', { name: t(a.label) }), 1200);
  }

  return (
    <div className={`cheat-wrap ${iconOnly ? 'icon-only' : ''} ${global ? 'cheat-global' : ''}`}>
      {iconOnly ? (
        <button className={`dock-btn dock-icon-only cheat-btn ${open ? 'on' : ''}`} onClick={() => { setOpen(!open); setConfirmDie(false); setConfirmReset(false); }} title={t('cheat.button')} aria-label={t('cheat.button')} aria-expanded={open}>
          <span className="dock-icon"><PixelIcon name="redBook" size={40} /></span>
        </button>
      ) : (
        <button className={`btn small hud-btn cheat-btn ${open ? 'on' : ''}`} onClick={() => { setOpen(!open); setConfirmDie(false); setConfirmReset(false); }}><PixelIcon name="redBook" />{t('cheat.button')}</button>
      )}
      {open && (
        <div className="cheat-menu panel wood-pop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="cheat-head">
            <b><PixelIcon name="redBook" size={18} />{t('cheat.title')}</b>
            <button className="btn small cheat-close" onClick={() => setOpen(false)} aria-label="✕">✕</button>
          </div>
          <div className="cheat-grid">
            {!global && ACTIONS.map((a) => (
              <button key={a.label} className="btn small cheat-item" onClick={() => act(a)}><PixelIcon name={a.icon} size={16} />{t(a.label)}</button>
            ))}
            {accountActions.map((a) => (
              <button key={a.label} className="btn small cheat-item" onClick={() => { a.fn(); done(t(a.label)); }}><PixelIcon name={a.icon} size={16} />{t(a.label)}</button>
            ))}
          </div>
          {!global && (
            <>
            <div className="cheat-sep" />
            {/* run toggles (infinite BP, no encounters, always drop) and dying, before the long unlock list */}
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
            </>
          )}
          <div className="cheat-sep" />
          {/* unlocks bought with gold + base level: everything bought or nothing bought, per area */}
          <b className="small">{t('cheat.unlocks')}</b>
          {unlockRows.map((u) => (
            <div key={u.label} className="cheat-unlock-row">
              <span className="cheat-unlock-name"><PixelIcon name={u.icon} size={16} />{t(u.label)}</span>
              <button className="btn tiny" onClick={() => { u.set(true); done(`${t(u.label)}: ${t('cheat.unlockAll')}`); }}>{t('cheat.unlockAll')}</button>
              <button className="btn tiny" onClick={() => { u.set(false); done(`${t(u.label)}: ${t('cheat.unlockNone')}`); }}>{t('cheat.unlockNone')}</button>
            </div>
          ))}
          <div className="cheat-sep" />
          {/* map boss wins, one by one: N = normal, A = abyssal (base level, abyssal mode, Limit Break follow them) */}
          <details className="cheat-bosses">
            <summary className="small"><b>{t('cheat.bossWins')}</b></summary>
            <div className="cheat-unlock-row">
              <span />
              <button className="btn tiny" onClick={() => { cheatAllBossWins(true); done(`${t('cheat.bossWins')}: ${t('cheat.unlockAll')}`); }}>{t('cheat.unlockAll')}</button>
              <button className="btn tiny" onClick={() => { cheatAllBossWins(false); done(`${t('cheat.bossWins')}: ${t('cheat.unlockNone')}`); }}>{t('cheat.unlockNone')}</button>
            </div>
            <div className="cheat-boss-row cheat-boss-head small muted">
              <span />
              <span title={t('mode.normal')}>N</span>
              <span title={t('mode.abyss')}>A</span>
            </div>
            {Object.entries(data.bossData.mapBosses).map(([id, b]) => (
              <div key={id} className="cheat-boss-row small">
                <span className="cheat-unlock-name">{id} · {b.name}</span>
                {[false, true].map((hard) => {
                  const won = !!bossWins[Number(id) + (hard ? 100 : 0)];
                  return (
                    <input
                      key={String(hard)}
                      type="checkbox"
                      checked={won}
                      aria-label={`${b.name} · ${t(hard ? 'mode.abyss' : 'mode.normal')}`}
                      onChange={() => { cheatBossWin(Number(id), hard, !won); if (global) markSavedRunCheated(); }}
                    />
                  );
                })}
              </div>
            ))}
          </details>
          <div className="cheat-sep" />
          {/* wipes the whole account (only the options stay); two clicks, like dying */}
          {!confirmReset ? (
            <button className="btn small danger cheat-item" onClick={() => setConfirmReset(true)}><PixelIcon name="skull" size={16} />{t('cheat.resetAccount')}</button>
          ) : (
            <button className="btn small danger cheat-item" onClick={() => { setOpen(false); setConfirmReset(false); cheatResetAccount(); showToast(t('cheat.toast', { name: t('cheat.resetAccount') }), 1500); }}><PixelIcon name="skull" size={16} />{t('cheat.confirmResetAccount')}</button>
          )}
          <p className="small muted">{t('cheat.note')}</p>
        </div>
      )}
    </div>
  );
}
