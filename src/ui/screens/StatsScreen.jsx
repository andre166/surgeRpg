import React, { useMemo, useState } from 'react';
import { useGame } from '../stores/gameStore.js';
import { STAT_POINT_GAIN } from '../../core/progression/characters.js';
import { fmt, fmtFull } from '../components/format.js';
import { useT } from '../i18n/index.js';
import PixelIcon, { LEVEL_ICON, STAT_ICONS as ICONS } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import HeroTabs from '../components/HeroTabs.jsx';
import { autoAllocOf, toPercents, percentTotal, snapPercent, AUTO_STATS, AUTO_STEP } from '../../core/progression/autoAlloc.js';

const KEYS = ['hp', 'atk', 'def', 'speed', 'luck'];
// stat values: full digits up to the millions, abbreviated (1.50B) past that so a row keeps one line
const num = (n) => (Math.abs(n) < 1e9 ? fmtFull(n) : fmt(n));

export default function StatsScreen() {
  const t = useT();
  const run = useGame((s) => s.run);
  const stats = useGame((s) => s.heroStats)();
  const confirm = useGame((s) => s.confirmStats);
  const back = useGame((s) => s.backToMap);
  const auto = autoAllocOf(useGame((s) => s.profile));
  const [autoOpen, setAutoOpen] = useState(false);
  const [staged, setStaged] = useState({ hp: 0, atk: 0, def: 0, speed: 0, luck: 0 });
  const spent = useMemo(() => KEYS.reduce((a, k) => a + staged[k], 0), [staged]);
  if (!run || !stats) return null;
  const left = run.statPoints - spent;

  function add(k, n) {
    const v = Math.max(0, Math.min(staged[k] + n, staged[k] + left));
    setStaged({ ...staged, [k]: v });
  }
  function allIn(k) {
    setStaged({ ...staged, [k]: staged[k] + left });
  }
  function half(k) {
    const target = Math.trunc((run.statPoints - spent + staged[k]) / 2 + 0.5);
    setStaged({ ...staged, [k]: Math.min(staged[k] + left, target) });
  }
  function reset() {
    setStaged({ hp: 0, atk: 0, def: 0, speed: 0, luck: 0 });
  }
  function doConfirm() {
    confirm(staged);
    reset();
  }

  return (
    <div className="screen stats hero-screen wood-screen">
      <WoodBackdrop />
      {autoOpen && <AutoAllocPanel auto={auto} onClose={() => setAutoOpen(false)} />}
      <HeroTabs />
      <header className="hero-head">
        <div className="hero-chips">
          <span className="hero-chip"><PixelIcon name={LEVEL_ICON.name} colors={LEVEL_ICON.colors} size={16} />LV <b>{fmtFull(run.level)}</b></span>
          <span className={`hero-chip points ${left > 0 ? 'has-points' : ''}`}><PixelIcon name="star" size={16} />{t('alloc.points')} <b>{fmtFull(left)}</b></span>
          <button className={`btn stats-auto ${auto.on ? 'on' : ''}`} onClick={() => setAutoOpen(true)}>
            {t('alloc.auto')} <span className="stats-auto-state">{auto.on ? t('alloc.autoOn') : t('alloc.autoOff')}</span>
          </button>
        </div>
      </header>
      <div className="stat-table">
        {KEYS.map((k) => {
          const gain = staged[k] * STAT_POINT_GAIN[k];
          const bonusPct = stats.bonusPercent[k];
          const previewBonus = Math.floor(gain * bonusPct);
          return (
            <div className={`stat-row ${gain > 0 ? 'staged' : ''}`} key={k}>
              <PixelIcon name={ICONS[k]} size={24} className="stat-icon" />
              <div className="stat-name">
                <b>{t(`stat.${k}`)}</b>
                <span className="stat-help">{t(`alloc.help.${k}`)} {t('alloc.perPoint', { n: STAT_POINT_GAIN[k] })}</span>
              </div>
              <div className="stat-value">
                <b title={fmtFull(run.base[k])}>{num(run.base[k])}</b>
                <span className="stat-bonus">{stats.bonus[k] < 0 ? '' : '+'}{num(stats.bonus[k])}</span>
                {gain > 0 && <span className="gain">→ +{num(gain)}{previewBonus ? ` (+${num(previewBonus)})` : ''}</span>}
              </div>
              <div className="stat-total">
                <span>{t('alloc.total')}</span>
                <b>{num(stats.total[k])}</b>
              </div>
              <div className="stat-buttons">
                <button className="btn tiny" disabled={left === 0} onClick={() => add(k, 1)}>+1</button>
                <button className="btn tiny" disabled={left === 0} onClick={() => half(k)}>{t('alloc.half')}</button>
                <button className="btn tiny all" disabled={left === 0} onClick={() => allIn(k)}>{t('alloc.all')}</button>
              </div>
            </div>
          );
        })}
        {/* under the last stat (Luck) and its buttons, inside the card */}
        {spent > 0 && <p className="stats-warn">{t('alloc.warn')}</p>}
      </div>
      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape onClick={() => { reset(); back(); }}>{t('common.back')}</button>
          <button className="btn" disabled={spent === 0} onClick={reset}>{t('common.cancel')}</button>
          <button className="btn primary" data-primary disabled={spent === 0} onClick={doConfirm}>{t('common.confirm')}</button>
        </div>
      </footer>
    </div>
  );
}

