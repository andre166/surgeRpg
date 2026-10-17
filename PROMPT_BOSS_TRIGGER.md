# Prompt: trigger de Boss Fight

Objetivo: criar um trigger de "boss fight" no editor de mapas e fazer o jogo (Surge RPG, repo inflationRpg) usá-lo no lugar das posições de chefe fixas no código. Se o mapa tiver um trigger de boss, o chefe aparece ali com tudo o que tem hoje (círculo, caveira, pulsar, toque que inicia a luta, slime ao lado etc.). Se o mapa não tiver nenhum trigger de boss, nada muda.

## Contexto (leia antes de mexer)

- Os chefes hoje vêm de `src/data/world.json` → `maps[].bosses`: `[{ id, x, y, w, h, scale }]`. O x/y é o centro do retângulo, em pixels do mapa. Exemplo do mapa 1: `{ id: 0, x: 800, y: 200, w: 188, h: 112 }` num mapa de 1600×1600. **`src/data` é GERADO: nunca edite à mão.**
- Tudo no core usa `map.bosses`, com `world.map(id)` (`src/core/world/world.js`):
  - `bossHit` (world.js): teste de retângulo.
  - `bossAt` e `bossTouch` (`src/core/session/session.js`): ao entrar no retângulo, o herói para AO LADO do chefe e a luta começa; quem já está dentro é empurrado para fora sem luta.
  - `mapSlimes` (`src/core/encounters/slimeBosses.js`): slime de TP ao lado dos chefes com id em `SLIME_BOSS_IDS` (hoje `[0]`). Fica à direita do chefe, ou à esquerda se não couber.
  - `startBattle` / `finishBattle` (session.js): dados do chefe em `bosses.json` → `mapBosses[id]`, set de chefe automático, `bossWinTeleport` (world.js), bônus de BP, bestiário (`bossesSeen`) e `run.bossBeaten[id]` (o chefe some depois de vencido).
- O desenho está em `src/game/scenes/MapScene.js` → `buildMap()`, bloco `// bosses`: um `graphics` com anel branco, círculo colorido (`hashColor('boss'+id)`) e borda escura, mais o texto `☠`, um tween de alpha e a profundidade `sortDepth(b.y + b.h / 2)`. O slime é desenhado no bloco seguinte.
- Arte e objetos do mapa vêm do JSON do editor, em `public/assets/maps/<arquivo>.json`, ligado ao mapa do jogo em `src/game/mapArt.js` (`MAP_ART`). O MapScene o carrega no `preload` (`this.cache.json`) e o lê em `drawMapArt()`, onde já guarda `this.art` e `this.triggers`.
- Os triggers do editor ficam em `objectProps`: `[{ index, type: 'trigger', name, data, pages }]`. A célula é `index`, com `col = index % width` e `row = floor(index / width)`. Já existe `src/core/world/triggers.js`, que lê teleportes em dois formatos (`pages[].transfer` ou o JSON em `data`), com `cellAt` e `cellCentre` para converter célula ↔ pixel (a grade da arte é esticada sobre o tamanho do mapa). Siga o mesmo padrão.

## Formato do trigger de boss

Trigger com `name: "boss"` e `data` em JSON:

```json
{ "boss": 0 }
```

- `boss` (obrigatório): id do chefe (chave de `mapBosses` em `bosses.json`).
- `w` e `h` (opcionais): tamanho em pixels do mapa. Sem eles, use o w/h desse chefe em `world.json`; se o chefe não estiver em `world.json`, use 188×112.
- Posição: centro da célula do trigger (`cellCentre`).

## Parte A — editor (rpg-map-editor, só se precisar)

O editor já salva triggers com nome e data livres. Se for fácil, adicione um atalho "Boss" que cria um trigger com `name: "boss"` e `data: '{"boss":0}'` editável, e mostre um ícone ou cor diferente para ele no mapa. Não mude o formato de export (versão 4) nem quebre os triggers de teleporte. Atualize o `progress.md` do editor.

## Parte B — jogo

1. Em `src/core/world/triggers.js`, crie `parseBossTriggers(art, map, defaultBosses)`, sem Phaser, que devolve `[{ id, x, y, w, h, scale }]` no mesmo formato de `map.bosses`. Ignore ids inválidos e duplicados (fica o primeiro).
2. Faça o core usar esses chefes sem duplicar regra. Sugestão: um override em `createWorld` (por exemplo `world.setMapBosses(mapId, bosses)`), em que `world.map(id)` devolve uma cópia do mapa com `bosses` trocado. Assim `bossTouch`, `bossAt`, `mapSlimes`, `startBattle` e o resto funcionam iguais. Regra: se o JSON do mapa tiver ≥ 1 trigger de boss, eles **substituem** os chefes de `world.json` naquele mapa; sem trigger de boss, ficam os de `world.json`.
3. No MapScene, aplique o override em `drawMapArt()` (antes do bloco `// bosses` e antes de qualquer movimento) e leia de novo `world.map(id)` para desenhar. O desenho, o pulsar, a profundidade, o slime e o comportamento devem ser exatamente os atuais, só que nas novas posições.
4. Não registre o trigger de boss como um trigger comum de "entrar na célula": a luta continua começando pelo retângulo do chefe (`bossTouch`), como hoje.

## Testes e verificação

- Testes vitest em `src/tests/` para:
  - leitura do trigger (com e sem w/h; id inválido);
  - override no world (com trigger substitui; sem trigger mantém);
  - `bossTouch` e `mapSlimes` usando a posição do trigger.
- `npm test` e `npx vite build` têm que passar.
- Teste no jogo: no mapa 1, ponha um trigger `{"boss":0}` numa célula longe do lugar atual (o atual fica perto da célula 32,8 numa grade 64×64), comece uma run e confirme por screenshot que o círculo aparece no trigger, que o lugar antigo ficou vazio, que encostar inicia a luta e que o slime está ao lado.
- **Portas:** NUNCA pare o processo da porta 5173 (dev do usuário) nem da 5174 (editor). Rode o seu servidor de teste com `npx vite --port 5175 --strictPort` e pare só ele no fim.
