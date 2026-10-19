import React from 'react';
import { useGame, SCREEN } from '../stores/gameStore.js';
import {
  TALENTS, TALENT_BRANCHES, TALENT_MILESTONES, MILESTONE_BONUS, TP_MAX, TALENT_EFFECTS, tpLevel, talentRank, talentBonus, talentTotals, milestonesReached,
} from '../../core/progression/talents.js';
import { useT } from '../i18n/index.js';
import HeroTabs from '../components/HeroTabs.jsx';
import PixelIcon, { STAT_ICONS } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import InfoButton from '../components/InfoButton.jsx';
import AccountUnlock from '../components/AccountUnlock.jsx';
import { talentTiersOwned, talentTierKind } from '../../core/progression/unlocks.js';

const pctText = (x) => `${Math.round(x * 1000) / 10}%`;
/** Icon of each talent effect (the five stats use their own). */
const EFFECT_ICONS = { ...STAT_ICONS, gold: 'coins', exp: 'star', move: 'boot', critDmg: 'swords', critRate: 'sword' };
/** Name of a talent effect: a stat, or one of the modifiers (tal.fx.*). */
const effectName = (t, effect) => (TALENT_EFFECTS[effect].kind === 'pct' ? t(`stat.${effect}`) : t(`tal.fx.${effect}`));

/**
 * Talent tree: four branches of three passive talents (stat percents and modifiers). Nothing to spend: every talent of a
 * bought tier has rank = the account's TP level (one per different Slime King beaten).
 */
export default function TalentsScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const mapReturn = useGame((s) => s.mapReturnScreen);
  const go = useGame((s) => s.go);
  const backToMap = useGame((s) => s.backToMap);
  if (!profile || !run) return null;
  const tp = tpLevel(profile);
  const tiersOwned = talentTiersOwned(profile);
  const totals = talentTotals(tp, tiersOwned);
  const bonus = milestonesReached(tp) * MILESTONE_BONUS;

  return (
    <div className="screen talents hero-screen wood-screen">
      <WoodBackdrop />
      <HeroTabs />
      <header className="hero-head">
        <div className="hero-chips tal-chips">
          <span className={`hero-chip points ${tp > 0 ? 'has-points' : ''}`}><PixelIcon name="slimeKing" size={16} />SK <b>{tp}/{TP_MAX}</b></span>
          {/* milestones: every active talent gains MILESTONE_BONUS more at each */}
          {TALENT_MILESTONES.map((m) => (
            <span key={m} className={`hero-chip tal-milestone ${tp >= m ? 'reached' : ''}`} title={t('tal.milestone', { n: m, pct: pctText(MILESTONE_BONUS) })}>
              {tp >= m ? '★' : '☆'} SK {m}
            </span>
          ))}
        </div>
        {/* total bonus per effect: chips in the row on desktop, an even 5-column grid on phones */}
        <div className="tal-totals">
          {Object.keys(TALENT_EFFECTS).map((fx) => (
            <span key={fx} className={`hero-chip tal-total-cell ${totals[fx] > 0 ? '' : 'zero'}`}>
              <PixelIcon name={EFFECT_ICONS[fx]} size={14} />
              <span className="tal-total-name">{effectName(t, fx)}</span>
              <b className="tal-total">+{pctText(totals[fx])}</b>
            </span>
          ))}
        </div>
        <InfoButton label={t('tal.help')}>
          <p>{t('tal.howTo', { max: TP_MAX, pct: pctText(MILESTONE_BONUS), milestones: TALENT_MILESTONES.join(', ') })}</p>
        </InfoButton>
      </header>
      <div className="tal-tree">
        {TALENT_BRANCHES.map((b) => {
          // each branch buys its own three tiers, in order (core/progression/unlocks.js)
          const kind = talentTierKind(b);
          const tiers = tiersOwned[b];
          return (
            <div key={b} className={`tal-branch tal-${b}`}>
              <h2><PixelIcon name={STAT_ICONS[b]} size={18} />{t(`tal.branch.${b}`)}</h2>
              {TALENTS.filter((x) => x.branch === b).map((tal) => {
                const tierLocked = tal.tier >= tiers;
                const rank = talentRank(tal.id, tp, tiers);
                const total = talentBonus(tal.id, tp, tiers);
                return (
                  <div
                    key={tal.id}
                    className={`tal-node ${tierLocked ? 'locked tier-locked' : ''} ${rank > 0 ? 'owned' : ''} ${rank >= tal.maxRank ? 'maxed' : ''}`}
                    title={t(`tal.name.${tal.id}`)}
                  >
                    <span className="tal-name">{tierLocked ? `🔒 ${t(`tal.name.${tal.id}`)}` : t(`tal.name.${tal.id}`)}</span>
                    {tierLocked && <AccountUnlock kind={kind} index={tal.tier} label={t('unlock.tier', { n: tal.tier + 1 })} />}
                    <span className="tal-effect">+{pctText(tal.perRank)} {effectName(t, tal.effect)} / {t('tal.rank')}</span>
                    <span className="tal-foot">
                      <span>{rank}/{tal.maxRank}{rank > 0 ? ` · +${pctText(total)}` : ''}</span>
                      <span className="tal-cost">{rank >= tal.maxRank ? t('tal.max') : rank > 0 && bonus > 0 ? `+${pctText(bonus)} ★` : ''}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape onClick={() => (run && mapReturn ? backToMap() : go(SCREEN.TITLE))}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}
