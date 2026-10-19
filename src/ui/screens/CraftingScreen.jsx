import React, { useState } from 'react';
import { useGame } from '../stores/gameStore.js';
import {
  RELICS, STAT_KEYS, RELIC_LEVEL_STEP, REROLL_COST, relicDef, ownedRelic, relicStats, relicPercents, upgradeCost,
  forgeStatus, forgeFee,
} from '../../core/crafting.js';
import { itemCount } from '../../core/farm.js';
import { useT } from '../i18n/index.js';
import FarmIcon from '../components/FarmIcon.jsx';
import HeroTabs from '../components/HeroTabs.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import RelicSprite from '../components/RelicSprite.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import ForgeRitual, { REROLL_GAPS, UPGRADE_GAPS } from '../components/ForgeRitual.jsx';
import { fmtShort } from '../components/format.js';

const pctText = (x) => `+${Math.round(x * 1000) / 10}%`;
/** Stat colours of the relics on the dark forge. */
const STAT_COLOR = { hp: '#ff6b6b', atk: '#ff9a3d', def: '#5aa9ff', speed: '#4fe0b8', luck: '#f2d36b' };

export const relicName = (t, id) => t(`relic.name.${id}`);

/** The stat a relic gives (the old value struck through when `before` differs). */
function StatLine({ id, state, t, before = null }) {
  const s = relicStats(id, state);
  const old = before ? relicStats(id, before) : null;
  return (
    <span className="relic-stats">
      <span className="relic-stat">
        <span className="relic-stat-name">{t(`stat.${s.stat}`)}</span>
        {old && old.pct !== s.pct && <s className="relic-stat-old">{pctText(old.pct)}</s>}
        <b>{pctText(s.pct)}</b>
      </span>
    </span>
  );
}

/** Material chips of a Forge cost, red when the farm stock is short. */
function Cost({ cost, profile, gold, fee, t }) {
  return (
    <span className="relic-cost">
      {Object.entries(cost).map(([m, n]) => (
        <span key={m} className={`relic-cost-chip ${itemCount(profile.farm, m) < n ? 'short' : ''}`} title={t(`farm.item.${m}`)}>
          <FarmIcon id={m} size={16} />{n}
        </span>
      ))}
      <span className={`relic-cost-chip ${gold < fee ? 'short' : ''}`}><PixelIcon name="coins" size={14} />{fmtShort(fee)}</span>
    </span>
  );
}

/**
 * Relics and Forge. Left, the four relic slots, one per relic (and stat): a relic sits in its own
 * slot once a boss drops it (a shadow until then) and works for every hero; what they add up to.
 * Right, the card of the selected relic: art, lore, its stat, and the Forge: upgrade (+1 level) or
 * reroll its percent, with mine materials and run gold (core/crafting.js).
 */
