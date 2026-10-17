/**
 * Pixel-art accessory sprites (16x16), one per catalog accessory, from its name:
 * the family picks the shape (gem, ring, band, pendant, feather, bell, lantern, boots,
 * token, crystal, sigil), the stat or theme the colours, and the tier (II..VII) changes the
 * piece itself (gem cut and setting, extra ring stones, band inlays, token marks, wings);
 * "+" adds a glow. Templates use palette letters:
 *   k outline · a/b/c main colour (light/mid/dark) · w white glint
 *   g/G gold (light/dark) · s/S silver (light/dark) · . transparent
 */
export const ACC_SIZE = 16;

const GEM_CUTS = [
  [
    '................',
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '....kwaaabbk....',
    '...kwaabbbbbk...',
    '...kaabbbbbck...',
    '...kabbbbbcck...',
    '...kbbbbbccck...',
    '....kbbbccck....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '......kkkk......',
    '.....kwaabk.....',
    '....kwaabbbk....',
    '....kaabbbbk....',
    '...kaabbbbbck...',
    '...kabbbbbcck...',
    '...kbbbbbccck...',
    '...kbbbbcccck...',
    '....kbbbccck....',
    '....kbbcccck....',
    '.....kbccck.....',
    '......kkkk......',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '....kkkkkkkk....',
    '...kwaaaaaabk...',
    '..kwaaaabbbbck..',
    '..kaaawbbbbbck..',
    '..kaabbbbbbcck..',
    '..kabbbbbbccck..',
    '..kbbbbbbcccck..',
    '...kbbbbcccck...',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '....kkkkkkkk....',
    '...kwwaaaabbk...',
    '..kwaaaabbbbck..',
    '.kkkkkkkkkkkkkk.',
    '.kaabbbbbbbbcck.',
    '..kabbbbbbbcck..',
    '...kbbbbbbcck...',
    '....kbbbbcck....',
    '.....kbbcck.....',
    '......kcck......',
    '.......kk.......',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '......gggg......',
    '....ggkkkkgg....',
    '...gkwaaabbkg...',
    '..gkwaabbbbbkg..',
    '..gkaabbbbbckg..',
    '..gkabbbbbcckg..',
    '..gkbbbbbccckg..',
    '...gkbbbccckg...',
    '....ggkkkkgg....',
    '......GGGG......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '.............w..',
    '....kkkkkkkk.ww.',
    '...kwwaaaabbk...',
    '..kwaaaabbbbck..',
    '.kgggggggggggGk.',
    '.kaabbbbbbbbcck.',
    '..kabbbbbbbcck..',
    '...kbbbbbbcck...',
    '....kbbbbcck....',
    '.....kbbcck.....',
    '..w...kcck......',
    '.www...kk.......',
    '..w.............',
    '................',
    '................',
    '................',
  ],
  [
    '...g...g...g....',
    '...gg.ggg.gg....',
    '...ggggggggg....',
    '...GGGGGGGGG....',
    '..kkkkkkkkkkk...',
    '.kwwaaaaabbbck..',
    '.kaaabbbbbbcck..',
    '..kabbbbbbcck...',
    '...kbbbbbcck....',
    '....kbbbcck.....',
    '.....kbcck......',
    '......kck.......',
    '.......k........',
    '................',
    '................',
    '................',
  ],
];

