/*
 * Steamworks bridge (decoupled). Loads `steamworks.js` only when it is installed
 * and a Steam App ID is configured; otherwise every call is a safe no-op so the
 * game runs identically without Steam.
 *
 * Configuration (no credentials are ever stored in the repo):
 *   - env SURGE_STEAM_APP_ID=<appid>  or  a `steam_appid.txt` next to the executable
 *   - the Steam client must be running for the API to initialise.
 */
const fs = require('node:fs');
const path = require('node:path');

let client = null;
let appId = null;
let initError = null;

function readAppId() {
  if (process.env.SURGE_STEAM_APP_ID) return Number(process.env.SURGE_STEAM_APP_ID);
  const candidates = [path.join(process.cwd(), 'steam_appid.txt'), path.join(path.dirname(process.execPath), 'steam_appid.txt')];
  for (const f of candidates) {
    try {
      const n = Number(fs.readFileSync(f, 'utf8').trim());
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      /* not present */
    }
  }
  return null;
}

function init() {
  appId = readAppId();
  if (!appId) return;
  try {
    // eslint-disable-next-line global-require, import/no-unresolved
    const steamworks = require('steamworks.js');
    client = steamworks.init(appId);
    try {
      steamworks.electronEnableSteamOverlay();
    } catch {
      /* overlay is optional */
    }
  } catch (err) {
    initError = String(err && err.message ? err.message : err);
    client = null;
  }
}

function status() {
  return {
    available: !!client,
    appId,
    error: initError,
    playerName: client ? safe(() => client.localplayer.getName()) : null,
    steamId: client ? safe(() => String(client.localplayer.getSteamId().steamId64)) : null,
  };
}

function safe(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function unlockAchievement(id) {
  if (!client) return false;
  return safe(() => client.achievement.activate(id), false);
}

function setStat(name, value) {
  if (!client) return false;
  return safe(() => {
    client.stats.setInt(name, Math.trunc(value));
    client.stats.store();
    return true;
  }, false);
}

function cloudWrite(name, data) {
  if (!client) return false;
  return safe(() => client.cloud.writeFile(name, data), false);
}

function cloudRead(name) {
  if (!client) return null;
  return safe(() => client.cloud.readFile(name), null);
}

function shutdown() {
  client = null;
}

module.exports = { init, status, unlockAchievement, setStat, cloudWrite, cloudRead, shutdown };
