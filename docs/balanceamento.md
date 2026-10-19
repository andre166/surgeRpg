# Balanceamento: simulação

> Gerado por `npm run simulate` (`scripts/simulate.mjs`) em 2026-10-17: 50 robôs × 10 partida(s), semente 1, 108.5s. Mundo: **Surge** (mapas do editor: 1, 2, 3, 4, 5).
> Robô: luta na área mais forte com perigo ≤ 1; enfrenta chefe/slime quando vence ≥ 60% de 8 lutas de teste; status hp 30 / atk 35 / def 25 / speed 10 / luck 0; compra e equipa o melhor equipamento a cada 3 batalhas; cura paga em chefes abaixo de 35% de HP. Viajar entre áreas e mapas não custa batalhas (aproximação).

## Evolução partida a partida

Medianas dos robôs (p90 = os 10% melhores). "Chefes vencidos": chefes de mapa e Slime Kings derrotados na partida.

| Partida | Nível final | Nível final (p90) | Batalhas | Ouro ganho | TP | Chefes vencidos |
|---|---|---|---|---|---|---|
| 1 | 2.099 | 3.114 | 38 | 90.468 | 0 | 3 |
| 2 | 3.021 | 5.609 | 40 | 110.701 | 0 | 4 |
| 3 | 3.864 | 6.897 | 42 | 126.783 | 7 | 5 |
| 4 | 4.990 | 7.880 | 43 | 124.060 | 7 | 5 |
| 5 | 5.306 | 7.952 | 42 | 132.670 | 7 | 6 |
| 6 | 6.291 | 8.087 | 45 | 148.313 | 7 | 6 |
| 7 | 6.168 | 8.799 | 45 | 136.401 | 7 | 6 |
| 8 | 6.649 | 8.445 | 45 | 142.962 | 7 | 6 |
| 9 | 7.046 | 8.480 | 45 | 143.281 | 7 | 6 |
| 10 | 7.359 | 8.949 | 45 | 152.626 | 7 | 6 |

## Partida 1 em detalhe

| | p10 | mediana | p90 |
|---|---|---|---|
| Nível final | 1.751 | 2.099 | 3.114 |
| Batalhas | 34 | 38 | 40 |
| Ouro ganho | 62.041 | 90.468 | 122.979 |
| TP ganho | 0 | 0 | 0 |
| Derrotas | 1 | 2 | 3 |

**Nível mediano por batalha:** 10ª: LV 345 · 25ª: LV 1.181 (98% chegam)

**Onde a partida termina:** mapa 4 82% · mapa 6 16% · mapa 2 2%

### Chefes e Slime Kings

"Alcançado": o mapa dele ficou acessível na partida. "Vencido": % das partidas em que caiu. Níveis e batalhas são medianas.

| Alvo | Alcançado | LV ao alcançar | Vencido | LV ao vencer | Batalha da vitória | Vitórias / tentativas |
|---|---|---|---|---|---|---|
| `boss#3` Molar the Matriarch | 100% | 1 | 0% | — | — | — |
| `boss#31` Branith the Keeper (Surge, LV 380) | 100% | 1 | 100% | 424 | 13 | 69% |
| `boss#0` Zephos the Avatar | 100% | 1 | 98% | 739 | 19 | 78% |
| `boss#29` Pyreth the Arbiter (Surge, LV 900) | 100% | 1 | 98% | 902 | 21 | 75% |
| `boss#2` Ithila the Eidolon | 100% | 1 | 12% | 2.332 | 35 | 67% |
| `slime#31` Storm Slime King | 100% | 1 | 8% | 2.982 | 40 | 100% |

### Chefes de evento encontrados

| Chefe | Partidas em que apareceu | Vitórias / lutas |
|---|---|---|
| `event#40` Yggar the Sovereign (evento) | 8% | 100% |
| `event#61` Caelion the Judge (evento) | 6% | 100% |
| `event#67` Ouroar the Apex (evento) | 4% | 100% |
| `event#32` Vaelael the Warden (evento) | 4% | 100% |
| `event#34` Kormus the Warden (evento) | 4% | 100% |
| `event#42` Solueth the Avatar (evento) | 2% | 0% |
| `event#35` Nyxus the Matriarch (evento) | 2% | 100% |

### Áreas mais usadas

| Área (mapa:índice) | LV | % das batalhas | Derrotas |
|---|---|---|---|
| 4:4 | 1.333 | 29% | 0% |
| 2:1 | 470 | 9% | 0% |
| 1:5 | 950 | 8% | 6% |
| 1:2 | 25 | 6% | 0% |
| 3:1 | 132 | 5% | 1% |
| 3:0 | 90 | 4% | 0% |
| 3:3 | 192 | 4% | 18% |
| 4:0 | 380 | 4% | 3% |
| 1:4 | 300 | 3% | 0% |
| 1:1 | 72 | 3% | 0% |
| 2:2 | 630 | 3% | 0% |
| 4:7 | 830 | 3% | 2% |
| 1:0 | 1 | 3% | 0% |
| 4:6 | 2.222 | 3% | 0% |
| 4:3 | 1.222 | 3% | 0% |

