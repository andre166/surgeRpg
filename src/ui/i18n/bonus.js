/** Display text of an area bonus value: "Gold x3 (2)" (name + remaining battles). */
import { bonusType, bonusCharges } from '../../core/encounters/bonus.js';

// Bonus types without a translation key (bonus.<type>) are shown as symbols.
const BONUS_SYMBOL = { 9: '? ? ?', 10: '? ? ?', 11: '? ? ?', 12: ' ! ', 13: '! ! !', 16: '! ?' };

export function bonusName(t, value) {
  const type = bonusType(value);
  return BONUS_SYMBOL[type] ?? t(`bonus.${type}`);
}

/** `extra`: battles added on top (threshold potions in a secret room). */
export function bonusText(t, value, extra = 0) {
  return `${bonusName(t, value)} (${bonusCharges(value) + extra})`;
}