/**
 * Auto distribution settings: on/off and a percentage per stat in steps of 5 (− / + or
 * typed, snapped on blur). Saving needs exactly 100%, on or off, typed values included.
 * Saved to the profile and applied after every battle.
 */
function AutoAllocPanel({ auto, onClose }) {
  const t = useT();
  const save = useGame((s) => s.setAutoAlloc);
  const [on, setOn] = useState(auto.on);
  const [pcts, setPcts] = useState(() => toPercents(auto.weights));
  const [drafts, setDrafts] = useState({});
  // what the panel shows: saved steps plus anything still being typed (snapped)
  const effective = Object.fromEntries(AUTO_STATS.map((k) => [k, drafts[k] != null ? snapPercent(drafts[k]) : pcts[k]]));
  const total = percentTotal(effective);
  const canSave = total === 100;

  // a stat can only take what the others leave free (the total never passes 100)
  const setPct = (k, v) => {
    setPcts({ ...pcts, [k]: Math.min(snapPercent(v), 100 - (total - effective[k])) });
    setDrafts({ ...drafts, [k]: undefined });
  };
  const commitDraft = (k) => {
    if (drafts[k] != null) setPct(k, drafts[k]);
  };

  return (
    <div className="modal auto-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auto-panel" role="dialog" aria-label={t('alloc.autoTitle')}>
        <div className="auto-head">
          <h2>{t('alloc.autoTitle')}</h2>
          <div className="auto-toggle" role="group">
            <button className={`btn ${!on ? 'active' : ''}`} aria-pressed={!on} onClick={() => setOn(false)}>{t('alloc.autoOff')}</button>
            <button className={`btn ${on ? 'active on' : ''}`} aria-pressed={on} onClick={() => setOn(true)}>{t('alloc.autoOn')}</button>
          </div>
        </div>
        <p className="auto-help">{t('alloc.autoHelp')}</p>
        <div className="auto-rows">
          {AUTO_STATS.map((k) => (
            <div key={k} className="auto-row">
              <PixelIcon name={ICONS[k]} size={20} />
              <b>{t(`stat.${k}`)}</b>
              <div className="auto-stepper">
                <button className="btn" aria-label={`− ${AUTO_STEP}%`} disabled={effective[k] <= 0} onClick={() => setPct(k, effective[k] - AUTO_STEP)}>−</button>
                <label className="auto-input">
                  <input
                    type="number" min="0" max="100" step={AUTO_STEP} inputMode="numeric"
                    value={drafts[k] ?? pcts[k]}
                    aria-label={`${t('alloc.weight')} ${t(`stat.${k}`)}`}
                    onChange={(e) => setDrafts({ ...drafts, [k]: e.target.value })}
                    onBlur={() => commitDraft(k)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); commitDraft(k); } }}
                    onFocus={(e) => e.target.select()}
                  />
                  <span>%</span>
                </label>
                <button className="btn" aria-label={`+ ${AUTO_STEP}%`} disabled={effective[k] >= 100 || total >= 100} onClick={() => setPct(k, effective[k] + AUTO_STEP)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div className={`auto-total ${total === 100 ? 'full' : ''}`}>
          <span>{t('alloc.autoTotal')}</span>
          <b>{total}% / 100%</b>
        </div>
        {total !== 100 && <p className="auto-warn">{t('alloc.autoNeed100')}</p>}
        <div className="row auto-foot">
          <button className="btn" data-escape onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn primary" data-primary disabled={!canSave} onClick={() => { if (!canSave) return; save({ on, weights: effective }); onClose(); }}>{t('alloc.save')}</button>
        </div>
      </div>
    </div>
  );
}
