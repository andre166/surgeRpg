/**
 * Android bridge (Capacitor): same shape as the Electron preload API.
 * Saves live in native Preferences (not WebView localStorage, which the OS may
 * clear), with rotating backups like electron/saves.cjs. The hardware back
 * button mirrors Escape: it clicks the active screen's [data-escape] element.
 * The launch splash stays up until the UI calls app.hideSplash() (title drawn).
 */
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';

// Never leave the player stuck on the splash if the UI fails to boot.
const SPLASH_FALLBACK_MS = 10000;

const PREFIX = 'surge-rpg:save:';
const BACKUPS = 3;
const SLOT_RE = /^[a-z0-9_-]{1,32}$/i;

const keyFor = (slot, bak = 0) => `${PREFIX}${slot}${bak ? `.bak${bak}` : ''}`;

async function readJson(key) {
  try {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    const data = JSON.parse(value);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

function wireBackButton() {
  App.addListener('backButton', () => {
    const esc = document.querySelector('.screen [data-escape]');
    if (esc) esc.click();
    else App.minimizeApp();
  });
}

export function androidBridge() {
  wireBackButton();
  setTimeout(() => SplashScreen.hide(), SPLASH_FALLBACK_MS);
  return {
    isElectron: false,
    isAndroid: true,
    save: {
      async load(slot) {
        if (!SLOT_RE.test(slot)) return null;
        const main = await readJson(keyFor(slot));
        if (main) return { data: main, restoredFromBackup: false };
        for (let i = 1; i <= BACKUPS; i += 1) {
          const b = await readJson(keyFor(slot, i));
          if (b) return { data: b, restoredFromBackup: true };
        }
        return null;
      },
      async write(slot, data) {
        if (!SLOT_RE.test(slot)) return false;
        try {
          const prev = await Preferences.get({ key: keyFor(slot) });
          if (prev.value) {
            for (let i = BACKUPS; i > 1; i -= 1) {
              const older = await Preferences.get({ key: keyFor(slot, i - 1) });
              if (older.value) await Preferences.set({ key: keyFor(slot, i), value: older.value });
            }
            await Preferences.set({ key: keyFor(slot, 1), value: prev.value });
          }
          await Preferences.set({ key: keyFor(slot), value: JSON.stringify(data) });
          return true;
        } catch {
          return false;
        }
      },
      async list() {
        const { keys } = await Preferences.keys();
        return keys.filter((k) => k.startsWith(PREFIX) && !k.includes('.bak')).map((k) => k.slice(PREFIX.length));
      },
    },
    app: {
      // The activity runs immersive full screen (MainActivity); nothing to toggle.
      async toggleFullscreen() {
        return true;
      },
      async setFullscreen() {
        return true;
      },
      async quit() {
        await App.exitApp();
      },
      async hideSplash() {
        await SplashScreen.hide();
      },
      async version() {
        return (await App.getInfo()).version;
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
