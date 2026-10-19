import React, { useEffect, useRef, useState } from 'react';
import { attachMapGame, detachMapGame, subscribeMapLoading } from '../mapGame.js';
import { useGame, world } from '../stores/gameStore.js';
import { fmtFull, fmtShort } from '../components/format.js';
import CheatMenu from '../components/CheatMenu.jsx';
import { SANDBOX } from '../../config/sandbox.js';
import ClassButton from '../components/ClassButton.jsx';
import WorldMapButton from '../components/WorldMap.jsx';
import PotionButton from '../components/PotionMenu.jsx';
import MapDock from '../components/MapDock.jsx';
import PixelIcon, { LEVEL_ICON } from '../components/PixelIcon.jsx';
import { useT } from '../i18n/index.js';
import { runSets, NORMAL_SETS, BOSS_SET } from '../../core/equipment/sets.js';
import { creatureWage, onStrike, wageDue, WAGE_PERIOD } from '../../core/farm.js';
import { bossLevel } from '../../core/progression/characters.js';
import { slimeKingWins } from '../../core/bestiary.js';
import { bonusText } from '../i18n/bonus.js';
import { inSecretRoom } from '../../core/session/session.js';

/**
 * Equipment set switcher (bottom right of the HUD): one tap equips another set. The 5th is the
 * boss set (a skull instead of the number): equipping it lets you edit it, and it equips itself
 * against bosses anyway. Locked sets show dimmed (they are unlocked in Gear).
 */
