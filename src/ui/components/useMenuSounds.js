import { useEffect } from 'react';
import { sfx } from '../../game/systems/audio.js';

/** Things that count as a menu button for the click sounds. */
const BUTTONS = 'button, [role="tab"], [role="menuitem"]';

/** Back / close / Esc buttons get the cancel sound. */
function isCancel(el) {
  return el.hasAttribute('data-escape') || el.textContent.trim() === '✕';
}

/** The main action of a screen (gold button / Enter target) gets the confirm sound. */
function isConfirm(el) {
  return el.hasAttribute('data-primary') || el.classList.contains('primary');
}

/**
 * Menu click sounds for the whole UI, from one listener: cancel for Back / ✕, confirm for
 * the primary action, a cursor blip for everything else, and a buzz on a disabled button
 * (disabled buttons get no click, so that one is caught on pointerdown).
 */
export function useMenuSounds() {
  useEffect(() => {
    function onClick(e) {
      const el = e.target instanceof Element ? e.target.closest(BUTTONS) : null;
      if (!el || el.disabled) return;
      if (isCancel(el)) sfx.cancel();
      else if (isConfirm(el)) sfx.confirm();
      else sfx.cursor();
    }
    function onPointerDown(e) {
      const hit = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.matches?.(BUTTONS));
      if (hit && hit.disabled) sfx.buzzer();
    }
    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);
}