### Alertas

- `boss#3` Molar the Matriarch: alcançado em 100% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `slime#31` Storm Slime King: alcançado em 100% das partidas, vencido em só 8% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- Mapa 2: área(s) 0 (LV 300) nunca usadas para lutar.
- Mapa 5: área(s) 0 (LV 2.222) nunca usadas para lutar.

## Partida 10 em detalhe

| | p10 | mediana | p90 |
|---|---|---|---|
| Nível final | 4.315 | 7.359 | 8.949 |
| Batalhas | 38 | 45 | 47 |
| Ouro ganho | 109.289 | 152.626 | 229.054 |
| TP ganho | 7 | 7 | 7 |
| Derrotas | 0 | 1 | 4 |

**Nível mediano por batalha:** 10ª: LV 897 · 25ª: LV 2.220

**Onde a partida termina:** mapa 8 52% · mapa 7 32% · mapa 6 12% · mapa 4 2% · mapa 9 2%

### Chefes e Slime Kings

"Alcançado": o mapa dele ficou acessível na partida. "Vencido": % das partidas em que caiu. Níveis e batalhas são medianas.

| Alvo | Alcançado | LV ao alcançar | Vencido | LV ao vencer | Batalha da vitória | Vitórias / tentativas |
|---|---|---|---|---|---|---|
| `boss#31` Branith the Keeper (Surge, LV 380) | 100% | 1 | 100% | 225 | 2 | 82% |
| `boss#0` Zephos the Avatar | 100% | 1 | 100% | 376 | 4 | 93% |
| `boss#29` Pyreth the Arbiter (Surge, LV 900) | 100% | 1 | 100% | 526 | 5 | 81% |
| `boss#2` Ithila the Eidolon | 100% | 1 | 98% | 2.061 | 22 | 63% |
| `slime#31` Storm Slime King | 100% | 1 | 98% | 2.720 | 26 | 86% |
| `boss#3` Molar the Matriarch | 100% | 1 | 86% | 4.608 | 32 | 90% |
| `boss#4` Nyxa the Eidolon | 86% | 4.608 | 0% | — | — | — |
| `boss#5` Thalith the Apex | 86% | 4.608 | 0% | — | — | — |
| `boss#6` Gorrathael the Overlord | 86% | 4.608 | 0% | — | — | — |
| `boss#7` Pyrear the Judge | 86% | 4.608 | 0% | — | — | — |
| `boss#8` Thalos the Avatar | 86% | 4.608 | 0% | — | — | — |
| `boss#20` Umbraus the Monarch | 86% | 4.608 | 0% | — | — | — |

### Chefes de evento encontrados

| Chefe | Partidas em que apareceu | Vitórias / lutas |
|---|---|---|
| `event#40` Yggar the Sovereign (evento) | 16% | 100% |
| `event#41` Tarnael the Sovereign (evento) | 10% | 100% |
| `event#61` Caelion the Judge (evento) | 8% | 100% |
| `event#35` Nyxus the Matriarch (evento) | 4% | 100% |
| `event#42` Solueth the Avatar (evento) | 4% | 100% |
| `event#67` Ouroar the Apex (evento) | 4% | 100% |
| `event#33` Zephith the Warden (evento) | 2% | 100% |

### Áreas mais usadas

| Área (mapa:índice) | LV | % das batalhas | Derrotas |
|---|---|---|---|
| 4:4 | 1.333 | 20% | 0% |
| 1:5 | 950 | 8% | 0% |
| 7:3 | 5.870 | 5% | 0% |
| 6:5 | 3.400 | 5% | 0% |
| 7:9 | 5.200 | 4% | 3% |
| 7:1 | 6.540 | 4% | 0% |
| 8:1 | 7.630 | 3% | 0% |
| 6:7 | 4.170 | 3% | 0% |
| 6:4 | 3.150 | 3% | 0% |
| 7:0 | 7.000 | 3% | 0% |
| 2:3 | 710 | 3% | 0% |
| 2:2 | 630 | 3% | 0% |
| 2:1 | 470 | 3% | 0% |
| 6:3 | 2.910 | 3% | 0% |
| 4:7 | 830 | 3% | 0% |

### Alertas

- `boss#4` Nyxa the Eidolon: alcançado em 86% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#5` Thalith the Apex: alcançado em 86% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#6` Gorrathael the Overlord: alcançado em 86% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#7` Pyrear the Judge: alcançado em 86% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#8` Thalos the Avatar: alcançado em 86% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#20` Umbraus the Monarch: alcançado em 86% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- Mapa 2: área(s) 0 (LV 300) nunca usadas para lutar.
- Mapa 3: área(s) 2 (LV 176), 3 (LV 192) nunca usadas para lutar.
- Mapa 4: área(s) 1 (LV 300), 5 (LV 710), 2 (LV 777) nunca usadas para lutar.
