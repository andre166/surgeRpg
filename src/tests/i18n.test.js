import { describe, it, expect } from 'vitest';
import en from '../ui/i18n/en.js';
import pt from '../ui/i18n/pt.js';

describe('i18n dictionaries', () => {
  it('pt has exactly the same keys as en', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
  });
  it('placeholders match between languages', () => {
    const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(en)) expect(ph(pt[k]), k).toBe(ph(en[k]));
  });
});
