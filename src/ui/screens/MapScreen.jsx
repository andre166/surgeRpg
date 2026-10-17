import React, { useEffect, useRef } from 'react';
import { attachMapGame, detachMapGame } from '../mapGame.js';
import { useGame } from '../stores/gameStore.js';
import { fmtFull, fmtShort } from '../components/format.js';
import CheatMenu from '../components/CheatMenu.jsx';
import { SANDBOX } from '../../config/sandbox.js';
import ClassButton from '../components/ClassButton.jsx';
import MapDock from '../components/MapDock.jsx';
import PixelIcon, { LEVEL_ICON } from '../components/PixelIcon.jsx';
import { useT } from '../i18n/index.js';
import { runSets, NORMAL_SETS, BOSS_SET } from '../../core/equipment/sets.js';

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

export default function MapScreen() {
  const t = useT();
  const host = useRef(null);
  const run = useGame((s) => s.run);
  const danger = useGame((s) => s.currentDanger)();
  const bp = useGame((s) => s.battlePoints)();

  useEffect(() => {
    if (!host.current) return undefined;
    // the game outlives this screen (src/ui/mapGame.js): coming back from Gear / Hero / a battle is instant
    attachMapGame(host.current);
    return () => detachMapGame();
  }, []);

  if (!run) return null;
  const dangerClass = danger >= 3 ? 'danger-high' : danger >= 1 ? 'danger-mid' : danger < 0 ? 'danger-low' : '';

  return (
    <div className="screen map">
      <div className="phaser-host" ref={host} />
      <div className="hud top">
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
            <div className="hud-stat hud-gold">
              <PixelIcon name="coins" size={28} />
              <div className="hud-group">
                <span className="hud-label">{t('map.gold')}</span>
                <b title={`${fmtFull(run.gold)} G`}>{fmtShort(run.gold)}</b>
              </div>
            </div>
            <div className="hud-stat">
              <PixelIcon name={LEVEL_ICON.name} colors={LEVEL_ICON.colors} size={28} />
              <div className="hud-group">
                <span className="hud-label">LV</span>
                <b title={`LV ${fmtFull(run.level)}`}>{fmtShort(run.level)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* one row at the bottom: the dock (Farm, Hero, Gear, Battle, Menu); above it at the right a column with the
          sandbox cheats and the class (icons) and the set switcher */}
      <div className="hud bottom">
        <MapDock />
        <div className="hud-right">
          {SANDBOX && <CheatMenu iconOnly />}
          {run.classId && <ClassButton run={run} iconOnly />}
          <SetSwitcher run={run} t={t} />
        </div>
      </div>
    </div>
  );
}
