/* IPC handlers shared by the real app and the smoke test. Narrow, validated surface. */
const { ipcMain, app } = require('electron');
const saves = require('./saves.cjs');
const steam = require('./steam.cjs');

function registerIpc(getWindow) {
  // slot names map to file names: only plain names are accepted
  const validSlot = (slot) => typeof slot === 'string' && /^[a-z0-9_-]{1,40}$/i.test(slot);
  ipcMain.handle('save:load', async (_e, slot) => (validSlot(slot) ? saves.load(slot) : null));
  ipcMain.handle('save:write', async (_e, slot, data) => { if (!validSlot(slot)) throw new Error('invalid save slot'); return saves.write(slot, data); });
  ipcMain.handle('save:list', async () => saves.list());
  ipcMain.handle('app:toggleFullscreen', async () => {
    const win = getWindow();
    if (!win) return false;
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
  });
  ipcMain.handle('app:setFullscreen', async (_e, on) => {
    const win = getWindow();
    if (!win) return false;
    win.setFullScreen(!!on);
    return win.isFullScreen();
  });
  ipcMain.handle('app:quit', async () => app.quit());
  ipcMain.handle('app:version', async () => app.getVersion());
  ipcMain.handle('steam:status', async () => steam.status());
  ipcMain.handle('steam:unlockAchievement', async (_e, id) => steam.unlockAchievement(id));
  ipcMain.handle('steam:setStat', async (_e, name, value) => steam.setStat(name, value));
  ipcMain.handle('steam:cloudWrite', async (_e, name, data) => steam.cloudWrite(name, data));
  ipcMain.handle('steam:cloudRead', async (_e, name) => steam.cloudRead(name));
}

module.exports = { registerIpc };
