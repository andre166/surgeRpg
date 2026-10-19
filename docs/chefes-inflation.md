# Chefes do Inflation RPG

Todos os chefes do jogo: os do original, **29 chefes de mapa** (ids 0–28, posicionados nos mapas) e **20 chefes de evento** (ids 32–90, que surgem em batalhas de níveis com bônus "???", "！", "!!!" e "!?"), e no fim os **chefes próprios do Surge** (customizados e Slime Kings).

> Gerado por `npm run build:boss-doc` (`scripts/build-boss-doc.mjs`) a partir de `src/data/bosses.json`, `items.json`, `world.json`, `src/core/encounters/customBosses.js`, `slimeBosses.js` e dos triggers dos mapas do editor (`public/assets/maps/`). Não edite à mão: rode o script depois de mexer em qualquer chefe. Regras completas do original em [reverse/enemies.md](reverse/enemies.md), seção 4. Os **nomes** são os do Surge RPG; o **sprite** é o id do original.

## Regras gerais

- **Encontro:** o chefe aparece no mapa sobre um círculo mágico enquanto não foi vencido na partida atual. Encostar nele inicia a batalha (precisa de BP > 0).
- **Custo de BP:** 1 pela batalha + 2 provisórios (4 no difícil). Vencendo, os 2/4 voltam e o chefe ainda dá o **+BP** da tabela. Perdendo ou fugindo, o custo fica (−3 / −5).
- **Drops:** só enquanto aquele chefe ainda não foi vencido na partida. Até 3 sorteios independentes.
- **Modo difícil (chefes de mapa):** HP ×10, ATK ×8,5, ouro ×5, EXP ×24 (×12 do modo, ×2 por ser chefe). Os drops passam a ser os da coluna "Drops (difícil)" quando ela existe.
- **EXP por nível:** os chefes 25–28 não têm EXP fixa: dão `N × EXP de um inimigo do nível da área` onde estão.
- **Nível de base (★):** vencer os chefes 0, 1, 2, 8, 9, 12, 13, 19 e 28 (cada um no normal e no difícil, máx. 18) sobe o nível de base do personagem, que aumenta os bônus de status dos equipamentos.
- O chefe **28** é o último: vencê-lo marca o jogo como zerado.

## Chefes de mapa

"Original": onde fica no Inflation (world.json). "No Surge": onde os triggers do editor o colocam; num mapa sem arte do editor ele fica na posição original, e um mapa com arte só tem os chefes dos seus triggers.

