/**
 * Platform bridge: wraps the Electron preload API when present, falls back to
 * browser storage during `vite dev` in a plain browser so the game stays playable.
 */

const LS_PREFIX = 'surge-rpg:save:';

function browserBridge() {
  return {
    isElectron: false,
    save: {
      async load(slot) {
        try {
          const txt = localStorage.getItem(LS_PREFIX + slot);
          if (!txt) return null;
          return { data: JSON.parse(txt), restoredFromBackup: false };
        } catch {
          return null;
        }
      },
      async write(slot, data) {
        try {
          localStorage.setItem(LS_PREFIX + slot, JSON.stringify(data));
          return true;
        } catch {
          return false;
        }
      },
      async list() {
        const out = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LS_PREFIX)) out.push(k.slice(LS_PREFIX.length));
        }
        return out;
      },
    },
    app: {
      async toggleFullscreen() {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
          return false;
        }
        await document.documentElement.requestFullscreen();
        return true;
      },
      async setFullscreen(on) {
        if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
        if (!on && document.fullscreenElement) await document.exitFullscreen();
        return !!document.fullscreenElement;
      },
      async quit() {
        window.close();
      },
      async version() {
        return 'dev';
      },
    },
    steam: {
      async status() {
        return { available: false, appId: null, error: null };
      },
      async unlockAchievement() {
        return false;
      },
      async setStat() {
        return false;
      },
      async cloudWrite() {
        return false;
      },
      async cloudRead() {
        return null;
      },
    },
  };
}

export const bridge = typeof window !== 'undefined' && window.surge ? window.surge : browserBridge();