function SetSwitcher({ run, t }) {
  const switchEquipSet = useGame((s) => s.switchEquipSet);
  const sets = runSets(run);
  return (
    <div className="hud-bar hud-sets" role="group" aria-label={t('map.sets')}>
      <span className="hud-label">{t('map.sets')}</span>
      <div className="hud-set-btns">
        {Array.from({ length: NORMAL_SETS + 1 }, (_, i) => {
          const boss = i === BOSS_SET;
          const name = boss ? t('eq.bossSet') : t('map.setN', { n: i + 1 });
          if (i >= sets.unlocked) {
            const locked = boss ? t('map.bossSetLocked') : t('map.setLocked', { n: i + 1 });
            return <span key={i} className={`hud-set locked ${boss ? 'boss' : ''}`} title={locked} aria-label={locked}>🔒</span>;
          }
          return (
            <button
              key={i}
              className={`hud-set ${boss ? 'boss' : ''} ${sets.active === i ? 'active' : ''}`}
              aria-pressed={sets.active === i}
              title={boss ? `${name} · ${t('map.bossSetHint')}` : name}
              aria-label={name}
              onClick={() => switchEquipSet(i)}
            >
              {boss ? <PixelIcon name="skull" size={18} /> : i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Stable wages (next to the gold): what the creatures in the stable cost the run every WAGE_PERIOD.
 * Warns when the gold does not cover it or a creature is on strike; hidden with an empty stable.
 */
function WageStat({ run, t }) {
  const profile = useGame((s) => s.profile);
  const stable = profile?.farm?.stable ?? [];
  if (!stable.length) return null;
  const ctx = { gold: run.gold, baseLevel: bossLevel(profile.bossWins), slimeWins: slimeKingWins(profile) };
  const total = stable.reduce((n, st) => n + creatureWage(st.creature, ctx), 0);
  const striking = stable.filter(onStrike).length;
  const warn = striking > 0 || run.gold < total;
  const period = `${Math.round(WAGE_PERIOD / 60000)} min`;
  const title = [t('map.wageHint', { gold: fmtFull(total), time: period, n: stable.length }), striking ? t('map.wageStrike', { n: striking }) : null].filter(Boolean).join(' · ');
  return (
    <div className={`hud-stat hud-wage ${warn ? 'warn' : ''}`} title={title}>
      <PixelIcon name="paw" size={28} />
      <div className="hud-group">
        <span className="hud-label">{t('map.wage')}</span>
        {/* same rule as the gold: at most 5 digits and one letter (fmtShort); the period is in the tooltip */}
        <b>{fmtShort(total)}</b>
      </div>
    </div>
  );
}

/** How long after a wage payment the HUD still plays its debit animation (also when coming back to the map). */
const DEBIT_SHOW_MS = 1600;

/** Gold of the run; a stable wage payment floats its "-amount" off the value and fades, while the value flashes. */
function GoldStat({ run, t }) {
  const debit = useGame((s) => s.wageDebit);
  const fresh = debit && Date.now() - debit.id < DEBIT_SHOW_MS;
  return (
    <div className="hud-stat hud-gold">
      <PixelIcon name="coins" size={28} />
      <div className="hud-group">
        <span className="hud-label">{t('map.gold')}</span>
        <b key={fresh ? debit.id : 'gold'} className={fresh ? 'gold-hit' : ''} title={`${fmtFull(run.gold)} G`}>{fmtShort(run.gold)}</b>
      </div>
      {fresh && (
        <span key={debit.id} className="gold-debit" aria-live="polite">
          {fmtShort(debit.amount)} <small>({t(`map.debit.${debit.reason}`)})</small>
        </span>
      )}
    </div>
  );
}

/** Danger word of the current area (the hero's level against the area's; abyssal mode hides it). */
const dangerKey = (danger, hardMode) => (hardMode ? 'abyss' : danger >= 3 ? 'deadly' : danger >= 1 ? 'hard' : danger < 0 ? 'easy' : 'normal');

/**
 * Current area, under the BP bar: map, recommended level (hidden in abyssal mode, like the
 * original's "? ? ? ?"), how dangerous it is for the hero, and its bonus with the battles left.
 */
/**
 * Area bonuses running on the current map (encounters/bonus.js: run.bonuses[map][area], 0 = none),
 * under the area info at the top: one chip per area (its name or number, its level) with the bonus
 * and the battles left; the area the hero stands in highlighted. Nothing when the map has none.
 */
/** Threshold-potion battles waiting in a secret room (added to its counter in the HUD). */
const roomExtraOf = (run) => (inSecretRoom(run) ? run.roomExtra ?? 0 : 0);

function MapBonuses({ run, t }) {
  const area = useGame((s) => s.currentArea)();
  const map = world.map(run.map.id);
  const list = (run.bonuses?.[run.map.id] ?? [])
    .map((value, id) => ({ id, value, level: map?.areas[id]?.level ?? 0 }))
    .filter((b) => b.value > 0);
  if (!list.length) return null;
  return (
    <div className="hud-bonuses" aria-label={t('map.bonuses')}>
      <ul>
        {list.map((b) => (
          <li key={b.id} className={b.id === area?.id ? 'here' : ''}>
            {/* just the area's level (hidden in abyssal mode) and its bonus */}
            {!run.hardMode && <span className="hud-bonus-area">LV {fmtShort(b.level)}</span>}
            <b>{bonusText(t, b.value, b.id === 0 ? roomExtraOf(run) : 0)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AreaInfo({ run, danger, t }) {
  const area = useGame((s) => s.currentArea)();
  if (!area) return null;
  const key = dangerKey(danger, run.hardMode);
  const bonus = run.bonuses?.[run.map.id]?.[area.id] ?? 0;
  return (
    <div className={`hud-bar hud-area danger-${key}`} aria-live="polite">
      <PixelIcon name="map" size={22} />
      <div className="hud-group hud-area-body">
        {/* first row: the danger (easy, hard, deadly...) and, at the far right, the level; under it the area's bonus */}
        <div className="hud-area-top">
          <span className="hud-label hud-area-danger">{t(`map.danger.${key}`)}</span>
          <b className="hud-area-lv">{run.hardMode ? '? ? ? ?' : `LV ${fmtShort(area.level)}`}</b>
        </div>
        {bonus ? <span className="hud-area-bonus">{bonusText(t, bonus, area.id === 0 ? roomExtraOf(run) : 0)}</span> : null}
      </div>
    </div>
  );
}

/** Sandbox debug button (above the cheats): fires a stable wage payment now, to test it and its animation. */
function DebugMenu({ t }) {
  const [open, setOpen] = useState(false);
  const payWages = useGame((s) => s.debugPayWages);
  const toast = useGame((s) => s.showToast);
  return (
    <div className="cheat-wrap icon-only debug-wrap">
      <button className={`dock-btn dock-icon-only cheat-btn debug-btn ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} title={t('debug.button')} aria-label={t('debug.button')} aria-expanded={open}>
        <span className="dock-icon"><PixelIcon name="info" size={40} /></span>
      </button>
      {open && (
        <div className="cheat-menu panel wood-pop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="cheat-head">
            <b><PixelIcon name="info" size={18} />{t('debug.title')}</b>
            <button className="btn small cheat-close" onClick={() => setOpen(false)} aria-label="✕">✕</button>
          </div>
          <button className="btn small cheat-item" onClick={() => { if (!payWages()) toast(t('debug.noCreatures'), 1600); }}>
            <PixelIcon name="paw" size={16} />{t('debug.payWages')}
          </button>
          <p className="small muted">{t('debug.note')}</p>
        </div>
      )}
    </div>
  );
}

export default function MapScreen() {
  const t = useT();
  const host = useRef(null);
  const run = useGame((s) => s.run);
  const danger = useGame((s) => s.currentDanger)();
  const bp = useGame((s) => s.battlePoints)();
  const [loading, setLoading] = useState(false);

  // stable wages are also paid while on the map: check every second, tick the farm only when one is due
  useEffect(() => {
    const id = setInterval(() => {
      const { profile, run: r, farmDo } = useGame.getState();
      if (!r || !profile?.farm) return;
      const ctx = { baseLevel: bossLevel(profile.bossWins), slimeWins: slimeKingWins(profile) };
      if (wageDue(profile.farm, Date.now(), r.gold, ctx)) farmDo('tick');
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!host.current) return undefined;
    // the game outlives this screen (src/ui/mapGame.js): coming back from Gear / Hero / a battle is instant
    const unsub = subscribeMapLoading(setLoading);
    attachMapGame(host.current);
    return () => {
      unsub();
      detachMapGame();
    };
  }, []);

  if (!run) return null;
  const dangerClass = danger >= 3 ? 'danger-high' : danger >= 1 ? 'danger-mid' : danger < 0 ? 'danger-low' : '';

  return (
    <div className="screen map">
      <div className="phaser-host" ref={host} />
      {loading && (
        <div className="map-loading" role="status">
          <span>{t('map.loading')}</span>
          <div className="map-loading-bar"><i /></div>
        </div>
      )}
      <div className="hud top">
        <div className="hud-top-stack">
        {/* battle points, gold and level; the border warns when the area is too strong */}
        <div className={`hud-bar hud-level ${dangerClass}`}>
          <div className="hud-stats">
            <div className="hud-stat">
              <PixelIcon name="swords" size={28} />
              <div className="hud-group">
                <span className="hud-label">{t('map.bp')}</span>
                <b className={bp <= 3 ? 'warn' : ''}>{bp}</b>
              </div>
            </div>
            <GoldStat run={run} t={t} />
            <WageStat run={run} t={t} />
            <div className="hud-stat">
              <PixelIcon name={LEVEL_ICON.name} colors={LEVEL_ICON.colors} size={28} />
              <div className="hud-group">
                <span className="hud-label">LV</span>
                <b title={`LV ${fmtFull(run.level)}`}>{fmtShort(run.level)}</b>
              </div>
            </div>
          </div>
        </div>
        {/* the area bonuses running on this map, under the BP bar */}
        <MapBonuses run={run} t={t} />
        </div>
      </div>
      {/* one row at the bottom: the dock (Farm, Hero, Gear, Battle, Menu); above it at the right a column with the
          sandbox cheats, the world map and the class (icons) and the set switcher */}
      <div className="hud bottom">
        {/* the area the hero stands in, floating right above the bottom bar */}
        <div className="hud-area-dock"><AreaInfo run={run} danger={danger} t={t} /></div>
        <MapDock />
        <div className="hud-right">
          {SANDBOX && <DebugMenu t={t} />}
          {SANDBOX && <CheatMenu iconOnly />}
          {/* potions and elixirs, then the world map, over the class */}
          <PotionButton />
          <WorldMapButton />
          {run.classId && <ClassButton run={run} iconOnly />}
          <SetSwitcher run={run} t={t} />
        </div>
      </div>
    </div>
  );
}