| Id | Nome | Sprite | Original (mapa · área · LV) | No Surge | HP | ATK | EXP | Ouro | +BP | Ao vencer |
|---|---|---|---|---|---|---|---|---|---|---|
| **0** ★ | Zephos the Avatar | `ene1_ba` | 1 · área 5 · LV 710 | mapa 2 · célula 6,59 · LV 810<br>mapa 6 (arquivo não ligado) · célula 19,10 · LV 5.000 | 32.000 | 1.440 | 250.000 | 4.000 | +3 | — |
| **1** ★ | Ithilael the Avatar | `ene3_ba` | 3 · área 6 · LV 2.222 | não posicionado | 300.000 | 2.400 | 1.500.000 | 10.000 | +7 | — |
| **2** ★ | Ithila the Eidolon | `ene5_ba` | 5 · área 5 · LV 2.000 | mapa 4 · célula 31,49 · LV 830 | 100.000 | 7.400 | 5.000.000 | 7.000 | +4 | — |
| **3** | Molar the Matriarch | `ene6_ba` | 6 · área 9 · LV 5.200 | como no original | 700.000 | 6.800 | 25.000.000 | 1.000 | +3 | continua no mapa 7 |
| **4** | Nyxa the Eidolon | `ene9_ba` | 9 · área 4 · LV 10.840 | mapa 7 (arquivo não ligado) · célula 16,19 · LV 5.400 | 1.580.000 | 23.600 | 160.000.000 | 7.000 | +3 | — |
| **5** | Thalith the Apex | `ene9_bb` | 9 · área 6 · LV 12.000 | como no original | 1.640.000 | 23.800 | 180.000.000 | 7.000 | +3 | — |
| **6** | Gorrathael the Overlord | `ene10_ba` | 10 · área 2 · LV 12.400 | como no original | 1.720.000 | 24.000 | 200.000.000 | 10.000 | +4 | — |
| **7** | Pyrear the Judge | `ene11_ba` | 11 · área 3 · LV 13.111 | como no original | 1.600.000 | 28.500 | 210.000.000 | 10.000 | +4 | — |
| **8** ★ | Thalos the Avatar | `ene15_ba` | 15 · área 6 · LV 20.000 | como no original | 2.800.000 | 50.000 | 350.000.000 | 1.000 | +4 | aleatório (25% cada): mapa 17, 18, 28 ou 50 |
| **9** ★ | Ferrumos the Avatar | `ene17_ba` | 35 · área 7 · LV 25.555 | como no original | 3.150.000 | 75.000 | 1.000.000.000 | 1.000 | +4 | mapa 56 |
| **10** | Kazael the Idol | `ene17_bb` | 20 · área 9 · LV 27.200 | como no original | 2.800.000 | 98.000 | 2.000.000.000 | 2.000 | +3 | — |
| **11** | Umbraith the Idol | `ene17_bc` | 40 · área 9 · LV 27.200 | como no original | 3.600.000 | 80.000 | 2.000.000.000 | 2.000 | +3 | — |
| **12** ★ | Lysaos the Arbiter | `ene56_ba` | 56 · área 4 · LV 36.000 | como no original | 6.200.000 | 120.000 | 2.400.000.000 | 17.777 | +5 | mapa 57 |
| **13** ★ | Caelith the Monarch | `ene57_ba` | 57 · área 0 · LV 37.777 | como no original | 8.000.000 | 122.000 | 4.000.000.000 | 17.777 | +3 | mapa 61 |
| **14** | Zephael the Judge | `ene58_ba` | 58 · área 0 · LV 41.111 | como no original | 7.000.000 | 150.000 | 3.600.000.000 | 9.999 | +2 | — |
| **15** | Vaeleth the Warden | `ene58_bb` | 58 · área 0 · LV 41.111 | como no original | 7.000.000 | 162.000 | 3.600.000.000 | 9.999 | +2 | — |
| **16** | Branna the Warden | `ene58_bc` | 58 · área 0 · LV 41.111 | como no original | 7.350.000 | 156.000 | 3.800.000.000 | 9.999 | +2 | — |
| **17** | Thalion the Warden | `ene58_bd` | 58 · área 0 · LV 41.111 | como no original | 8.050.000 | 150.000 | 4.000.000.000 | 9.999 | +2 | — |
| **18** | Ouroos the Keeper | `ene58_be` | 58 · área 0 · LV 41.111 | como no original | 7.000.000 | 162.000 | 4.000.000.000 | 9.999 | +2 | — |
| **19** ★ | Ferrumus the Keeper | `ene58_bf` | 58 · área 0 · LV 41.111 | como no original | 8.050.000 | 169.500 | 7.000.000.000 | 9.999 | +4 | mapa 61 |
| **20** | Umbraus the Monarch | `ene59_ba` | 59 · área 0 · LV 20.000 | como no original | 3.000.000 | 77.000 | 2.000.000.000 | 30.000 | +6 | — |
| **21** | Ferrumeth the Matriarch | `ene63_bb` | 65 · área 0 · LV 58.000 | como no original | 16.536.000 | 323.400 | 9.000.000.000 | 20.000 | +4 | — |
| **22** | Umbraar the Apex | `ene64_ba` | 66 · área 0 · LV 50.000 | como no original | 11.454.000 | 282.600 | 7.000.000.000 | 20.000 | +5 | — |
| **23** | Nyxus the Apex | `ene64_bb` | 66 · área 1 · LV 67.000 | como no original | 20.925.000 | 459.660 | 11.000.000.000 | 20.000 | +4 | — |
| **24** | Kazos the Patriarch | `ene63_ba` | 63 · área 2 · LV 75.000 | como no original | 30.012.000 | 469.200 | 14.000.000.000 | 20.000 | +4 | — |
| **25** | Ravnos the Monarch | `ene68_ba` | 68 · área 2 · LV 93.333 | como no original | 40.000.000 | 1.032.000 | 6.000 × EXP do nível | 20.000 | +4 | mapa 69 |
| **26** | Umbraael the Patriarch | `ene70_bb` | 72 · área 3 · LV 245.000 | como no original | 326.750.000 | 3.496.500 | 10.000 × EXP do nível | 50.000 | +4 | mapa 73 |
| **27** | Gorrathion the Herald | `ene70_ba` | 72 · área 4 · LV 250.000 | como no original | 205.200.000 | 5.460.000 | 10.000 × EXP do nível | 50.000 | +4 | mapa 73 |
| **28** ★ | Kormith the Warden | `ene73_ba` | 74 · área 2 · LV 450.000 | como no original | 587.500.000 | 5.510.000 | 20.000 × EXP do nível | 50.000 | +5 | fim do jogo (último chefe) |

