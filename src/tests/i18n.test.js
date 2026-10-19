import { describe, it, expect } from 'vitest';
import en from '../ui/i18n/en.js';
import pt from '../ui/i18n/pt.js';
import es from '../ui/i18n/es.js';
import ko from '../ui/i18n/ko.js';
import ja from '../ui/i18n/ja.js';

const LANGS = { pt, es, ko, ja };

describe('i18n dictionaries', () => {
  for (const [code, dict] of Object.entries(LANGS)) {
    it(`${code} has exactly the same keys as en`, () => {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
    });
    it(`${code} placeholders match en`, () => {
      const ph = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      for (const k of Object.keys(en)) expect(ph(dict[k]), k).toBe(ph(en[k]));
    });
  }
});
