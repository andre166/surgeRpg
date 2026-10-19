import Phaser from 'phaser';
import MapScene from '../game/scenes/MapScene.js';
import { isCompact } from './responsive.js';

/**
 * The map's Phaser game, kept alive between visits to the map screen. Creating it is slow
 * (WebGL context, hero art and walk sheets, the map JSON with its embedded tiles, ground
 * canvases), so leaving the map (Gear, Hero, a battle...) only detaches its canvas and puts
 * the loop to sleep; coming back re-attaches it and restarts the scene, which reuses every
 * texture already loaded and picks up whatever changed meanwhile (map, position, hero, echo).
 */
let game = null;
let holder = null;
let compactMode = null;
// true from the game's creation (or a scene load with files to fetch) until the map's first frame
let loading = false;
const loadingListeners = new Set();

function setLoading(v) {
  if (loading === v) return;
  loading = v;
  for (const cb of loadingListeners) cb(v);
}

/** Calls `cb(loading)` now and on every change; returns the unsubscribe. */
export function subscribeMapLoading(cb) {
  loadingListeners.add(cb);
  cb(loading);
  return () => loadingListeners.delete(cb);
}

/** Creates the game inside `host`: the holder must be in the page first, or the FIT scale mode measures a 0x0 parent and the canvas stays 0x0 (invisible, never clicked). */
function create(compact, host) {
  holder = document.createElement('div');
  holder.className = 'phaser-holder';
  host.appendChild(holder);
  setLoading(true);
  const g = new Phaser.Game({
    type: Phaser.AUTO,
    parent: holder,
    width: 1280,
    height: 720,
    backgroundColor: '#0b0d12',
    // Phones fill the whole viewport (the camera follows the hero); desktop keeps the fixed 16:9 view.
    scale: compact
      ? { mode: Phaser.Scale.RESIZE }
      : { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [MapScene],
    render: { antialias: true },
    audio: { noAudio: true },
  });
  g.events.on('map-loading', () => setLoading(true));
  g.events.on('map-ready', () => setLoading(false));
  return g;
}

/**
 * Restarts the map scene so it shows the current run. A scene still in its first load (the
 * map was left and re-entered quickly) restarts only once it is created: restarting it
 * mid-load queues the same images again while the first ones are still arriving, and they
 * collide ("Texture key already in use").
 */
function refreshScene(scene) {
  if (!scene) return;
  if (scene.sys.settings.status === Phaser.Scenes.RUNNING) { scene.scene.restart(); return; }
  if (scene.restartQueued) return;
  scene.restartQueued = true;
  scene.events.once('create', () => {
    scene.restartQueued = false;
    scene.scene.restart();
  });
}

/** Shows the map game inside `host` (creating it the first time). */
export function attachMapGame(host) {
  const compact = isCompact();
  // the scale mode is fixed at creation: crossing the phone/desktop breakpoint needs a new game
  if (game && compact !== compactMode) {
    game.loop.wake(); // a sleeping loop would never run the pending destroy
    game.destroy(true);
    game = null;
    setLoading(false);
  }
  if (!game) {
    game = create(compact, host);
    compactMode = compact;
  } else {
    host.appendChild(holder);
    game.loop.wake();
    game.scale.refresh();
    refreshScene(game.scene.getScene('map'));
  }
  // dev/test hook (like window.__surge): lets tests sample the map scene; never in production builds
  if (import.meta.env.DEV) window.__game = game;
}

/** Hides the map game (leaving the map screen): canvas out of the page, loop asleep. */
export function detachMapGame() {
  if (!game) return;
  game.loop.sleep();
  holder.remove();
}