★ conta para o nível de base do personagem.

### Modo difícil (valores efetivos)

| Id | Nome | HP | ATK | EXP | Ouro |
|---|---|---|---|---|---|
| **0** | Zephos the Avatar | 320.000 | 12.240 | 6.000.000 | 20.000 |
| **1** | Ithilael the Avatar | 3.000.000 | 20.400 | 36.000.000 | 50.000 |
| **2** | Ithila the Eidolon | 1.000.000 | 62.900 | 120.000.000 | 35.000 |
| **3** | Molar the Matriarch | 7.000.000 | 57.800 | 600.000.000 | 5.000 |
| **4** | Nyxa the Eidolon | 15.800.000 | 200.600 | 3.840.000.000 | 35.000 |
| **5** | Thalith the Apex | 16.400.000 | 202.300 | 4.320.000.000 | 35.000 |
| **6** | Gorrathael the Overlord | 17.200.000 | 204.000 | 4.800.000.000 | 50.000 |
| **7** | Pyrear the Judge | 16.000.000 | 242.250 | 5.040.000.000 | 50.000 |
| **8** | Thalos the Avatar | 28.000.000 | 425.000 | 8.400.000.000 | 5.000 |
| **9** | Ferrumos the Avatar | 31.500.000 | 637.500 | 24.000.000.000 | 5.000 |
| **10** | Kazael the Idol | 28.000.000 | 833.000 | 48.000.000.000 | 10.000 |
| **11** | Umbraith the Idol | 36.000.000 | 680.000 | 48.000.000.000 | 10.000 |
| **12** | Lysaos the Arbiter | 62.000.000 | 1.020.000 | 57.600.000.000 | 88.885 |
| **13** | Caelith the Monarch | 80.000.000 | 1.037.000 | 96.000.000.000 | 88.885 |
| **14** | Zephael the Judge | 70.000.000 | 1.275.000 | 86.400.000.000 | 49.995 |
| **15** | Vaeleth the Warden | 70.000.000 | 1.377.000 | 86.400.000.000 | 49.995 |
| **16** | Branna the Warden | 73.500.000 | 1.326.000 | 91.200.000.000 | 49.995 |
| **17** | Thalion the Warden | 80.500.000 | 1.275.000 | 96.000.000.000 | 49.995 |
| **18** | Ouroos the Keeper | 70.000.000 | 1.377.000 | 96.000.000.000 | 49.995 |
| **19** | Ferrumus the Keeper | 80.500.000 | 1.440.750 | 168.000.000.000 | 49.995 |
| **20** | Umbraus the Monarch | 30.000.000 | 654.500 | 48.000.000.000 | 150.000 |
| **21** | Ferrumeth the Matriarch | 165.360.000 | 2.748.900 | 216.000.000.000 | 100.000 |
| **22** | Umbraar the Apex | 114.540.000 | 2.402.100 | 168.000.000.000 | 100.000 |
| **23** | Nyxus the Apex | 209.250.000 | 3.907.110 | 264.000.000.000 | 100.000 |
| **24** | Kazos the Patriarch | 300.120.000 | 3.988.200 | 336.000.000.000 | 100.000 |
| **25** | Ravnos the Monarch | 400.000.000 | 8.772.000 | 6.000 × EXP do nível (×24) | 100.000 |
| **26** | Umbraael the Patriarch | 3.267.500.000 | 29.720.250 | 10.000 × EXP do nível (×24) | 250.000 |
| **27** | Gorrathion the Herald | 2.052.000.000 | 46.410.000 | 10.000 × EXP do nível (×24) | 250.000 |
| **28** | Kormith the Warden | 5.875.000.000 | 46.835.000 | 20.000 × EXP do nível (×24) | 250.000 |

### Drops dos chefes de mapa

