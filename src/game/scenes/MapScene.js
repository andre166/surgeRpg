/**
 * Phaser scene: renders the current map (procedural art from the area grid),
 * the hero, boss nodes, and drives pointer-follow movement. Rules (gauge,
 * bosses, transitions) are delegated to the game store / core.
 */
import Phaser from 'phaser';
import { useGame, world, data } from '../../ui/stores/gameStore.js';
import { exitEdge } from '../../core/world/world.js';
import { tierColor, hashColor } from '../systems/palette.js';
import { areaBorderSegments, areaLineColor } from '../../core/world/areaLines.js';
import { mapSlimes } from '../../core/encounters/slimeBosses.js';
import { bossPixels, BOSS_SIZE } from '../../ui/bossArt.js';
import { HERO_ART_INDEXES, heroArtKey, heroArtUrl, heroWalk, heroWalkAnimKey, WALK_COLUMNS, WALK_DIRECTIONS } from '../heroArt.js';
import { hasMapArt, mapArtKey, mapArtLayers, mapArtSpriteFrames, mapArtSpriteKey, mapArtSprites, mapArtTilesetKey, mapArtTilesets, mapArtUrl, tilesetOf } from '../mapArt.js';
import { collisionGrid, moveWithCollision } from '../../core/world/collision.js';
import { parseTriggers, parseBossTriggers, isBossTrigger, bossSprites, spawnCell, triggerMapId, cellAt, cellCentre } from '../../core/world/triggers.js';
import { translate } from '../../ui/i18n/index.js';
import { bonusText } from '../../ui/i18n/bonus.js';
import { heroEcho } from '../../core/echoes.js';
import { echoSvg, echoGlowHsl } from '../animations/procedural.js';

const SPRITE_FPS = 60;
// Map walking pace: 42.5% of the original speed (50%, then 15% slower; moveSpeed modifiers still apply on top).
const WALK_SPEED_SCALE = 0.5 * 0.85;
// Walking animation frames per second at a normal pace (animateHero scales it with the actual speed).
const WALK_FPS = 8;
// ground covered per walking frame at timeScale 1 (px), and the step lift on passing frames (px)
const HERO_STRIDE_PX = 22;
const HERO_LIFT_PX = 1.5;
// the walk cycle only stops after this long without moving (ms)
const HERO_IDLE_AFTER = 120;
// idle loop frames per second (heroes whose sheet has an idle row)
const HERO_IDLE_FPS = 4;
// the hero stops this close to the pointer (px)
const HERO_ARRIVE_PX = 12;
// idle breathing per class: period (ms) and depth (fraction of the height); the mage gives off motes
const HERO_FLAVOUR = {
  warrior: { breath: 820, depth: 0.018, motes: false },
  thief: { breath: 520, depth: 0.011, motes: false },
  mage: { breath: 680, depth: 0.014, motes: true },
  default: { breath: 680, depth: 0.014, motes: false },
};
// area border lines (original: 5px inset, 3px line + 7px glow on a 640px-wide screen)
const BORDER_INSET = 8;
const BORDER_WIDTH = 4;
const BORDER_GLOW = 10;
// whole border layer translucent so the map art shows through
const BORDER_ALPHA = 0.45;
// colours of the last borders bake per map texture (re-bake only when they change)
const BORDER_BAKES = new Map();
// on maps with hand-made art the procedural terrain is baked at this fraction of the map size (it sits under the art)
const TERRAIN_SCALE = 0.25;
// Depth: the hero, bosses and the map's sprite layer are sorted by their bottom edge
// (10..11); tile layers above the sprite layer cover them all.
const sortDepth = (bottomY) => 10 + bottomY / 100000;
const DEPTH_ABOVE = 20;
// Under everything else (depth 0): procedural terrain, the map art's ground layer, then the
// boss circles, which lie on the ground like it (the decor tiles over the ground cover them).
const DEPTH_TERRAIN = -3;
const DEPTH_GROUND = -2;
const DEPTH_BOSS_MARK = -1;
// hero feet, below the hero position (the art is anchored 22px lower)
const HERO_FEET = 22;
// equipped echo: size on the map, where it floats (over the shoulder away from the facing
// direction, relative to the hero position) and how fast it catches up
const ECHO_SIZE = 44;
const ECHO_OFFSET = { down: [-36, -44], up: [36, -44], left: [42, -38], right: [-42, -38] };
const ECHO_FOLLOW = 0.1;
// echo animation: wag frames, idle orbit around the hero, little hearts now and then
const ECHO_FRAMES = 8;
const ECHO_FRAME_MS = 110;
const ECHO_IDLE_AFTER = 700;
const ECHO_ORBIT_SPEED = 0.0011; // radians per ms
const ECHO_ORBIT_RX = 44;
const ECHO_ORBIT_RY = 16;
const ECHO_HEART_EVERY = 6000;

export default class MapScene extends Phaser.Scene {
  constructor() {
    super('map');
  }

  preload() {
    for (const i of HERO_ART_INDEXES) {
      if (!this.textures.exists(heroArtKey(i))) this.load.image(heroArtKey(i), heroArtUrl(i));
      const walk = heroWalk(i);
      if (!this.textures.exists(walk.key)) this.load.spritesheet(walk.key, walk.url, { frameWidth: walk.frameWidth, frameHeight: walk.frameHeight });
    }
    // background art of the current map: the JSON first, then its embedded images
    const mapId = useGame.getState().run?.map.id;
    if (hasMapArt(mapId)) {
      const key = mapArtKey(mapId);
      const loadImages = (art) => {
        const image = (k, dataUrl) => {
          if (!this.textures.exists(k)) this.load.image(k, dataUrl);
        };
        for (const t of mapArtTilesets(art)) image(mapArtTilesetKey(mapId, t.firstGid), t.dataUrl);
        for (const f of mapArtSpriteFrames(art)) image(mapArtSpriteKey(mapId, f.asset, f.frame), f.dataUrl);
      };
      if (this.cache.json.exists(key)) loadImages(this.cache.json.get(key));
      else {
        this.load.once(`filecomplete-json-${key}`, (_, __, art) => loadImages(art));
        this.load.json(key, mapArtUrl(mapId));
      }
    }
  }

  /** Image of a loaded texture (for drawing into a canvas). */
  sourceImage(key) {
    return this.textures.exists(key) ? this.textures.get(key).getSourceImage() : null;
  }

