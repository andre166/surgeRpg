/**
 * Procedural art: deterministic SVG creatures and heroes from a string seed.
 * Keeps the visual identity our own while giving every enemy a stable look.
 */
import { ECHO_ART, ECHO_ART_GLOW } from './echoArt.js';

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function creatureSvg(sprite, boss = false) {
  const r = rnd(hash(sprite || 'x'));
  const hue = Math.floor(r() * 360);
  const sat = 45 + Math.floor(r() * 40);
  const light = 38 + Math.floor(r() * 20);
  const body = `hsl(${hue} ${sat}% ${light}%)`;
  const dark = `hsl(${hue} ${sat}% ${Math.max(10, light - 22)}%)`;
  const glow = `hsl(${(hue + 40) % 360} 90% 65%)`;
  const n = 7 + Math.floor(r() * 6);
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const rad = 28 + r() * 18;
    pts.push([50 + Math.cos(a) * rad, 52 + Math.sin(a) * rad * 0.9]);
  }
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';
  const eyes = 1 + Math.floor(r() * 3);
  let eyeSvg = '';
  for (let i = 0; i < eyes; i += 1) {
    const ex = 36 + (i + 0.5) * (28 / eyes);
    const ey = 44 + r() * 8;
    const er = 3 + r() * 3;
    eyeSvg += `<circle cx="${ex}" cy="${ey}" r="${er}" fill="#fff"/><circle cx="${ex + 1}" cy="${ey + 1}" r="${er / 2}" fill="#111"/>`;
  }
  const spikes = Math.floor(r() * 5);
  let spikeSvg = '';
  for (let i = 0; i < spikes; i += 1) {
    const x = 30 + r() * 40;
    spikeSvg += `<path d="M${x},30 l6,-18 l6,18 z" fill="${dark}"/>`;
  }
  const crown = boss ? `<path d="M30,22 l8,10 l12,-16 l12,16 l8,-10 l-4,18 h-32 z" fill="${glow}" stroke="${dark}" stroke-width="1.5"/>` : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs><radialGradient id="g${hue}" cx="40%" cy="35%"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset="1" stop-color="${body}" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="50" cy="90" rx="30" ry="6" fill="#000" opacity=".35"/>
${spikeSvg}
<path d="${path}" fill="${body}" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="${path}" fill="url(#g${hue})"/>
${eyeSvg}${crown}
</svg>`;
}

export function heroSvg(index) {
  const hue = Math.round((index * 360) / 16);
  const cloth = `hsl(${hue} 60% 45%)`;
  const dark = `hsl(${hue} 60% 25%)`;
  const skin = '#f1c9a5';
  const hair = `hsl(${(hue + 180) % 360} 40% 30%)`;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="32" cy="58" rx="16" ry="4" fill="#000" opacity=".3"/>
<rect x="22" y="30" width="20" height="22" rx="5" fill="${cloth}" stroke="${dark}" stroke-width="2"/>
<rect x="18" y="32" width="6" height="14" rx="3" fill="${cloth}" stroke="${dark}" stroke-width="2"/>
<rect x="40" y="32" width="6" height="14" rx="3" fill="${cloth}" stroke="${dark}" stroke-width="2"/>
<circle cx="32" cy="20" r="11" fill="${skin}" stroke="${dark}" stroke-width="2"/>
<path d="M21,18 q11,-14 22,0 v-4 q-11,-10 -22,0 z" fill="${hair}"/>
<circle cx="28" cy="21" r="1.6" fill="#222"/><circle cx="36" cy="21" r="1.6" fill="#222"/>
<rect x="24" y="52" width="6" height="8" fill="${dark}"/><rect x="34" y="52" width="6" height="8" fill="${dark}"/>
</svg>`;
}

/** Colours per echo affinity: body, dark outline, glow. */
const AFFINITY_HUES = {
  fire: { body: 'hsl(22 92% 55%)', dark: 'hsl(8 80% 28%)', glow: 'hsl(45 100% 65%)' },
  water: { body: 'hsl(205 85% 55%)', dark: 'hsl(215 70% 25%)', glow: 'hsl(185 100% 75%)' },
  earth: { body: 'hsl(35 45% 45%)', dark: 'hsl(25 45% 20%)', glow: 'hsl(90 55% 60%)' },
  wind: { body: 'hsl(150 60% 55%)', dark: 'hsl(160 55% 22%)', glow: 'hsl(170 90% 80%)' },
  light: { body: 'hsl(48 95% 65%)', dark: 'hsl(38 70% 35%)', glow: 'hsl(55 100% 90%)' },
  dark: { body: 'hsl(272 50% 45%)', dark: 'hsl(275 55% 18%)', glow: 'hsl(300 80% 70%)' },
};
/** Glow colour of an echo as [hue 0..360, saturation 0..1, lightness 0..1] (map sparkles). */
export function echoGlowHsl(echo) {
  if (ECHO_ART_GLOW[echo?.id]) return ECHO_ART_GLOW[echo.id];
  const c = AFFINITY_HUES[echo?.affinity] ?? AFFINITY_HUES.fire;
  const [h, sat, l] = c.glow.match(/[\d.]+/g).map(Number);
  return [h, sat / 100, l / 100];
}

