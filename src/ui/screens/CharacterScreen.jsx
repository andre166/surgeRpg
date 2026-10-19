import React, { useState } from 'react';
import { useGame, SCREEN, data } from '../stores/gameStore.js';
import { Hero } from '../components/Sprite.jsx';
import { characterPowerWeights } from '../../core/attributes/characterPower.js';
import { characterAbilityLevel, baseAbilityLevel, bossLevel, ABILITY_BOSSES, ABYSS_UNLOCK_BASE } from '../../core/progression/characters.js';
import { useT } from '../i18n/index.js';
import { CLASSES, heroClass, DEFAULT_CLASS, classOwned } from '../../core/progression/classes.js';
import AccountUnlock from '../components/AccountUnlock.jsx';
import { classPassiveText } from '../components/ClassButton.jsx';
import { relicSlots } from '../../core/crafting.js';
import RelicSprite from '../components/RelicSprite.jsx';
import { relicName } from './CraftingScreen.jsx';
import { heroEcho } from '../../core/echoes.js';
import { tpLevel } from '../../core/progression/talents.js';
import PixelIcon, { LEVEL_ICON, STAT_ICONS } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import AbyssBackdrop from '../components/AbyssBackdrop.jsx';
import { sfx } from '../../game/systems/audio.js';
import { heroCurrentPassive, passiveShardCount, canReroll, passiveRerollUnlocked, passiveOffer, PASSIVE_REROLL_COST } from '../../core/progression/passiveShards.js';
import { playableHeroes, playableHeroOr } from '../../core/progression/heroes.js';
import { heroExtra, heroExtraUsed, lbNextCost, lbAddStatus, LB_STATS, LB_MAX_PER_STAT, lbUnlocked } from '../../core/progression/limitBreak.js';

