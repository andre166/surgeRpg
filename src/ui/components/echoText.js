/** Display texts of an Ancestral Echo's four benefits (src/core/echoes.js). */
import { classGrowth } from '../../core/progression/classes.js';

const pct = (x) => Math.round(x * 1000) / 10;

/** `account` (classes.js accountProgress): when given, a growing stat also shows what it gives now. */
export function echoPassiveText(t, echo, account = null) {
  const parts = [];
  for (const [k, v] of Object.entries(echo.passive.pct ?? {})) parts.push(`${t(`stat.${k}`)} +${pct(v)}%`);
  for (const [k, v] of Object.entries(echo.passive.mods ?? {})) parts.push(t(`echo.mod.${k}`, { n: typeof v === 'number' ? pct(v) : '' }));
  if (echo.growth) {
    const stat = t(`stat.${echo.growth.stat}`);
    parts.push(t('echo.growth', { max: pct(echo.growth.cap), stat }));
    if (account) parts.push(t('class.mod.growNow', { n: pct(classGrowth({ mods: { growth: echo.growth } }, account).pct), stat }));
  }
  return parts.join(' · ');
}

export function echoSkillText(t, echo) {
  return t(`echo.skill.${echo.skill.kind}`, { n: echo.skill.every, p: pct(echo.skill.power) });
}

export function echoResonanceText(t, echo) {
  const text = t(`echo.res.${echo.resonance.kind}`, { p: pct(echo.resonance.power) });
  return echo.resonance.strike ? `${text} ${t('echo.res.strike', { p: pct(echo.resonance.strike) })}` : text;
}
