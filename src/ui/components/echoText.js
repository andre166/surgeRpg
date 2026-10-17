/** Display texts of an Ancestral Echo's four benefits (src/core/echoes.js). */
const pct = (x) => Math.round(x * 1000) / 10;

export function echoPassiveText(t, echo) {
  const parts = [];
  for (const [k, v] of Object.entries(echo.passive.pct ?? {})) parts.push(`${t(`stat.${k}`)} +${pct(v)}%`);
  for (const [k, v] of Object.entries(echo.passive.mods ?? {})) parts.push(t(`echo.mod.${k}`, { n: typeof v === 'number' ? pct(v) : '' }));
  return parts.join(' · ');
}

export function echoSkillText(t, echo) {
  return t(`echo.skill.${echo.skill.kind}`, { n: echo.skill.every, p: pct(echo.skill.power) });
}

export function echoResonanceText(t, echo) {
  return t(`echo.res.${echo.resonance.kind}`, { p: pct(echo.resonance.power) });
}
