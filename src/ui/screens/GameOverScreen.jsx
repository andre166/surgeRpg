import React, { useEffect } from 'react';
import { useGame, SCREEN } from '../stores/gameStore.js';
import { fmt, fmtFull } from '../components/format.js';
import { sfx } from '../../game/systems/audio.js';
import { useT } from '../i18n/index.js';
import PixelIcon, { LEVEL_ICON, HeroPortrait } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import { isMapBossId } from '../../core/encounters/customBosses.js';

export default function GameOverScreen() {
  const t = useT();
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const finishRun = useGame((s) => s.finishRun);
  const retryRun = useGame((s) => s.retryRun);
  const openFromMap = useGame((s) => s.openFromMap);
  useEffect(() => {
    sfx.gameOver();
  }, []);
  if (!run) return null;
  const record = run.level > profile.highestLevel;
  const bosses = Object.keys(run.bossBeaten).filter((k) => isMapBossId(Number(k))).length;
  const summary = [
    { icon: 'coins', label: t('over.totalGold'), value: `${fmt(run.totalGold)} G` },
    { icon: 'skull', label: t('over.deaths'), value: run.deaths },
    { icon: 'paw', label: t('over.bosses'), value: bosses },
    { icon: 'sword', label: t('over.battles'), value: run.battles },
    { icon: 'star', label: t('over.bestCombo'), value: run.highestCombo },
    { icon: 'swords', label: t('over.bestHit'), value: fmt(run.highestDamage) },
  ];

  return (
    <div className="screen gameover hero-screen wood-screen">
      <WoodBackdrop />
      <div className="result-card over-card">
        <h1 className="result-title over-title"><PixelIcon name="skull" size={32} />{t('over.title')}</h1>
        <div className="over-level">
          <HeroPortrait index={run.characterIndex} size={48} />
          <div className="over-level-text">
            <span className="over-level-label"><PixelIcon name={LEVEL_ICON.name} colors={LEVEL_ICON.colors} size={14} />{t('over.finalLevel')}</span>
            <b>LV {fmtFull(run.level)}</b>
          </div>
          {record && <span className="over-record"><PixelIcon name="star" size={16} />{t('over.newRecord')}</span>}
        </div>
        <div className="over-grid">
          {summary.map((s, i) => (
            <div key={s.label} className="over-stat" style={{ animationDelay: `${0.08 * i}s` }}>
              <PixelIcon name={s.icon} size={22} />
              <div className="over-stat-text">
                <span>{s.label}</span>
                <b>{s.value}</b>
              </div>
            </div>
          ))}
        </div>
        <p className="hero-help">{t('over.note')}</p>
        <div className="over-foot">
          {/* the run's gold left: spend it on equipment or on the farm (both come back here) */}
          <div className="over-spend">
            <span className="over-spend-label"><PixelIcon name="coins" size={16} />{t('over.goldLeft')} <b>{fmt(run.gold)} G</b></span>
            <div className="over-spend-row">
              <button className="btn" onClick={() => openFromMap(SCREEN.EQUIPMENT)}><PixelIcon name="helmet" size={18} />{t('over.toEquipment')}</button>
              <button className="btn" onClick={() => openFromMap(SCREEN.FARM)}><PixelIcon name="sprout" size={18} />{t('over.toFarm')}</button>
            </div>
          </div>
          <div className="over-end-row">
            <button className="btn" onClick={() => finishRun()}>{t('over.title2')}</button>
            {/* a new run with the same hero (and mode and class), straight to the map */}
            <button className="btn primary" data-primary onClick={() => retryRun()}>
              <HeroPortrait index={run.characterIndex} size={18} />{t('over.again')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
