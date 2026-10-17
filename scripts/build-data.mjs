/**
 * Builds the game's data files (src/data/*.json) from the reverse-engineering
 * extractions in reverse/extracted/. Numbers (stats, prices, weights, levels,
 * layouts of area grids) are kept as balancing reference; every name and
 * description is generated here so the shipped game carries no original text.
 *
 * Run: node scripts/build-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (p, data) => {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
  fs.writeFileSync(path.join(root, p), JSON.stringify(data));
  console.log('wrote', p, `${(fs.statSync(path.join(root, p)).size / 1024).toFixed(1)} KB`);
};

const maps = read('reverse/extracted/maps.json');
const enemies = read('reverse/extracted/enemies.json');
const items = read('reverse/extracted/items.json');

/* ------------------------------------------------------------------ naming */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick(list, seed) {
  return list[seed % list.length];
}

const CREATURES = ['Mote', 'Sprout', 'Beetle', 'Toad', 'Wisp', 'Hound', 'Crawler', 'Lurker', 'Shade', 'Stalker', 'Golem', 'Wyrm', 'Drake', 'Warden', 'Revenant', 'Titan', 'Colossus', 'Seraph', 'Leviathan', 'Harbinger', 'Mimic', 'Imp', 'Gremlin', 'Spore', 'Jelly', 'Raptor', 'Basilisk', 'Chimera', 'Hydra', 'Phantom', 'Juggernaut', 'Behemoth', 'Oracle', 'Tyrant', 'Devourer', 'Sentinel', 'Spectre', 'Marauder', 'Reaver', 'Fiend', 'Ogre', 'Gargoyle', 'Wraith', 'Lich', 'Automaton', 'Djinn', 'Kraken', 'Ravager', 'Archon', 'Paragon'];
const ADJ_BY_TIER = [
  ['Pale', 'Mossy', 'Dusty', 'Timid', 'Hollow', 'Muddy', 'Dim', 'Lesser'],
  ['Amber', 'Rusted', 'Thorned', 'Bristle', 'Feral', 'Ashen', 'Brackish', 'Sallow'],
  ['Crimson', 'Ironclad', 'Howling', 'Venom', 'Gloom', 'Ember', 'Frost', 'Cinder'],
  ['Obsidian', 'Storm', 'Blight', 'Molten', 'Abyssal', 'Hallowed', 'Dread', 'Grave'],
  ['Eclipse', 'Void', 'Astral', 'Primordial', 'Eternal', 'Celestial', 'Omega', 'Sovereign'],
];
function tierOf(level) {
  if (level < 300) return 0;
  if (level < 3000) return 1;
  if (level < 20000) return 2;
  if (level < 100000) return 3;
  return 4;
}
const usedNames = new Set();
function uniqueName(base) {
  let name = base;
  let n = 2;
  while (usedNames.has(name)) {
    name = `${base} ${['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 2] ?? n}`;
    n += 1;
  }
  usedNames.add(name);
  return name;
}
function enemyName(sprite, level) {
  const h = hash(sprite);
  const adj = pick(ADJ_BY_TIER[tierOf(level)], h);
  const noun = pick(CREATURES, h >>> 8);
  return uniqueName(`${adj} ${noun}`);
}

const BOSS_TITLES = ['Warden', 'Keeper', 'Matriarch', 'Patriarch', 'Herald', 'Overlord', 'Monarch', 'Prime', 'Apex', 'Eidolon', 'Regent', 'Arbiter', 'Sovereign', 'Avatar', 'Idol', 'Judge'];
const BOSS_ROOTS = ['Vorr', 'Ashka', 'Mol', 'Threx', 'Ilun', 'Gorrath', 'Seln', 'Kaz', 'Umbra', 'Nyx', 'Ferrum', 'Ouro', 'Thal', 'Brann', 'Vael', 'Zeph', 'Korm', 'Lysa', 'Drav', 'Ithil', 'Quor', 'Mael', 'Ravn', 'Solu', 'Tarn', 'Ygg', 'Cael', 'Orm', 'Pyre', 'Wyn'];
function bossName(sprite) {
  const h = hash(`boss:${sprite}`);
  return uniqueName(`${pick(BOSS_ROOTS, h)}${pick(['a', 'os', 'ith', 'ar', 'eth', 'ion', 'us', 'ael'], h >>> 5)} the ${pick(BOSS_TITLES, h >>> 10)}`);
}

