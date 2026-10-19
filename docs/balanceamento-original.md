# Balanceamento: simulação

> Gerado por `npm run simulate` (`scripts/simulate.mjs`) em 2026-10-17: 50 robôs × 10 partida(s), semente 1, 53.3s. Mundo: **original** (só world.json).
> Robô: luta na área mais forte com perigo ≤ 1; enfrenta chefe/slime quando vence ≥ 60% de 8 lutas de teste; status hp 30 / atk 35 / def 25 / speed 10 / luck 0; compra e equipa o melhor equipamento a cada 3 batalhas; cura paga em chefes abaixo de 35% de HP. Viajar entre áreas e mapas não custa batalhas (aproximação).

## Evolução partida a partida

Medianas dos robôs (p90 = os 10% melhores). "Chefes vencidos": chefes de mapa e Slime Kings derrotados na partida.

| Partida | Nível final | Nível final (p90) | Batalhas | Ouro ganho | TP | Chefes vencidos |
|---|---|---|---|---|---|---|
| 1 | 2.200 | 4.901 | 31 | 62.455 | 0 | 1 |
| 2 | 4.120 | 5.975 | 42 | 79.680 | 0 | 3 |
| 3 | 5.167 | 6.757 | 42 | 86.305 | 0 | 3 |
| 4 | 5.070 | 6.899 | 43 | 96.837 | 0 | 3 |
| 5 | 5.771 | 6.833 | 44 | 105.810 | 0 | 4 |
| 6 | 5.384 | 7.114 | 43 | 109.445 | 0 | 4 |
| 7 | 6.215 | 7.413 | 45 | 115.128 | 0 | 4 |
| 8 | 5.999 | 7.416 | 45 | 121.612 | 0 | 4 |
| 9 | 6.411 | 8.109 | 45 | 123.533 | 0 | 4 |
| 10 | 6.431 | 8.693 | 45 | 135.884 | 0 | 4 |

## Partida 1 em detalhe

| | p10 | mediana | p90 |
|---|---|---|---|
| Nível final | 1.693 | 2.200 | 4.901 |
| Batalhas | 29 | 31 | 42 |
| Ouro ganho | 34.075 | 62.455 | 95.605 |
| TP ganho | 0 | 0 | 0 |
| Derrotas | 1 | 2 | 3 |

**Nível mediano por batalha:** 10ª: LV 367 · 25ª: LV 1.489

**Onde a partida termina:** mapa 5 38% · mapa 6 38% · mapa 3 20% · mapa 7 4%

### Chefes e Slime Kings

"Alcançado": o mapa dele ficou acessível na partida. "Vencido": % das partidas em que caiu. Níveis e batalhas são medianas.

| Alvo | Alcançado | LV ao alcançar | Vencido | LV ao vencer | Batalha da vitória | Vitórias / tentativas |
|---|---|---|---|---|---|---|
| `boss#0` Zephos the Avatar | 100% | 1 | 100% | 736 | 17 | 79% |
| `boss#1` Ithilael the Avatar | 100% | 1 | 48% | 2.177 | 30 | 80% |
| `boss#2` Ithila the Eidolon | 100% | 1 | 40% | 2.625 | 33 | 67% |
| `boss#3` Molar the Matriarch | 100% | 1 | 4% | 4.872 | 43 | 50% |
| `boss#4` Nyxa the Eidolon | 4% | 4.872 | 0% | — | — | — |
| `boss#5` Thalith the Apex | 4% | 4.872 | 0% | — | — | — |
| `boss#6` Gorrathael the Overlord | 4% | 4.872 | 0% | — | — | — |
| `boss#7` Pyrear the Judge | 4% | 4.872 | 0% | — | — | — |
| `boss#8` Thalos the Avatar | 4% | 4.872 | 0% | — | — | — |
| `boss#20` Umbraus the Monarch | 4% | 4.872 | 0% | — | — | — |

### Chefes de evento encontrados

| Chefe | Partidas em que apareceu | Vitórias / lutas |
|---|---|---|
| `event#40` Yggar the Sovereign (evento) | 12% | 86% |
| `event#41` Tarnael the Sovereign (evento) | 6% | 100% |
| `event#61` Caelion the Judge (evento) | 4% | 100% |
| `event#49` Nyxion the Monarch (evento) | 4% | 0% |
| `event#67` Ouroar the Apex (evento) | 4% | 100% |
| `event#42` Solueth the Avatar (evento) | 4% | 0% |
| `event#33` Zephith the Warden (evento) | 2% | 0% |
| `event#34` Kormus the Warden (evento) | 2% | 100% |
| `event#35` Nyxus the Matriarch (evento) | 2% | 100% |
| `event#32` Vaelael the Warden (evento) | 2% | 100% |

### Áreas mais usadas

