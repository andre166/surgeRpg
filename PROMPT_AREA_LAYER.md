# Prompt: layer de Áreas (nível recomendado)

Objetivo: no editor de mapas, criar um layer **"area"** onde eu pinto as áreas do mapa (cada célula recebe o número de uma área) e defino o **nível recomendado** de cada área. O jogo (Surge RPG, repo inflationRpg) usa esse layer no lugar da grade de áreas fixa de `world.json`. Se o mapa não tiver o layer pintado, nada muda.

## Contexto: como as áreas funcionam no jogo (leia antes de mexer)

- Como no Inflation RPG, cada mapa é dividido em **áreas** e cada área tem um **nível recomendado** (*tekisei LV*). A área onde o herói está define:
  - a cor da borda e o aviso de perigo (nível da área vs. nível do herói),
  - a velocidade da barra de encontro (áreas mais fortes = mais batalhas),
  - a tabela de inimigos e o EXP (o EXP cresce com o nível da área),
  - os bônus de área (ouro x2, EXP x1,5, etc.).
- Hoje as áreas vêm de `src/data/world.json` → `maps[].grid` (`{ cols, rows, cells }`, `cells[row][col]` = id da área, grade esticada sobre o mapa inteiro) e `maps[].areas` (`[{ id, level, pool, weights, ... }]`). Exemplo do mapa 1: grade 9×9, áreas `0:LV1 1:LV25 2:LV72 3:LV172 4:LV300 5:LV710`. **`src/data` é GERADO: nunca edite à mão.**
- No core, tudo passa por `world.map(id)` (`src/core/world/world.js`): `areaIndexAt(map, x, y)` e `areaAt(map, x, y)`. Já existe um override por mapa (`world.setMapBosses`), que devolve uma cópia do mapa com `bosses` trocado; siga o mesmo padrão para as áreas.
- A arte e os objetos do mapa vêm do JSON do editor (`public/assets/maps/<arquivo>.json`, versão 4), ligado ao mapa do jogo em `src/game/mapArt.js` (`MAP_ART`). O MapScene o carrega no `preload` e o lê em `drawMapArt()`. A grade do editor (`width` × `height` células, ex.: 64×64) é esticada sobre o tamanho do mapa do jogo; `src/core/world/triggers.js` já tem `cellAt`/`cellCentre` para converter célula ↔ pixel.

## Formato no export (versão 4, sem quebrar nada)

1. Um layer novo em `layerStack`: `{ "id": "area", "name": "area", "kind": "area", "visible": true, "opacity": 0.45, "system": true }`.
2. As células em `layerData.area`: array de `width * height` inteiros (mesma ordem dos outros layers: `index = row * width + col`). Cada valor é o **id da área** daquela célula; **`-1` = não pintada**.
3. A tabela de áreas no topo do JSON:

```json
"areas": [
  { "id": 0, "level": 1, "name": "Campina", "color": "#7ec850" },
  { "id": 1, "level": 25, "name": "Bosque", "color": "#3f8f3a" }
]
```

- `id` (obrigatório): inteiro ≥ 0. É o id da área no jogo (as áreas `0..N-1` do mapa em `world.json`; o id escolhe a tabela de inimigos daquela área).
- `level` (opcional): nível recomendado. Sem ele, o jogo usa o nível dessa área em `world.json`.
- `name` e `color` (opcionais): só para o editor (rótulo e cor da pintura).

## Parte A — editor (rpg-map-editor)

1. Adicionar o layer "area" (kind `area`) à pilha de layers de todo mapa (novo ou aberto), sem mexer nos outros layers.
2. Painel de áreas: lista com `id`, `name`, `level` e `color`; botões para adicionar, editar e remover. A área selecionada é o "pincel".
3. Pintura com as ferramentas que já existem (pincel, retângulo, balde/preenchimento) e borracha (volta para `-1`).
4. Desenho por cima do mapa: cada célula pintada com a cor da sua área, semitransparente (opacidade do layer), e o rótulo "LV N" centralizado em cada região. Mostrar/ocultar como os outros layers.
5. Salvar e carregar `layerData.area` e `areas` no formato acima, sem mudar a versão do export (4) nem quebrar mapas antigos (mapa sem esses campos abre com o layer vazio).
6. Atualizar o `progress.md` do editor.

## Parte B — jogo (inflationRpg)

1. Em `src/core/world/` (sem Phaser), criar `parseAreaLayer(art, map)` que devolve `{ grid, areas }` no formato de `world.json`, ou `null` se o layer não existir ou não tiver nenhuma célula pintada:
   - `grid = { cols: art.width, rows: art.height, cells }` (`cells[row][col]`);
   - célula `-1`, ou com id que não existe nas áreas do mapa, usa a área da grade original de `world.json` naquele ponto (centro da célula);
   - `areas` = as do `world.json`, com `level` trocado pelo do editor quando ele vier.
2. Override no world, como `setMapBosses`: `world.setMapAreas(mapId, { grid, areas })` faz `world.map(id)` devolver uma cópia com `grid` e `areas` trocados (os dois overrides convivem). Assim `areaAt`, perigo, encontros, inimigos, EXP e bônus funcionam iguais.
3. No MapScene, aplicar o override em `drawMapArt()`, antes de desenhar as bordas e antes de qualquer movimento, e ler de novo `world.map(id)`. As bordas de área (`drawBorders`) e o rótulo de nível devem seguir a nova grade.

## Testes e verificação

- Vitest em `src/tests/`: leitura do layer (pintado, vazio, célula `-1`, id inválido, level opcional); override no world (com layer substitui, sem layer mantém); `areaAt` usando a nova grade.
- `npm test` e `npx vite build` têm que passar.
- No jogo: pintar no mapa 1 uma área LV 300 num canto que hoje é LV 1, começar uma run, andar até lá e confirmar por screenshot a borda nova e o aviso de perigo.
- **Portas:** NUNCA pare o processo da porta 8000 (dev do usuário), 5173 nem 5174 (editor). Rode o seu servidor de teste com `npx vite --port 5175 --strictPort` e pare só ele no fim.
