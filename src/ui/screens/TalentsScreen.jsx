import React, { useState } from 'react';
import { useGame, SCREEN } from '../stores/gameStore.js';
import { fmtFull } from '../components/format.js';
import {
  TALENTS, TALENT_BRANCHES, heroTalents, talentRank, talentCost, talentBuyStatus, isTalentUnlocked, talentPercents, UNLOCK_RANK,
} from '../../core/progression/talents.js';
import { useT } from '../i18n/index.js';
import HeroTabs from '../components/HeroTabs.jsx';
import PixelIcon, { STAT_ICONS } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import InfoButton from '../components/InfoButton.jsx';
import AccountUnlock from '../components/AccountUnlock.jsx';
import { accountOwned, ACCOUNT_UNLOCK_PRICES } from '../../core/progression/unlocks.js';

const pctText = (x) => `${Math.round(x * 1000) / 10}%`;

/** Talent tree: five branches of five passive percent talents, bought with TP. */
export default function TalentsScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const mapReturn = useGame((s) => s.mapReturnScreen);
  const go = useGame((s) => s.go);
  const backToMap = useGame((s) => s.backToMap);
  const buy = useGame((s) => s.buyTalent);
  const reset = useGame((s) => s.resetTalents);
  const toast = useGame((s) => s.showToast);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!profile || !run) return null;
  const talents = heroTalents(profile, run.characterIndex);
  const totals = talentPercents(talents);
  const spentAny = Object.values(talents.ranks).some((r) => r > 0);
  const tiers = accountOwned(profile, 'talentTiers');

  function onBuy(tal) {
    const st = buy(tal.id);
    if (st === 'ok') return;
    toast(t(`tal.msg.${st}`, { n: Math.min(UNLOCK_RANK, TALENTS.find((x) => x.branch === tal.branch && x.tier === tal.tier - 1)?.maxRank ?? 0) }));
  }

  return (
    <div className="screen talents hero-screen wood-screen">
      <WoodBackdrop />
      <HeroTabs />
      <header className="hero-head">
        <div className="hero-chips tal-chips">
          <span className={`hero-chip points ${talents.points > 0 ? 'has-points' : ''}`}><PixelIcon name="tree" size={16} />TP <b>{fmtFull(talents.points)}</b></span>
        </div>
        {/* total bonus per attribute: chips in the row on desktop, an even 5-column strip on phones */}
        <div className="tal-totals">
          {TALENT_BRANCHES.map((b) => (
            <span key={b} className={`hero-chip tal-total-cell ${totals[b] > 0 ? '' : 'zero'}`}>
              <PixelIcon name={STAT_ICONS[b]} size={14} />
              <span className="tal-total-name">{t(`stat.${b}`)}</span>
              <b className="tal-total">+{pctText(totals[b])}</b>
            </span>
          ))}
        </div>
        {!confirmReset ? (
          <button className="btn small" disabled={!spentAny} onClick={() => setConfirmReset(true)}>{t('tal.reset')}</button>
        ) : (
          <button className="btn small danger" onClick={() => { reset(); setConfirmReset(false); }}>{t('tal.confirmReset')}</button>
        )}
        <InfoButton label={t('tal.help')}>
          <p>{t('tal.howTo', { earned: fmtFull(talents.earned) })}</p>
        </InfoButton>
      </header>
      {/* the five tiers (same in every branch) are bought in order (core/progression/unlocks.js) */}
      <div className="unlock-strip" aria-label={t('unlock.talentTiers')}>
        {ACCOUNT_UNLOCK_PRICES.talentTiers.map((_, i) => (i < tiers
          ? <span key={i} className="unlock-chip owned">✓ {t('unlock.tier', { n: i + 1 })}</span>
          : <span key={i} className="unlock-chip"><AccountUnlock kind="talentTiers" index={i} label={t('unlock.tier', { n: i + 1 })} /></span>))}
      </div>
      <div className="tal-tree">
        {TALENT_BRANCHES.map((b) => (
          <div key={b} className={`tal-branch tal-${b}`}>
            <h2><PixelIcon name={STAT_ICONS[b]} size={18} />{t(`tal.branch.${b}`)}</h2>
            {TALENTS.filter((x) => x.branch === b).map((tal) => {
              const rank = talentRank(talents, tal.id);
              const unlocked = tal.tier < tiers && isTalentUnlocked(talents, tal.id);
              const cost = talentCost(tal.id, rank);
              const status = talentBuyStatus(talents, tal.id, tiers);
              return (
                <button
                  key={tal.id}
                  className={`tal-node ${unlocked ? '' : 'locked'} ${rank > 0 ? 'owned' : ''} ${rank >= tal.maxRank ? 'maxed' : ''} ${status === 'ok' ? 'can-buy' : ''}`}
                  onClick={() => onBuy(tal)}
                  title={t(`tal.name.${tal.id}`)}
                >
                  <span className="tal-name">{unlocked ? t(`tal.name.${tal.id}`) : `🔒 ${t(`tal.name.${tal.id}`)}`}</span>
                  {tal.tier >= tiers && <span className="small plot-need">{t('unlock.tierLocked', { n: tal.tier + 1 })}</span>}
                  <span className="tal-effect">+{pctText(tal.perRank)} {t(`stat.${tal.stat}`)} / {t('tal.rank')}</span>
                  <span className="tal-foot">
                    <span>{rank}/{tal.maxRank}{rank > 0 ? ` · +${pctText(rank * tal.perRank)}` : ''}</span>
                    <span className="tal-cost">{cost == null ? t('tal.max') : `${fmtFull(cost)} TP`}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape onClick={() => (run && mapReturn ? backToMap() : go(SCREEN.TITLE))}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}
