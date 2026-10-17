import React, { useState } from 'react';
import { useGame, SCREEN, data } from '../stores/gameStore.js';
import { ECHOES, RARITIES, ownsEcho, echoHolders, heroEcho, masteryInfo, applyMastery, echoRarityOwned, MASTERY_MAX, MASTERY_STEP, MASTERY_MILESTONES } from '../../core/echoes.js';
import { isAccountOwned } from '../../core/progression/unlocks.js';
import AccountUnlock from '../components/AccountUnlock.jsx';
import { echoPassiveText, echoSkillText, echoResonanceText } from '../components/echoText.js';
import { useT } from '../i18n/index.js';
import { EchoSpirit } from '../components/Sprite.jsx';
import HeroTabs from '../components/HeroTabs.jsx';
import PixelIcon, { HeroPortrait } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';

/** Ancestral Echoes: account collection; equip one echo per hero. */
export default function EchoesScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const mapReturn = useGame((s) => s.mapReturnScreen);
  const go = useGame((s) => s.go);
  const backToMap = useGame((s) => s.backToMap);
  const equip = useGame((s) => s.equipEcho);
  const unequip = useGame((s) => s.unequipEcho);
  const fromRun = !!(run && mapReturn);
  const [hero, setHero] = useState(fromRun ? run.characterIndex : profile?.lastCharacter ?? 0);
  const [info, setInfo] = useState(false);
  if (!profile) return null;


  return (
    <div className="screen echoes hero-screen wood-screen">
      <WoodBackdrop />
      <HeroTabs />
      {/* from the title: the title and a bar to pick the hero being equipped; from the map the hero
          tabs replace the title, the run's hero is the one equipped (toggles on the cards) */}
      {!fromRun && (
        <header className="hero-head">
          <h1><PixelIcon name="orb" size={22} />{t('echo.title')}</h1>
        </header>
      )}
      {!fromRun && (
        <section className="echo-hero-bar" aria-label={t('echo.hero')}>
          <div className="echo-hero-strip" role="radiogroup" aria-label={t('echo.hero')}>
            {data.characters.map((c) => (
              <button
                key={c.id}
                role="radio"
                aria-checked={hero === c.id}
                className={`echo-hero-pick ${hero === c.id ? 'active' : ''}`}
                onClick={() => setHero(c.id)}
                title={c.name}
              >
                <HeroPortrait index={c.id} size={28} />
                <span>{c.name}</span>
                {heroEcho(profile, c.id) && <span className="echo-hero-dot" />}
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="echo-lore">
        <p className="hero-help">{t('echo.lore')}</p>
        <button className="btn icon-btn echo-info-btn" aria-label={t('echo.info')} title={t('echo.info')} onClick={() => setInfo(true)}>
          <PixelIcon name="info" size={20} />
        </button>
      </div>
      {info && <EchoInfo t={t} onClose={() => setInfo(false)} />}
      {/* rarities are bought in order (core/progression/unlocks.js): only echoes of a bought one can be equipped */}
      <div className="unlock-strip" aria-label={t('unlock.echoRarities')}>
        {RARITIES.map((r, i) => (isAccountOwned(profile, 'echoRarities', i)
          ? <span key={r} className={`unlock-chip owned r-${r}`}>✓ {t(`echo.rarity.${r}`)}</span>
          : <span key={r} className={`unlock-chip r-${r}`}><AccountUnlock kind="echoRarities" index={i} label={t(`echo.rarity.${r}`)} /></span>))}
      </div>
      <div className="echo-grid">
        {ECHOES.map((e) => {
          const has = ownsEcho(profile, e.id);
          const holders = echoHolders(profile, e.id);
          const others = holders.filter((h) => h !== hero);
          const m = masteryInfo(profile, e.id);
          const shown = applyMastery(e, m.level);
          return (
            <div key={e.id} className={`echo-card r-${e.rarity} ${has ? '' : 'locked'} ${holders.includes(hero) ? 'on-hero' : ''}`}>
              <div className="echo-top">
                <EchoSpirit echo={e} size={64} />
                <div className="echo-title">
                  <b>{has ? t(`echo.name.${e.id}`) : '????'}</b>
                  <span className="echo-rarity">{t(`echo.rarity.${e.rarity}`)} · <span className={`aff aff-${e.affinity}`}>{t(`echo.aff.${e.affinity}`)}</span></span>
                  {has && (
                    <div className="mastery">
                      <div className="mastery-head">
                        <span>{t('echo.mastery')} <b>{m.level}/{MASTERY_MAX}</b></span>
                        <span>{m.next == null ? t('echo.masteryMax') : `${m.xp - m.current} / ${m.next - m.current} XP`}</span>
                      </div>
                      <div className="bar mastery-bar"><div className="fill" style={{ width: `${m.next == null ? 100 : ((m.xp - m.current) / (m.next - m.current)) * 100}%` }} /></div>
                    </div>
                  )}
                </div>
              </div>
              <dl className="echo-stats">
                <dt>{t('echo.passive')}</dt><dd>{has ? echoPassiveText(t, shown) : '—'}</dd>
                <dt>{t('echo.skill')}</dt><dd>{has ? echoSkillText(t, shown) : '—'}</dd>
                <dt>{t('echo.resonance')}</dt><dd>{has ? echoResonanceText(t, shown) : '—'}</dd>
              </dl>
              <div className="echo-foot">
                {has && !echoRarityOwned(profile, e.id) && !holders.includes(hero) ? (
                  <span className="muted">🔒 {t('unlock.rarityLocked')}</span>
                ) : has ? (
                  // equipped on this hero: on equips it (replacing the hero's echo), off unequips it
                  <button
                    role="switch"
                    aria-checked={holders.includes(hero)}
                    className={`echo-toggle ${holders.includes(hero) ? 'on' : ''}`}
                    onClick={() => (holders.includes(hero) ? unequip(hero) : equip(hero, e.id))}
                  >
                    <span className="echo-toggle-track"><span className="echo-toggle-knob" /></span>
                    <span>{t('echo.equippedHere')}</span>
                  </button>
                ) : <span className="muted">{t('echo.notOwned')}</span>}
                {has && others.length > 0 && <span className="muted">{t('echo.alsoOn', { heroes: others.map((h) => data.characters[h].name).join(', ') })}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape onClick={() => (fromRun ? backToMap() : go(SCREEN.TITLE))}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}

/** How echoes work (opened from the info button): account rules, how to get them, slots, mastery. */
function EchoInfo({ t, onClose }) {
  const rules = [
    t('echo.ruleAccount'),
    t('echo.ruleObtain'),
    t('echo.stats'),
    t('echo.masteryHowTo', { step: Math.round(MASTERY_STEP * 100), a: MASTERY_MILESTONES[0], b: MASTERY_MILESTONES[1] }),
  ];
  return (
    <div className="modal auto-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auto-panel echo-info" role="dialog" aria-label={t('echo.info')}>
        <div className="auto-head">
          <h2><PixelIcon name="orb" size={20} />{t('echo.info')}</h2>
        </div>
        <ul className="echo-info-list">
          {rules.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <div className="row auto-foot">
          <button className="btn primary" data-escape data-primary onClick={onClose}>{t('common.gotIt')}</button>
        </div>
      </div>
    </div>
  );
}
