/**
 * Statistics per game mode (not in the original): the Statistics screen shows normal and abyssal
 * (hard mode) apart, each with its own runs, battles, best level (and the record of how it was
 * reached), best combo and best hit. profile.modeStats = { normal, abyss }; the global counters of
 * the profile (gameOverCount, highestLevel, ...) stay as they are, since game rules read them.
 */

export const MODES = ['normal', 'abyss'];

/** Mode key of a run: 'abyss' for hard mode, else 'normal'. */
export const modeOf = (hardMode) => (hardMode ? 'abyss' : 'normal');

export function emptyModeStats() {
  return { runs: 0, wins: 0, losses: 0, highestLevel: 0, highestCombo: 0, highestDamage: 0, highestRecord: null };
}

export function createModeStats() {
  return { normal: emptyModeStats(), abyss: emptyModeStats() };
}

const num = (v) => (Number.isFinite(v) ? v : 0);

/** One mode's stats from a save (unknown or broken values become 0 / null). */
function sanitize(raw) {
  const s = emptyModeStats();
  if (!raw || typeof raw !== 'object') return s;
  for (const k of ['runs', 'wins', 'losses', 'highestLevel', 'highestCombo', 'highestDamage']) s[k] = num(raw[k]);
  s.highestRecord = raw.highestRecord && typeof raw.highestRecord === 'object' ? raw.highestRecord : null;
  return s;
}

/**
 * Mode stats of a save: kept when present; saves from before modes were split put their whole
 * history in normal (the abyssal mode is new), abyssal starts empty.
 */
export function modeStatsFromSave(raw) {
  if (raw?.modeStats && typeof raw.modeStats === 'object') {
    return { normal: sanitize(raw.modeStats.normal), abyss: sanitize(raw.modeStats.abyss) };
  }
  return {
    normal: sanitize({
      runs: raw?.gameOverCount, wins: raw?.winBattles, losses: raw?.loseBattles, highestLevel: raw?.highestLevel,
      highestCombo: raw?.highestCombo, highestDamage: raw?.highestDamage, highestRecord: raw?.highestRecord,
    }),
    abyss: emptyModeStats(),
  };
}

function update(profile, hardMode, fn) {
  const all = profile.modeStats ?? createModeStats();
  const key = modeOf(hardMode);
  return { ...profile, modeStats: { ...all, [key]: fn({ ...emptyModeStats(), ...all[key] }) } };
}

/** A battle ended: won / lost count and the best combo and hit of the run's mode. */
export function recordModeBattle(profile, hardMode, battle, won) {
  return update(profile, hardMode, (s) => ({
    ...s,
    wins: s.wins + (won ? 1 : 0),
    losses: s.losses + (won ? 0 : 1),
    highestCombo: Math.max(s.highestCombo, battle.highestCombo ?? 0),
    highestDamage: Math.max(s.highestDamage, battle.highestDamage ?? 0),
  }));
}

/** A run ended: one more run in its mode, and its best level (with `record`, the snapshot) if beaten. */
export function recordModeRunEnd(profile, run, record = null) {
  return update(profile, run.hardMode, (s) => {
    const best = run.level > s.highestLevel || s.highestLevel === 0;
    return {
      ...s,
      runs: s.runs + 1,
      highestLevel: Math.max(s.highestLevel, run.level),
      highestRecord: best && record ? record : s.highestRecord,
    };
  });
}
