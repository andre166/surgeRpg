/* Save files: JSON in the user data directory, atomic writes, rotating backups. */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

let dir = null;
const BACKUPS = 3;

function init(userData) {
  dir = path.join(userData, 'saves');
  fs.mkdirSync(dir, { recursive: true });
}

function fileFor(slot) {
  return path.join(dir, `${slot}.json`);
}

async function readJson(file) {
  try {
    const txt = await fsp.readFile(file, 'utf8');
    const data = JSON.parse(txt);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

/** Loads the slot, falling back to the newest readable backup. */
async function load(slot) {
  const main = await readJson(fileFor(slot));
  if (main) return { data: main, restoredFromBackup: false };
  for (let i = 1; i <= BACKUPS; i += 1) {
    const b = await readJson(`${fileFor(slot)}.bak${i}`);
    if (b) return { data: b, restoredFromBackup: true };
  }
  return null;
}

/** Atomic write: temp file + rename, then rotate backups of the previous version. */
async function write(slot, data) {
  if (!data || typeof data !== 'object') return false;
  const file = fileFor(slot);
  const tmp = `${file}.tmp`;
  const txt = JSON.stringify(data);
  // validate it round-trips before touching the real file
  JSON.parse(txt);
  await fsp.writeFile(tmp, txt, 'utf8');
  try {
    // rotate backups: bak2 -> bak3, bak1 -> bak2, current -> bak1
    for (let i = BACKUPS - 1; i >= 1; i -= 1) {
      try {
        await fsp.rename(`${file}.bak${i}`, `${file}.bak${i + 1}`);
      } catch {
        /* missing is fine */
      }
    }
    try {
      await fsp.rename(file, `${file}.bak1`);
    } catch {
      /* first save */
    }
  } finally {
    await fsp.rename(tmp, file);
  }
  return true;
}

async function list() {
  try {
    const names = await fsp.readdir(dir);
    return names.filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5));
  } catch {
    return [];
  }
}

module.exports = { init, load, write, list };
