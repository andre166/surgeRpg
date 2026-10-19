# Guia: áreas e níveis no editor de mapas

Este guia explica como desenhar as **áreas** de um mapa no editor e como escolher o **nível recomendado** de cada uma. As regras e números vêm do jogo (Surge RPG), que segue o Inflation RPG.

---

## 1. O que é uma área

- O mapa é dividido em **áreas**. Cada área tem um **id** (0, 1, 2…) e um **nível recomendado** (LV).
- Uma área pode ter **qualquer formato** e vários pedaços separados. O que importa é o id pintado em cada célula.
- A cada passo, o jogo olha a célula onde o herói está e descobre a área dele. A barra do HUD, abaixo do BP, mostra a área atual: mapa, LV e perigo.

## 2. O que o nível da área muda no jogo

| O quê | Como funciona |
|---|---|
| **Perigo** | Compara o LV da área com o LV do herói (tabela da seção 3). Aparece no HUD e na cor da borda da área. |
| **Frequência de batalhas** | Quanto mais perigosa, mais rápido a barra de encontro enche enquanto anda (seção 3). |
| **Inimigos** | O **id** da área escolhe a tabela de inimigos (quais monstros, HP, ATK, ouro, drops). |
| **EXP** | Cresce com o LV da área. Lutar acima do seu nível rende muito mais. |
| **Bônus de área** | Áreas ganham bônus temporários depois das vitórias: ouro ×2/×3/×4/×7, EXP ×1,5/×2, HP ou ATK do inimigo pela metade, crítico/combo, e "???" com chefes escondidos. |

> **Importante:** o **id** decide *quais inimigos* aparecem; o **nível** decide *perigo, frequência e EXP*. Dois pedaços com o mesmo id e níveis diferentes não existem: o nível é por id.

## 3. Perigo: como o jogo compara os níveis

`T` = LV da área, `L` = LV do herói.

| Perigo no HUD | Condição | Barra de encontro (por passo) |
|---|---|---|
| **Mortal** (vermelho) | T ≥ L×1,4 + 50 | 0,98 (muitas batalhas) |
| **Mortal** (vermelho) | T ≥ L×1,2 + 25 | 0,85 |
| **Perigosa** (laranja) | T ≥ L×1,1 + 8 | 0,72 |
| **Perigosa** (laranja) | T ≥ L×1,05 + 1 | 0,64 |
| **Normal** | perto do seu nível | 0,58 |
| **Fácil** (verde) | T ≤ L×0,74 − 6 | 0,40 |
| **Fácil** (verde) | T ≤ L×0,58 − 12 | 0,32 (poucas batalhas) |

A batalha acontece com chance crescente conforme a barra enche: cerca de 17% aos 50%, 80% aos 95% e garantida aos 100%.

**Exemplos prontos** (a partir de qual LV de área o herói vê cada perigo):

| LV do herói | Fácil até | Perigosa a partir de | Mortal a partir de |
|---|---|---|---|
| 1 | — | 3 | 27 |
| 10 | 1 | 12 | 37 |
| 50 | 31 | 54 | 85 |
| 100 | 68 | 106 | 145 |
| 300 | 216 | 316 | 385 |
| 1000 | 734 | 1051 | 1225 |

No **modo abissal** o nível fica oculto ("? ? ? ?") e toda área conta como Perigosa.

---

## 4. Passo a passo no editor

1. Abra o mapa e selecione o layer **area**.
2. No painel de áreas, crie uma entrada para cada id que for usar:
   - **id**: um dos ids que o mapa tem (tabela da seção 6);
   - **level**: o nível recomendado;
   - **name** e **color**: só para você se orientar no editor (o jogo não usa).
3. Escolha a área e pinte as células (pincel, retângulo, balde). A borracha volta a célula para "não pintada".
4. Exporte para `public/assets/maps/<arquivo>.json` (mesmo nome de antes, por exemplo `map1.json`).
5. No jogo, entre no mapa de novo. A pintura nova aparece sozinha; se o jogo estava aberto antes de uma atualização de código, dê Ctrl+R uma vez.

## 5. Regras que o jogo segue

- **Mapa com pelo menos uma célula pintada:** as áreas vêm **só** do editor.
  - Célula **não pintada** = **área 0**.
  - Id que o mapa não tem (por exemplo 9 num mapa com áreas 0–5) = área 0.
  - Id que você usa mas não colocou na tabela de áreas = usa o nível original desse id (seção 6).
- **Mapa sem nada pintado:** fica com as áreas originais do jogo.
- O **rótulo "LV N"** de cada área aparece no maior pedaço dela.
- As **bordas** são desenhadas entre áreas diferentes, com a cor do perigo para o herói.

---

## 6. Ids e níveis originais de cada mapa

Use estes ids. O nível original é só referência: você pode trocar no editor. A relação completa dos 77 mapas está em [mapas-areas-e-niveis.md](mapas-areas-e-niveis.md).

