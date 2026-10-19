/**
 * Balance simulator: bots play many runs with the game's rules and the numbers are summed up in
 * docs/balanceamento.md (scripts/sim/bot.mjs has how the bot plays).
 *
 * Usage: npm run simulate -- [options]
 *   --players N     bots, each with a fresh profile (default 50)
 *   --runs N        runs in a row per bot, keeping the profile (default 10)
 *   --seed N        first random seed (default 1; same seed = same numbers)
 *   --original      the original world (world.json only, no map editor files)
 *   --danger N      highest area danger the bot fights in (default 1; -2..4)
 *   --boss-rate X   trial win share it needs to fight a boss (default 0.6)
 *   --out FILE      report file (default docs/balanceamento.md)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './sim/world.mjs';
import { createBot, DEFAULT_POLICY } from './sim/bot.mjs';
import { slimeDef } from '../src/core/encounters/slimeBosses.js';
import { CUSTOM_MAP_BOSSES } from '../src/core/encounters/customBosses.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const opts = { players: 50, runs: 10, seed: 1, original: false, danger: DEFAULT_POLICY.maxDanger, bossRate: DEFAULT_POLICY.bossWinRate, out: 'docs/balanceamento.md' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const v = () => argv[++i];
    if (a === '--players') opts.players = Number(v());
    else if (a === '--runs') opts.runs = Number(v());
    else if (a === '--seed') opts.seed = Number(v());
    else if (a === '--original') opts.original = true;
    else if (a === '--danger') opts.danger = Number(v());
    else if (a === '--boss-rate') opts.bossRate = Number(v());
    else if (a === '--out') opts.out = v();
    else throw new Error(`unknown option ${a}`);
  }
  return opts;
}

const n = (v) => (v == null || Number.isNaN(v) ? '—' : Math.round(v).toLocaleString('pt-BR'));
const pct = (v) => (v == null || Number.isNaN(v) ? '—' : `${Math.round(v * 100)}%`);
const quantile = (list, q) => {
  if (!list.length) return null;
  const s = [...list].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const median = (list) => quantile(list, 0.5);
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

function targetName(key, bossData) {
  const [kind, raw] = key.split('#');
  const id = Number(raw);
  if (kind === 'boss') return `${bossData.mapBosses[id]?.name ?? '?'}${CUSTOM_MAP_BOSSES[id] ? ` (Surge, LV ${n(CUSTOM_MAP_BOSSES[id].level)})` : ''}`;
  if (kind === 'slime') return slimeDef(bossData, id, null)?.name ?? '?';
  return `${bossData.eventBosses[id]?.normal?.name ?? '?'} (evento)`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const game = loadGame(root, { original: opts.original });
  const policy = { ...DEFAULT_POLICY, maxDanger: opts.danger, bossWinRate: opts.bossRate };
  const bot = createBot(game, policy);
  const started = Date.now();

  // results[r] = stats of run r (0-based) of every bot
  const results = Array.from({ length: opts.runs }, () => []);
  for (let p = 0; p < opts.players; p += 1) {
    let profile = bot.newProfile();
    for (let r = 0; r < opts.runs; r += 1) {
      const out = bot.playRun(profile, opts.seed + p * 1009 + r * 7);
      profile = out.profile;
      results[r].push(out.stats);
    }
    if ((p + 1) % 25 === 0) process.stdout.write(`  ${p + 1}/${opts.players} bots\n`);
  }
  const secs = ((Date.now() - started) / 1000).toFixed(1);

  const { bossData } = game.data;
  const lines = [];
  const w = (s = '') => lines.push(s);
  w('# Balanceamento: simulação');
  w();
  w(`> Gerado por \`npm run simulate\` (\`scripts/simulate.mjs\`) em ${new Date().toISOString().slice(0, 10)}: ${opts.players} robôs × ${opts.runs} partida(s), semente ${opts.seed}, ${secs}s. Mundo: ${opts.original ? '**original** (só world.json)' : `**Surge** (mapas do editor: ${game.edited.join(', ') || 'nenhum'})`}.`);
  w(`> Robô: luta na área mais forte com perigo ≤ ${policy.maxDanger}; enfrenta chefe/slime quando vence ≥ ${pct(policy.bossWinRate)} de ${policy.bossTrials} lutas de teste; status ${Object.entries(policy.weights).map(([k, v]) => `${k} ${v}`).join(' / ')}; compra e equipa o melhor equipamento a cada ${policy.gearEvery} batalhas; cura paga em chefes abaixo de ${pct(policy.healBelow)} de HP. Viajar entre áreas e mapas não custa batalhas (aproximação).`);
  w();

  if (opts.runs > 1) {
    // the profile carries gear, base level and talents over: how the bots grow run after run
    w('## Evolução partida a partida');
    w();
    w('Medianas dos robôs (p90 = os 10% melhores). "Chefes vencidos": chefes de mapa e Slime Kings derrotados na partida.');
    w();
    w('| Partida | Nível final | Nível final (p90) | Batalhas | Ouro ganho | SK | Chefes vencidos |');
    w('|---|---|---|---|---|---|---|');
    results.forEach((runs, r) => {
      const beaten = runs.map((s) => Object.keys(s.targets).filter((k) => !k.startsWith('event#') && s.targets[k].wins > 0).length);
      w(`| ${r + 1} | ${n(median(runs.map((s) => s.level)))} | ${n(quantile(runs.map((s) => s.level), 0.9))} | ${n(median(runs.map((s) => s.battles)))} | ${n(median(runs.map((s) => s.gold)))} | ${n(median(runs.map((s) => s.tp)))} | ${n(median(beaten))} |`);
    });
    w();
  }

  // details of the first and the last run
  results.forEach((runs, r) => {
    if (r !== 0 && r !== results.length - 1) return;
    const title = opts.runs > 1 ? `## Partida ${r + 1} em detalhe` : '## Partida';
    w(title);
    w();
    const lv = runs.map((s) => s.level);
    const bt = runs.map((s) => s.battles);
    w('| | p10 | mediana | p90 |');
    w('|---|---|---|---|');
    w(`| Nível final | ${n(quantile(lv, 0.1))} | ${n(median(lv))} | ${n(quantile(lv, 0.9))} |`);
    w(`| Batalhas | ${n(quantile(bt, 0.1))} | ${n(median(bt))} | ${n(quantile(bt, 0.9))} |`);
    w(`| Ouro ganho | ${n(quantile(runs.map((s) => s.gold), 0.1))} | ${n(median(runs.map((s) => s.gold)))} | ${n(quantile(runs.map((s) => s.gold), 0.9))} |`);
    w(`| SK ganho | ${n(quantile(runs.map((s) => s.tp), 0.1))} | ${n(median(runs.map((s) => s.tp)))} | ${n(quantile(runs.map((s) => s.tp), 0.9))} |`);
    w(`| Derrotas | ${n(quantile(runs.map((s) => s.losses), 0.1))} | ${n(median(runs.map((s) => s.losses)))} | ${n(quantile(runs.map((s) => s.losses), 0.9))} |`);
    w();
    const cps = [10, 25, 50, 100, 200, 400].filter((cp) => runs.some((s) => s.levelAt[cp] != null));
    if (cps.length) {
      w('**Nível mediano por batalha:** ' + cps.map((cp) => {
        const got = runs.filter((s) => s.levelAt[cp] != null);
        return `${cp}ª: LV ${n(median(got.map((s) => s.levelAt[cp])))}${got.length < runs.length ? ` (${pct(got.length / runs.length)} chegam)` : ''}`;
      }).join(' · '));
      w();
    }
    const endMaps = {};
    for (const s of runs) endMaps[s.endMap] = (endMaps[s.endMap] ?? 0) + 1;
    w('**Onde a partida termina:** ' + Object.entries(endMaps).sort((a, b) => b[1] - a[1]).map(([m, c]) => `mapa ${m} ${pct(c / runs.length)}`).join(' · '));
    const capped = runs.filter((s) => s.capped).length;
    if (capped) w(`\n⚠️ ${capped} partida(s) pararam no limite de ${policy.maxBattles} batalhas.`);
    w();

    // bosses and slimes
    const keys = new Set(runs.flatMap((s) => Object.keys(s.targets)));
    const rows = [...keys].map((key) => {
      const ts = runs.map((s) => s.targets[key]).filter(Boolean);
      const reached = ts.filter((t) => t.reachedLevel != null);
      const beaten = ts.filter((t) => t.wins > 0);
      const tries = ts.reduce((a, t) => a + t.tries, 0);
      const wins = ts.reduce((a, t) => a + t.wins, 0);
      return {
        key,
        event: key.startsWith('event#'),
        reached: reached.length / runs.length,
        reachLevel: median(reached.map((t) => t.reachedLevel)),
        reachBattle: median(reached.map((t) => t.reachedBattle)),
        met: ts.length / runs.length,
        beaten: beaten.length / runs.length,
        winLevel: median(beaten.map((t) => t.winLevel).filter((v) => v != null)),
        winBattle: median(beaten.map((t) => t.winBattle).filter((v) => v != null)),
        winRate: tries ? wins / tries : null,
      };
    });
    const mapRows = rows.filter((x) => !x.event).sort((a, b) => (a.winBattle ?? a.reachBattle ?? 1e9) - (b.winBattle ?? b.reachBattle ?? 1e9));
    w('### Chefes e Slime Kings');
    w();
    w('"Alcançado": o mapa dele ficou acessível na partida. "Vencido": % das partidas em que caiu. Níveis e batalhas são medianas.');
    w();
    w('| Alvo | Alcançado | LV ao alcançar | Vencido | LV ao vencer | Batalha da vitória | Vitórias / tentativas |');
    w('|---|---|---|---|---|---|---|');
    for (const x of mapRows) w(`| \`${x.key}\` ${targetName(x.key, bossData)} | ${pct(x.reached)} | ${n(x.reachLevel)} | ${pct(x.beaten)} | ${n(x.winLevel)} | ${n(x.winBattle)} | ${pct(x.winRate)} |`);
    w();
    const events = rows.filter((x) => x.event).sort((a, b) => b.met - a.met);
    if (events.length) {
      w('### Chefes de evento encontrados');
      w();
      w('| Chefe | Partidas em que apareceu | Vitórias / lutas |');
      w('|---|---|---|');
      for (const x of events) w(`| \`${x.key}\` ${targetName(x.key, bossData)} | ${pct(x.met)} | ${pct(x.winRate)} |`);
      w();
    }

    // areas
    const areaStats = {};
    for (const s of runs) {
      for (const [k, a] of Object.entries(s.areas)) {
        const t = (areaStats[k] ??= { battles: 0, losses: 0 });
        t.battles += a.battles;
        t.losses += a.losses;
      }
    }
    const allBattles = Object.values(areaStats).reduce((a, t) => a + t.battles, 0);
    const levelOf = (k) => {
      const [m, i] = k.split(':').map(Number);
      return game.world.map(m)?.areas[i]?.level;
    };
    w('### Áreas mais usadas');
    w();
    w('| Área (mapa:índice) | LV | % das batalhas | Derrotas |');
    w('|---|---|---|---|');
    for (const [k, t] of Object.entries(areaStats).sort((a, b) => b[1].battles - a[1].battles).slice(0, 15)) w(`| ${k} | ${n(levelOf(k))} | ${pct(t.battles / allBattles)} | ${pct(t.losses / t.battles)} |`);
    w();

    // alerts
    const alerts = [];
    for (const x of mapRows) {
      if (x.reached > 0.5 && x.beaten < 0.1) alerts.push(`\`${x.key}\` ${targetName(x.key, bossData)}: alcançado em ${pct(x.reached)} das partidas, vencido em só ${pct(x.beaten)} (forte demais para onde está, ou o robô nunca fica forte o bastante).`);
      if (x.winRate != null && x.winRate < 0.5 && x.beaten > 0) alerts.push(`\`${x.key}\`: só ${pct(x.winRate)} das tentativas vencem (difícil de prever pelas lutas de teste).`);
    }
    for (const [k, t] of Object.entries(areaStats)) if (t.battles >= runs.length && t.losses / t.battles > 0.25) alerts.push(`Área ${k} (LV ${n(levelOf(k))}): ${pct(t.losses / t.battles)} de derrotas.`);
    if (!opts.original) {
      for (const id of game.edited) {
        const map = game.world.map(id);
        const used = new Set(Object.keys(areaStats).filter((k) => k.startsWith(`${id}:`)));
        const painted = new Set(map.grid.cells.flat());
        const unused = [...painted].filter((i) => !used.has(`${id}:${i}`));
        if (unused.length) alerts.push(`Mapa ${id}: área(s) ${unused.map((i) => `${i} (LV ${n(map.areas[i]?.level)})`).join(', ')} nunca usadas para lutar.`);
      }
    }
    w('### Alertas');
    w();
    w(alerts.length ? alerts.map((a) => `- ${a}`).join('\n') : 'Nenhum.');
    w();
  });

  const file = path.join(root, opts.out);
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`${opts.out} written (${secs}s)`);
}

main();
