import React from 'react';

/**
 * What an unlock needs (a price with baseLevel and / or slimeKings, like core/farm.js PLOT_PRICES):
 * "Base LV cur/needed" and / or "Slime King cur/needed", each red until reached.
 */
export default function UnlockNeed({ price, base, slimes, t }) {
  const one = (have, n, key) => <span key={key} className={`small plot-need ${have >= n ? 'met' : ''}`}>{t(key, { cur: Math.min(have, n), n })}</span>;
  if (!price.slimeKings) return one(base, price.baseLevel, 'farm.plotBaseLevel');
  // both (the last accessory slots): the base level, then the Slime Kings
  if (price.baseLevel > 0) return <>{one(base, price.baseLevel, 'farm.plotBaseLevel')}{one(slimes, price.slimeKings, 'farm.plotSlimeKings')}</>;
  return one(slimes, price.slimeKings, 'farm.plotSlimeKings');
}