/* ------------------------------------------------------------------ items */
const WEAPON_FORMS = ['Shiv', 'Knife', 'Blade', 'Sword', 'Sabre', 'Cleaver', 'Falchion', 'Claymore', 'Glaive', 'Halberd', 'Greatsword', 'Warblade', 'Zweihander', 'Edge', 'Fang', 'Talon'];
const ARMOR_FORMS = ['Tunic', 'Vest', 'Jerkin', 'Hauberk', 'Brigandine', 'Cuirass', 'Harness', 'Mail', 'Plate', 'Aegis', 'Bulwark', 'Carapace'];
const MATERIALS = ['Flint', 'Copper', 'Bronze', 'Iron', 'Steel', 'Silver', 'Cobalt', 'Mithral', 'Adamant', 'Obsidian', 'Starsteel', 'Voidglass', 'Sunforged', 'Moonlit', 'Dragonbone', 'Astral', 'Eternal', 'Primal', 'Aether', 'Omega'];
// rank (0..1) by strength = flat * (1 + percent/100), keyed by item id (table order != id order)
function rankByValue(list) {
  const sorted = list.map((x) => ({ id: x.id, v: x.baset1_flat * (1 + x.baset2_percent / 100) })).sort((a, b) => a.v - b.v);
  const rank = {};
  sorted.forEach((s, idx) => {
    rank[s.id] = idx / Math.max(1, list.length - 1);
  });
  return rank;
}
function gearName(forms, idx, rank, seed, plusName) {
  const m = MATERIALS[Math.min(MATERIALS.length - 1, Math.floor(rank * MATERIALS.length))];
  const f = pick(forms, hash(`${seed}:${idx}`));
  return uniqueName(`${m} ${f}${plusName ? ' +' : ''}`);
}

const ACC_NAMES = {
  30: ['Vitality Gem', 'HP increases by {v}'],
  31: ['Might Gem', 'ATK increases by {v}'],
  32: ['Guard Gem', 'DEF increases by {v}'],
  33: ['Swift Gem', 'AGI increases by {v}'],
  34: ['Fortune Gem', 'LUCK increases by {v}'],
  35: ['Gambler Gem', 'A gamble: big ATK/DEF/AGI bonus that may fail to activate in a battle'],
  40: ['Prism Gem', 'All stats increase by {v}'],
  41: ['Trinity Gem', 'ATK, DEF and AGI increase by {v}'],
  42: ['Quartet Gem', 'HP, ATK, DEF and AGI increase by {v}'],
  60: ['Scholar Band', 'EXP gained increases by {v}%'],
  700: ['Growth Crystal', 'One extra stat point per level up'],
  701: ['Growth Crystal+', 'Two extra stat points per level up'],
  200: ['Keen Ring', 'Critical rate +8%'],
  210: ['Brutal Ring', 'Critical damage +20%'],
  310: ['Opening Ring', 'The first hit of a battle is always critical'],
  311: ['Opening Ring II', 'The first two hits of a battle are always critical'],
  312: ['Opening Ring III', 'The first three hits of a battle are always critical'],
  250: ['Cadence Ring', 'Combo rate +9%'],
  1201: ['Leech Pendant', 'Recover a little HP on every hit'],
  1200: ['Leech Pendant+', 'Recover HP on every hit'],
  1210: ['Last Breath Pendant', 'Chance to survive a lethal blow with 1 HP'],
  1211: ['Last Breath Pendant+', 'High chance to survive a lethal blow with 1 HP'],
  10: ['Quiet Step Charm', 'Encounter gauge fills 15% slower'],
  12: ['Loud Step Charm', 'Encounter gauge fills 20% faster'],
  14: ['Beacon Charm', 'Lets you call an encounter at any time'],
  100: ['Stride Boots', 'Move speed +{v}%'],
  500: ['Endurance Token', 'Battle Points +{v} per run'],
  820: ['Hero Sigil', 'Character ability bonus +{v}%'],
};
const accCounter = {};
function accessoryName(acc) {
  const spec = ACC_NAMES[acc.effect_code];
  const hard = acc.hardmode ? ' (H)' : '';
  if (!spec) return { name: uniqueName(`Curio ${acc.id}${hard}`), description: '' };
  accCounter[acc.effect_code] = (accCounter[acc.effect_code] ?? 0) + 1;
  const n = accCounter[acc.effect_code];
  const suffix = n > 1 ? ` ${['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n - 1] ?? n}` : '';
  return { name: uniqueName(`${spec[0]}${suffix}${hard}`), description: spec[1].replace('{v}', String(acc.value)) };
}

