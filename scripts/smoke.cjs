/* Electron smoke test: boots the app against the dev server and plays one battle. */
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const saves = require('../electron/saves.cjs');
const { registerIpc } = require('../electron/ipc.cjs');
const os = require('node:os');
const fs = require('node:fs');

const URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:8000';
const DIST = process.env.SMOKE_DIST === '1';
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(win, expr, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const ok = await win.webContents.executeJavaScript(`(() => { try { return !!(${expr}); } catch (e) { return false; } })()`);
    if (ok) return true;
    await sleep(150);
  }
  throw new Error(`timeout waiting for: ${expr}`);
}
const js = (win, code) => win.webContents.executeJavaScript(code);

const SIZE = (process.env.SMOKE_SIZE || '1280x720').split('x').map(Number);

app.whenReady().then(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'surge-smoke-'));
  saves.init(tmp);
  let win = null;
  registerIpc(() => win);
  win = new BrowserWindow({
    // SMOKE_SIZE=390x844 runs the smoke test at a phone-sized viewport.
    width: SIZE[0], height: SIZE[1], useContentSize: true, show: !!process.env.SMOKE_SHOTS,
    webPreferences: { preload: path.join(__dirname, '..', 'electron', 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.on('console-message', (_e, level, msg) => { if (level >= 2 && !/Electron Security Warning/.test(msg)) errors.push(msg); });
  const shots = process.env.SMOKE_SHOTS;
  const shot = async (name) => { if (!shots) return; await sleep(400); const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(shots, name + '.png'), img.toPNG()); };
  win.webContents.on('render-process-gone', (_e, d) => errors.push(`renderer gone: ${d.reason}`));
  try {
    if (DIST) await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    else await win.loadURL(URL);
    await waitFor(win, "document.querySelector('.screen.title')");
    console.log('title ok');
    await shot('title');
    await js(win, "[...document.querySelectorAll('button')].find(b => b.textContent.includes('New run')).click()");
    await waitFor(win, "document.querySelector('.screen.character')");
    await js(win, "[...document.querySelectorAll('button')].find(b => b.textContent.includes('Start run')).click()");
    await waitFor(win, "document.querySelector('.screen.map canvas')", 20000);
    await shot('map');
    if (DIST) {
      // production bundle has no store hook: exercise navigation through the UI only
      console.log('map ok (dist)');
      await js(win, "[...document.querySelectorAll('button')].find(b => b.textContent === 'Hero').click()");
      await waitFor(win, "document.querySelector('.screen.stats')");
      await js(win, "[...document.querySelectorAll('button')].find(b => b.textContent === 'Back').click()");
      await waitFor(win, "document.querySelector('.screen.map canvas')");
      await js(win, "[...document.querySelectorAll('.hud-actions button')].find(b => b.textContent.startsWith('Menu')).click()");
      await waitFor(win, "document.querySelector('.game-menu')");
      await js(win, "[...document.querySelectorAll('.game-menu-item')].find(b => b.textContent.includes('Save & quit')).click()");
      await waitFor(win, "document.querySelector('.screen.title')");
      const files = fs.readdirSync(tmp + '/saves');
      console.log('save files:', files.join(','));
      if (!files.includes('profile.json')) throw new Error('no profile.json written');
      await sleep(300);
      console.log('console errors:', errors.length);
      for (const e of errors) console.log(' -', e.slice(0, 400));
      app.exit(errors.length ? 1 : 0);
      return;
    }
    console.log('map ok, BP', await js(win, 'window.__surge.getState().battlePoints()'));
    // walk: move the hero by simulating store moves until a battle triggers
    let battle = false;
    for (let i = 0; i < 2000 && !battle; i += 1) {
      battle = await js(win, "(() => { const s = window.__surge.getState(); const r = s.run; return s.movedTo(r.map.x + 1, r.map.y, r.map.id, 1); })()");
    }
    if (!battle) throw new Error('no battle after 2000 steps');
    await waitFor(win, "document.querySelector('.screen.battle')");
    console.log('battle started:', await js(win, 'window.__surge.getState().battle.enemy.name'));
    await shot('battle-intro');
    // the fight starts by itself and opens the result screen when it ends
    await sleep(1500);
    await shot('battle');
    await waitFor(win, "document.querySelector('.screen.result')", 60000);
    console.log('battle over:', await js(win, 'window.__surge.getState().battle.state.phase'));
    await shot('result');
    const res = await js(win, 'JSON.stringify(window.__surge.getState().result, (k,v)=> k==="battleState"||k==="enemy"?undefined:v)');
    console.log('result:', res);
    // taps only count once every reward row is shown (the Continue button is enabled then)
    await waitFor(win, "document.querySelector('.result-continue:not(:disabled)')");
    await js(win, "document.querySelector('.screen.result').click()");
    await waitFor(win, "document.querySelector('.screen.map canvas') || document.querySelector('.screen.stats')");
    console.log('back on map. run:', await js(win, 'JSON.stringify({lv: window.__surge.getState().run.level, bp: window.__surge.getState().battlePoints(), gold: window.__surge.getState().run.gold, sp: window.__surge.getState().run.statPoints})'));
    // stats screen
    await js(win, "window.__surge.getState().openFromMap('stats')");
    await waitFor(win, "document.querySelector('.screen.stats')");
    await shot('stats');
    await js(win, "[...document.querySelectorAll('button')].find(b => b.textContent === 'All').click()");
    await js(win, "[...document.querySelectorAll('button')].find(b => b.textContent === 'Confirm').click()");
    console.log('stats confirmed:', await js(win, 'JSON.stringify(window.__surge.getState().run.base)'));
    await js(win, "window.__surge.getState().backToMap()");
    await waitFor(win, "document.querySelector('.screen.map canvas')");
    // equipment screen
    await js(win, "window.__surge.getState().openFromMap('equipment')");
    await waitFor(win, "document.querySelector('.screen.equipment')");
    // tapping the weapon slot opens its shop
    await js(win, "document.querySelector('.equip-slot').click()");
    await waitFor(win, "document.querySelector('.equip-shop')");
    console.log('equipment shop rows:', await js(win, "document.querySelectorAll('.equip-shop .item-row').length"));
    await shot('equipment');
    await js(win, "window.__surge.getState().backToMap()");
    await waitFor(win, "document.querySelector('.screen.map canvas')");
    // save round-trip
    await js(win, 'window.__surge.getState().persist(true)');
    const saved = await js(win, "window.surge.save.load('profile').then(r => !!(r && r.data && r.data.run))");
    console.log('save has run:', saved);
    await sleep(500);
  } catch (e) {
    errors.push(String(e.stack || e));
  }
  console.log('console errors:', errors.length);
  for (const e of errors) console.log(' -', e.slice(0, 400));
  app.exit(errors.length ? 1 : 0);
});
