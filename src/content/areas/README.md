# Conteúdo das áreas

Um arquivo por mapa do jogo (`map<id>.json`), editado à mão ou pela ferramenta de áreas
(`npm run dev`, depois abra `/tools/areas.html`). O jogo (`src/game/areaContent.js`) e o
simulador (`npm run simulate`) leem estes arquivos.

```json
{ "map": 1, "areas": [
  { "id": 6, "name": "Clareira", "level": 85,
    "monsters": [ { "sprite": "ene1_0a", "weight": 10 } ] }
] }
```

- `id`: o id da área que você pinta no layer "area" do editor de mapas.
- `level`: nível da área (sobrepõe o do editor). Os monstros são reescalados para ele.
- `monsters`: monstros pelo sprite, com peso. Cada um usa a versão do original feita para o
  nível mais próximo (proporção de status e drops) e é reescalado para o nível exato.
  Sem `monsters`, a área usa os monstros do original (`ref` ou id), também reescalados.
