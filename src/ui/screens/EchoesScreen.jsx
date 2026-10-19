import React, { useState } from 'react';
import { useGame, SCREEN, data } from '../stores/gameStore.js';
import { ECHOES, ownsEcho, echoHolders, heroEcho, masteryInfo, applyMastery, echoFound, echoBuyStatus, MASTERY_MAX, MASTERY_STEP } from '../../core/echoes.js';
import { bossLevel } from '../../core/progression/characters.js';
import { slimeKingWins } from '../../core/bestiary.js';
import { accountProgress } from '../../core/progression/classes.js';
import UnlockNeed from '../components/UnlockNeed.jsx';
import { fmtShort } from '../components/format.js';
import { echoPassiveText, echoSkillText, echoResonanceText } from '../components/echoText.js';
import { useT } from '../i18n/index.js';
import { EchoSpirit } from '../components/Sprite.jsx';
import HeroTabs from '../components/HeroTabs.jsx';
import PixelIcon, { HeroPortrait } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import { playableHeroes, playableHeroOr } from '../../core/progression/heroes.js';

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
  const buy = useGame((s) => s.buyEcho);
  const toast = useGame((s) => s.showToast);
  const fromRun = !!(run && mapReturn);
  const [hero, setHero] = useState(fromRun ? run.characterIndex : playableHeroOr(profile?.lastCharacter ?? 0, data.characters));
  const [info, setInfo] = useState(false);
  if (!profile) return null;
  const base = bossLevel(profile.bossWins ?? {});
  const slimes = slimeKingWins(profile);
  const gold = (run ?? profile.run)?.gold ?? 0;
  const onBuy = (id) => {
    const res = buy(id);
    toast(res === 'ok' ? t('farm.unlockBought') : res === 'level' ? t('eq.needsBase') : res === 'drop' ? t('echo.needsDrop') : res === 'norun' ? t('unlock.needsRun') : t('eq.noGold'), 1400);
  };


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
            {playableHeroes(data.characters).map((c) => (
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
      <div className="echo-grid">
        {ECHOES.map((e) => {
          const has = ownsEcho(profile, e.id);
          // each echo needs the shared base level, then a boss drop reveals it (name and sprite), then it is bought with run gold (core/echoes.js echo.unlock)
          const seen = echoFound(profile, e.id);
          const holders = echoHolders(profile, e.id);
          const others = holders.filter((h) => h !== hero);
          const m = masteryInfo(profile, e.id);
          const shown = applyMastery(e, m.level);
          return (
            <div key={e.id} className={`echo-card r-${e.rarity} ${seen ? '' : 'locked'} ${holders.includes(hero) ? 'on-hero' : ''}`}>
              <div className="echo-top">
                {seen ? <EchoSpirit echo={e} size={64} /> : <span className="echo-spirit echo-unknown" style={{ width: 64, height: 64 }}>?</span>}
                <div className="echo-title">
                  <b>{seen ? t(`echo.name.${e.id}`) : '????'}</b>
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
                <dt>{t('echo.passive')}</dt><dd>{seen ? echoPassiveText(t, shown, accountProgress(profile, run)) : '—'}</dd>
                <dt>{t('echo.skill')}</dt><dd>{seen ? echoSkillText(t, shown) : '—'}</dd>
                <dt>{t('echo.resonance')}</dt><dd>{seen ? echoResonanceText(t, shown) : '—'}</dd>
              </dl>
              <div className="echo-foot">
                {has ? (
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
                ) : <EchoBuy t={t} echo={e} st={echoBuyStatus(profile, e.id, gold, base, slimes)} base={base} slimes={slimes} onBuy={() => onBuy(e.id)} />}
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

/**
 * Footer of an echo not bought yet: "Base LV cur/needed" or Slime King victories (red until
 * reached), then "drops from a boss" until dropped, then the buy button with its gold price (run gold), like AccountUnlock.
 */
function EchoBuy({ t, echo, st, base, slimes, onBuy }) {
  const price = echo.unlock;
  return (
    <span className="account-unlock">
      <span className="plot-lock">{st === 'level' ? '🔒' : '🔓'}</span>
      <UnlockNeed price={price} base={base} slimes={slimes} t={t} />
      {st === 'drop' && <span className="small muted">{t('echo.needsDrop')}</span>}
      {st !== 'level' && st !== 'drop' && (
        <button className={`btn tiny unlock-buy ${st === 'ok' ? 'primary' : ''}`} disabled={st !== 'ok'} onClick={onBuy} aria-label={`${t('farm.buyUnlock')} ${fmtShort(price.gold)}`} title={t('farm.buyUnlock')}>
          <span className={`plot-price ${st === 'gold' ? 'short' : ''}`}><PixelIcon name="coins" size={12} />{fmtShort(price.gold)}</span>
        </button>
      )}
    </span>
  );
}

/** How echoes work (opened from the info button): account rules, how to get them, slots, mastery. */
function EchoInfo({ t, onClose }) {
  const rules = [
    t('echo.ruleAccount'),
    t('echo.ruleObtain'),
    t('echo.stats'),
    t('echo.masteryHowTo', { step: Math.round(MASTERY_STEP * 100) }),
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