const weaponRank = rankByValue(items.weapons);
const armorRank = rankByValue(items.armors);
const weapons = items.weapons.map((w) => ({
  id: w.id,
  type: 0,
  name: gearName(WEAPON_FORMS, w.id, weaponRank[w.id], 'w', /\+1$/.test(w.name_en)),
  price: w.price,
  flat: w.baset1_flat,
  percent: w.baset2_percent,
  hard: w.hardmode ? 1 : 0,
  rank: 0,
  icon: [w.icon_col ?? 0, w.icon_row ?? 0],
}));
const armors = items.armors.map((a) => ({
  id: a.id,
  type: 1,
  name: gearName(ARMOR_FORMS, a.id, armorRank[a.id], 'a', /\+1$/.test(a.name_en)),
  price: a.price,
  flat: a.baset1_flat,
  percent: a.baset2_percent,
  hard: a.hardmode ? 1 : 0,
  rank: 0,
  icon: [a.icon_col ?? 0, a.icon_row ?? 0],
}));
const accessories = items.accessories.map((a) => {
  const { name, description } = accessoryName(a);
  return {
    id: a.id,
    type: 2,
    name,
    description,
    price: a.price,
    effect: a.effect_code,
    value: a.value,
    rank: a.rank ?? 0,
    hard: a.hardmode ? 1 : 0,
    icon: [a.icon_col ?? 0, a.icon_row ?? 0],
  };
});
// ids must be dense
const dense = (list) => {
  const out = [];
  for (const it of list) out[it.id] = it;
  for (let i = 0; i < out.length; i += 1) if (!out[i]) throw new Error(`missing item id ${i}`);
  return out;
};
write('src/data/items.json', { weapons: dense(weapons), armors: dense(armors), accessories: dense(accessories) });

/* ------------------------------------------------------------------ enemies */
const spriteNames = {};
const areaLevelBySprite = {};
for (const e of enemies.enemies) {
  if (!e.sprite || e.sprite.startsWith('BitmapData')) continue;
  const lv = Math.min(...(e.area_levels ?? [0]));
  if (!(e.sprite in areaLevelBySprite) || areaLevelBySprite[e.sprite] > lv) areaLevelBySprite[e.sprite] = lv;
}
for (const s of Object.keys(areaLevelBySprite).sort()) spriteNames[s] = enemyName(s, areaLevelBySprite[s]);

function convDrops(d) {
  if (!d) return [null, null, null];
  const out = [null, null, null];
  for (let i = 0; i < 3; i += 1) {
    const t = d[i];
    if (t) out[i] = { type: t[0], itemId: t[1], chance: t[2] };
  }
  return out;
}
const pools = {};
for (const [key, list] of Object.entries(maps.enemyPools)) {
  pools[key] = list.map((e) => {
    const base = {
      sprite: e.sprite,
      name: spriteNames[e.sprite] ?? uniqueName(`Nameless ${e.sprite}`),
      scale: e.scale ?? 1,
      expParam: e.expParam ?? 0,
      gold: e.gold ?? 0,
      skills: e.skills ?? [0],
      drops: convDrops(e.drops),
      hardDrops: e.hardDrops ? convDrops(e.hardDrops) : null,
    };
    if (e.hpMul != null) return { ...base, hpMul: e.hpMul, atkMul: e.atkMul };
    return { ...base, hp: e.hp, atk: e.atk };
  });
}
write('src/data/enemies.json', { pools });