  /**
   * Draws the tile layers of the map art the way the editor shows them (layers in order,
   * every tile at the map tile size) into three canvases: `ground` (up to the ground layer,
   * else the first tile layer; under the boss circles), `below` (the rest up to the sprite
   * layer, under the hero and the sprites) and `above` (`below` and `above` null when empty).
   * The sprites themselves are returned to be placed as objects, depth-sorted with the hero.
   */
  composeMapArt(art, mapId) {
    const ts = art.tileSize ?? 32;
    const newCanvas = () => {
      const canvas = document.createElement('canvas');
      canvas.width = art.width * ts;
      canvas.height = art.height * ts;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      return { canvas, ctx, drawn: false };
    };
    const tilesets = mapArtTilesets(art).map((t) => ({ ...t, img: this.sourceImage(mapArtTilesetKey(mapId, t.firstGid)) })).filter((t) => t.img);
    for (const t of tilesets) t.columns = Math.max(1, Math.floor(t.img.width / t.tileW));
    const ground = newCanvas();
    const below = newCanvas();
    const above = newCanvas();
    const layers = mapArtLayers(art);
    const groundLayer = layers.find((l) => l.id === 'ground' && l.kind === 'tile') ?? layers.find((l) => l.kind === 'tile');
    let target = ground;
    let sprites = [];
    for (const layer of layers) {
      if (layer.kind === 'sprite') {
        sprites = mapArtSprites(art).map((s) => ({ ...s, opacity: layer.opacity }));
        target = above;
        continue;
      }
      const { ctx } = target;
      ctx.globalAlpha = layer.opacity;
      const data = art.layerData?.[layer.id] ?? [];
      for (let i = 0; i < data.length; i += 1) {
        const t = tilesetOf(tilesets, data[i]);
        if (!t) continue;
        const local = data[i] - t.firstGid;
        const sx = (local % t.columns) * t.tileW;
        const sy = Math.floor(local / t.columns) * t.tileH;
        ctx.drawImage(t.img, sx, sy, t.tileW, t.tileH, (i % art.width) * ts, Math.floor(i / art.width) * ts, ts, ts);
        target.drawn = true;
      }
      if (layer === groundLayer && target === ground) target = below;
    }
    return { ground: ground.canvas, below: below.drawn ? below.canvas : null, above: above.drawn ? above.canvas : null, sprites };
  }