// one decimal when it has one (rolled passives: +1.3%)
const pctLabel = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 1000) / 10}%`;

/**
 * Limit Break on the hero page: Break Shards buy extra affinity arrows (max 2 per stat, 3 extra per
 * hero; core/progression/limitBreak.js). Reset refunds every shard.
 */
function LimitBreakPanel({ profile, sel, t }) {
  const addLimitArrow = useGame((s) => s.addLimitArrow);
  const resetLimitBreak = useGame((s) => s.resetLimitBreak);
  const [ask, setAsk] = useState(null); // stat whose arrow the confirm modal is about
  const shards = profile.limitBreak?.shards ?? 0;
  const used = heroExtraUsed(profile, sel);
  if (!lbUnlocked(profile)) {
    return (
      <div className="limit-break locked">
        <div className="lb-head">
          <span className="lb-title"><PixelIcon name="abyssEye" size={16} />{t('lb.title')}</span>
          <span className="lb-lock" aria-label={t('lb.st.locked')} title={t('lb.st.locked')}>🔒</span>
        </div>
      </div>
    );
  }
  return (
    <div className="limit-break">
      <div className="lb-head">
        <span className="lb-title"><PixelIcon name="abyssEye" size={16} />{t('lb.title')}</span>
        {used > 0 && <button className="btn small lb-reset" onClick={() => { resetLimitBreak(sel); sfx.click(); }} title={t('lb.resetHint')}>{t('lb.reset')}</button>}
      </div>
      {/* every extra arrow used: nothing left to buy, so no stat buttons (Reset still frees them) */}
      {lbNextCost(profile, sel) != null && (
      <div className="lb-stats">
        {/* stats the hero already has at the cap naturally have nothing to break */}
        {LB_STATS.filter((k) => characterPowerWeights(sel)[k] < LB_MAX_PER_STAT).map((k) => {
          const st = lbAddStatus(profile, sel, k);
          // capped stats / heroes stay disabled; otherwise the modal tells the price (and if it is affordable)
          const closed = st === 'statMax' || st === 'heroMax';
          return (
            <button key={k} className="btn small lb-add" disabled={closed} title={t(`lb.st.${st}`)} onClick={() => { setAsk(k); sfx.click(); }}>
              <PixelIcon name={STAT_ICONS[k]} size={14} />{t(`stat.${k}`)}
            </button>
          );
        })}
      </div>
      )}
      {ask && (
        <LimitBreakModal
          t={t}
          stat={ask}
          cost={lbNextCost(profile, sel)}
          shards={shards}
          ok={lbAddStatus(profile, sel, ask) === 'ok'}
          onConfirm={() => { addLimitArrow(sel, ask); sfx.levelUp(); setAsk(null); }}
          onClose={() => setAsk(null)}
        />
      )}
    </div>
  );
}

/** Confirm modal of a Limit Break arrow: how many shards it takes, and the buy when affordable. */
function LimitBreakModal({ t, stat, cost, shards, ok, onConfirm, onClose }) {
  return (
    <div className="modal auto-modal class-auto-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); e.stopPropagation(); }}>
      <div className="auto-panel lb-modal" role="dialog" aria-label={t('lb.title')}>
        <div className="auto-head">
          <h2><PixelIcon name={STAT_ICONS[stat]} size={20} />{t('lb.upTitle', { stat: t(`stat.${stat}`) })}</h2>
        </div>
        <p>{t('lb.need', { n: cost, shard: t('lb.shards'), stat: t(`stat.${stat}`) })}</p>
        <p className={ok ? 'lb-have' : 'lb-have lb-short'}>{t('lb.have', { n: shards, shard: t('lb.shards') })}</p>
        <div className="row auto-foot">
          <button className="btn" data-escape onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn primary" data-primary disabled={!ok} onClick={onConfirm}>{t('common.confirm')}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * The hero's passive and its reroll: abyssal bosses drop Passive Shards, PASSIVE_REROLL_COST of them
 * swap the passive for a random other one (core/progression/passiveShards.js).
 */
function PassivePanel({ profile, sel, t }) {
  const p = heroCurrentPassive(profile, sel);
  return (
    <div className="affinity">
      <span className="affinity-label">{t('char.passive')}:</span>
      {p && (
        <span className="on"><b>{t(`hero.passive.${p.id}`)}</b> <PixelIcon name={STAT_ICONS[p.stat]} size={16} />{t(`stat.${p.stat}`)} {pctLabel(p.pct)}</span>
      )}
    </div>
  );
}

/**
 * The passive reroll, a panel like Limit Break's: locked until Limit Break opens, then the Passive
 * Shards and the Reroll button, which asks first (core/progression/passiveShards.js).
 */
function PassiveRerollPanel({ profile, sel, t }) {
  const rerollHeroPassive = useGame((s) => s.rerollHeroPassive);
  const acceptPassive = useGame((s) => s.acceptPassiveOffer);
  const keepPassive = useGame((s) => s.keepPassive);
  const rerollAgain = useGame((s) => s.rerollPassiveAgain);
  const [ask, setAsk] = useState(false); // 'pay' (the price) | 'pick' (accept / keep the rolled one)
  const shards = passiveShardCount(profile);
  const offer = passiveOffer(profile, sel);
  const current = heroCurrentPassive(profile, sel);
  if (!passiveRerollUnlocked(profile)) {
    return (
      <div className="limit-break locked">
        <div className="lb-head">
          <span className="lb-title"><PixelIcon name="star" size={16} />{t('ps.title')}</span>
          <span className="lb-lock" aria-label={t('lb.st.locked')} title={t('lb.st.locked')}>🔒</span>
        </div>
      </div>
    );
  }
  const close = () => setAsk(false);
  const passiveLine = (p) => (
    <span className="ps-passive"><b>{t(`hero.passive.${p.id}`)}</b> <PixelIcon name={STAT_ICONS[p.stat]} size={16} />{t(`stat.${p.stat}`)} {pctLabel(p.pct)}</span>
  );
  return (
    <div className="limit-break">
      <div className="lb-head">
        <span className="lb-title"><PixelIcon name="star" size={16} />{t('ps.title')}</span>
        {/* a roll not answered yet (closed modal, reload): the button reopens the choice */}
        {offer ? (
          <button className="btn small lb-reset" onClick={() => { setAsk('pick'); sfx.click(); }}>{t('ps.pending')}</button>
        ) : (
          <button className="btn small lb-reset" title={t('ps.rerollHint')} onClick={() => { setAsk('pay'); sfx.click(); }}>{t('ps.reroll', { n: PASSIVE_REROLL_COST })}</button>
        )}
      </div>
      {ask && (
        <div className="modal auto-modal class-auto-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); e.stopPropagation(); }}>
          <div className="auto-panel lb-modal" role="dialog" aria-label={t('ps.title')}>
            <div className="auto-head">
              <h2><PixelIcon name="star" size={20} />{t('ps.title')}</h2>
            </div>
            {ask === 'pick' && offer ? (
              <>
                <p>{t('ps.pickHint')}</p>
                <div className="ps-compare">
                  <div className="ps-option"><span className="muted small">{t('ps.current')}</span>{passiveLine(current)}</div>
                  <span className="ps-arrow" aria-hidden="true">▼</span>
                  <div className="ps-option ps-new"><span className="muted small">{t('ps.new')}</span>{passiveLine(offer)}</div>
                </div>
                <div className="row auto-foot">
                  <button className="btn" data-escape onClick={() => { keepPassive(sel); sfx.click(); close(); }}>{t('ps.keep')}</button>
                  {/* another roll: drops this offer and pays again (passiveShards.js keepPassive + rerollPassive) */}
                  <button className="btn" disabled={shards < PASSIVE_REROLL_COST} title={t('ps.rerollHint')} onClick={() => { rerollAgain(sel); sfx.click(); }}>{t('ps.reroll', { n: PASSIVE_REROLL_COST })}</button>
                  <button className="btn primary" data-primary onClick={() => { acceptPassive(sel); sfx.levelUp(); close(); }}>{t('ps.accept')}</button>
                </div>
              </>
            ) : (
              <>
                <p>{t('ps.need', { n: PASSIVE_REROLL_COST, shard: t('ps.shards') })}</p>
                <p className={canReroll(profile, sel) ? 'lb-have' : 'lb-have lb-short'}>{t('lb.have', { n: shards })}</p>
                <div className="row auto-foot">
                  <button className="btn" data-escape onClick={close}>{t('common.cancel')}</button>
                  <button className="btn primary" data-primary disabled={!canReroll(profile, sel)} onClick={() => { rerollHeroPassive(sel); sfx.click(); setAsk('pick'); }}>{t('common.confirm')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * New run in two steps: first the hero grid; clicking a hero opens its page (portrait and
 * information, class choice, Start). Back on the hero page returns to the grid.
 */
/** The abyssal (hard) mode opens at this base level (bossLevel: map bosses beaten, progression/characters.js). */
const HARD_UNLOCK_BASE = ABYSS_UNLOCK_BASE;

export default function CharacterScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const go = useGame((s) => s.go);
  const newRun = useGame((s) => s.newRun);
  const [sel, setSel] = useState(playableHeroOr(profile?.lastCharacter ?? 0, data.characters));
  // 'mode' (difficulty: normal / abyssal) | 'heroes' (grid) | 'hero' (the picked hero's page)
  const [step, setStep] = useState('mode');
  const [hard, setHard] = useState(false);
  const [cls, setCls] = useState(classOwned(profile, profile?.lastClass) ? profile.lastClass : DEFAULT_CLASS);
  const base = baseAbilityLevel(profile.bossWins); // original ability level (character power)
  const bp = bossLevel(profile.bossWins); // base level of the unlocks
  const hardUnlocked = bp >= HARD_UNLOCK_BASE;
  const abyss = hard && step !== 'mode';
  const c = data.characters[sel];
  const w = characterPowerWeights(sel);
  const extra = heroExtra(profile, sel); // Limit Break arrows (core/progression/limitBreak.js)
  const hasRun = !!profile.run;

  return (
    // abyssal mode: the hero select turns eldritch (AbyssBackdrop, .wood-screen.abyss in styles.css)
    <div className={`screen character hero-screen wood-screen ${abyss ? 'abyss' : ''}`}>
      {abyss ? <AbyssBackdrop /> : <WoodBackdrop />}
      <header className="hero-head">
        <h1><PixelIcon name="sword" size={24} />{step === 'mode' ? t('mode.title') : t('char.title')}</h1>
        <div className="hero-chips">
          {step !== 'mode' && (
            <button className={`hero-chip mode-chip ${hard ? 'abyss' : ''}`} onClick={() => setStep('mode')} title={t('mode.title')}>
              <PixelIcon name={hard ? 'skull' : 'swords'} size={16} />{t(hard ? 'mode.abyss' : 'mode.normal')}
            </button>
          )}
          <span className="hero-chip" title={t('char.sharedByAll')}><PixelIcon name={LEVEL_ICON.name} colors={LEVEL_ICON.colors} size={16} />{t('char.baseLvl')} <b>{base}</b></span>
          {/* talents are account-wide, so the TP level sits with the base level rather than on each hero */}
          <span className="hero-chip" title={t('title.talents')}><PixelIcon name="slimeKing" size={16} />SK <b>{tpLevel(profile)}</b></span>
        </div>
      </header>
      {abyss && <p className="abyss-quote">{t('abyss.quote')}</p>}
      {step === 'mode' ? (
      // difficulty first: normal, or abyssal (hard mode) once the best level allows it
      <div className="mode-grid">
        <button className={`mode-card ${!hard ? 'selected' : ''}`} data-primary onClick={() => { setHard(false); setStep('heroes'); }}>
          <PixelIcon name="swords" size={40} />
          <b>{t('mode.normal')}</b>
          <span className="mode-desc">{t('mode.normalDesc')}</span>
        </button>
        {hardUnlocked ? (
          <button className={`mode-card abyss ${hard ? 'selected' : ''}`} onClick={() => { setHard(true); setStep('heroes'); sfx.abyss(); }}>
            <PixelIcon name="skull" size={40} />
            <b>{t('mode.abyss')}</b>
            <span className="mode-desc">{t('mode.abyssDesc')}</span>
          </button>
        ) : (
          <div className="mode-card abyss locked" aria-disabled="true">
            <PixelIcon name="skull" size={40} />
            <b>🔒 {t('mode.abyss')}</b>
            <span className="mode-desc">{t('mode.abyssDesc')}</span>
            <span className="small plot-need">{t('farm.plotBaseLevel', { cur: Math.min(bp, HARD_UNLOCK_BASE), n: HARD_UNLOCK_BASE })}</span>
          </div>
        )}
      </div>
      ) : step === 'heroes' ? (
      <div className="char-grid">
        {/* skin-only heroes (core/progression/heroes.js) stay out of the grid */}
        {playableHeroes(data.characters).map((ch) => (
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
            <p className="muted">{t(`char.story.${sel}`)}</p>
            {/* stats the hero's ability boosts: ▲ / ▲▲ by weight; Limit Break arrows in gold */}
            <div className="affinity">
              <span className="affinity-label">{t('char.heroBonus')}:</span>
              {Object.entries(w).filter(([k, v]) => v + (extra[k] ?? 0) > 0).map(([k, v]) => (
                <span key={k} className="on"><PixelIcon name={STAT_ICONS[k]} size={16} />{t(`stat.${k}`)} <span className="bonus-arrow">{'▲'.repeat(v)}<span className="lb-arrow">{'▲'.repeat(extra[k] ?? 0)}</span></span></span>
              ))}
              {base <= 0 && <span className="affinity-none">{t('char.bonusNone')}</span>}
            </div>
            <PassivePanel profile={profile} sel={sel} t={t} />
            <div className="char-relics small">
              <PixelIcon name="orb" size={16} /><span className="muted">{t('echo.title')}:</span>
              <span className="char-relic">{heroEcho(profile, sel) ? t(`echo.name.${heroEcho(profile, sel).id}`) : '—'}</span>
            </div>
            <div className="char-relics small">
              <PixelIcon name="forge" size={16} /><span className="muted">{t('craft.relicsShort')}:</span>
              {relicSlots(profile).map((id, i) => (
                <span key={i} className={`char-relic ${id ? 'has-relic' : 'empty'}`} title={id ? relicName(t, id) : ''}>
                  {id ? <RelicSprite id={id} size={20} /> : '—'}
                </span>
              ))}
            </div>
            {/* Limit Break and the passive reroll, below the relics; they show once the abyssal mode is open (they unlock there) */}
            {hardUnlocked && <LimitBreakPanel profile={profile} sel={sel} t={t} />}
            {hardUnlocked && <PassiveRerollPanel profile={profile} sel={sel} t={t} />}
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
                  {classPassiveText(t, cl.root) && <span className="class-passive"><b>{t(`class.${cl.id}.passive`)}</b>: {classPassiveText(t, cl.root)}</span>}
                </button>
              )))}
            </div>
          </div>
        </div>
      )}
      <footer className="hero-foot">
        <div className="row">
          {step === 'mode' ? (
            <button className="btn" data-escape onClick={() => go(SCREEN.TITLE)}>{t('common.back')}</button>
          ) : step === 'heroes' ? (
            <button className="btn" data-escape onClick={() => setStep('mode')}>{t('common.back')}</button>
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
