import React, { useState } from 'react';
import { useGame, SCREEN, data } from '../stores/gameStore.js';
import { Hero } from '../components/Sprite.jsx';
import { characterPowerWeights } from '../../core/attributes/characterPower.js';
import { characterAbilityLevel, baseAbilityLevel, ABILITY_BOSSES } from '../../core/progression/characters.js';
import { useT } from '../i18n/index.js';
import { CLASSES, heroClass, DEFAULT_CLASS, classOwned } from '../../core/progression/classes.js';
import AccountUnlock from '../components/AccountUnlock.jsx';
import { heroRelics, STAT_KEYS as RELIC_STATS } from '../../core/crafting.js';
import { relicName } from './CraftingScreen.jsx';
import { heroEcho } from '../../core/echoes.js';
import { heroTalents } from '../../core/progression/talents.js';
import PixelIcon, { LEVEL_ICON, STAT_ICONS } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import InfoButton from '../components/InfoButton.jsx';

const pctLabel = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;

/**
 * New run in two steps: first the hero grid; clicking a hero opens its page (portrait and
 * information, class choice, Start). Back on the hero page returns to the grid.
 */
export default function CharacterScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const go = useGame((s) => s.go);
  const newRun = useGame((s) => s.newRun);
  const [sel, setSel] = useState(profile?.lastCharacter ?? 0);
  const [step, setStep] = useState('heroes'); // 'heroes' (grid) | 'hero' (the picked hero's page)
  const [hard, setHard] = useState(false);
  const [cls, setCls] = useState(classOwned(profile, profile?.lastClass) ? profile.lastClass : DEFAULT_CLASS);
  const hardUnlocked = profile.highestLevel >= 100000;
  const base = baseAbilityLevel(profile.bossWins);
  const c = data.characters[sel];
  const w = characterPowerWeights(sel);
  const hasRun = !!profile.run;

  return (
    <div className="screen character hero-screen wood-screen">
      <WoodBackdrop />
      <header className="hero-head">
        <h1><PixelIcon name="sword" size={24} />{t('char.title')}</h1>
        <div className="hero-chips">
          <span className="hero-chip" title={t('char.sharedByAll')}><PixelIcon name={LEVEL_ICON.name} colors={LEVEL_ICON.colors} size={16} />{t('char.baseAbility')} <b>LV {base}</b></span>
          <InfoButton label={t('char.baseHelpLabel')}>
            <p>{t('char.baseHelp', { n: ABILITY_BOSSES.length, max: ABILITY_BOSSES.length * 2 })}</p>
          </InfoButton>
        </div>
      </header>
      {step === 'heroes' ? (
      <div className="char-grid">
        {data.characters.map((ch) => (
          <button key={ch.id} className={`char-cell ${ch.id === sel ? 'selected' : ''}`} onClick={() => { setSel(ch.id); setStep('hero'); }} aria-label={ch.name}>
            <Hero index={ch.id} size={64} />
            <span>{ch.name} <span className="char-lv">LV {characterAbilityLevel(profile.characterExp[ch.id] ?? 0)}</span></span>
          </button>
        ))}
      </div>
      ) : (
        <div className="char-page">
          {/* the picked hero: portrait, level and what carries over between runs */}
          <div className="char-detail panel px-card">
            <div className="char-hero-head">
              <Hero index={sel} size={96} />
              <div className="char-hero-title">
                <h2>{c.name}</h2>
                <span className="char-lv">LV {characterAbilityLevel(profile.characterExp[sel] ?? 0)}</span>
              </div>
            </div>
            <p className="muted">{t('char.desc')}</p>
            <div className="affinity">
              {Object.entries(w).map(([k, v]) => (
                <span key={k} className={v ? 'on' : ''}><PixelIcon name={STAT_ICONS[k]} size={16} />{t(`stat.${k}`)} {'★'.repeat(v) || '–'}</span>
              ))}
            </div>
            <div className="char-relics small">
              <PixelIcon name="tree" size={16} /><span className="muted">{t('title.talents')}:</span>
              <span className="char-relic">{t('tal.heroSummary', { tp: heroTalents(profile, sel).points, ranks: Object.values(heroTalents(profile, sel).ranks).reduce((a, n) => a + n, 0) })}</span>
            </div>
            <div className="char-relics small">
              <PixelIcon name="orb" size={16} /><span className="muted">{t('echo.title')}:</span>
              <span className="char-relic">{heroEcho(profile, sel) ? t(`echo.name.${heroEcho(profile, sel).id}`) : '—'}</span>
            </div>
            <div className="char-relics small">
              <PixelIcon name="forge" size={16} /><span className="muted">{t('craft.relicsShort')}:</span>
              {heroRelics(profile, sel).map((rl, i) => (
                <span key={i} className={`char-relic ${rl ? `q-${rl.quality}` : 'empty'}`} title={rl ? RELIC_STATS.filter((k) => rl.bonus[k] > 0).map((k) => `${t(`stat.${k}`)} +${Math.round(rl.bonus[k] * 1000) / 10}%`).join(' · ') : ''}>
                  {rl ? relicName(t, rl) : '—'}
                </span>
              ))}
            </div>
            {hardUnlocked && (
              <label className="check">
                <input type="checkbox" checked={hard} onChange={(e) => setHard(e.target.checked)} /> {t('char.hardMode')}
              </label>
            )}
            {hasRun && <p className="warn small">{t('char.discardWarn')}</p>}
          </div>
          <div className="class-row">
            <h2><PixelIcon name="star" size={18} />{t('class.choose')}</h2>
            <div className="class-grid">
              {CLASSES.map((cl, ci) => (!classOwned(profile, cl.id) ? (
                // classes are bought in order (core/progression/unlocks.js); the first one is free
                <div key={cl.id} className={`class-card class-${cl.id} class-locked`}>
                  <b>🔒 {t(`class.${cl.id}`)}</b>
                  <AccountUnlock kind="classes" index={ci} />
                </div>
              ) : (
                <button key={cl.id} className={`class-card class-${cl.id} ${cls === cl.id ? 'selected' : ''}`} onClick={() => setCls(cl.id)}>
                  <b>{t(`class.${cl.id}`)}</b>
                  <span className="class-stats">
                    {Object.entries(cl.root.pct).filter(([, v]) => v).map(([k, v]) => (
                      <span key={k} className={v > 0 ? 'up' : 'down'}>{t(`stat.${k}`)} {pctLabel(v)}</span>
                    ))}
                  </span>
                  <span className="class-passive"><b>{t(`class.${cl.id}.passive`)}</b>: {t(`class.${cl.id}.passiveDesc`)}</span>
                </button>
              )))}
            </div>
          </div>
        </div>
      )}
      <footer className="hero-foot">
        <div className="row">
          {step === 'heroes' ? (
            <button className="btn" data-escape onClick={() => go(SCREEN.TITLE)}>{t('common.back')}</button>
          ) : (
            <>
              <button className="btn" data-escape onClick={() => setStep('heroes')}>{t('common.back')}</button>
              <button className="btn primary" data-primary onClick={() => newRun(sel, hard, classOwned(profile, cls) ? cls : DEFAULT_CLASS)}>{t('char.start')}</button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
