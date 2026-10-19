import { describe, it, expect } from 'vitest';
import { balancedComboRate, COMBO_CAP } from '../core/battle/combo.js';
import { comboChance } from '../core/battle/damage.js';

describe('combo balance (Surge, not in the original)', () => {
  it('low rates are untouched; above 0.5 they grow slower; never above 0.65', () => {
    expect(balancedComboRate(0.3)).toBe(0.3);
    expect(balancedComboRate(0.5)).toBe(0.5);
    expect(balancedComboRate(0.7)).toBeCloseTo(0.65);
    expect(balancedComboRate(0.7, 0.5)).toBeLessThanOrEqual(COMBO_CAP);
  });
  it('class / echo combo has diminishing returns near the cap', () => {
    const slow = balancedComboRate(0.2, 0.1) - balancedComboRate(0.2);
    const fast = balancedComboRate(0.6, 0.1) - balancedComboRate(0.6);
    expect(slow).toBeCloseTo(0.1 * (1 - 0.2 / 0.7));
    expect(fast).toBeLessThan(slow / 3);
  });
  it('every combo of a turn rolls the same capped chance', () => {
    const rate = balancedComboRate(0.7, 0.15);
    expect(comboChance(rate, 1)).toBeCloseTo(COMBO_CAP);
  });
});
