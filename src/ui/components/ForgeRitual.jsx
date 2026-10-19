import React, { useEffect, useState } from 'react';
import { sfx } from '../../game/systems/audio.js';
import FarmIcon from './FarmIcon.jsx';
import RelicSprite from './RelicSprite.jsx';

/** Milliseconds the materials take to melt into the relic before the first blow. */
const HEAT_MS = 850;
/** Gaps after each hammer blow of a reroll: fast, then slowing down to the deciding one. */
export const REROLL_GAPS = [95, 95, 100, 110, 120, 140, 165, 200, 250, 320, 410];
/** Gaps of an upgrade: a steady beat, the last one heavier. */
export const UPGRADE_GAPS = [210, 200, 190, 180, 260];
/** Pause on the last blow before the result is shown. */
const SETTLE_MS = 520;
const SPARKS = 7;
const EMBERS = 12;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The Forge at work on a relic, over the Forge screen (the change is already saved: this only shows
 * it). The materials fly into the relic on the anvil, which heats up; then the hammer falls, every
 * blow throwing sparks and flashing a label of `reel` ({ label, color }; a null label just strikes)
 * like a roulette with its ticks; the last, heavier blow lands on the result, which `children`
 * show on a card with rays and a fanfare. Tapping skips to the result; with reduced motion it starts there.
 */
export default function ForgeRitual({ relic, materials, reel, gaps, name, t, onDone, children }) {
  const [phase, setPhase] = useState(() => (reducedMotion() ? 'reveal' : 'heat'));
  const [step, setStep] = useState(-1);
  const final = reel[reel.length - 1];

  useEffect(() => {
    if (phase === 'reveal') return undefined;
    const ids = [];
    let at = HEAT_MS;
    const total = gaps.reduce((a, g) => a + g, 0) / 1000;
    ids.push(setTimeout(() => { setPhase('strike'); sfx.reelSpin(total); }, at));
    reel.forEach((_, i) => {
      const last = i === reel.length - 1;
      ids.push(setTimeout(() => {
        setStep(i);
        if (last) sfx.reelStop(SETTLE_MS / 1000);
        else sfx.reelTick(i / reel.length);
      }, at));
      at += gaps[i] ?? 0;
    });
    ids.push(setTimeout(() => setPhase('reveal'), at + SETTLE_MS));
    return () => ids.forEach(clearTimeout);
  }, [phase === 'reveal', reel, gaps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'reveal') return;
    sfx.loot('epic');
    navigator.vibrate?.(40);
  }, [phase]);

  const cur = phase === 'reveal' ? final : (reel[step] ?? null);
  const last = step === reel.length - 1;
  const gap = gaps[step] ?? 260;
  const style = { '--q': cur?.color ?? '#ff8a2a', '--blow': `${Math.min(gap, 220)}ms` };

  if (phase === 'reveal') {
    return (
      <div className="modal forge-ritual reveal" style={style} role="dialog" aria-label={name}>
        <div className="forge-ritual-rays" aria-hidden="true" />
        <div className="forge-reveal-burst" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--a': `${i * 30 + 8}deg`, '--d': `${70 + (i % 3) * 26}px` }} />)}
        </div>
        <div className="forge-reveal-card">
          <span className="forge-reveal-art"><RelicSprite id={relic} size={96} /></span>
          <b className="forge-reveal-name">{name}</b>
          {children}
          <button className="btn primary forge-reveal-go" autoFocus onClick={onDone}>{t('relic.ritual.done')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal forge-ritual" style={style} role="dialog" aria-label={t('craft.ritual.forging')} onClick={() => setPhase('reveal')}>
      <div className="forge-embers" aria-hidden="true">
        {Array.from({ length: EMBERS }, (_, i) => <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--t': `${1.6 + (i % 4) * 0.45}s`, '--dl': `${(i * 0.23) % 1.8}s` }} />)}
      </div>
      <div className={`forge-stage ${phase}`}>
        {phase === 'heat' && (
          <div className="forge-feed" aria-hidden="true">
            {materials.slice(0, 3).map((id, i) => (
              <span key={id} className="forge-feed-item" style={{ '--from': `${(i - 1) * 90}px`, '--dl': `${i * 110}ms` }}>
                <FarmIcon id={id} size={34} />
              </span>
            ))}
          </div>
        )}
        <svg key={`h${step}`} className={`forge-hammer ${step >= 0 ? 'blow' : ''} ${last ? 'final' : ''}`} viewBox="0 0 32 32" aria-hidden="true">
          <rect x="14" y="10" width="4" height="20" rx="1" fill="#7a4a24" />
          <rect x="14" y="10" width="2" height="20" fill="#9a6232" />
          <rect x="5" y="3" width="22" height="9" rx="1.5" fill="#5d6472" />
          <rect x="5" y="3" width="22" height="3" fill="#8b93a3" />
          <rect x="5" y="10" width="22" height="2" fill="#3c414c" />
        </svg>
        <div key={`p${step}`} className={`forge-piece ${step >= 0 ? 'struck' : ''} ${last ? 'final' : ''}`}>
          <RelicSprite id={relic} size={56} />
        </div>
        <div className="forge-anvil" aria-hidden="true" />
        {step >= 0 && (
          <div key={`s${step}`} className={`forge-sparks ${last ? 'final' : ''}`} aria-hidden="true">
            {Array.from({ length: last ? SPARKS * 2 : SPARKS }, (_, i) => (
              <i key={i} style={{ '--a': `${-170 + ((i * 47 + step * 23) % 160)}deg`, '--d': `${34 + ((i * 13 + step * 7) % 40) * (last ? 1.6 : 1)}px` }} />
            ))}
          </div>
        )}
        <div className="forge-reel" aria-live="polite">
          {cur?.label
            ? <span key={`q${step}`} className={`forge-reel-q ${last ? 'final' : ''}`}>{cur.label}</span>
            : step < 0 && <span className="forge-reel-q heating">{t('craft.ritual.forging')}</span>}
        </div>
      </div>
      <span className="forge-skip">{t('craft.ritual.skip')}</span>
    </div>
  );
}
