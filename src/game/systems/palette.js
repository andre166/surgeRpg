/** Colours for procedural terrain by area level, and stable colours from strings. */
import Phaser from 'phaser';

const TIERS = [
  { max: 100, h: 110, s: 0.45, l: 0.32 }, // meadow
  { max: 1000, h: 90, s: 0.4, l: 0.28 }, // forest
  { max: 5000, h: 35, s: 0.45, l: 0.3 }, // savanna
  { max: 20000, h: 20, s: 0.5, l: 0.26 }, // badlands
  { max: 60000, h: 265, s: 0.35, l: 0.26 }, // twilight
  { max: 200000, h: 215, s: 0.45, l: 0.22 }, // deep
  { max: Infinity, h: 335, s: 0.45, l: 0.2 }, // crimson
];

export function tierColor(level, mapId = 0) {
  const t = TIERS.find((x) => level < x.max) ?? TIERS[TIERS.length - 1];
  const shift = ((mapId * 13) % 20) - 10;
  const fill = Phaser.Display.Color.HSLToColor(((t.h + shift + 360) % 360) / 360, t.s, t.l + ((level % 7) / 7) * 0.05).color;
  const dot = Phaser.Display.Color.HSLToColor(((t.h + shift + 360) % 360) / 360, t.s, t.l + 0.18).color;
  return { fill, dot };
}

export function hashColor(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Phaser.Display.Color.HSLToColor(((h >>> 0) % 360) / 360, 0.7, 0.5).color;
}