const TEMPLATES = {
  ring: [
    '................',
    '................',
    '......kkkk......',
    '.....kwaabk.....',
    '.....kabbck.....',
    '....kkkbbkkk....',
    '...kggkkkkGGk...',
    '..kgGk....kGGk..',
    '..kgk......kGk..',
    '..kgk......kGk..',
    '..kgk......kGk..',
    '..kgGk....kGGk..',
    '...kgGkkkkGGk...',
    '....kkGGGGkk....',
    '......kkkk......',
    '................',
  ],
  band: [
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '...kssssssssk...',
    '..ksSkkkkkkSsk..',
    '..ksk......ksk..',
    '.ksSk......kSsk.',
    '.ksSk......kSsk.',
    '.ksSk......kSsk.',
    '..ksk......ksk..',
    '..ksSkkkkkkSsk..',
    '...kSSSSSSSSk...',
    '....kkkkkkkk....',
    '................',
    '................',
  ],
  pendant: [
    '..s..........s..',
    '...s........s...',
    '....s......s....',
    '.....s....s.....',
    '......kggk......',
    '......kgGk......',
    '.....kkkkkk.....',
    '....kwaabbk.....',
    '...kwaabbbck....',
    '...kaabbbbck....',
    '...kabbbbcck....',
    '....kbbbcck.....',
    '.....kbcck......',
    '......kck.......',
    '.......k........',
    '................',
  ],
  feather: [
    '............kk..',
    '..........kkaak.',
    '.........kaabbk.',
    '........kaabbk..',
    '.......kaabbk...',
    '......kaabbk....',
    '.....kaabbk.....',
    '....kaabbk......',
    '...kaabbk.......',
    '...kabbk........',
    '..ksbbk.........',
    '.ks.kk..........',
    'ks..............',
    '................',
    '................',
    '................',
  ],
  bell: [
    '................',
    '.......kk.......',
    '......kGGk......',
    '.....kkggkk.....',
    '....kgwgggGk....',
    '....kgggggGk....',
    '...kgwgggggGk...',
    '...kggggggGGk...',
    '...kggggggGGk...',
    '..kgggggggGGGk..',
    '..kkkkkkkkkkkk..',
    '......kaak......',
    '.......kk.......',
    '................',
    '................',
    '................',
  ],
  lantern: [
    '.......kk.......',
    '......k..k......',
    '....kkkkkkkk....',
    '....kGGGGGGk....',
    '....kkkkkkkk....',
    '....ksk..ksk....',
    '....ks.aa.sk....',
    '....ks.abask....',
    '....ksaabbsk....',
    '....ksabbcsk....',
    '....ksk..ksk....',
    '....kkkkkkkk....',
    '....kGGGGGGk....',
    '.....kkkkkk.....',
    '................',
    '................',
  ],
  boots: [
    '................',
    '.....kkkkk......',
    '.....kabbk......',
    '.....kabbk......',
    '.....kgggk......',
    '.....kabbk......',
    '.....kabbk......',
    '.....kabbkkkk...',
    '....kaabbbbbbk..',
    '....kabbbbbbbck.',
    '....kccccccccck.',
    '....kkkkkkkkkkk.',
    '................',
    '................',
    '................',
    '................',
  ],
  token: [
    '................',
    '.....kkkkkk.....',
    '...kkgggggGkk...',
    '..kgggwwgggGGk..',
    '..kggwggggggGk..',
    '.kggggkkkkggGGk.',
    '.kgggkaaaakgGGk.',
    '.kgggkabbbkgGGk.',
    '.kgggkbbbbkgGGk.',
    '.kggggkkkkgGGGk.',
    '..kgggggggGGGk..',
    '..kGgggggGGGGk..',
    '...kkGGGGGGkk...',
    '.....kkkkkk.....',
    '................',
    '................',
  ],
  crystal: [
    '................',
    '.........k......',
    '........kak.....',
    '.......kaabk....',
    '..k....kabbk....',
    '.kak...kabbck...',
    '.kabk.kaabbck...',
    '.kabbkkabbbck...',
    '.kabbckabbcck.k.',
    '..kbcckabbcckkak',
    '..kbcckbbccckabk',
    '...kkkkkkkkkkkk.',
    '................',
    '................',
    '................',
    '................',
  ],
  sigil: [
    '....kkkkkkkk....',
    '...kggggggggk...',
    '..kgaaaaaaaaGk..',
    '..kgaaawaaaaGk..',
    '..kgaawwwaaaGk..',
    '..kgawwwwwaaGk..',
    '..kgaaawaaaaGk..',
    '..kgaawawaaaGk..',
    '...kgaaaaaaGk...',
    '....kgaaaaGk....',
    '.....kgaaGk.....',
    '......kggk......',
    '.......kk.......',
    '................',
    '................',
    '................',
  ],
};

