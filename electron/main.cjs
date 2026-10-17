/* Electron main process: window, secure IPC, save files, Steam bridge. */
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('node:path');
const saves = require('./saves.cjs');
const steam = require('./steam.cjs');
const { registerIpc } = require('./ipc.cjs');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!DEV_URL;
// SURGE_WINDOW=390x844 opens a phone-sized window (the compact layout kicks in under 900px wide)
const PHONE = /^(\d+)x(\d+)$/.exec(process.env.SURGE_WINDOW ?? '');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: PHONE ? Number(PHONE[1]) : 1280,
    height: PHONE ? Number(PHONE[2]) : 720,
    useContentSize: !!PHONE,
    minWidth: PHONE ? 320 : 960,
    minHeight: PHONE ? 480 : 540,
    backgroundColor: '#0b0d12',
    show: false,
    autoHideMenuBar: true,
    title: 'Surge RPG',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
  win.on('closed', () => {
    win = null;
  });
}

function installCsp() {
  // Production CSP; in dev Vite needs inline scripts/eval for HMR so we only tighten the packaged app.
  if (isDev) return;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        ],
      },
    });
  });
}

app.whenReady().then(() => {
  installCsp();
  saves.init(app.getPath('userData'));
  steam.init();
  registerIpc(() => win);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  steam.shutdown();
  app.quit();
});

app.on('before-quit', () => steam.shutdown());
