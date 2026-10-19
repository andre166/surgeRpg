/** What a potion or an elixir does, as shown in the storehouse and the potion menu. */
export function effectText(t, def) {
  if (def.effect) {
    if (def.effect.kind === 'bp') return t('farm.fx.bp', { n: def.effect.amount });
    if (def.effect.kind === 'mapBonus') return t('farm.fx.mapBonus');
    if (def.effect.kind === 'roomBattles') return t('farm.fx.roomBattles', { n: def.effect.amount });
    return t('farm.fx.battleHeal');
  }
  const parts = [];
  for (const [k, v] of Object.entries(def.buff.pct ?? {})) parts.push(`${t(`stat.${k}`)} +${Math.round(v * 1000) / 10}%`);
  for (const [k, v] of Object.entries(def.buff.mods ?? {})) parts.push(t(`farm.fx.${k}`, { n: Math.round(v * 1000) / 10 }));
  return `${parts.join(' · ')} · ${t('farm.fx.battles', { n: def.battles })}`;
}

/** Can the item be used from the storehouse / potion menu on the run (the healing potion is for battles)? */
export const usableOnMap = (def) => def.effect?.kind === 'bp' || def.effect?.kind === 'mapBonus' || def.effect?.kind === 'roomBattles' || !!def.buff;
