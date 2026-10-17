/** Number formatting helpers for the HUD and menus. */
export function fmt(n) {
  if (n == null || Number.isNaN(n)) return '-';
  const v = Math.floor(n);
  if (Math.abs(v) < 1e6) return v.toLocaleString('en-US');
  if (Math.abs(v) < 1e9) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) < 1e12) return `${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) < 1e15) return `${(v / 1e12).toFixed(2)}T`;
  return v.toExponential(2);
}

/** Suffixes for fmtShort: thousand, million, billion, trillion, quadrillion. */
const SHORT_SUFFIXES = ['K', 'M', 'B', 'T', 'Q'];

/**
 * At most 5 digits plus one letter (HUD gold): 84,200 · 123K · 60,290M. Below 100,000 the
 * full number; past that the smallest suffix that keeps the integer part at 5 digits.
 * Beyond the last suffix it falls back to scientific notation.
 */
export function fmtShort(n) {
  if (n == null || Number.isNaN(n)) return '-';
  const v = Math.floor(n);
  const sign = v < 0 ? '-' : '';
  let abs = Math.abs(v);
  if (abs < 1e5) return sign + abs.toLocaleString('en-US');
  for (const suffix of SHORT_SUFFIXES) {
    abs = Math.floor(abs / 1000);
    if (abs < 1e5) return `${sign}${abs.toLocaleString('en-US')}${suffix}`;
  }
  return v.toExponential(2);
}

export function fmtFull(n) {
  if (n == null || Number.isNaN(n)) return '-';
  return Math.floor(n).toLocaleString('en-US');
}

export function pct(x) {
  return `${Math.round(x * 100)}%`;
}

