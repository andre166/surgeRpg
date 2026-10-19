import React from 'react';
import { useGame } from '../stores/gameStore.js';
import { ACCOUNT_UNLOCK_PRICES, accountOwned, accountBuyStatus, paidInEmblems } from '../../core/progression/unlocks.js';
import { emblemCount } from '../../core/progression/classEmblems.js';
import { bossLevel } from '../../core/progression/characters.js';
import { slimeKingWins } from '../../core/bestiary.js';
import UnlockNeed from './UnlockNeed.jsx';
import { fmtShort } from './format.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';

/**
 * Padlock of an account unlock not bought yet (core/progression/unlocks.js): "Base LV cur/needed"
 * or Slime King victories (red until reached) and, for the next one in order, the buy button with its gold price
 * (run gold: the current run's, or the saved run's from the hero select; the classes cost Class Emblems,
 * the account's, shown as have/needed).
 */
export default function AccountUnlock({ kind, index, label = null }) {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const buyUnlock = useGame((s) => s.buyAccountUnlock);
  const toast = useGame((s) => s.showToast);
  const price = ACCOUNT_UNLOCK_PRICES[kind][index];
  if (!price) return null;
  const base = bossLevel(profile?.bossWins ?? {});
  const slimes = slimeKingWins(profile);
  const gold = (run ?? profile?.run)?.gold ?? 0;
  const next = index === accountOwned(profile, kind);
  const st = next ? accountBuyStatus(profile, kind, gold, base, slimes) : 'locked';
  const emblems = paidInEmblems(price);
  const priceLabel = emblems ? `${Math.min(emblemCount(profile), price.emblems)}/${price.emblems} ${t('emblem.name')}` : fmtShort(price.gold);
  const onBuy = (e) => {
    e.stopPropagation();
    const res = buyUnlock(kind);
    toast(res === 'ok' ? t('farm.unlockBought') : res === 'level' ? t('eq.needsBase') : res === 'norun' ? t('unlock.needsRun') : res === 'emblems' ? t('emblem.short') : t('eq.noGold'), 1400);
  };
  return (
    <span className="account-unlock" onClick={(e) => e.stopPropagation()}>
      <span className="plot-lock">{st === 'ok' || st === 'gold' || st === 'emblems' ? '🔓' : '🔒'}</span>
      {label && <b className="small">{label}</b>}
      <UnlockNeed price={price} base={base} slimes={slimes} t={t} />
      {next && (
        <button className={`btn tiny unlock-buy ${st === 'ok' ? 'primary' : ''}`} disabled={st !== 'ok'} onClick={onBuy} aria-label={`${t('farm.buyUnlock')} ${priceLabel}`} title={emblems ? t('emblem.hint') : t('farm.buyUnlock')}>
          <span className={`plot-price ${st === 'gold' || st === 'emblems' ? 'short' : ''}`}><PixelIcon name={emblems ? 'swords' : 'coins'} size={12} />{priceLabel}</span>
        </button>
      )}
    </span>
  );
}