/** Main colour (light, mid, dark) per stat / theme word. */
const COLOURS = {
  Vitality: ['#ff9a9a', '#e8384a', '#8f1424'],
  Might: ['#ffc58a', '#f07a24', '#9a3c0e'],
  Guard: ['#9ec8ff', '#3f7fe0', '#22488f'],
  Swift: ['#b6f5a8', '#3fbf5a', '#1d6b2c'],
  Fortune: ['#fff1a0', '#f2c230', '#9a6f0a'],
  Prism: ['#ffffff', '#f0b8ff', '#7fc8ff'],
  Trinity: ['#ffe0a0', '#3fc0b0', '#2a4f9a'],
  Quartet: ['#ffd0f0', '#e04aa8', '#7a1a6a'],
  Gambler: ['#e8c8ff', '#9a4ae0', '#4a1a7a'],
  Scholar: ['#bfe6ff', '#4aa8e8', '#1f5a8f'],
  Keen: ['#ffffff', '#c8d8f0', '#7a8aa8'],
  Brutal: ['#ff9a8a', '#d83020', '#7a120a'],
  Opening: ['#fff6b0', '#ffd040', '#b8800a'],
  Cadence: ['#b0fff0', '#30d0c0', '#0f7a70'],
  Leech: ['#ff8a9a', '#c8102e', '#6a0614'],
  'Last Breath': ['#ffffff', '#e8eef8', '#9aa8c0'],
  Quiet: ['#e8f4ff', '#a8c8f0', '#5a7aa8'],
  Loud: ['#fff1a0', '#f2c230', '#9a6f0a'],
  Beacon: ['#fff4a0', '#ff9a2a', '#c83a10'],
  Stride: ['#d8a878', '#9a6438', '#5a3418'],
  Endurance: ['#ffc0c0', '#e04a4a', '#8a1a1a'],
  Growth: ['#c8ff9a', '#5ad04a', '#1f7a2a'],
  Hero: ['#9ec8ff', '#2f6fe0', '#1a3a8a'],
};
const FAMILY = {
  Gem: 'gem', Band: 'band', Crystal: 'crystal', Ring: 'ring', Pendant: 'pendant', Boots: 'boots', Token: 'token', Sigil: 'sigil',
};
// charms: the step charms are a feather (quiet) or a bell (loud); the beacon is a lantern
const CHARM = { Quiet: 'feather', Loud: 'bell', Beacon: 'lantern' };
const ROMAN = { II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };
const FIXED = { k: '#14161f', w: '#ffffff', g: '#ffd76a', G: '#b8860b', s: '#d8dee8', S: '#8a94a6' };

/** Shape, colour theme, tier and glow parsed from an accessory name. */
export function accessoryLook(name) {
  const clean = String(name ?? '').replace(/\(H\)/g, ' ').replace(/[+]/g, ' + ');
  const words = clean.split(/\s+/).filter(Boolean);
  const tier = words.map((w) => ROMAN[w]).find(Boolean) ?? 1;
  const plus = words.includes('+');
  const theme = Object.keys(COLOURS).find((k) => clean.includes(`${k} `) || clean.endsWith(k)) ?? null;
  let shape = null;
  if (words.includes('Charm')) shape = CHARM[theme] ?? 'feather';
  else shape = FAMILY[words.find((w) => FAMILY[w])] ?? null;
  return { theme, shape, tier, plus };
}