  /** Hand-made background (src/game/mapArt.js) stretched over the map; false when the map has none. */
  drawMapArt(map) {
    const art = this.cache.json.get(mapArtKey(map.id));
    // collision layer of the editor (non-zero = wall), stretched like the art
    this.collision = art ? collisionGrid(art.layerData?.collision, art.width, art.height, map.w, map.h) : null;
    // triggers of the editor's object layer (src/core/world/triggers.js)
    this.art = art ?? null;
    this.triggers = art ? parseTriggers(art) : [];
    // boss triggers replace the world.json bosses of this map (none = keep them); the core
    // (bossTouch, mapSlimes, battles) reads them through world.map(id)
    const bosses = art
      ? parseBossTriggers(art, map, world.maps.flatMap((m) => m.bosses ?? []), { validIds: new Set(Object.keys(data.bossData.mapBosses).map(Number)) })
      : [];
    const bossTriggerCount = (art?.objectProps ?? []).filter(isBossTrigger).length;
    if (bossTriggerCount > bosses.length) console.warn(`map ${map.id}: ${bossTriggerCount - bosses.length} boss trigger(s) ignored (invalid or repeated boss id; use {"boss": 0} or {"boss": "boss#0"})`);
    world.setMapBosses(map.id, bosses);
    // sprites standing on a boss trigger are that boss: hidden once it is beaten this run
    this.bossSpriteOwners = art ? bossSprites(art) : new Map();
    if (!art) return false;
    // tile layers composed once per map (they never change while the game runs), stretched over the map
    const groundKey = `map-art-ground-${map.id}`;
    const belowKey = `map-art-below-${map.id}`;
    const aboveKey = `map-art-above-${map.id}`;
    if (!this.textures.exists(groundKey)) {
      const { ground, below, above, sprites } = this.composeMapArt(art, map.id);
      // plain image textures: addCanvas would read every pixel back (getImageData), which the
      // game never needs and which made the first visit of a big map hitch
      this.textures.addImage(groundKey, ground).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (below) this.textures.addImage(belowKey, below).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (above) this.textures.addImage(aboveKey, above).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.mapArtSprites = { ...this.mapArtSprites, [map.id]: sprites };
    }
    const bg = this.add.image(0, 0, groundKey).setOrigin(0, 0).setDepth(DEPTH_GROUND);
    const sx = map.w / bg.width;
    const sy = map.h / bg.height;
    bg.setScale(sx, sy);
    // decor tiles (default depth, added first): over the boss circles, under the borders and labels
    if (this.textures.exists(belowKey)) this.add.image(0, 0, belowKey).setOrigin(0, 0).setScale(sx, sy);
    if (this.textures.exists(aboveKey)) this.add.image(0, 0, aboveKey).setOrigin(0, 0).setScale(sx, sy).setDepth(DEPTH_ABOVE);
    // sprite layer: each sprite sorted with the hero by its bottom edge (lower on screen = in front).
    // Sprites standing on a boss trigger are not drawn: the boss is drawn with its own pixel art in
    // their place (bottom-centre, same height; see the bosses in create), until it is beaten.
    this.bossArtSpots = {};
    for (const s of this.mapArtSprites?.[map.id] ?? []) {
      const owner = this.bossSpriteOwners.get(s.index);
      if (owner != null) {
        const spot = { x: (s.x + s.w / 2) * sx, y: (s.y + s.h) * sy, h: s.h * sy };
        const prev = this.bossArtSpots[owner];
        // a boss built from several sprites: its spot spans them (lowest feet, tallest height)
        this.bossArtSpots[owner] = prev ? { x: prev.x, y: Math.max(prev.y, spot.y), h: Math.max(prev.h, spot.h) } : spot;
        continue;
      }
      const sprite = this.add.sprite(s.x * sx, s.y * sy, mapArtSpriteKey(map.id, s.asset, 0)).setOrigin(0, 0).setAlpha(s.opacity);
      sprite.setDisplaySize(s.w * sx, s.h * sy);
      sprite.setDepth(sortDepth((s.y + s.h) * sy));
      if (s.frames.length > 1) {
        // animated sprites (e.g. tree crowns) loop their embedded frames
        const animKey = `map-art-anim-${map.id}-${s.asset}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: s.frames.map((f, i) => ({ key: mapArtSpriteKey(map.id, s.asset, i), duration: f.duration })),
            repeat: -1,
          });
        }
        sprite.play(animKey);
      }
    }
    return true;
  }

  /** Walking animations (one per direction) for a hero with a walking atlas. */
  ensureWalkAnims(index) {
    const walk = heroWalk(index);
    if (!walk || !this.textures.exists(walk.key)) return false;
    WALK_DIRECTIONS.forEach((dir, row) => {
      const key = heroWalkAnimKey(index, dir);
      if (this.anims.exists(key)) return;
      const cols = walk.rows[dir] ?? Array.from({ length: walk.frames }, (_, c) => c);
      const frames = cols.map((c) => ({ key: walk.key, frame: row * WALK_COLUMNS + c }));
      this.anims.create({ key, frames, frameRate: WALK_FPS, repeat: -1 });
    });
    // front-facing idle loop, for heroes whose sheet has one
    const idleKey = heroWalkAnimKey(index, 'idle');
    if (walk.idleRow != null && !this.anims.exists(idleKey)) {
      const frames = Array.from({ length: WALK_COLUMNS }, (_, c) => ({ key: walk.key, frame: walk.idleRow * WALK_COLUMNS + c }));
      this.anims.create({ key: idleKey, frames, frameRate: HERO_IDLE_FPS, repeat: -1 });
    }
    return true;
  }

  /** Plays the walking animation for a movement direction (dx, dy). */
  walkHero(dx, dy) {
    if (!this.heroSprite) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    this.heroDir = dir;
    this.heroSprite.anims.play(heroWalkAnimKey(this.heroIndex, dir), true);
  }

  /** Turns the hero to a direction, standing. */
  faceHero(dir) {
    this.heroDir = dir;
    if (!this.heroSprite) return;
    if (this.playIdleLoop()) return;
    this.heroSprite.anims.stop();
    this.heroSprite.setFrame(WALK_DIRECTIONS.indexOf(dir) * WALK_COLUMNS);
  }

  /**
   * Hand-drawn heroes only have 3-4 frames per direction, so a little procedural motion goes
   * on top, kept subtle so it never looks like floating: the walk frames run at a rate that
   * follows the hero's actual speed (feet do not skate), the step lift comes from the frames
   * themselves (up on the passing frames, down on the contacts, eased) with a puff of dust on
   * each contact, and a small settle on stopping. Standing still, only the height breathes
   * from the feet (per class: the warrior slow and deep, the thief quick), with the odd glance
   * to one side; the mage gives off arcane motes.
   */
  setupHeroAnim(classId) {
    const flavour = HERO_FLAVOUR[classId] ?? HERO_FLAVOUR.default;
    this.heroAnim = {
      // pixel-art heroes animate standing still in the art itself (no scale tricks, no glances)
      pixel: !!heroWalk(this.heroIndex)?.pixel,
      flavour, x: this.hero.x, y: this.hero.y, movedAt: -1e9, moving: false, speed: 0,
      lift: 0, frame: -1, settleAt: -1e9,
      nextGlance: this.time.now + 4000 + Math.random() * 3000, glanceUntil: 0, nextMote: 0,
    };
    if (this.heroSprite) this.heroBaseScale = this.heroSprite.scaleX;
    this.events.on('update', this.animateHero, this);
    this.events.once('shutdown', () => this.events.off('update', this.animateHero, this));
  }

  animateHero(time, delta) {
    const a = this.heroAnim;
    const sp = this.heroSprite;
    if (!a || !sp || !this.hero) return;
    const dt = Math.max(1, delta || 16);
    const dist = Math.hypot(this.hero.x - a.x, this.hero.y - a.y);
    a.x = this.hero.x;
    a.y = this.hero.y;
    if (dist > 0.3) a.movedAt = time;
    const moving = time - a.movedAt < 90;
    if (a.moving && !moving) a.settleAt = time;
    a.moving = moving;
    const base = this.heroBaseScale;
    let sy = base;
    let lift = 0;

    if (moving) {
      // frames keep pace with the ground covered, so the feet do not skate: a whole cycle always
      // covers 4 strides, so a 2-frame walk (contact, contact) runs its frames at half the rate
      const count = sp.anims.currentAnim?.frames.length ?? 4;
      const perFrame = (HERO_STRIDE_PX * 4) / Math.max(2, count);
      a.speed += ((dist / dt) * 1000 - a.speed) * 0.2;
      if (sp.anims.isPlaying) sp.anims.timeScale = Phaser.Math.Clamp(a.speed / perFrame / WALK_FPS, 0.4, 1.8);
      const idx = sp.anims.currentFrame?.index ?? 1;
      const dir = this.heroDir === 'left' ? -1 : this.heroDir === 'right' ? 1 : 0;
      if (idx !== a.frame) {
        a.frame = idx;
        a.since = 0;
        // dust on each contact: every frame of a 2-frame walk, the odd (contact) frames otherwise
        if (count === 2 || idx % 2 === 1) this.heroDust(dir);
      }
      a.since = (a.since ?? 0) + dist;
      // step bounce: up on the passing frames (even) of a full walk; a 2-frame walk has only
      // contacts, so it rises and falls within each frame as the step is covered
      lift = count === 2
        ? -HERO_LIFT_PX * Math.sin(Math.PI * Math.min(1, a.since / perFrame))
        : (idx % 2 === 0 ? -HERO_LIFT_PX : 0);
      a.nextGlance = time + 4000 + Math.random() * 3000;
      a.glanceUntil = 0;
    } else {
      a.frame = -1;
      a.speed = 0;
      const k = (time - a.settleAt) / 160;
      if (a.pixel) {
        // the idle loop in the sheet breathes and sways; scaling would bend the pixels
      } else if (k < 1) {
        // settle: a small squash right after stopping
        sy = base * (1 - Math.sin(k * Math.PI) * 0.03);
      } else {
        // breathing: only the height changes, from the feet (they stay on the ground)
        sy = base * (1 + Math.sin(time / a.flavour.breath) * a.flavour.depth);
      }
      // the odd glance to one side, then back
      if (a.pixel) {
        // (the idle loop covers it)
      } else if (time >= a.nextGlance && !a.glanceUntil) {
        sp.setFrame(WALK_DIRECTIONS.indexOf(Math.random() < 0.5 ? 'left' : 'right') * WALK_COLUMNS);
        a.glanceUntil = time + 650;
      } else if (a.glanceUntil && time >= a.glanceUntil) {
        sp.setFrame(WALK_DIRECTIONS.indexOf(this.heroDir ?? 'down') * WALK_COLUMNS);
        a.glanceUntil = 0;
        a.nextGlance = time + 5000 + Math.random() * 4000;
      }
      if (a.flavour.motes && time >= a.nextMote) {
        a.nextMote = time + 450 + Math.random() * 350;
        this.heroMote();
      }
    }
    // ease the lift so the bounce is round instead of a jolt
    a.lift += (lift - a.lift) * Math.min(1, dt / 45);
    sp.setPosition(0, HERO_FEET + Math.round(a.lift * 2) / 2).setScale(base, sy).setRotation(0);
  }

  /** Two small dust puffs at the feet, kicked back against the walking direction (dir -1 / 0 / 1). */
  heroDust(dir) {
    for (let i = 0; i < 2; i += 1) {
      const p = this.add.circle(this.hero.x + (Math.random() - 0.5) * 10, this.hero.y + HERO_FEET - 2, 2 + Math.random() * 2, 0xd9cfb4, 0.5)
        .setDepth(this.hero.depth - 0.000002);
      this.tweens.add({
        targets: p, x: p.x - dir * (6 + Math.random() * 6), y: p.y - 3 - Math.random() * 4,
        alpha: 0, scale: 1.8, duration: 420 + Math.random() * 180, ease: 'Sine.easeOut', onComplete: () => p.destroy(),
      });
    }
  }

  /** Mage idle: a little arcane mote that rises and fades beside the hero. */
  heroMote() {
    const m = this.add.circle(this.hero.x + (Math.random() - 0.5) * 34, this.hero.y + 4 - Math.random() * 30, 1.5 + Math.random() * 1.5, 0xc79bff, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.hero.depth + 0.000002);
    this.tweens.add({ targets: m, y: m.y - 14 - Math.random() * 10, alpha: 0, duration: 900 + Math.random() * 400, ease: 'Sine.easeOut', onComplete: () => m.destroy() });
  }

  /** Map art cell under a map position, or -1 (no art / outside). */
  cellOf(x, y) {
    return this.art ? cellAt(x, y, this.art.width, this.art.height, this.map.w, this.map.h) : -1;
  }

  /**
   * Places the hero where a pending teleport lands on this map: the trigger's cell, else the
   * map art's spawn cell, else the map centre.
   */
  applyArrival(map) {
    const arrival = this.pendingArrival;
    if (!arrival || arrival.mapId !== map.id) return;
    this.pendingArrival = null;
    const art = this.art;
    const cell = arrival.x != null && arrival.y != null ? { col: arrival.x, row: arrival.y } : art ? spawnCell(art) : null;
    const p = cell && art ? cellCentre(cell.col, cell.row, art.width, art.height, map.w, map.h) : { x: map.w / 2, y: map.h / 2 };
    useGame.getState().setPosition(Phaser.Math.Clamp(p.x, 8, map.w - 8), Phaser.Math.Clamp(p.y, 8, map.h - 8), map.id);
    this.arrivalDir = arrival.dir;
  }

  /** A new run starts on the spawn point of the start map's art (editor object of type spawn). */
  applySpawn(map) {
    const pos = useGame.getState().run?.map;
    if (!pos?.atStart || pos.id !== map.id || !this.art) return;
    const cell = spawnCell(this.art);
    if (!cell) return;
    const p = cellCentre(cell.col, cell.row, this.art.width, this.art.height, map.w, map.h);
    useGame.getState().setPosition(p.x, p.y, map.id);
  }

  /** Hero placed at (x, y): standing on a trigger keeps triggers off until it steps off them. */
  disarmTriggers(x, y) {
    this.triggerCell = this.cellOf(x, y);
    this.triggersArmed = !this.triggers?.some((t) => t.cell === this.triggerCell);
  }

  /** Runs a trigger the hero just stepped on; true when it moved the hero. */
  fireTrigger(trigger) {
    const destId = triggerMapId(trigger, this.map.id);
    const dest = destId != null ? world.map(destId) : null;
    if (!dest) {
      console.warn(`teleport trigger at cell ${trigger.cell}: unknown map "${trigger.map}"`);
      return false;
    }
    // the hero keeps walking after a teleport while the pointer is still held (update checks it)
    this.pendingArrival = { mapId: dest.id, x: trigger.x, y: trigger.y, dir: trigger.dir };
    if (dest.id === this.map.id) {
      this.applyArrival(this.map);
      const pos = useGame.getState().run.map;
      this.hero.setPosition(pos.x, pos.y).setDepth(sortDepth(pos.y + HERO_FEET));
      this.cameras.main.centerOn(pos.x, pos.y);
      this.faceHero(this.arrivalDir ?? this.heroDir);
      this.arrivalDir = null;
      this.disarmTriggers(pos.x, pos.y);
      return true;
    }
    // another map: the map change restarts the scene (store subscription in create) and
    // applyArrival places the hero; a second restart here would lose the arrival direction
    useGame.getState().setPosition(dest.w / 2, dest.h / 2, dest.id);
    return true;
  }

  /** Stops walking: first frame of the last direction. */
  idleHero() {
    if (!this.heroSprite) return;
    // a stop of a frame or two (catching up with the pointer) must not cut the walk cycle short
    if (this.heroAnim && this.time.now - this.heroAnim.movedAt < HERO_IDLE_AFTER) return;
    if (this.playIdleLoop()) return;
    if (!this.heroSprite.anims.isPlaying) return;
    this.heroSprite.anims.stop();
    this.heroSprite.setFrame(WALK_DIRECTIONS.indexOf(this.heroDir ?? 'down') * WALK_COLUMNS);
  }

  /** Facing the camera with an idle loop in the sheet: plays it (once started it keeps going). */
  playIdleLoop() {
    const key = heroWalkAnimKey(this.heroIndex, 'idle');
    if ((this.heroDir ?? 'down') !== 'down' || !this.anims.exists(key)) return false;
    const sp = this.heroSprite;
    if (sp.anims.currentAnim?.key !== key || !sp.anims.isPlaying) {
      sp.anims.timeScale = 1;
      sp.anims.play(key);
    }
    return true;
  }

  /**
   * Camera bounds past the map edges by the height of the HUD bars over the canvas, so the
   * first and last rows of the map can scroll out from under them (and be clicked).
   */
  fitCameraToHud() {
    if (!this.map) return;
    const canvas = this.game.canvas.getBoundingClientRect();
    if (!canvas.height) return;
    const k = this.scale.height / canvas.height;
    const hud = (side) => document.querySelector(`.screen.map .hud.${side}`)?.getBoundingClientRect();
    // top: only the first button row (on phones the buttons stack in a column on the right)
    const top = document.querySelector('.screen.map .hud.top .hud-actions > :first-child')?.getBoundingClientRect();
    const bottom = hud('bottom');
    const padTop = top ? Math.max(0, top.bottom - canvas.top) * k : 0;
    const padBottom = bottom ? Math.max(0, canvas.bottom - bottom.top) * k : 0;
    this.cameras.main.setBounds(0, -padTop, this.map.w, this.map.h + padTop + padBottom);
  }

  create() {
    this.buildMap();
    this.fitCameraToHud();
    // HUD sizes change with the window and with fonts loading
    this.scale.on('resize', this.fitCameraToHud, this);
    this.time.delayedCall(500, () => this.fitCameraToHud());
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCameraToHud, this));
    this.input.on('pointerdown', () => {
      this.holding = true;
    });
    this.input.on('pointerup', () => {
      this.holding = false;
    });
    // the game outlives the scene (src/ui/mapGame.js restarts it on every visit): drop the listener with it
    const onBlur = () => {
      this.holding = false;
    };
    this.game.events.on('blur', onBlur);
    this.events.once('shutdown', () => this.game.events.off('blur', onBlur));
    this.unsub = useGame.subscribe((s, prev) => {
      if (s.run && prev.run && s.run.map.id !== prev.run.map.id && s.screen === 'map') this.scene.restart();
      else if (s.run && this.borders && s.run.level !== this.bordersLevel) this.drawBorders(s.run);
    });
    // also on 'destroy': leaving the map screen destroys the whole game (no 'shutdown'), and a
    // leaked listener would throw on the next map change (restarting a dead scene), aborting the
    // store update before the live scene could restart
    const unsub = this.unsub;
    const release = () => {
      unsub();
      if (this.unsub === unsub) this.unsub = null;
      this.events.off('shutdown', release);
      this.events.off('destroy', release);
    };
    this.events.once('shutdown', release);
    this.events.once('destroy', release);
    this.lastSaveAt = 0;
  }

  buildMap() {
    const run = useGame.getState().run;
    if (!run) return;
    let map = world.map(run.map.id);
    this.map = map;
    this.mapId = map.id;
    this.cameras.main.setBounds(0, 0, map.w, map.h);
    this.cameras.main.setBackgroundColor('#0b0d12');

    // terrain: drawn once per map into a texture (as live Graphics it was re-triangulated every
    // frame: hundreds of dot circles, ~40% of the CPU on big maps)
    const { cols, rows, cells } = map.grid;
    const cw = map.w / cols;
    const ch = map.h / rows;
    const terrainKey = `map-terrain-${map.id}`;
    // maps with hand-made art hide it underneath, so it is baked small there
    const terrainScale = hasMapArt(map.id) ? TERRAIN_SCALE : 1;
    if (!this.textures.exists(terrainKey)) this.bakeGraphics(terrainKey, map.w, map.h, (g, k) => this.drawTerrain(g, map, cw * k, ch * k, k), terrainScale);
    this.add.image(0, 0, terrainKey).setOrigin(0, 0).setScale(1 / terrainScale).setDepth(DEPTH_TERRAIN);
    // hand-made background over the procedural terrain (which still shows through empty tiles)
    this.drawMapArt(map);
    // read again: boss triggers of the art may have moved this map's bosses
    map = world.map(run.map.id);
    this.map = map;
    this.applyArrival(map);
    this.applySpawn(map);
    // area borders, coloured by area level vs hero level (redrawn on level change)
    this.borderSegments = areaBorderSegments(cells, cw, ch, BORDER_INSET);
    this.borders = null;
    this.drawBorders(run);
    // labels (StageMap_MakeMap.as MapTextTekiseiMC): area level, with the active bonus below it
    const lang = useGame.getState().profile?.options.language;
    const t = (key, vars) => translate(lang, key, vars);
    const style = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '22px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    for (const a of map.areas) {
      if (!a.label || a.label[0] < 0) continue;
      const x = (map.w * a.label[0]) / 100;
      const y = (map.h * a.label[1]) / 100;
      const bonus = run.bonuses?.[map.id]?.[a.id] ?? 0;
      const lv = this.add.text(x, y, `LV ${a.level}`, style).setOrigin(0.5, bonus ? 1 : 0.5).setAlpha(0.9);
      if (bonus) {
        this.add.text(x, lv.y + 2, bonusText(t, bonus), { ...style, fontSize: '18px', color: '#f2b632' }).setOrigin(0.5, 0).setAlpha(0.95);
      }
    }
    // edges to neighbours
    const n = map.neighbours;
    const edge = this.add.graphics();
    edge.lineStyle(6, 0xf2b632, 0.6);
    if (n.up > 0) edge.lineBetween(0, 2, map.w, 2);
    if (n.down > 0) edge.lineBetween(0, map.h - 2, map.w, map.h - 2);
    if (n.left > 0) edge.lineBetween(2, 0, 2, map.h);
    if (n.right > 0) edge.lineBetween(map.w - 2, 0, map.w - 2, map.h);

    // bosses
    this.bossMarks = [];
    for (const b of map.bosses) {
      if (run.bossBeaten[b.id]) continue;
      const c = hashColor(`boss${b.id}`);
      const ring = this.add.graphics();
      ring.lineStyle(4, 0xffffff, 0.9);
      ring.strokeCircle(b.x, b.y, Math.max(b.w, b.h) / 2);
      ring.fillStyle(c, 0.85);
      ring.fillCircle(b.x, b.y, Math.min(b.w, b.h) / 2.4);
      ring.lineStyle(3, 0x111111, 1);
      ring.strokeCircle(b.x, b.y, Math.min(b.w, b.h) / 2.4);
      const skull = this.add.text(b.x, b.y, '☠', { fontSize: `${Math.max(24, Math.min(b.w, b.h) / 2)}px`, color: '#ffffff' }).setOrigin(0.5);
      ring.setDepth(DEPTH_BOSS_MARK);
      skull.setDepth(DEPTH_BOSS_MARK);
      this.tweens.add({ targets: [ring, skull], alpha: { from: 0.75, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
      this.bossMarks.push(ring);
      // the boss itself, in its own pixel art (bossArt.js): where the map art had a sprite on its
      // trigger (bottom-centre, same height), else standing on its circle; breathing from the feet
      const pixels = bossPixels(`boss#${b.id}`);
      if (pixels) {
        const key = `boss-art-${b.id}`;
        if (!this.textures.exists(key)) {
          const tex = this.textures.createCanvas(key, BOSS_SIZE, BOSS_SIZE);
          tex.context.putImageData(pixels, 0, 0);
          tex.refresh();
          tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        const spot = this.bossArtSpots?.[b.id] ?? { x: b.x, y: b.y + Math.min(b.w, b.h) / 2, h: Math.max(b.w, b.h) * 1.2 };
        const art = this.add.image(spot.x, spot.y, key).setOrigin(0.5, 1).setScale(spot.h / BOSS_SIZE);
        art.setDepth(sortDepth(spot.y));
        this.tweens.add({ targets: art, scaleY: { from: art.scaleY, to: art.scaleY * 0.97 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.bossMarks.push(art);
      }
    }

    // slime kings (talent points), next to each boss until beaten this run: each drawn with its own
    // pixel-art sprite (bossArt.js), crisp, feet on the ground, breathing from the feet
    for (const s of mapSlimes(map)) {
      if (run.slimesBeaten?.[s.id]) continue;
      const r = Math.min(s.w, s.h) / 2;
      const artKey = `slime-art-${s.id}`;
      const pixels = bossPixels(`slime#${s.id}`);
      if (pixels && !this.textures.exists(artKey)) {
        const tex = this.textures.createCanvas(artKey, BOSS_SIZE, BOSS_SIZE);
        tex.context.putImageData(pixels, 0, 0);
        tex.refresh();
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      // the body is about 36 of the 48 px wide: make it a little wider than the touch area
      const art = this.add.image(s.x, s.y + r, artKey).setOrigin(0.5, 1).setScale((r * 2.2) / 36);
      const tag = this.add.text(s.x, s.y + r * 1.05, 'TP', { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '16px', color: '#f2b632', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5, 0);
      for (const o of [art, tag]) o.setDepth(sortDepth(s.y + r));
      this.tweens.add({ targets: art, scaleY: { from: art.scaleY, to: art.scaleY * 0.96 }, duration: 700, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: tag, alpha: { from: 0.75, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
    }

    // hero (position read again: a teleport arrival may have moved it)
    const pos = useGame.getState().run.map;
    this.hero = this.add.container(pos.x, pos.y);
    this.heroSprite = null;
    this.heroIndex = run.characterIndex;
    this.heroDir = 'down';
    if (this.ensureWalkAnims(run.characterIndex)) {
      // hand-made hero art with a walking animation: feet at the hero position, about 64px tall
      const walk = heroWalk(run.characterIndex);
      // pixel-art heroes scale with nearest-neighbour (crisp 2x), the others smoothly
      if (walk.pixel) this.textures.get(walk.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.heroSprite = this.add.sprite(0, 22, walk.key, 0).setOrigin(0.5, 1);
      this.heroSprite.setScale(64 / walk.frameHeight);
      this.hero.add(this.heroSprite);
    } else if (this.textures.exists(heroArtKey(run.characterIndex))) {
      const img = this.add.image(0, 22, heroArtKey(run.characterIndex)).setOrigin(0.5, 1);
      img.setScale(60 / img.height);
      this.hero.add(img);
    } else {
    const body = this.add.graphics();
    const hue = Math.round((run.characterIndex * 360) / 16);
    const cloth = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.45).color;
    const dark = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.25).color;
    body.fillStyle(0x000000, 0.3);
    body.fillEllipse(0, 18, 28, 8);
    body.fillStyle(cloth, 1);
    body.fillRoundedRect(-10, -4, 20, 22, 5);
    body.lineStyle(2, dark, 1);
    body.strokeRoundedRect(-10, -4, 20, 22, 5);
    body.fillStyle(0xf1c9a5, 1);
    body.fillCircle(0, -12, 10);
    body.lineStyle(2, dark, 1);
    body.strokeCircle(0, -12, 10);
    this.hero.add(body);
    }
    this.hero.setDepth(sortDepth(pos.y + HERO_FEET));
    this.cameras.main.startFollow(this.hero, true, 0.15, 0.15);
    this.cameras.main.centerOn(pos.x, pos.y);
    if (this.arrivalDir) this.faceHero(this.arrivalDir);
    this.arrivalDir = null;
    // the cell the hero starts on does not fire its trigger (only entering a cell does)
    this.disarmTriggers(pos.x, pos.y);
    this.bob = 0;
    this.setupHeroAnim(run.classId);
    this.addEcho(heroEcho(useGame.getState().profile, run.characterIndex));
  }

  /**
   * Equipped echo (the Echoes-screen spirit) as a little companion: its frames (tail wag,
   * orbiting orbs, blinks) are drawn once into textures, then updateEcho brings it to life.
   */
  addEcho(echo) {
    this.echo = null;
    // generation of this scene run: a load still pending from before a restart (map change)
    // must not place its echo into the new map. isActive() can't be used here: on a restart the
    // textures already exist and place() runs inside create(), before the scene is RUNNING.
    this.echoGen = (this.echoGen ?? 0) + 1;
    const gen = this.echoGen;
    if (!echo) return;
    const base = `echo-spirit-${echo.id}`;
    const keys = Array.from({ length: ECHO_FRAMES }, (_, i) => `${base}-${i}`);
    const blinkKeys = keys.map((k) => `${k}-blink`);
    const glowKey = `${base}-glow`;
    const [h, s, l] = echoGlowHsl(echo);
    const glowColor = Phaser.Display.Color.HSLToColor(h / 360, s, l).color;

    const place = () => {
      const status = this.sys.settings.status;
      if (gen !== this.echoGen || !this.hero || status === Phaser.Scenes.SHUTDOWN || status === Phaser.Scenes.DESTROYED) return;
      const [ox, oy] = ECHO_OFFSET[this.heroDir] ?? ECHO_OFFSET.down;
      this.echoGlow = this.add.image(this.hero.x + ox, this.hero.y + oy, glowKey).setDisplaySize(ECHO_SIZE * 1.9, ECHO_SIZE * 1.9).setBlendMode(Phaser.BlendModes.ADD);
      this.echo = this.add.image(this.hero.x + ox, this.hero.y + oy, keys[0]).setDisplaySize(ECHO_SIZE, ECHO_SIZE).setAlpha(0.95);
      this.echoState = {
        keys, blinkKeys, glowColor, frame: -1, nextBlinkAt: this.time.now + 1500, blinkUntil: 0,
        heroX: this.hero.x, heroY: this.hero.y, stillSince: this.time.now, angle: Math.PI, vx: 0,
        lean: 0, hop: null, nextSparkle: 0, nextHeart: this.time.now + ECHO_HEART_EVERY,
      };
      this.echoPos = null;
      this.events.on('update', this.updateEcho, this);
      this.events.once('shutdown', () => this.events.off('update', this.updateEcho, this));
      this.updateEcho(this.time.now, 0);
    };
    if (this.textures.exists(keys[0])) {
      place();
      return;
    }
    const svgUrl = (pose) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(echoSvg(echo, pose).replace('<svg ', '<svg width="128" height="128" '))}`;
    const load = (key, url) => new Promise((resolve) => {
      if (this.textures.exists(key)) { resolve(); return; }
      const img = new Image();
      img.onload = () => {
        if (!this.textures.exists(key)) {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          canvas.getContext('2d').drawImage(img, 0, 0, 128, 128);
          this.textures.addImage(key, canvas);
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
    // soft round glow in the echo's colour (drawn additively behind it)
    if (!this.textures.exists(glowKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const g = canvas.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, `hsla(${h}, ${s * 100}%, ${l * 100}%, 0.55)`);
      grad.addColorStop(1, `hsla(${h}, ${s * 100}%, ${l * 100}%, 0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      this.textures.addImage(glowKey, canvas);
    }
    const jobs = keys.map((k, i) => load(k, svgUrl({ t: i / ECHO_FRAMES })))
      .concat(blinkKeys.map((k, i) => load(k, svgUrl({ t: i / ECHO_FRAMES, blink: true }))));
    Promise.all(jobs).then(place);
  }

  /**
   * The echo's life on the map: wags (frames), blinks, breathes and glows; trails the hero
   * when it walks (leaning into the motion, leaving sparkles) and, once the hero stands
   * still, orbits slowly around it, now and then hopping with a little heart.
   */
  updateEcho(time, delta) {
    if (!this.echo || !this.hero || !this.echoState) return;
    const st = this.echoState;
    const dt = delta || 16;

    // frames: tail wag loop, with a blink now and then
    if (time >= st.nextBlinkAt) {
      st.blinkUntil = time + 140;
      st.nextBlinkAt = time + 2500 + Math.random() * 2500;
    }
    const frame = Math.floor(time / ECHO_FRAME_MS) % ECHO_FRAMES;
    const blinking = time < st.blinkUntil;
    const key = (blinking ? st.blinkKeys : st.keys)[frame];
    if (this.echo.texture.key !== key) this.echo.setTexture(key).setDisplaySize(ECHO_SIZE, ECHO_SIZE);

    // walking or standing still?
    const heroMoved = Math.hypot(this.hero.x - st.heroX, this.hero.y - st.heroY) > 0.5;
    st.heroX = this.hero.x;
    st.heroY = this.hero.y;
    if (heroMoved) st.stillSince = time;
    const idle = time - st.stillSince > ECHO_IDLE_AFTER;

    let tx;
    let ty;
    if (idle) {
      // slow orbit: behind the hero over the top, in front of it underneath
      st.angle += dt * ECHO_ORBIT_SPEED;
      tx = this.hero.x + Math.cos(st.angle) * ECHO_ORBIT_RX;
      ty = this.hero.y - 30 + Math.sin(st.angle) * ECHO_ORBIT_RY;
    } else {
      const [ox, oy] = ECHO_OFFSET[this.heroDir] ?? ECHO_OFFSET.down;
      tx = this.hero.x + ox;
      ty = this.hero.y + oy;
      // pick up the orbit from where the echo is when the hero stops again
      st.angle = Math.atan2((ty - (this.hero.y - 30)) / ECHO_ORBIT_RY, (tx - this.hero.x) / ECHO_ORBIT_RX);
    }
    const ease = delta ? 1 - (1 - (idle ? 0.06 : ECHO_FOLLOW)) ** (dt / (1000 / SPRITE_FPS)) : 1;
    const prevX = this.echoPos ? this.echoPos.x : tx;
    this.echoPos = this.echoPos && delta ? this.echoPos : { x: tx, y: ty };
    this.echoPos.x += (tx - this.echoPos.x) * ease;
    this.echoPos.y += (ty - this.echoPos.y) * ease;

    // lean into the motion and face where it goes
    st.vx += ((this.echoPos.x - prevX) / Math.max(1, dt / 16) - st.vx) * 0.2;
    st.lean += (Phaser.Math.Clamp(st.vx * 0.06, -0.3, 0.3) - st.lean) * 0.15;
    if (Math.abs(st.vx) > 0.15) this.echo.setFlipX(st.vx < 0);

    // happy hop (idle): a quick arc up and back
    let hopY = 0;
    if (st.hop) {
      const k = (time - st.hop) / 380;
      if (k >= 1) st.hop = null;
      else hopY = -Math.sin(k * Math.PI) * 10;
    }
    if (idle && time >= st.nextHeart) {
      st.hop = time;
      st.nextHeart = time + ECHO_HEART_EVERY + Math.random() * 3000;
      this.echoHeart();
    } else if (!idle) st.nextHeart = Math.max(st.nextHeart, time + 2500);

    // breathe and bob
    const breathe = Math.sin(time / 380) * 0.045;
    const y = this.echoPos.y + Math.sin(time / 450) * 4 + hopY;
    const scale = ECHO_SIZE / 128;
    this.echo.setPosition(this.echoPos.x, y).setRotation(st.lean).setScale(scale * (1 - breathe), scale * (1 + breathe));
    this.echoGlow.setPosition(this.echoPos.x, y + 2).setAlpha(0.45 + Math.sin(time / 520) * 0.15);

    // depth: behind the hero, except when the orbit brings it in front (below the hero)
    const inFront = idle && Math.sin(st.angle) > 0.2;
    this.echo.setDepth(this.hero.depth + (inFront ? 0.000001 : -0.000001));
    this.echoGlow.setDepth(this.echo.depth - 0.0000005);

    // sparkles: a trail while walking, a calm one now and then while idle
    if (time >= st.nextSparkle) {
      st.nextSparkle = time + (idle ? 520 : 90);
      this.echoSparkle(this.echoPos.x - st.vx * 4, y + 10);
    }
  }

  /** A tiny glowing dot that drifts up and fades (echo trail). */
  echoSparkle(x, y) {
    const st = this.echoState;
    const dot = this.add.circle(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 6, 1.5 + Math.random() * 1.5, st.glowColor, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.echo.depth - 0.000001);
    this.tweens.add({ targets: dot, y: dot.y - 10 - Math.random() * 10, alpha: 0, scale: 0.3, duration: 650 + Math.random() * 250, ease: 'Sine.easeOut', onComplete: () => dot.destroy() });
  }

  /** A little heart that floats up from the echo (idle happiness). */
  echoHeart() {
    const heart = this.add.text(this.echo.x + 8, this.echo.y - 16, '♥', { fontSize: '14px', color: '#ff8fb1', stroke: '#3a0d1c', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(this.echo.depth + 0.000002).setScale(0.4);
    this.tweens.add({ targets: heart, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: heart, y: heart.y - 26, alpha: 0, duration: 1300, delay: 200, ease: 'Sine.easeIn', onComplete: () => heart.destroy() });
  }

  /** StageMapVar.as: a wide faint stroke (glow) under a thin solid one, per area colour. */
  drawBorders(run) {
    this.bordersLevel = run.level;
    const color = (areaIdx) => areaLineColor(this.map.areas[areaIdx]?.level ?? 0, run.level, run.hardMode);
    // baked into a texture, re-baked only when the colours change (each area's colour depends on
    // the hero's level against the area's, so most level-ups keep the same picture)
    const key = `map-borders-${this.map.id}`;
    const colours = this.map.areas.map((_, i) => color(i)).join(',');
    const fresh = BORDER_BAKES.get(key) !== colours || !this.textures.exists(key);
    if (fresh) BORDER_BAKES.set(key, colours);
    if (fresh) this.bakeGraphics(key, this.map.w, this.map.h, (g) => {
      for (const [width, alpha] of [[BORDER_GLOW, 0.3], [BORDER_WIDTH, 0.7]]) {
        for (const s of this.borderSegments) {
          g.lineStyle(width, color(s.area), alpha);
          g.lineBetween(s.x1, s.y1, s.x2, s.y2);
        }
      }
    });
    if (!this.borders) this.borders = this.add.image(0, 0, key).setOrigin(0, 0).setAlpha(BORDER_ALPHA);
    else if (fresh) this.borders.setTexture(key);
  }

  /**
   * Draws with a throw-away Graphics into an offscreen canvas and registers it as the texture
   * `key` (replacing it). `scale` < 1 bakes at a lower resolution (the image is scaled back up).
   */
  bakeGraphics(key, w, h, draw, scale = 1) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    draw(g, scale);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale);
    canvas.height = Math.ceil(h * scale);
    g.generateTexture(canvas, canvas.width, canvas.height);
    g.destroy();
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addImage(key, canvas);
  }

  /** Procedural terrain: one rect per grid cell coloured by area level, with a few texture dots (`k`: bake scale). */
  drawTerrain(g, map, cw, ch, k = 1) {
    const { cols, rows, cells } = map.grid;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const area = map.areas[cells[r][c]] ?? map.areas[0];
        const col = tierColor(area.level, map.id);
        g.fillStyle(col.fill, 1);
        g.fillRect(c * cw, r * ch, cw + 1, ch + 1);
        // texture dots
        g.fillStyle(col.dot, 0.35);
        const seed = (r * 131 + c * 17 + map.id * 7) % 97;
        for (let d = 0; d < 4; d += 1) {
          const dx = ((seed * (d + 3) * 37) % 100) / 100;
          const dy = ((seed * (d + 5) * 53) % 100) / 100;
          g.fillCircle(c * cw + dx * cw, r * ch + dy * ch, (3 + (d % 2) * 2) * k);
        }
      }
    }
  }

  update(time, delta) {
    const store = useGame.getState();
    if (!store.run || store.screen !== 'map' || !this.hero) return;
    // a release missed while the scene restarted (map change) must not leave the hero walking
    if (this.holding && !this.input.activePointer.isDown) this.holding = false;
    if (!this.holding) {
      this.idleHero();
      return;
    }
    const p = this.input.activePointer;
    const target = this.cameras.main.getWorldPoint(p.x, p.y);
    const stats = store.heroStats();
    const speed = (stats?.modifiers.moveSpeed ?? 10) * WALK_SPEED_SCALE * (delta / (1000 / SPRITE_FPS));
    let { x, y } = this.hero;
    const dx = target.x - x;
    const dy = target.y - y;
    const dist = Math.hypot(dx, dy);
    // close enough: stop instead of chasing the pointer back and forth. The target is the pointer
    // in world space, so it jumps with the following camera (0-5 px a frame); a dead zone wider
    // than that keeps the hero from jittering around it (which reads as stutter)
    if (dist < Math.max(HERO_ARRIVE_PX, speed)) {
      this.idleHero();
      return;
    }
    this.walkHero(dx, dy);
    let angle = Math.atan2(dy, dx);
    angle = Math.round((angle * 180) / Math.PI / 5) * 5 * (Math.PI / 180); // 5 degree steps
    let nx = x + Math.cos(angle) * speed;
    let ny = y + Math.sin(angle) * speed;
    if (Math.abs(target.x - x) < speed) nx = target.x;
    if (Math.abs(target.y - y) < speed) ny = target.y;

    // map transitions
    const edge = exitEdge(this.map, nx, ny);
    if (edge) {
      const nb = this.map.neighbours[edge];
      const dest = world.map(nb);
      if (dest) {
        let px = nx;
        let py = ny;
        if (edge === 'left') { px = dest.w - 8; py = (ny / this.map.h) * dest.h; }
        if (edge === 'right') { px = 8; py = (ny / this.map.h) * dest.h; }
        if (edge === 'up') { py = dest.h - 8; px = (nx / this.map.w) * dest.w; }
        if (edge === 'down') { py = 8; px = (nx / this.map.w) * dest.w; }
        this.holding = false;
        store.setPosition(px, py, dest.id);
        this.scene.restart();
        return;
      }
    }
    nx = Phaser.Math.Clamp(nx, 8, this.map.w - 8);
    ny = Phaser.Math.Clamp(ny, 8, this.map.h - 8);
    // walls of the hand-made map (src/core/world/collision.js)
    ({ x: nx, y: ny } = moveWithCollision(this.collision, x, y, nx, ny));
    if (nx === x && ny === y) {
      this.idleHero();
      return;
    }
    this.hero.setPosition(nx, ny);
    this.hero.setDepth(sortDepth(ny + HERO_FEET));
    this.bob += delta;
    if (!this.heroSprite) this.hero.y += Math.sin(this.bob / 90) * 0.6; // animated heroes walk instead of bobbing

    // triggers fire when the hero enters their cell; after starting on a trigger (teleport
    // arrival), they wait until the hero steps off every trigger, so walking along a row of
    // triggers (a wide passage) does not send the hero straight back
    const cell = this.cellOf(nx, ny);
    if (cell !== this.triggerCell) {
      this.triggerCell = cell;
      const trigger = this.triggers?.find((t) => t.cell === cell);
      if (!trigger) this.triggersArmed = true;
      else if (this.triggersArmed && this.fireTrigger(trigger)) return;
    }

    const battle = store.movedTo(nx, ny, this.mapId, stats?.modifiers.encounterMultiplier ?? 1);
    if (battle) {
      this.holding = false;
      return;
    }
    // the store may have kept the hero outside a boss (bossTouch); follow its position
    const pos = useGame.getState().run?.map;
    if (pos && (pos.x !== nx || pos.y !== ny)) this.hero.setPosition(pos.x, pos.y).setDepth(sortDepth(pos.y + HERO_FEET));
    if (time - this.lastSaveAt > 1500) {
      this.lastSaveAt = time;
      store.persist();
    }
  }
}