/* ------------------------------------------------------------------ bosses */
const bossNames = {};
function nameBoss(sprite) {
  if (!bossNames[sprite]) bossNames[sprite] = bossName(sprite);
  return bossNames[sprite];
}
const mapBosses = {};
const eventBosses = {};
for (const b of enemies.bosses) {
  const line = {
    sprite: b.sprite,
    name: nameBoss(b.sprite),
    scale: b.scale ?? 1,
    hp: b.hp,
    atk: b.atk,
    expParam: typeof b.p6_expBonus === 'number' ? b.p6_expBonus : 0,
    expScale: b.tekiseiLvBai,
    gold: typeof b.gold === 'number' ? b.gold : 0,
    goldScaled: typeof b.gold !== 'number',
    drops: convDrops(b.drops_normal),
    hardDrops: b.drops_hard ? convDrops(b.drops_hard) : null,
  };
  if (b.kind === 'map_boss') {
    mapBosses[b.boss_id] = { id: b.boss_id, ...line, bpBonus: maps.bossBPOnWin?.[b.boss_id] ?? 0 };
  } else {
    const slot = (eventBosses[b.boss_id] ??= { id: b.boss_id });
    if (b.mode === 'both' || b.mode === 'normal') slot.normal = line;
    if (b.mode === 'both' || b.mode === 'hard') slot.hard = line;
  }
}
for (const eb of Object.values(eventBosses)) {
  if (!eb.normal) eb.normal = eb.hard;
  if (!eb.hard) eb.hard = eb.normal;
}
write('src/data/bosses.json', { mapBosses, eventBosses });

/* ------------------------------------------------------------------ world */
const world = {
  start: { map: 1, x: maps.startState.sX - maps.startState.backSpx, y: maps.startState.sY - maps.startState.backSpy + 0, firstBonus: maps.startState.firstBonus },
  maps: maps.maps.map((m) => ({
    id: m.id,
    w: m.bitmapSize[0],
    h: m.bitmapSize[1],
    grid: { cols: m.areaGrid.cols, rows: m.areaGrid.rows, cells: m.areaGrid.cells },
    neighbours: m.neighbours,
    areas: m.areas.map((a) => ({
      id: a.id,
      level: a.tekiseiLv,
      pool: a.enemyPool,
      weights: a.enemyWeights,
      poolHard: a.enemyPoolHard ?? null,
      weightsHard: a.enemyWeightsHard ?? null,
      expScale: a.tekiseiLvBai,
      baseHp: a.baseHP ?? null,
      baseAtk: a.baseATK ?? null,
      label: a.labelPct,
      bounds: a.bounds?.px ?? null,
    })),
    bosses: (m.bosses ?? []).map((b) => ({ id: b.index, x: b.x, y: b.y, w: b.rect.w, h: b.rect.h, scale: b.scale })),
  })),
};
// map 1 start: original starts at tile (1,2) of map 1 with sprite at (320,480) and scroll (-80,460):
// local pixel = tileCol*400 + sX - backSpx = 400 + 320 + 80 = 800 ; y = 2*400 + 480 - 460 = 820
world.start = { map: 1, x: 800, y: 820, firstBonus: maps.startState.firstBonus };
write('src/data/world.json', world);

/* ------------------------------------------------------------------ characters */
const CHAR_NAMES = ['Rook', 'Sable', 'Ivo', 'Marin', 'Tamsin', 'Odo', 'Wren', 'Lior', 'Bastian', 'Nell', 'Corvin', 'Elka', 'Hollis', 'Petra', 'Dax', 'Yara'];
const characters = CHAR_NAMES.map((name, i) => ({ id: i, name, row: Math.floor(i / 4), col: i % 4, hue: Math.round((i * 360) / 16) }));
write('src/data/characters.json', { characters });

console.log('enemy sprites named:', Object.keys(spriteNames).length, 'bosses named:', Object.keys(bossNames).length);
