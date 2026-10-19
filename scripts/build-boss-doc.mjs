/**
 * Writes docs/chefes-inflation.md: every boss of the game with its numbers.
 *   - the original's map bosses (0..28) and event bosses (32..90), from src/data;
 *   - Surge's own bosses (core/encounters/customBosses.js) and slime kings
 *     (core/encounters/slimeBosses.js), with where the map editor's boss triggers place them
 *     (public/assets/maps/*.json).
 * Run it after any boss change: npm run build:boss-doc
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withCustomBosses, CUSTOM_MAP_BOSSES } from '../src/core/encounters/customBosses.js';
import { slimeDef, SLIME_BOSS_IDS, SLIME_IDS, STANDALONE_SLIMES, SLIME_SIZE } from '../src/core/encounters/slimeBosses.js';
import { parseBossTriggers, parseSlimeTriggers } from '../src/core/world/triggers.js';
import { parseAreaLayer } from '../src/core/world/areaLayer.js';
import { areaAt } from '../src/core/world/world.js';
import { BOSS_ECHO_DROPS } from '../src/core/echoes.js';
import pt from '../src/ui/i18n/pt.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const original = readJson('src/data/bosses.json');
const IT = readJson('src/data/items.json');
const W = readJson('src/data/world.json');
const B = withCustomBosses(original, W.maps);
const maps = W.maps;

const n = (v) => Math.round(v).toLocaleString('pt-BR');
const pct = (c) => `${(c * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const TYPE = ['weapons', 'armors', 'accessories'];
const TYPE_PT = ['Arma', 'Armadura', 'Acessório'];
const item = (d) => {
  const it = IT[TYPE[d.type]].find((x) => x.id === d.itemId);
  return `${it ? it.name : '?'} (${TYPE_PT[d.type]} #${d.itemId}) ${pct(d.chance)}`;
};
const drops = (list) => {
  const l = (list ?? []).filter(Boolean);
  return l.length ? l.map(item).join('<br>') : '—';
};
// echo a map boss drops (echoes.js BOSS_ECHO_DROPS), added to its drops
const echoDrop = (id) => (BOSS_ECHO_DROPS[id] ? `<br>**Eco: ${pt[`echo.name.${BOSS_ECHO_DROPS[id].echo}`] ?? BOSS_ECHO_DROPS[id].echo}** ${pct(BOSS_ECHO_DROPS[id].chance)} (uma vez por conta)` : '');
const bossDrops = (b, list) => {
  const text = drops(list) + echoDrop(b.id);
  return text.startsWith('—<br>') ? text.slice(5) : text;
};
const exp = (b, mul = 1) => (b.expScale === -2 ? n(b.expParam * mul) : `${n(b.expScale)} × EXP do nível${mul > 1 ? ` (×${mul})` : ''}`);

// where each original map boss stands (world.json): map and the area under it
const where = {};
for (const m of maps) {
  for (const b of m.bosses ?? []) {
    const area = areaAt(m, b.x, b.y);
    where[b.id] = { map: m.id, area: m.areas.indexOf(area), level: area?.level };
  }
}

// map editor files: boss and slime triggers, with the level of the area painted under them
const linked = new Set([...fs.readFileSync(path.join(root, 'src/game/mapArt.js'), 'utf8').matchAll(/^\s*(\d+):\s*'/gm)].map((m) => Number(m[1])));
const placed = {}; // 'boss#29' | 'slime#30' -> ['mapa 5 (célula 16,19 · LV 1.350)']
const mapDir = path.join(root, 'public/assets/maps');
for (const file of fs.readdirSync(mapDir).filter((f) => f.endsWith('.json'))) {
  const id = Number(/(\d+)\.json$/.exec(file)?.[1]);
  const base = maps.find((m) => m.id === id);
  if (!base) continue;
  const art = JSON.parse(fs.readFileSync(path.join(mapDir, file), 'utf8'));
  const map = { ...base, ...(parseAreaLayer(art, base, maps) ?? {}) };
  const note = (key, x, y) => {
    const level = areaAt(map, x, y)?.level;
    const col = Math.floor((x / map.w) * art.width);
    const row = Math.floor((y / map.h) * art.height);
    (placed[key] ??= []).push(`mapa ${id}${linked.has(id) ? '' : ' (arquivo não ligado)'} · célula ${col},${row} · LV ${n(level ?? 0)}`);
  };
  for (const b of parseBossTriggers(art, map, [], { validIds: new Set(Object.keys(B.mapBosses).map(Number)) })) note(`boss#${b.id}`, b.x, b.y);
  for (const s of parseSlimeTriggers(art, map, SLIME_SIZE, { validIds: new Set(SLIME_IDS) })) note(`slime#${s.id}`, s.x, s.y);
}
const placement = (key) => (placed[key] ?? ['não posicionado']).join('<br>');

const POWER = new Set([0, 1, 2, 8, 9, 12, 13, 19, 28]);
const MAP_CH = {
  3: 'continua no mapa 7',
  8: 'aleatório (25% cada): mapa 17, 18, 28 ou 50',
  9: 'mapa 56',
  12: 'mapa 57',
  13: 'mapa 61',
  19: 'mapa 61',
  25: 'mapa 69',
  26: 'mapa 73',
  27: 'mapa 73',
  28: 'fim do jogo (último chefe)',
};
const originalMapBosses = Object.values(original.mapBosses);

const out = [];
const p = (s = '') => out.push(s);
p('# Chefes do Inflation RPG');
p();
p('Todos os chefes do jogo: os do original, **29 chefes de mapa** (ids 0–28, posicionados nos mapas) e **20 chefes de evento** (ids 32–90, que surgem em batalhas de níveis com bônus "???", "！", "!!!" e "!?"), e no fim os **chefes próprios do Surge** (customizados e Slime Kings).');
p();
p('> Gerado por `npm run build:boss-doc` (`scripts/build-boss-doc.mjs`) a partir de `src/data/bosses.json`, `items.json`, `world.json`, `src/core/encounters/customBosses.js`, `slimeBosses.js` e dos triggers dos mapas do editor (`public/assets/maps/`). Não edite à mão: rode o script depois de mexer em qualquer chefe. Regras completas do original em [reverse/enemies.md](reverse/enemies.md), seção 4. Os **nomes** são os do Surge RPG; o **sprite** é o id do original.');
p();
p('## Regras gerais');
p();
p('- **Encontro:** o chefe aparece no mapa sobre um círculo mágico enquanto não foi vencido na partida atual. Encostar nele inicia a batalha (precisa de BP > 0).');
p('- **Custo de BP:** 1 pela batalha + 2 provisórios (4 no difícil). Vencendo, os 2/4 voltam e o chefe ainda dá o **+BP** da tabela. Perdendo ou fugindo, o custo fica (−3 / −5).');
p('- **Drops:** só enquanto aquele chefe ainda não foi vencido na partida. Até 3 sorteios independentes.');
p('- **Modo difícil (chefes de mapa):** HP ×10, ATK ×8,5, ouro ×5, EXP ×24 (×12 do modo, ×2 por ser chefe). Os drops passam a ser os da coluna "Drops (difícil)" quando ela existe.');
p('- **EXP por nível:** os chefes 25–28 não têm EXP fixa: dão `N × EXP de um inimigo do nível da área` onde estão.');
p('- **Nível de base (★):** vencer os chefes 0, 1, 2, 8, 9, 12, 13, 19 e 28 (cada um no normal e no difícil, máx. 18) sobe o nível de base do personagem, que aumenta os bônus de status dos equipamentos.');
p('- O chefe **28** é o último: vencê-lo marca o jogo como zerado.');
p();
p('## Chefes de mapa');
p();
p('"Original": onde fica no Inflation (world.json). "No Surge": onde os triggers do editor o colocam; num mapa sem arte do editor ele fica na posição original, e um mapa com arte só tem os chefes dos seus triggers.');
p();
p('| Id | Nome | Sprite | Original (mapa · área · LV) | No Surge | HP | ATK | EXP | Ouro | +BP | Ao vencer |');
p('|---|---|---|---|---|---|---|---|---|---|---|');
for (const b of originalMapBosses) {
  const w = where[b.id];
  const loc = w ? `${w.map} · área ${w.area} · LV ${n(w.level)}` : '—';
  const surge = placed[`boss#${b.id}`]?.join('<br>') ?? (w && !linked.has(w.map) ? 'como no original' : 'não posicionado');
  p(`| **${b.id}**${POWER.has(b.id) ? ' ★' : ''} | ${b.name} | \`${b.sprite}\` | ${loc} | ${surge} | ${n(b.hp)} | ${n(b.atk)} | ${exp(b)} | ${n(b.gold)} | +${b.bpBonus} | ${MAP_CH[b.id] ?? '—'} |`);
}
p();
p('★ conta para o nível de base do personagem.');
p();
p('### Modo difícil (valores efetivos)');
p();
p('| Id | Nome | HP | ATK | EXP | Ouro |');
p('|---|---|---|---|---|---|');
for (const b of originalMapBosses) p(`| **${b.id}** | ${b.name} | ${n(b.hp * 10)} | ${n(b.atk * 8.5)} | ${exp(b, 24)} | ${n(b.gold * 5)} |`);
p();
p('### Drops dos chefes de mapa');
p();
p('| Id | Nome | Drops (normal) | Drops (difícil) |');
p('|---|---|---|---|');
for (const b of originalMapBosses) p(`| **${b.id}** | ${b.name} | ${bossDrops(b, b.drops)} | ${b.hardDrops ? bossDrops(b, b.hardDrops) : 'iguais ao normal'} |`);
p();
p('## Chefes de evento');
p();
p('Não ficam no mapa: surgem no lugar de um inimigo comum quando o nível atual tem o bônus correspondente. Cada um tem uma ficha própria para o normal e outra para o difícil; no difícil a ficha ainda leva os multiplicadores do modo (HP ×10, ATK ×8,5, ouro ×5, EXP ×12, sem o ×2 de chefe de mapa). As tabelas abaixo mostram os valores efetivos.');
p();
p('| Bônus | Chance | Chefes | Como é escolhido |');
p('|---|---|---|---|');
p('| 9 · "???" | 40% | 32–35 | sorteio uniforme |');
p('| 10 · "???" | 44% | 40–42 | pesos pelo nível da área (até LV 1.000 só o 40; acima, mais chance dos mais fortes) |');
p('| 11 · "???" (ouro) | 35% | 48–53 | pesos pelo nível da área (abaixo de LV 3.000 só 48–50) |');
p('| 12 · "！" | 24% | 60 (normal) / 62 (difícil), ou 61 (isca) | o verdadeiro vem se já foi encontrado antes, ou se você tem armas suficientes (≥ 70% das disponíveis − 4; difícil 85%); senão vem a isca |');
p('| 13 · "!!!" | 26% | 66 (normal) / 68 (difícil), ou 67 (isca) | o verdadeiro vem se já foi encontrado, ou com armas (≥ 40% de n − 8; difícil 70%) ou armaduras (≥ 60% de n − 3; difícil 80%) suficientes |');
p('| 16 · "!?" | 26% | 90 | só no mapa 57 |');
p();
p('- **Iscas 61 e 67:** 1 HP, 1 ATK, 1 EXP, 5.000 de ouro.');
p('- **Vencer 60/62:** leva à **sala branca** (mapa 13); **66/68:** à **sala preta** (mapa 14). O jogador fica lá por 1,5–5,5 batalhas e depois volta ao mapa de onde veio.');
p('- **Vencer 90:** leva ao mapa 58.');
p('- **Ouro dos 40–42:** (antes do ×5 do difícil) cresce com o nível da área `L` (amortecido acima de 7.500, 10.000 e 15.000): 40 = 15.000 + 5L, 41 = 30.000 + 7,5L, 42 = 77.777 + 10L (difícil: 50.000 + 8L, 100.000 + 11L, 200.000 + 14L).');
p();
for (const mode of ['normal', 'hard']) {
  const h = mode === 'hard';
  p(`### ${h ? 'Difícil' : 'Normal'}`);
  p();
  p(h ? 'No difícil, o 62 e o 68 são os verdadeiros; 60 e 66 só aparecem no normal.' : 'No normal, o 60 e o 66 são os verdadeiros; 62 e 68 só aparecem no difícil.');
  p();
  p('| Id | Nome | Sprite | HP | ATK | EXP | Ouro | Drops |');
  p('|---|---|---|---|---|---|---|---|');
  for (const e of Object.values(B.eventBosses)) {
    const b = e[mode];
    const gold = b.goldScaled ? 'pelo nível' : n(b.gold * (h ? 5 : 1));
    p(`| **${e.id}** | ${b.name} | \`${b.sprite}\` | ${n(b.hp * (h ? 10 : 1))} | ${n(b.atk * (h ? 8.5 : 1))} | ${exp(b, h ? 12 : 1)} | ${gold} | ${drops(b.drops)} |`);
  }
  p();
}

p('## Chefes do Surge');
p();
p('Não existem no original. Ficam fora do `world.json`: só aparecem onde um trigger do editor os coloca (nome `boss`, data `{"boss": <id>}` para chefes, `{"boss": "slime#<id>"}` para Slime Kings).');
p();
p('### Chefes customizados');
p();
p('Definidos em `CUSTOM_MAP_BOSSES` (`src/core/encounters/customBosses.js`) só pelo **nível**: HP, ATK, EXP e ouro são interpolados (escala log-log) entre os chefes de mapa originais dos níveis mais próximos (0 em LV 710; 1 e 2 juntos em ~LV 2.100; 3 em LV 5.200; 4–7 em ~LV 12.000; 8 em LV 20.000). Abaixo de LV 710 seguem a curva dos inimigos comuns do original e a tabela de EXP por nível. Contam como chefes de mapa (EXP ×24 no difícil, +BP). Só os marcados com ◆ (`baseLevel: true`) sobem o **nível de base** (o nível da conta que libera fazenda, slots, ecos, modo abissal...), como os 29 originais. Ids: 29–31, depois 200–299 (100–199 são as vitórias no difícil, id + 100).');
p();
p('| Id | Nome | Sprite | LV | HP | ATK | EXP | Ouro | +BP | Drops | Posição (triggers) |');
p('|---|---|---|---|---|---|---|---|---|---|---|');
const customs = Object.keys(CUSTOM_MAP_BOSSES).map((id) => B.mapBosses[id]).sort((a, b) => CUSTOM_MAP_BOSSES[a.id].level - CUSTOM_MAP_BOSSES[b.id].level);
for (const b of customs) {
  p(`| **${b.id}**${CUSTOM_MAP_BOSSES[b.id].baseLevel ? ' ◆' : ''} | ${b.name} | \`${b.sprite}\` | ${n(CUSTOM_MAP_BOSSES[b.id].level)} | ${n(b.hp)} | ${n(b.atk)} | ${exp(b)} | ${n(b.gold)} | +${b.bpBonus} | ${bossDrops(b, b.drops)} | ${placement(`boss#${b.id}`)} |`);
}
p();
p('◆ sobe o nível de base. No difícil: HP ×10, ATK ×8,5, ouro ×5, EXP ×24, com os mesmos drops.');
p();
p('### Slime Kings');
p();
p('Única fonte de SK (+1 por Slime King diferente vencido): o nível dos talentos e o requisito "Slime King" de ecos, fazenda e desbloqueios. Têm 35% do HP, 50% do ATK, 50% do ouro e 25% da EXP do chefe em que se baseiam, não dão drops nem BP e somem até a próxima partida depois de vencidos. Só aparecem onde um trigger `{"boss": "slime#<id>"}` os coloca (nada nasce sozinho ao lado dos chefes). Os de `SLIME_BOSS_IDS` (0–9) se baseiam no chefe de mapa de mesmo id; os de `STANDALONE_SLIMES` são feitos para um nível (base: um chefe balanceado para ele, como os customizados).');
p();
p('| Id | Nome | Base | HP | ATK | EXP | Ouro | SK | Posição |');
p('|---|---|---|---|---|---|---|---|---|');
for (const id of SLIME_BOSS_IDS) {
  const s = slimeDef(B, id, null);
  p(`| **${id}** | ${s.name} | chefe ${id} (${B.mapBosses[id].name}) | ${n(s.hp)} | ${n(s.atk)} | ${exp(s)} | ${n(s.gold)} | ${s.talentPoints} | ${placement(`slime#${id}`)} |`);
}
for (const [id, def] of Object.entries(STANDALONE_SLIMES)) {
  const s = slimeDef(B, Number(id), null);
  p(`| **${id}** | ${s.name} | LV ${n(def.level)} | ${n(s.hp)} | ${n(s.atk)} | ${exp(s)} | ${n(s.gold)} | ${s.talentPoints} | ${placement(`slime#${id}`)} |`);
}
p();

fs.writeFileSync(path.join(root, 'docs/chefes-inflation.md'), out.join('\n'));
console.log('docs/chefes-inflation.md written');
