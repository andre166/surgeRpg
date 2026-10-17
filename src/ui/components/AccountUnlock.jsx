import React from 'react';
import { useGame } from '../stores/gameStore.js';
import { ACCOUNT_UNLOCK_PRICES, accountOwned, accountBuyStatus } from '../../core/progression/unlocks.js';
import { baseAbilityLevel } from '../../core/progression/characters.js';
import { fmtShort } from './format.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';

/**
 * Padlock of an account unlock not bought yet (core/progression/unlocks.js): "Base LV cur/needed"
 * (red until reached) and, for the next one in order, the buy button with its gold price
 * (run gold: the current run's, or the saved run's from the hero select).
 */
export default function AccountUnlock({ kind, index, label = null }) {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const buyUnlock = useGame((s) => s.buyAccountUnlock);
  const toast = useGame((s) => s.showToast);
  const price = ACCOUNT_UNLOCK_PRICES[kind][index];
  if (!price) return null;
  const base = baseAbilityLevel(profile?.bossWins ?? {});
  const gold = (run ?? profile?.run)?.gold ?? 0;
  const next = index === accountOwned(profile, kind);
  const st = next ? accountBuyStatus(profile, kind, gold, base) : 'locked';
  const onBuy = (e) => {
    e.stopPropagation();
    const res = buyUnlock(kind);
    toast(res === 'ok' ? t('farm.unlockBought') : res === 'level' ? t('eq.needsBase') : res === 'norun' ? t('unlock.needsRun') : t('eq.noGold'), 1400);
  };
  return (
    <span className="account-unlock" onClick={(e) => e.stopPropagation()}>
      <span className="plot-lock">{st === 'ok' || st === 'gold' ? '🔓' : '🔒'}</span>
      {label && <b className="small">{label}</b>}
      <span className={`small plot-need ${base >= price.baseLevel ? 'met' : ''}`}>{t('farm.plotBaseLevel', { cur: Math.min(base, price.baseLevel), n: price.baseLevel })}</span>
      {next && (
        <button className={`btn tiny unlock-buy ${st === 'ok' ? 'primary' : ''}`} disabled={st !== 'ok'} onClick={onBuy}>
          {t('farm.buyUnlock')} <span className={`plot-price ${st === 'gold' ? 'short' : ''}`}><PixelIcon name="coins" size={12} />{fmtShort(price.gold)}</span>
        </button>
      )}
    </span>
  );
}