| Mapa | Arquivo do editor | Ids e níveis originais | Vizinhos (para onde levam as bordas) | Chefe |
|---|---|---|---|---|
| **1** (início) | `map1.json` | 0: LV 1 · 1: 25 · 2: 72 · 3: 172 · 4: 300 · 5: 710 | ↑ mapa 5 · → mapa 3 · ↓ mapa 2 · ← mapa 4 | chefe 0 (no alto, x 800 / y 200) |
| **2** | `map2.json` | 0: 90 · 1: 132 · 2: 176 · 3: 192 · 4: 244 · 5: 315 | ↑ mapa 1 | — |
| **3** | `map3.json` | 0: 220 · 1: 300 · 2: 380 · 3: 777 · 4: 1222 · 5: 1333 · 6: 2222 | ← mapa 1 | chefe 1 |
| **4** | `map4.json` | 0: 300 · 1: 470 · 2: 630 · 3: 810 · 4: 1000 | → mapa 1 · ← mapa 60 | — |
| **5** | `map5.json` | 0: 750 · 1: 830 · 2: 950 · 3: 1200 · 4: 1350 · 5: 2000 · 6: 2300 | ↑ mapa 6 · ↓ mapa 1 | chefe 2 |
| **6** | `map6.json`* | 0: 2400 · 1: 2610 · 2: 2690 · 3: 2910 · 4: 3150 · 5: 3400 · 6: 4110 · 7: 4170 · 8: 5000 · 9: 5200 | ↓ mapa 5 | chefe 3 |
| **7** | `mapa7.json`* | 0: 7000 · 1: 6540 · 2: 6460 · 3: 5870 · 4: 5720 · 5: 5500 · 6: 5400 · 7: 5400 · 8: 5300 · 9: 5200 | ↓ mapa 8 | — |

\* `map6.json` e `mapa7.json` existem na pasta, mas ainda **não estão ligados ao jogo** (`src/game/mapArt.js` só liga os mapas 1 a 5). Peça para ligar quando forem usar.

**Como estava o mapa 1 no original** (grade 9×9, de cima para baixo):

```
4 5 5 5 5 5 5 5 3      5 = LV 710 (no alto, perto do mapa 5 e do chefe)
4 4 5 5 5 5 5 3 3      4 = LV 300 (à esquerda, perto do mapa 4)
4 4 4 5 5 5 5 3 3      3 = LV 172 (à direita, perto do mapa 3)
4 4 4 0 0 0 3 3 3      0 = LV 1   (o centro: onde o herói começa)
4 4 1 0 0 0 3 3 3      1 = LV 25 e 2 = LV 72 (em volta do centro e mais abaixo)
4 1 1 0 0 0 1 3 3
...
```

---

## 7. Dicas para montar um mapa gostoso de jogar

1. **Comece fácil onde o herói nasce ou chega.** A área de entrada deve estar perto do nível de quem vem do mapa anterior.
2. **Faça degraus.** Vizinhas com níveis parecidos (por exemplo 1 → 25 → 72) deixam o jogador "subir" aos poucos. Um salto grande (1 ao lado de 710) é um **risco escolhido**: ótimo para tentar EXP alto, mas deixe claro (fica vermelho no HUD).
3. **Combine com os vizinhos.** A borda que leva a um mapa mais forte deve ter áreas próximas do nível dele. No mapa 1 original, o alto (LV 710) leva ao mapa 5 (LV 750+), a direita (172) ao mapa 3 (220+) e a esquerda (300) ao mapa 4 (300+).
4. **Chefe numa área à altura dele.** Coloque o chefe numa área com nível parecido ao que o jogador deve ter para enfrentá-lo.
5. **Áreas maiores = mais batalhas ali.** Uma área grande e fácil vira lugar de farm; uma pequena e forte, de risco rápido.
6. **Caminhos e atalhos.** Uma faixa estreita de área forte pode cortar caminho entre duas regiões fáceis.
7. **Cada id tem inimigos próprios.** Se quiser variedade, use ids diferentes, mesmo com níveis parecidos.

## 8. Checklist antes de exportar

- [ ] Todos os ids pintados existem no mapa (tabela da seção 6).
- [ ] Cada id usado tem o **level** na tabela de áreas do editor (ou você quer o original).
- [ ] O lugar onde o herói nasce ou chega é Fácil/Normal para quem vem de antes.
- [ ] As bordas que levam a outros mapas têm níveis parecidos com os desses mapas.
- [ ] O chefe está numa área à altura dele.
- [ ] Exportou para `public/assets/maps/<arquivo>.json` com o mesmo nome.

## 9. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| A pintura não aparece no jogo | O export não foi para `public/assets/maps/` com o mesmo nome, ou o jogo está rodando código antigo (Ctrl+R uma vez). |
| O mapa todo virou LV 1 | Tem algo pintado, então o que não foi pintado é área 0. Pinte as outras áreas. |
| A área pintada usa os inimigos errados | O id escolhe os inimigos; troque o id, não só o nível. |
| O nível da área não mudou | Falta o **level** daquele id na tabela de áreas do editor. |
| Um id não teve efeito | Esse id não existe no mapa (vira área 0). Veja a seção 6. |
