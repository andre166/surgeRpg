/* Preload: exposes a minimal, typed bridge to the renderer. No Node access leaks. */
const { contextBridge, ipcRenderer } = require('electron');

const SLOT_RE = /^[a-z0-9_-]{1,32}$/i;

function slotOk(slot) {
  return typeof slot === 'string' && SLOT_RE.test(slot);
}

contextBridge.exposeInMainWorld('surge', {
  isElectron: true,
  save: {
    load: (slot) => (slotOk(slot) ? ipcRenderer.invoke('save:load', slot) : Promise.resolve(null)),
    write: (slot, data) => (slotOk(slot) ? ipcRenderer.invoke('save:write', slot, data) : Promise.resolve(false)),
    list: () => ipcRenderer.invoke('save:list'),
  },
  app: {
    toggleFullscreen: () => ipcRenderer.invoke('app:toggleFullscreen'),
    setFullscreen: (on) => ipcRenderer.invoke('app:setFullscreen', !!on),
    quit: () => ipcRenderer.invoke('app:quit'),
    version: () => ipcRenderer.invoke('app:version'),
  },
  steam: {
    status: () => ipcRenderer.invoke('steam:status'),
    unlockAchievement: (id) => ipcRenderer.invoke('steam:unlockAchievement', String(id)),
    setStat: (name, value) => ipcRenderer.invoke('steam:setStat', String(name), Number(value)),
    cloudWrite: (name, data) => ipcRenderer.invoke('steam:cloudWrite', String(name), String(data)),
    cloudRead: (name) => ipcRenderer.invoke('steam:cloudRead', String(name)),
  },
});
