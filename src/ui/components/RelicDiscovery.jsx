import React, { useEffect, useState } from 'react';
import { sfx } from '../../game/systems/audio.js';
import { relicStats } from '../../core/crafting.js';
import RelicSprite from './RelicSprite.jsx';

/** Heartbeats (s) of the shadow before it wakes. */
const BEATS = [0.75, 1.35, 1.85];
/** When the relic is revealed (s). */
const WAKE_AT = 2.4;
const MOTES = 16;

const pctText = (x) => `+${Math.round(x * 1000) / 10}%`;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A relic found after a boss (ResultScreen shows it before the rewards): a full-screen moment.
 * The screen sinks into an abyssal mist; the relic's shadow rises from it and beats like a heart,
 * each beat a low thump and a flicker of eldritch light, while "something stirs…" trembles; then a
 * flash wakes it: the full art with rays, its name stamped, its lore and stats, and Continue.
 * Tapping skips to the reveal; with reduced motion it starts there.
 */
export default function RelicDiscovery({ id, state, t, onDone }) {
  const [phase, setPhase] = useState(() => (reducedMotion() ? 'awake' : 'stir'));
  const [beat, setBeat] = useState(-1);

  useEffect(() => {
    if (phase !== 'stir') return undefined;
    const ids = [setTimeout(() => sfx.abyss(), 120)];
    BEATS.forEach((s, i) => ids.push(setTimeout(() => { setBeat(i); sfx.relicPulse(i / (BEATS.length - 1)); navigator.vibrate?.(30 + i * 20); }, s * 1000)));
    ids.push(setTimeout(() => setPhase('awake'), WAKE_AT * 1000));
    return () => ids.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'awake') return;
    sfx.loot('legendary');
    navigator.vibrate?.([40, 60, 90]);
  }, [phase]);

  const s = relicStats(id, state);
  const awake = phase === 'awake';
  return (
    <div
      className={`relic-discovery ${phase}`}
      role="dialog" aria-label={t('relic.found')}
      onClick={(e) => { e.stopPropagation(); if (!awake) setPhase('awake'); }}
    >
      <div className="rd-mist" aria-hidden="true"><i /><i /><i /></div>
      <div className="rd-motes" aria-hidden="true">
        {Array.from({ length: MOTES }, (_, i) => <i key={i} style={{ '--x': `${(i * 61) % 100}%`, '--t': `${3 + (i % 5) * 0.7}s`, '--dl': `${(i * 0.37) % 3}s` }} />)}
      </div>
      {awake && <div className="rd-flash" aria-hidden="true" />}
      {awake && <div className="rd-rays" aria-hidden="true" />}

      <div className="rd-center">
        <span className="rd-kicker">{awake ? t('relic.discovery.kicker') : t('relic.discovery.stir')}</span>
        <div className="rd-art">
          <span className="rd-halo" aria-hidden="true" />
          {awake
            ? <span className="rd-sprite awake"><RelicSprite id={id} size={144} /></span>
            : <span key={beat} className={`rd-sprite shadow ${beat >= 0 ? 'beat' : ''}`}><RelicSprite id={id} size={144} shadow /></span>}
          {awake && (
            <span className="rd-burst" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--a': `${i * 22.5}deg`, '--d': `${90 + (i % 4) * 24}px` }} />)}
            </span>
          )}
        </div>
        {awake && (
          <div className="rd-info">
            <span className="rd-new">{t('result.new')}</span>
            <b className="rd-name">{t(`relic.name.${id}`)}</b>
            <p className="rd-lore">{t(`relic.lore.${id}`)}</p>
            {s && <span className="rd-stats"><span>{t(`stat.${s.stat}`)} <b>{pctText(s.pct)}</b></span></span>}
            <span className="rd-hint">{t('relic.foundNote')}</span>
            <button className="btn primary rd-go" autoFocus onClick={(e) => { e.stopPropagation(); onDone(); }}>{t('relic.ritual.done')}</button>
          </div>
        )}
      </div>
      {!awake && <span className="forge-skip">{t('craft.ritual.skip')}</span>}
    </div>
  );
}
