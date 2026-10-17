import { useEffect } from 'react';
import { sfx } from '../../game/systems/audio.js';

/**
 * Keyboard navigation for menus: arrows / Tab move focus between focusable
 * elements inside the active screen, Enter/Space activates, Escape triggers
 * the element marked data-escape.
 */
export function useKeyboardNav() {
  useEffect(() => {
    function focusables() {
      const root = document.querySelector('.screen');
      if (!root) return [];
      return Array.from(root.querySelectorAll('button:not([disabled]), [tabindex="0"], input, select')).filter(
        (el) => el.offsetParent !== null,
      );
    }
    function onKey(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      const list = focusables();
      if (!list.length) return;
      const idx = list.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        list[(idx + 1 + list.length) % list.length].focus();
        sfx.cursor();
      } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
        list[(idx - 1 + list.length) % list.length].focus();
        sfx.cursor();
      } else if (e.key === 'Escape') {
        const esc = document.querySelector('.screen [data-escape]');
        if (esc) {
          e.preventDefault();
          esc.click();
        }
      } else if (e.key === 'Enter' && idx === -1) {
        const primary = document.querySelector('.screen [data-primary]');
        if (primary) {
          e.preventDefault();
          primary.click();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