| Área (mapa:índice) | LV | % das batalhas | Derrotas |
|---|---|---|---|
| 5:4 | 1.350 | 11% | 11% |
| 4:1 | 470 | 9% | 1% |
| 1:1 | 25 | 6% | 0% |
| 4:4 | 1.000 | 6% | 2% |
| 3:2 | 380 | 6% | 0% |
| 3:5 | 1.333 | 4% | 0% |
| 5:1 | 830 | 3% | 4% |
| 1:0 | 1 | 3% | 0% |
| 1:2 | 72 | 3% | 0% |
| 2:0 | 90 | 3% | 0% |
| 2:1 | 132 | 3% | 0% |
| 2:4 | 244 | 3% | 0% |
| 2:5 | 315 | 3% | 2% |
| 4:2 | 630 | 3% | 0% |
| 2:2 | 176 | 3% | 0% |

### Alertas

- `boss#3` Molar the Matriarch: alcançado em 100% das partidas, vencido em só 4% (forte demais para onde está, ou o robô nunca fica forte o bastante).

## Partida 10 em detalhe

| | p10 | mediana | p90 |
|---|---|---|---|
| Nível final | 4.490 | 6.431 | 8.693 |
| Batalhas | 41 | 45 | 47 |
| Ouro ganho | 92.667 | 135.884 | 190.998 |
| TP ganho | 0 | 0 | 0 |
| Derrotas | 0 | 1 | 3 |

**Nível mediano por batalha:** 10ª: LV 421 · 25ª: LV 1.968

**Onde a partida termina:** mapa 7 58% · mapa 8 20% · mapa 6 16% · mapa 9 4% · mapa 5 2%

### Chefes e Slime Kings

"Alcançado": o mapa dele ficou acessível na partida. "Vencido": % das partidas em que caiu. Níveis e batalhas são medianas.

| Alvo | Alcançado | LV ao alcançar | Vencido | LV ao vencer | Batalha da vitória | Vitórias / tentativas |
|---|---|---|---|---|---|---|
| `boss#0` Zephos the Avatar | 100% | 1 | 100% | 362 | 9 | 79% |
| `boss#1` Ithilael the Avatar | 100% | 1 | 100% | 1.435 | 22 | 79% |
| `boss#2` Ithila the Eidolon | 100% | 1 | 98% | 2.074 | 25 | 77% |
| `boss#3` Molar the Matriarch | 100% | 1 | 82% | 4.272 | 35 | 85% |
| `boss#5` Thalith the Apex | 82% | 4.272 | 0% | — | — | 0% |
| `boss#6` Gorrathael the Overlord | 82% | 4.272 | 0% | — | — | — |
| `boss#7` Pyrear the Judge | 82% | 4.272 | 0% | — | — | — |
| `boss#8` Thalos the Avatar | 82% | 4.272 | 0% | — | — | — |
| `boss#20` Umbraus the Monarch | 82% | 4.272 | 0% | — | — | — |
| `boss#4` Nyxa the Eidolon | 82% | 4.272 | 2% | 8.833 | 42 | 100% |

### Chefes de evento encontrados

| Chefe | Partidas em que apareceu | Vitórias / lutas |
|---|---|---|
| `event#67` Ouroar the Apex (evento) | 10% | 100% |
| `event#40` Yggar the Sovereign (evento) | 10% | 100% |
| `event#41` Tarnael the Sovereign (evento) | 8% | 100% |
| `event#33` Zephith the Warden (evento) | 4% | 100% |
| `event#34` Kormus the Warden (evento) | 4% | 100% |
| `event#35` Nyxus the Matriarch (evento) | 4% | 100% |
| `event#61` Caelion the Judge (evento) | 4% | 100% |
| `event#42` Solueth the Avatar (evento) | 2% | 100% |
| `event#51` Kazus the Monarch (evento) | 2% | 0% |

### Áreas mais usadas

| Área (mapa:índice) | LV | % das batalhas | Derrotas |
|---|---|---|---|
| 4:1 | 470 | 7% | 0% |
| 5:4 | 1.350 | 7% | 0% |
| 7:9 | 5.200 | 5% | 3% |
| 7:3 | 5.870 | 5% | 0% |
| 1:1 | 25 | 4% | 0% |
| 5:1 | 830 | 4% | 0% |
| 6:5 | 3.400 | 4% | 0% |
| 4:4 | 1.000 | 4% | 0% |
| 6:3 | 2.910 | 4% | 0% |
| 3:2 | 380 | 4% | 0% |
| 6:2 | 2.690 | 4% | 0% |
| 7:1 | 6.540 | 3% | 2% |
| 6:4 | 3.150 | 3% | 0% |
| 4:2 | 630 | 3% | 0% |
| 6:0 | 2.400 | 3% | 0% |

### Alertas

- `boss#5` Thalith the Apex: alcançado em 82% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#6` Gorrathael the Overlord: alcançado em 82% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#7` Pyrear the Judge: alcançado em 82% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#8` Thalos the Avatar: alcançado em 82% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#20` Umbraus the Monarch: alcançado em 82% das partidas, vencido em só 0% (forte demais para onde está, ou o robô nunca fica forte o bastante).
- `boss#4` Nyxa the Eidolon: alcançado em 82% das partidas, vencido em só 2% (forte demais para onde está, ou o robô nunca fica forte o bastante).
