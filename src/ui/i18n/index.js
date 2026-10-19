/**
 * Minimal UI translation layer. The language lives in profile.options.language;
 * strings use `{name}` placeholders. Missing keys fall back to English, then to the key.
 * Game data (item, enemy and hero names, accessory descriptions) is not translated.
 */
import { useCallback } from 'react';
import { useGame } from '../stores/gameStore.js';
import en from './en.js';
import pt from './pt.js';
import es from './es.js';
import ko from './ko.js';
import ja from './ja.js';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
];

const DICTS = { en, pt, es, ko, ja };

export function translate(lang, key, vars) {
  const s = DICTS[lang]?.[key] ?? en[key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

export function useLang() {
  return useGame((s) => (DICTS[s.profile?.options.language] ? s.profile.options.language : 'en'));
}

/** Hook returning t(key, vars) for the current language. */
export function useT() {
  const lang = useLang();
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}