/** 16x16 grid of colours (null = transparent) for an accessory name. Deterministic. */
export function accessoryGrid(name) {
  const look = accessoryLook(name);
  const main = COLOURS[look.theme] ?? COLOURS.Keen;
  const pal = { ...FIXED, a: main[0], b: main[1], c: main[2] };
  const t = look.tier;
  const template = look.shape === 'gem' ? GEM_CUTS[Math.min(GEM_CUTS.length, t) - 1] : TEMPLATES[look.shape] ?? TEMPLATES.ring;
  const grid = template.map((row) => [...row].map((ch) => (ch === '.' ? null : pal[ch] ?? null)));
  const put = (x, y, c) => { if (grid[y] && x >= 0 && x < ACC_SIZE) grid[y][x] = c; };

  // tier details beyond the gem cuts
  if (look.shape === 'ring' && t >= 2) {
    // side stones (2 px each), a second pair lower down from tier III
    for (const [x, y] of [[2, 8], [3, 8], [12, 8], [13, 8]]) put(x, y, main[1]);
    if (t >= 3) for (const [x, y] of [[2, 10], [3, 10], [12, 10], [13, 10]]) put(x, y, main[0]);
  }
  if (look.shape === 'band') {
    // inlaid stones round the band, one per tier (top, bottom, then the sides)
    const spots = [[[7, 4], [8, 4]], [[7, 12], [8, 12]], [[1, 8], [1, 9]], [[14, 8], [14, 9]], [[4, 4], [11, 4]]];
    for (let i = 0; i < Math.min(5, t); i += 1) for (const [x, y] of spots[i]) put(x, y, i % 2 ? main[0] : main[1]);
  }
  if (look.shape === 'token') {
    // marks around the rim, one per tier
    const marks = [[3, 7], [12, 7], [7, 12], [8, 2]];
    for (let i = 0; i < Math.min(4, t); i += 1) put(marks[i][0], marks[i][1], '#ffffff');
  }
  if (look.shape === 'boots' && t >= 2) {
    // winged boots
    put(10, 2, '#ffffff'); put(11, 2, '#ffffff'); put(11, 3, '#ffffff'); put(12, 3, '#ffffff'); put(10, 3, '#d8dee8'); put(11, 4, '#d8dee8');
  }
  if (look.shape === 'gem' && look.theme === 'Gambler') {
    // dice pips on the gamble gems
    put(6, 7, '#ffffff'); put(9, 9, '#ffffff'); if (t >= 2) put(7, 8, '#ffffff'); if (t >= 3) put(10, 7, '#ffffff');
  }
  if (look.shape === 'gem' && (look.theme === 'Prism' || look.theme === 'Trinity' || look.theme === 'Quartet')) {
    // multi-colour facets
    const extra = { Prism: ['#7fffd0', '#ffd76a', '#ff8ad8'], Trinity: ['#ff9a3d', '#3f7fe0'], Quartet: ['#e8384a', '#3fbf5a', '#3f7fe0'] }[look.theme];
    const spots = [[6, 8], [8, 7], [7, 9]];
    extra.forEach((c, i) => { const [x, y] = spots[i]; if (grid[y]?.[x] && grid[y][x] !== FIXED.k) grid[y][x] = c; });
  }
  // "+" (and the top gems): a soft glow ring outside the outline
  if (look.plus || (look.shape === 'gem' && t >= 7)) {
    const glow = `${main[0]}99`;
    const snap = grid.map((row) => row.slice());
    for (let y = 0; y < ACC_SIZE; y += 1) {
      for (let x = 0; x < ACC_SIZE; x += 1) {
        if (snap[y][x]) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => snap[y + dy]?.[x + dx] === FIXED.k)) grid[y][x] = glow;
      }
    }
  }
  return grid;
}

/** Horizontal runs of equal colour, for compact SVG rects: [{ x, y, w, fill }]. */
export function accessoryRuns(name) {
  const runs = [];
  accessoryGrid(name).forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === c) end += 1;
      if (c) runs.push({ x, y, w: end - x, fill: c });
      x = end;
    }
  });
  return runs;
}