| Id | Nome | Drops (normal) | Drops (difícil) |
|---|---|---|---|
| **0** | Zephos the Avatar | Copper Blade (Arma #2) 50%<br>Steel Plate (Armadura #2) 50% | Starsteel Sabre + (Arma #75) 40% |
| **1** | Ithilael the Avatar | Vitality Gem II (Acessório #1) 16%<br>Might Gem II (Acessório #5) 16%<br>Guard Gem II (Acessório #9) 16% | iguais ao normal |
| **2** | Ithila the Eidolon | Obsidian Greatsword (Arma #11) 9%<br>Vitality Gem III (Acessório #2) 8%<br>Might Gem III (Acessório #6) 8%<br>**Eco: Fagulha Errante** 100% (uma vez por conta) | Trinity Gem (H) (Acessório #66) 2,2%<br>**Eco: Fagulha Errante** 100% (uma vez por conta) |
| **3** | Molar the Matriarch | Scholar Band II (Acessório #21) 30%<br>Scholar Band III (Acessório #22) 18%<br>Scholar Band IV (Acessório #23) 6% | Prism Gem (Acessório #64) 2,2% |
| **4** | Nyxa the Eidolon | Adamant Sword + (Arma #41) 14% | Aether Glaive (Arma #71) 7,5%<br>Might Gem VI (Acessório #47) 1%<br>Vitality Gem VI (Acessório #46) 0,7% |
| **5** | Thalith the Apex | Iron Halberd + (Arma #43) 14% | Obsidian Fang (Arma #73) 6%<br>Fortune Gem VI (Acessório #50) 1%<br>Vitality Gem VI (Acessório #46) 0,7% |
| **6** | Gorrathael the Overlord | Silver Shiv + (Arma #40) 14% | Primal Warblade (Arma #70) 7%<br>Guard Gem VI (Acessório #48) 1%<br>Vitality Gem VI (Acessório #46) 0,7% |
| **7** | Pyrear the Judge | Steel Falchion + (Arma #42) 14% | Dragonbone Knife (Arma #72) 7%<br>Swift Gem VI (Acessório #49) 1%<br>Vitality Gem VI (Acessório #46) 0,7% |
| **8** | Thalos the Avatar | Gambler Gem II (Acessório #45) 2,6% | Trinity Gem (H) (Acessório #66) 3% |
| **9** | Ferrumos the Avatar | Gambler Gem II (Acessório #45) 4%<br>Endurance Token III (Acessório #38) 3,2% | iguais ao normal |
| **10** | Kazael the Idol | Starsteel Glaive (Arma #48) 6,7%<br>Flint Mail (Armadura #18) 6,6% | Eternal Fang + (Arma #59) 3,3%<br>Flint Brigandine + (Armadura #24) 3% |
| **11** | Umbraith the Idol | Astral Warblade (Arma #49) 7,2%<br>Flint Mail (Armadura #18) 7,2% | Omega Blade + (Arma #60) 3,8%<br>Flint Brigandine + (Armadura #24) 3,6% |
| **12** | Lysaos the Arbiter | Endurance Token III (Acessório #38) 2,8%<br>Endurance Token IV (Acessório #53) 2% | iguais ao normal |
| **13** | Caelith the Monarch | Endurance Token III (Acessório #38) 3%<br>Endurance Token IV (Acessório #53) 2,5% | iguais ao normal |
| **14** | Zephael the Judge | Vitality Gem V (Acessório #39) 7,8%<br>Vitality Gem VI (Acessório #46) 4,4% | iguais ao normal |
| **15** | Vaeleth the Warden | Might Gem V (Acessório #40) 7,8%<br>Might Gem VI (Acessório #47) 4,8% | iguais ao normal |
| **16** | Branna the Warden | Guard Gem V (Acessório #41) 7,8%<br>Guard Gem VI (Acessório #48) 4,4% | iguais ao normal |
| **17** | Thalion the Warden | Swift Gem V (Acessório #42) 7,8%<br>Swift Gem VI (Acessório #49) 4,7% | iguais ao normal |
| **18** | Ouroos the Keeper | Fortune Gem V (Acessório #43) 7,8%<br>Fortune Gem VI (Acessório #50) 3,2% | iguais ao normal |
| **19** | Ferrumus the Keeper | Gambler Gem II (Acessório #45) 5,2%<br>Prism Gem (Acessório #64) 2,4%<br>Gambler Gem III (Acessório #51) 2,2% | Prism Gem II (H) (Acessório #65) 4,2%<br>Prism Gem III (H) (Acessório #69) 2,2% |
| **20** | Umbraus the Monarch | Scholar Band IV (Acessório #23) 3,5%<br>Scholar Band V (Acessório #52) 2,5% | Scholar Band IV (Acessório #23) 3,5%<br>Scholar Band V (Acessório #52) 2,5% |
| **21** | Ferrumeth the Matriarch | Moonlit Plate (Armadura #20) 1,8%<br>Moonlit Plate (Armadura #20) 3,2% | Primal Hauberk + (Armadura #25) 1%<br>Primal Hauberk + (Armadura #25) 2,2% |
| **22** | Umbraar the Apex | Eternal Sword (Arma #52) 2%<br>Eternal Sword (Arma #52) 3,6% | Omega Cleaver + (Arma #61) 1,2%<br>Omega Cleaver + (Arma #61) 2,2% |
| **23** | Nyxus the Apex | Bronze Shiv II (Arma #53) 1,7%<br>Bronze Shiv II (Arma #53) 2,7% | Adamant Zweihander + (Arma #62) 1%<br>Adamant Zweihander + (Arma #62) 2% |
| **24** | Kazos the Patriarch | Eternal Mail (Armadura #21) 1,7%<br>Eternal Mail (Armadura #21) 3% | Omega Jerkin + (Armadura #26) 1%<br>Omega Jerkin + (Armadura #26) 2,1% |
| **25** | Ravnos the Monarch | Quartet Gem (Acessório #70) 1,4%<br>Quartet Gem (Acessório #70) 2,6% | Quartet Gem II (H) (Acessório #71) 1%<br>Quartet Gem II (H) (Acessório #71) 1,8% |
| **26** | Umbraael the Patriarch | Astral Aegis (Armadura #34) 2,3% | Omega Bulwark + (Armadura #35) 2,1% |
| **27** | Gorrathion the Herald | Primal Zweihander (Arma #80) 2,3% | Primal Talon + II (Arma #81) 2,1% |
| **28** | Kormith the Warden | — | iguais ao normal |

## Chefes de evento

Não ficam no mapa: surgem no lugar de um inimigo comum quando o nível atual tem o bônus correspondente. Cada um tem uma ficha própria para o normal e outra para o difícil; no difícil a ficha ainda leva os multiplicadores do modo (HP ×10, ATK ×8,5, ouro ×5, EXP ×12, sem o ×2 de chefe de mapa). As tabelas abaixo mostram os valores efetivos.

| Bônus | Chance | Chefes | Como é escolhido |
|---|---|---|---|
| 9 · "???" | 40% | 32–35 | sorteio uniforme |
| 10 · "???" | 44% | 40–42 | pesos pelo nível da área (até LV 1.000 só o 40; acima, mais chance dos mais fortes) |
| 11 · "???" (ouro) | 35% | 48–53 | pesos pelo nível da área (abaixo de LV 3.000 só 48–50) |
| 12 · "！" | 24% | 60 (normal) / 62 (difícil), ou 61 (isca) | o verdadeiro vem se já foi encontrado antes, ou se você tem armas suficientes (≥ 70% das disponíveis − 4; difícil 85%); senão vem a isca |
| 13 · "!!!" | 26% | 66 (normal) / 68 (difícil), ou 67 (isca) | o verdadeiro vem se já foi encontrado, ou com armas (≥ 40% de n − 8; difícil 70%) ou armaduras (≥ 60% de n − 3; difícil 80%) suficientes |
| 16 · "!?" | 26% | 90 | só no mapa 57 |

- **Iscas 61 e 67:** 1 HP, 1 ATK, 1 EXP, 5.000 de ouro.
- **Vencer 60/62:** leva à **sala branca** (mapa 13); **66/68:** à **sala preta** (mapa 14). O jogador fica lá por 1,5–5,5 batalhas e depois volta ao mapa de onde veio.
- **Vencer 90:** leva ao mapa 58.
- **Ouro dos 40–42:** (antes do ×5 do difícil) cresce com o nível da área `L` (amortecido acima de 7.500, 10.000 e 15.000): 40 = 15.000 + 5L, 41 = 30.000 + 7,5L, 42 = 77.777 + 10L (difícil: 50.000 + 8L, 100.000 + 11L, 200.000 + 14L).

### Normal

No normal, o 60 e o 66 são os verdadeiros; 62 e 68 só aparecem no difícil.

| Id | Nome | Sprite | HP | ATK | EXP | Ouro | Drops |
|---|---|---|---|---|---|---|---|
| **32** | Vaelael the Warden | `ene0_0a` | 150.000 | 666 | 400.000 | 30.000 | Keen Ring (Acessório #25) 12% |
| **33** | Zephith the Warden | `ene0_0b` | 150.000 | 666 | 400.000 | 30.000 | Last Breath Pendant (Acessório #30) 15% |
| **34** | Kormus the Warden | `ene0_0c` | 175.000 | 666 | 450.000 | 30.000 | Cadence Ring (Acessório #28) 12% |
| **35** | Nyxus the Matriarch | `ene0_0d` | 200.000 | 777 | 500.000 | 30.000 | Leech Pendant+ (Acessório #29) 15% |
| **40** | Yggar the Sovereign | `ene0_1a` | 50.000 | 800 | 100 | pelo nível | — |
| **41** | Tarnael the Sovereign | `ene0_1b` | 150.000 | 2.500 | 1.000 | pelo nível | — |
| **42** | Solueth the Avatar | `ene0_1c` | 500.000 | 5.000 | 10.000 | pelo nível | — |
| **48** | Thalael the Herald | `ene0_2a` | 500.000 | 14.000 | 7.000.000 | 40.000 | Obsidian Fang II (Arma #28) 9%<br>Starsteel Bulwark (Armadura #13) 9% |
| **49** | Nyxion the Monarch | `ene0_2b` | 500.000 | 15.000 | 7.000.000 | 40.000 | Sunforged Knife (Arma #29) 9%<br>Starsteel Bulwark (Armadura #13) 9% |
| **50** | Ferruma the Overlord | `ene0_2c` | 500.000 | 15.000 | 7.000.000 | 40.000 | Voidglass Talon (Arma #30) 9%<br>Starsteel Bulwark (Armadura #13) 9% |
| **51** | Kazus the Monarch | `ene0_2d` | 850.000 | 18.000 | 9.000.000 | 40.000 | Brutal Ring (Acessório #26) 9%<br>Opening Ring (Acessório #27) 9% |
| **52** | Umbraith the Monarch | `ene0_2e` | 1.800.000 | 24.000 | 12.000.000 | 50.000 | Voidglass Zweihander (Arma #31) 6%<br>Starsteel Mail (Armadura #14) 8% |
| **53** | Gorrathael the Prime | `ene0_2f` | 1.300.000 | 32.000 | 12.000.000 | 50.000 | Astral Cleaver (Arma #32) 6%<br>Starsteel Mail (Armadura #14) 8% |
| **60** | Soluar the Warden | `ene0_3a` | 2.000.000 | 33.333 | 70.000.000 | 50.000 | Vitality Gem IV (Acessório #3) 20% |
| **61** | Caelion the Judge | `ene0_3b` | 1 | 1 | 1 | 5.000 | — |
| **62** | Soluar the Warden | `ene0_3a` | 12.000.000 | 170.000 | 700.000.000 | 50.000 | — |
| **66** | Ferruma the Eidolon | `ene0_4a` | 2.000.000 | 2.500 | 10.000.000 | 5.000 | Vitality Gem IV (Acessório #3) 15% |
| **67** | Ouroar the Apex | `ene0_4b` | 1 | 1 | 1 | 5.000 | — |
| **68** | Ferruma the Eidolon | `ene0_4a` | 10.000.000 | 150.000 | 100.000.000 | 5.000 | — |
| **90** | Solua the Prime | `ene57_bb` | 7.500.000 | 130.000 | 600.000.000 | 17.777 | — |

### Difícil

No difícil, o 62 e o 68 são os verdadeiros; 60 e 66 só aparecem no normal.

| Id | Nome | Sprite | HP | ATK | EXP | Ouro | Drops |
|---|---|---|---|---|---|---|---|
| **32** | Vaelael the Warden | `ene0_0a` | 9.600.000 | 472.218 | 28.800.000 | 150.000 | Opening Ring II (H) (Acessório #56) 6,5%<br>Opening Ring III (H) (Acessório #57) 3,5% |
| **33** | Zephith the Warden | `ene0_0b` | 13.800.000 | 377.774 | 28.800.000 | 150.000 | Last Breath Pendant+ (H) (Acessório #58) 5% |
| **34** | Kormus the Warden | `ene0_0c` | 10.500.000 | 377.774 | 32.400.000 | 150.000 | Cadence Ring (Acessório #28) 12% |
| **35** | Nyxus the Matriarch | `ene0_0d` | 12.000.000 | 472.218 | 36.000.000 | 150.000 | Leech Pendant+ (Acessório #29) 15% |
| **40** | Yggar the Sovereign | `ene0_1a` | 15.000.000 | 382.500 | 12.000.000 | pelo nível | — |
| **41** | Tarnael the Sovereign | `ene0_1b` | 50.000.000 | 680.000 | 120.000.000 | pelo nível | — |
| **42** | Solueth the Avatar | `ene0_1c` | 150.000.000 | 1.190.000 | 1.200.000.000 | pelo nível | — |
| **48** | Thalael the Herald | `ene0_2a` | 20.000.000 | 476.000 | 504.000.000 | 200.000 | Obsidian Fang II (Arma #28) 9%<br>Starsteel Bulwark (Armadura #13) 9% |
| **49** | Nyxion the Monarch | `ene0_2b` | 20.000.000 | 510.000 | 504.000.000 | 200.000 | Sunforged Knife (Arma #29) 9%<br>Starsteel Bulwark (Armadura #13) 9% |
| **50** | Ferruma the Overlord | `ene0_2c` | 20.000.000 | 510.000 | 504.000.000 | 200.000 | Voidglass Talon (Arma #30) 9%<br>Starsteel Bulwark (Armadura #13) 9% |
| **51** | Kazus the Monarch | `ene0_2d` | 34.000.000 | 612.000 | 648.000.000 | 200.000 | Brutal Ring (Acessório #26) 9%<br>Opening Ring (Acessório #27) 9% |
| **52** | Umbraith the Monarch | `ene0_2e` | 90.000.000 | 816.000 | 1.152.000.000 | 250.000 | Voidglass Zweihander (Arma #31) 6%<br>Starsteel Mail (Armadura #14) 8% |
| **53** | Gorrathael the Prime | `ene0_2f` | 65.000.000 | 1.088.000 | 1.152.000.000 | 250.000 | Astral Cleaver (Arma #32) 6%<br>Starsteel Mail (Armadura #14) 8% |
| **60** | Soluar the Warden | `ene0_3a` | 20.000.000 | 283.331 | 840.000.000 | 250.000 | Vitality Gem IV (Acessório #3) 20% |
| **61** | Caelion the Judge | `ene0_3b` | 10 | 9 | 12 | 25.000 | — |
| **62** | Soluar the Warden | `ene0_3a` | 120.000.000 | 1.445.000 | 8.400.000.000 | 250.000 | — |
| **66** | Ferruma the Eidolon | `ene0_4a` | 20.000.000 | 21.250 | 120.000.000 | 25.000 | Vitality Gem IV (Acessório #3) 15% |
| **67** | Ouroar the Apex | `ene0_4b` | 10 | 9 | 12 | 25.000 | — |
| **68** | Ferruma the Eidolon | `ene0_4a` | 100.000.000 | 1.275.000 | 1.200.000.000 | 25.000 | — |
| **90** | Solua the Prime | `ene57_bb` | 75.000.000 | 1.105.000 | 7.200.000.000 | 88.885 | — |

## Chefes do Surge

Não existem no original. Ficam fora do `world.json`: só aparecem onde um trigger do editor os coloca (nome `boss`, data `{"boss": <id>}` para chefes, `{"boss": "slime#<id>"}` para Slime Kings).

### Chefes customizados

Definidos em `CUSTOM_MAP_BOSSES` (`src/core/encounters/customBosses.js`) só pelo **nível**: HP, ATK, EXP e ouro são interpolados (escala log-log) entre os chefes de mapa originais dos níveis mais próximos (0 em LV 710; 1 e 2 juntos em ~LV 2.100; 3 em LV 5.200; 4–7 em ~LV 12.000; 8 em LV 20.000). Abaixo de LV 710 seguem a curva dos inimigos comuns do original e a tabela de EXP por nível. Contam como chefes de mapa (EXP ×24 no difícil, +BP). Só os marcados com ◆ (`baseLevel: true`) sobem o **nível de base** (o nível da conta que libera fazenda, slots, ecos, modo abissal...), como os 29 originais. Ids: 29–31, depois 200–299 (100–199 são as vitórias no difícil, id + 100).

| Id | Nome | Sprite | LV | HP | ATK | EXP | Ouro | +BP | Drops | Posição (triggers) |
|---|---|---|---|---|---|---|---|---|---|---|
| **31** ◆ | Branith the Keeper | `surge_b31` | 380 | 14.558 | 825 | 103.508 | 3.404 | +3 | Vitality Gem (Acessório #0) 25%<br>Might Gem (Acessório #4) 25%<br>Guard Gem (Acessório #8) 25% | mapa 3 · célula 54,57 · LV 244 |
| **200** | Thalor the Herald | `surge_b200` | 820 | 40.015 | 1.660 | 343.192 | 4.410 | +4 | Might Gem II (Acessório #5) 10%<br>Fortune Gem II (Acessório #17) 10%<br>Iron Falchion (Arma #6) 10% | não posicionado |
| **29** | Pyreth the Arbiter | `surge_b29` | 900 | 46.234 | 1.820 | 421.176 | 4.698 | +4 | Obsidian Greatsword (Arma #11) 10%<br>Vitality Gem III (Acessório #2) 8%<br>Guard Gem III (Acessório #10) 8% | mapa 1 · célula 28,7 · LV 950 |

◆ sobe o nível de base. No difícil: HP ×10, ATK ×8,5, ouro ×5, EXP ×24, com os mesmos drops.

### Slime Kings

Única fonte de SK (+1 por Slime King diferente vencido): o nível dos talentos e o requisito "Slime King" de ecos, fazenda e desbloqueios. Têm 35% do HP, 50% do ATK, 50% do ouro e 25% da EXP do chefe em que se baseiam, não dão drops nem BP e somem até a próxima partida depois de vencidos. Só aparecem onde um trigger `{"boss": "slime#<id>"}` os coloca (nada nasce sozinho ao lado dos chefes). Os de `SLIME_BOSS_IDS` (0–9) se baseiam no chefe de mapa de mesmo id; os de `STANDALONE_SLIMES` são feitos para um nível (base: um chefe balanceado para ele, como os customizados).

| Id | Nome | Base | HP | ATK | EXP | Ouro | SK | Posição |
|---|---|---|---|---|---|---|---|---|
| **0** | Emerald Slime King | chefe 0 (Zephos the Avatar) | 11.200 | 720 | 62.500 | 2.000 | 2 | não posicionado |
| **1** | Azure Slime King | chefe 1 (Ithilael the Avatar) | 105.000 | 1.200 | 375.000 | 5.000 | 5 | não posicionado |
| **2** | Crimson Slime King | chefe 2 (Ithila the Eidolon) | 35.000 | 3.700 | 1.250.000 | 3.500 | 4 | não posicionado |
| **3** | Amber Slime King | chefe 3 (Molar the Matriarch) | 245.000 | 3.400 | 6.250.000 | 500 | 7 | não posicionado |
| **4** | Violet Slime King | chefe 4 (Nyxa the Eidolon) | 553.000 | 11.800 | 40.000.000 | 3.500 | 8 | não posicionado |
| **5** | Obsidian Slime King | chefe 5 (Thalith the Apex) | 574.000 | 11.900 | 45.000.000 | 3.500 | 8 | não posicionado |
| **6** | Golden Slime King | chefe 6 (Gorrathael the Overlord) | 602.000 | 12.000 | 50.000.000 | 5.000 | 8 | não posicionado |
| **7** | Frost Slime King | chefe 7 (Pyrear the Judge) | 560.000 | 14.250 | 52.500.000 | 5.000 | 8 | não posicionado |
| **8** | Magma Slime King | chefe 8 (Thalos the Avatar) | 980.000 | 25.000 | 87.500.000 | 500 | 9 | não posicionado |
| **9** | Shadow Slime King | chefe 9 (Ferrumos the Avatar) | 1.102.500 | 37.500 | 250.000.000 | 500 | 9 | não posicionado |
| **30** | Prism Slime King | LV 4.100 | 169.630 | 2.998 | 3.491.924 | 875 | 6 | não posicionado |
| **31** | Storm Slime King | LV 7.500 | 354.386 | 5.983 | 14.992.130 | 1.261 | 7 | mapa 5 · célula 16,19 · LV 2.222 |