const RARITY_AURA = { common: 0.15, rare: 0.3, epic: 0.45, legendary: 0.65 };

/**
 * Ancestral Echo spirit: a wisp with a flowing tail, coloured by affinity, with
 * per-echo features (horns, orbiting orbs, eye count) and an aura that grows with rarity.
 * `pose` (optional, for animation frames): `t` 0..1 is the phase of the tail wag (a wave:
 * the tip lags behind the middle) and of the orbs' orbit; `blink` closes the eyes.
 * Without a pose the drawing is the still portrait.
 */
export function echoSvg(echo, pose = null) {
  // the rare echoes are hand-drawn (echoArt.js); the commons are these procedural ghosts
  if (ECHO_ART[echo?.id]) return ECHO_ART[echo.id](pose);
  const r = rnd(hash(`echo:${echo?.id ?? 'x'}`));
  const c = AFFINITY_HUES[echo?.affinity] ?? AFFINITY_HUES.fire;
  const aura = RARITY_AURA[echo?.rarity] ?? 0.2;
  const id = (echo?.id ?? 'x').replace(/[^a-z0-9]/gi, '');
  const sway = (r() - 0.5) * 16;
  const phase = pose ? pose.t * Math.PI * 2 : 0;
  const mid = sway + (pose ? Math.sin(phase) * 4 : 0);
  const tip = sway + (pose ? Math.sin(phase - 0.9) * 10 : 0);
  const body = `M50,14 C${72 + r() * 8},16 ${80 + r() * 6},${40 + r() * 8} 72,60 C66,72 ${60 + mid},82 ${52 + tip},94 C${46 + tip},84 40,76 30,66 C${16 - r() * 6},50 ${24 - r() * 6},16 50,14 Z`;
  const horns = r() < 0.5
    ? `<path d="M36,22 q-10,-12 -6,-20 q4,10 12,14 z" fill="${c.dark}"/><path d="M64,22 q10,-12 6,-20 q-4,10 -12,14 z" fill="${c.dark}"/>`
    : '';
  const eyes = 1 + Math.floor(r() * 3);
  let eyeSvg = '';
  for (let i = 0; i < eyes; i += 1) {
    const ex = 50 + (i - (eyes - 1) / 2) * 11;
    eyeSvg += pose?.blink
      ? `<rect x="${ex - 3.6}" y="38" width="7.2" height="1.6" rx="0.8" fill="${c.glow}"/>`
      : `<ellipse cx="${ex}" cy="38" rx="3.6" ry="5" fill="${c.glow}"/><ellipse cx="${ex}" cy="39" rx="1.6" ry="2.4" fill="#fff"/>`;
  }
  const orbs = Math.floor(r() * 3) + (echo?.rarity === 'legendary' ? 2 : 0);
  let orbSvg = '';
  for (let i = 0; i < orbs; i += 1) {
    const a = (i / Math.max(1, orbs)) * Math.PI * 2 + r() + phase;
    orbSvg += `<circle cx="${(50 + Math.cos(a) * 40).toFixed(1)}" cy="${(48 + Math.sin(a) * 30).toFixed(1)}" r="${(3 + r() * 2).toFixed(1)}" fill="${c.glow}" opacity=".85"/>`;
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="ea${id}" cx="50%" cy="45%"><stop offset="0" stop-color="${c.glow}" stop-opacity="${aura}"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="eb${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.body}" stop-opacity=".95"/><stop offset="1" stop-color="${c.body}" stop-opacity=".15"/></linearGradient>
</defs>
<circle cx="50" cy="48" r="48" fill="url(#ea${id})"/>
${horns}
<path d="${body}" fill="url(#eb${id})" stroke="${c.dark}" stroke-width="2" stroke-linejoin="round"/>
<path d="M42,26 q8,-6 16,0" stroke="${c.glow}" stroke-width="2" fill="none" opacity=".7"/>
${eyeSvg}${orbSvg}
</svg>`;
}