export default function CraftingScreen() {
  const t = useT();
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const back = useGame((s) => s.backToMap);
  const forge = useGame((s) => s.forgeRelic);
  const toast = useGame((s) => s.showToast);
  const [selected, setSelected] = useState(null);
  const [ritual, setRitual] = useState(null); // the Forge at work (ForgeRitual)
  if (!run || !profile) return null;

  const sel = selected ?? RELICS.find((r) => ownedRelic(profile, r.id))?.id ?? RELICS[0].id;
  const state = ownedRelic(profile, sel);
  const total = relicPercents(profile);
  const fee = forgeFee(run.gold);

  function onForge(kind) {
    const res = forge(sel, kind);
    if (!res) return;
    const def = relicDef(sel);
    const color = STAT_COLOR[def.stat];
    const cost = kind === 'upgrade' ? upgradeCost(res.before) : REROLL_COST;
    const final = { label: kind === 'upgrade' ? `+${res.after.level}` : pctText(relicStats(sel, res.after).pct), color: kind === 'upgrade' ? '#f2b632' : color };
    // upgrade: plain blows, then the new level; reroll: a percent of the range per blow, landing on the new one
    const k = 1 + RELIC_LEVEL_STEP * res.after.level;
    const reel = kind === 'upgrade'
      ? [...UPGRADE_GAPS.slice(1).map(() => ({ label: null, color: '#ff8a2a' })), final]
      : [...REROLL_GAPS.slice(1).map(() => ({ label: pctText((def.min + (def.max - def.min) * Math.random()) * k), color })), final];
    setRitual({ ...res, kind, reel, materials: Object.keys(cost) });
  }
  function endRitual() {
    toast(ritual.kind === 'upgrade'
      ? t('relic.upgraded', { name: relicName(t, ritual.id), n: ritual.after.level })
      : t('relic.rerolled', { name: relicName(t, ritual.id), pct: pctText(relicStats(ritual.id, ritual.after).pct) }));
    setRitual(null);
  }

  const upCost = state ? upgradeCost(state) : null;
  const upSt = forgeStatus(run, profile, sel, 'upgrade');
  const reSt = forgeStatus(run, profile, sel, 'reroll');
  const def = relicDef(sel);

  return (
    <div className={`screen crafting hero-screen wood-screen ${ritual ? 'modal-open' : ''}`}>
      <WoodBackdrop />
      <HeroTabs />
      {ritual && (
        <ForgeRitual relic={ritual.id} materials={ritual.materials} reel={ritual.reel} gaps={ritual.kind === 'upgrade' ? UPGRADE_GAPS : REROLL_GAPS} name={relicName(t, ritual.id)} t={t} onDone={endRitual}>
          <span className="relic-level-badge big">+{ritual.after.level}</span>
          <StatLine id={ritual.id} state={ritual.after} before={ritual.before} t={t} />
        </ForgeRitual>
      )}

      <div className="forge-main relic-main">
        <section className="panel relic-altar">
          <h2><PixelIcon name="star" size={18} />{t('craft.relicsShort')}</h2>
          <div className="relic-niches">
            {RELICS.map((r) => {
              const st = ownedRelic(profile, r.id);
              return (
                <button key={r.id} className={`relic-niche ${st ? 'filled' : 'empty'} ${sel === r.id ? 'target' : ''}`} style={{ '--stat': STAT_COLOR[r.stat] }} onClick={() => setSelected(r.id)} aria-pressed={sel === r.id}>
                  <span className="relic-niche-label">{t(`stat.${r.stat}`)}</span>
                  <span className="relic-niche-art"><RelicSprite id={r.id} size={48} shadow={!st} /></span>
                  <b className={`relic-niche-name ${st ? '' : 'muted'}`}>{st ? relicName(t, r.id) : t('relic.unknown')}</b>
                  {st && <span className="relic-niche-pct">{pctText(relicStats(r.id, st).pct)}</span>}
                  {st?.level > 0 && <span className="relic-level-badge">+{st.level}</span>}
                </button>
              );
            })}
          </div>
          <div className="relic-total">
            <span className="relic-total-label">{t('relic.total')}</span>
            {total
              ? STAT_KEYS.filter((k) => total[k] > 0).map((k) => <span key={k} className="relic-total-chip">{t(`stat.${k}`)} <b>{pctText(total[k])}</b></span>)
              : <span className="muted small">{t('relic.noneFound')}</span>}
          </div>
          <p className="relic-note">{t('relic.allHeroes')}</p>
        </section>

        <section className="panel relic-collection">
          <h2><PixelIcon name="forge" size={18} />{t('craft.title')}</h2>
          <div key={sel} className={`relic-detail ${state ? 'found' : 'unknown'}`}>
            <div className="relic-detail-head">
              <span className="relic-detail-art"><RelicSprite id={sel} size={72} shadow={!state} /></span>
              <span className="relic-detail-title">
                <b>{state ? relicName(t, sel) : t('relic.unknown')}</b>
                {state
                  ? <span className="relic-detail-level">{t('relic.level', { n: state.level })}</span>
                  : <span className="relic-detail-level">{t(`stat.${def.stat}`)}</span>}
              </span>
            </div>
            <p className="relic-lore">{state ? t(`relic.lore.${sel}`) : t('relic.unknownLore')}</p>
            {state && (
              <>
                <StatLine id={sel} state={state} t={t} />
                <div className="relic-forge">
                  <div className="relic-forge-row">
                    <button className={`btn primary relic-forge-btn ${upSt === 'ok' ? 'ready' : ''}`} disabled={upSt !== 'ok' || !!ritual} onClick={() => onForge('upgrade')}>
                      <PixelIcon name="forge" size={16} />{upCost ? t('relic.upgrade', { n: state.level + 1 }) : t('relic.maxLevel')}
                    </button>
                    {upCost && <Cost cost={upCost} profile={profile} gold={run.gold} fee={fee} t={t} />}
                  </div>
                  <div className="relic-forge-row">
                    <button className="btn relic-forge-btn" disabled={reSt !== 'ok' || !!ritual} onClick={() => onForge('reroll')}>
                      <PixelIcon name="orb" size={16} />{t('relic.reroll')}
                    </button>
                    <Cost cost={REROLL_COST} profile={profile} gold={run.gold} fee={fee} t={t} />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape onClick={() => back()}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}
