
Inflation RPG — Regras de Negócio (Engenharia Reversa)
13 de out. de 2026 · @André de Souza Mesquita Bezerra Lima
Inflation RPG é um RPG incremental de partidas curtas: cada partida tem 30 Battle Points, o nível sobe centenas de vezes, e só equipamentos e habilidades de personagem persistem. Este documento separa o que foi validado jogando (1 partida completa, 27 batalhas, LV 1 → 313) do que vem de fontes externas.
Escopo, método e legenda
A análise combinou jogo real no Google Play Games para PC (pacote air.infurerpgkuesuto, save novo) com uma pesquisa externa feita em paralelo. Nenhum arquivo ou dado interno do jogo foi alterado. Houve três ações persistentes, todas jogabilidade normal: a opção "After the battle" passou de 3 (padrão) para 1 e voltou para 3; foi jogada 1 partida até o fim (recorde LV 313); e foi desbloqueado 1 slot de acessório com ouro que seria perdido de qualquer forma.
Tag
Significado
[C] Confirmado
Observado no jogo, de forma reproduzível ou com valor exato (texto da UI, número do log).
[P] Provável
Observado, mas com poucos pontos de dados ou uma explicação alternativa possível.
[NV] Não verificado
Hipótese sem teste no jogo.
[EXT]
Vem de fonte externa (wiki de fãs com dados extraídos do código, ou Gamerch JP), não do jogo. Quando o jogo confirmou o dado, a tag fica [C+EXT].
Como foi testado: 27 batalhas nas áreas LV 1, 25, 72, 90 e 132. Cada batalha registrou nível antes e depois, EXP para o próximo nível, ouro, EXP ganha, Battle Points (BP) e o log de combate (dano por golpe, críticos, combos e dano recebido), lido na tela de pausa e no log inferior.
Loop de jogo
Uma partida é uma corrida de 30 batalhas para maximizar o nível. Ao fim, só o progresso permanente segue: equipamentos, slots de acessório e nível/habilidade de personagem. [C]
1. Título → Start Game → seleção de 1 entre 16 personagens (grade 4×4). [C]
2. Mapa: o personagem anda em direção ao ponto pressionado. Andando, o Encounter Gauge enche; quando cheio, ocorre um encontro aleatório com um inimigo da área atual. [C]
3. Encontro: o BP é debitado no momento em que o inimigo aparece (−1). [C] Um toque inicia a batalha.
4. Batalha semiautomática: turnos alternados jogador/inimigo até alguém chegar a 0 HP. Tocar na tela durante a batalha pausa e oferece HP recovery pago. [C]
5. Resultado da vitória: ouro + EXP da área, level-ups, 4 Stat Points por nível. [C] O HP volta ao máximo antes do próximo encontro. [C]
6. Resultado da derrota: sem recompensa e −2 BP extras (−3 no total). Se o BP restante for menor, ele vai a 0 ("Because you lost the battle, your Battle Points are now 0"). [C+EXT]
7. Distribuição de Stat Points no Menu > Stats. Os pontos ficam acumulados até serem distribuídos; nível sem pontos distribuídos não aumenta a força. [C]
8. Menu > Equipment: compra e equipa itens, desbloqueia slots de acessório. [C para slots; a compra pela lista não pôde ser executada no emulador]
9. BP = 0 → GAME OVER: a tela mostra o nível final ("Highest level updated!"), o total de ouro, mortes, chefes derrotados e batalhas. Ainda nessa tela dá para abrir Menu/Equipment e gastar o ouro, que não é mantido. [C]
10. Retorno ao título: o jogo confirma "Money cannot be carried over… Equipment and Character Abilities LV can be carried over". [C]
    Dados da partida observada [C]:
    Métrica
    Valor
    Nível final
    313
    Batalhas
    27
    Mortes
    2
    Chefes
    0
    Ouro total
    14.400 G
    Melhor combo
    4
    Maior dano
    1.184
    Mapas
    2
    Atributos
    São 5 atributos, cada um com um ganho fixo por Stat Point. O personagem recebe 4 Stat Points por nível e escolhe onde investir; não existe crescimento automático. [C+EXT]
    Atributo
    Inicial (personagem 1)
    Ganho por ponto
    Função (texto do jogo + observação)
    HP
    100
    +5
    Vida máxima. Restaurada a 100% após cada batalha. [C]
    ATK
    10 (+5)
    +3
    Base do dano causado. [C]
    DEF
    10 (+5)
    +3
    Reduz o dano recebido. [C qualitativo]
    AGI
    5
    +2
    "Combo attack and critical rate depend on AGI." [C texto]
    LUC
    1
    +1
    "Critical rate, gained items, and gained money depend on LUC." [C texto]
    Regras de alocação [C]:
    • O valor entre colchetes, como em 10(+5), é o bônus de equipamento e de Character Abilities. O +5 inicial vem da Dagger (ATK 5) e da Leather Armor (DEF 5).
    • Half aloca floor(pontos/2) no atributo (136 → 68). All aloca tudo.
    • Os botões HP, ATK, DEF, AGI e LUC alocam 1 ponto e podem ser segurados. Cancel desfaz a alocação pendente e OK confirma.
    • Os pontos se acumulam entre batalhas. Na Settings > "After the battle", a opção 1 abre a alocação após cada batalha, a 2 pergunta e a 3 não abre.
    • Verificação da regra de 4 pontos por nível: 22 níveis → 88; 8 → 32; 21 → 84; 11 → 44; 19 → 76; 14 → 56.
    O ganho por ponto pode variar por personagem. Fontes externas descrevem multiplicadores por posição na grade 4×4 [EXT], mas aqui só o personagem 1 foi testado. [NV para os demais]
    Experiência e níveis
    A EXP para subir de nível cresce quase linearmente dentro de faixas, com saltos entre elas (perto de LV 50, 100, 200 e 300). Já a EXP dada pelos inimigos cresce muito mais rápido com o nível da área. Por isso uma única batalha rende de 7 a 22 níveis. Os valores medidos são [C]; o formato da curva é [P]; a fórmula exata é [NV] e também não foi encontrada em fontes externas.
    EXP necessária para o próximo nível, need(L), lida na barra "x / need" [C]:
    Faixa
    Pontos medidos (LV: need)
    need / LV
    Ajuste linear aproximado [P]
    1–49
    1: 3 · 23: 29 · 31: 36
    1,2–3,0
    ~0,9·L + 8
    50–99
    52: 108 · 63: 120 · 72: 151
    1,9–2,1
    ~2·L
    100–199
    106: 475 · 155: 650 · 175: 736 · 193: 781
    4,0–4,5
    ~3,5·L + 100
    200–299
    207: 1189 · 215: 1242 · 229: 1253 · 237: 1287 · 254: 1389 · 270: 1461 · 285: 1493
    5,2–5,8
    ~3,9·L + 380 (±2%)
    300+
    300: 1734 · 313: 1791
    5,7–5,8
    ~4,4·L + 410
    EXP ganha por vitória [C]:
    Área LV
    EXP por vitória
    Níveis ganhos por batalha
    1
    250
    22 (no LV 1), 8 (no LV 23)
    72
    6.040
    19 (LV 87 → 106)
    90
    9.040 (ovo) · 9.220 (pássaro)
    7–14
    90 com EXP ×1,5
    13.560 = 9.040 × 1,5 (exato) · 13.831 ≈ 9.220 × 1,5
    18–20
    132
    22.640
    13–17
    Regras [C]:
    • A EXP é fixa por tipo de inimigo: o mesmo inimigo deu o mesmo valor em batalhas diferentes.
    • O bônus de EXP da área multiplica esse valor exatamente.
    • A EXP excedente passa para os níveis seguintes, sem limite de level-ups por batalha.
    Implicação de design: como a EXP por área cresce mais rápido que need(L), a vantagem está em lutar na área mais alta que o personagem ainda vença. Esse é o centro da tomada de decisão do jogo.
    Combate
    O combate é automático e por turnos alternados. O dano normal ficou em ~75–88% do ATK do jogador, com variação aleatória de cerca de ±7%. Críticos multiplicam o dano por ~2–2,3, combos dão golpes extras, e o HP volta ao máximo a cada batalha.
    Regras de fluxo
    • Turnos se alternam: "Attack X Damage!" e depois "Enemy's attack Y Damage". [C]
    • O combo é um ataque extra no mesmo turno ("Attack 498 Damage! 2 Combo!"). Foi observada uma cadeia até "4 Combo" (Best Combo = 4). [C]
    • Crítico aparece como "Damage! Critical!" e pode acontecer dentro de um combo ("1184 Damage! 3 Combo! Critical!"). [C]
    • Pausa: tocar durante a batalha pausa e mostra o log mais "HP recovery" e "Reopen battle". [C]
    • HP recovery: recupera todo o HP no próximo turno. Custo = floor((ouro_atual + HP_máx) / 2) + 3000. Validado 3 vezes: LV 1, 0 G, HP 100 → 3.050; 5.700 G, HP 605 → 6.152; 6.500 G, HP 605 → 6.552. [C+EXT] Pela wiki, curar consome o próximo ataque. [EXT]
    • Derrota: o HP do jogador chega a 0, aparece "Lost the battle" e a penalidade de BP é aplicada. [C]
    • Contra inimigos muito mais fracos a batalha se resolve quase instantaneamente (1 golpe). [C]
    Dano — dados medidos [C]
    Situação
    ATK jogador
    DEF jogador
    Dano causado (normal)
    Crítico
    Dano recebido
    Área 1, slime
    15
    15
    6–9
    18–27
    4–9
    Área 1, galinha
    207
    78
    162 (1 golpe)
    —
    0
    Área 90, ovo/pássaro
    663
    186
    484–587
    —
    87–102
    Área 132, ceifador
    663
    186
    477–558
    987–1.184
    139–165
    Fórmulas
    • Dano normal ≈ ATK × k × rand(0,93–1,07). Na área 90+, k ≈ 0,79; contra inimigos de nível baixo, k fica menor. Isso sugere um redutor por defesa do inimigo. [P] A fórmula exata de ATK contra DEF não foi encontrada, nem externamente. [NV]
    • Multiplicador de crítico: de ~2,0 a 2,3 na área 132, e de ~3 na área 1 (com ATK baixo, a constante pesa mais). Isso é compatível com a fórmula datamined dmg_crit = (dmg+1) × (1,75 + crit/5) + 4, faixa ×1,75 a ×2,75. [P+EXT]
    • Chance de combo (datamined) [EXT]: rate = AGI/BEIT × 0,52 + 0,06 + pequenos bônus, teto 0,5 vindo de atributos (até 0,7–0,8 com anéis e HP baixo). O bônus de área "Combo & Crit" aplica rate × 1,1 + 0,075. O dano esperado por turno é 1/(1 − rate) golpes. BEIT é a "força" normalizada do inimigo.
    • Chance de crítico (datamined) [EXT]: AGI/BEIT × 0,07 + LUC/BEIT × 0,22 + 0,06, teto de 35% vindo de atributos.
    • Defesa do jogador: reduz o dano recebido com retorno decrescente. Com DEF 186, inimigos de área 90 causaram ~90 e os de área 132 causaram ~150. [P] A fórmula exata é [NV].
    AGI e LUC tiveram efeito pequeno nos testes: com AGI 95 e LUC 2, os combos apareceram em ~20% dos turnos. As fontes externas recomendam priorizar ATK, HP e DEF. [P+EXT]
    Mapa e áreas
    O mapa é aberto e dividido em retângulos de nível fixo. Nada bloqueia o acesso: o jogador pode entrar em qualquer área, e numa área acima do seu nível aparece o aviso "WARNING! This is a area is LV:72". A dificuldade é controlada pela escolha do jogador, não por portas. [C]
    Área LV
    Posição observada
    Ouro por vitória
    EXP por vitória
    Inimigos vistos
    1
    Centro (praça de pedra, início)
    200
    250
    Slime, galinha
    25
    Sul da área 1
    350 (uma vez 700)
    não lida
    Águia, cavaleiro
    72
    Sul da 25
    400
    6.040
    Lobo/guerreiro
    90
    Abaixo da escada no penhasco
    400
    9.040–9.220
    Ovo, pássaro branco
    132
    Oeste da 90
    400–450
    22.640
    Ceifador com lanterna
    Regras [C]:
    • O nível do inimigo é dado pela área onde o encontro acontece, não pela posição do inimigo.
    • O ouro cresce devagar com o nível da área (×2 da área 1 à 132), enquanto a EXP cresce perto de ×90. O ouro serve para economia entre partidas e a EXP para progresso dentro da partida.
    • O encontro é aleatório, regido pelo Encounter Gauge, que enche enquanto o jogador anda. Anéis alteram a velocidade de enchimento.
    • O mundo 1 vai até cerca de LV 5.200, em 6 mapas, e há 9 mundos. O mundo seguinte é desbloqueado matando o chefe que teletransporta. [EXT] Statistics registrou "Maps: 2" após descer a escada. [C]
    Bônus de área e botão Bonus
    Os bônus de área são modificadores temporários presos a uma área do mapa, com um contador entre parênteses. Eles migram e trocam de tipo ao longo da partida, dando ao jogador motivo para se mover. [C]
    Sequência observada [C]:
    Momento
    Área
    Bônus mostrado
    Início
    1
+ Combo & Crit (5)
  Após batalhas 1–4
  1
+ Combo & Crit (4) → (3) → (2) → (1), mesmo lutando em outras áreas
  Batalha ~7
  72
+ Combo & Crit (1), depois (3)
  Batalha ~7
  1
  Money ×3 (2)
  Batalha ~10
  72
  Money ×3 (2)
  Batalha ~13
  90
  EXP ×1,5 (3); a EXP subiu exatamente ×1,5
  Batalha ~19
  90
  !!! (3); gerou um inimigo sombra especial que deu 5.000 G e 1 EXP
  Interpretação [P]:
  • O contador cai 1 a cada batalha feita em qualquer área.
  • Ao zerar, o bônus some e outro nasce em outra área.
  • Pelas fontes externas, dura de 1 a 6 batalhas e os tipos possíveis são: Money ×2/×3/×4/×7, EXP ×1,5/×2, Combo&Crit, Enemy ATK ×0,5, Enemy HP ×0,5 e os raros ??? / ! / !!! / !?. Alguns só aparecem após N partidas jogadas. [EXT]
  • Na wiki, o "!!!" leva a um chefe que abre a "área preta". No teste ele gerou um inimigo de ouro, e a diferença não foi resolvida. [NV]
  O botão Bonus fica no topo do mapa e oferece duas ações [C texto da UI; não acionadas]:
1. "Bonuses will be added all over the map you are currently on": 5 usos por dia, 1 por partida.
2. "Obtain money at random. The quantity increases as the number of uses goes up": 1 por dia, até 2 por partida. O valor cresce com o total de usos.
   São recursos de retenção diária. Nenhuma fonte confirma ligação com anúncios. [NV]
   Economia
   O ouro existe só dentro da partida e se converte em poder permanente via equipamentos e slots, comprados antes de terminar. A cura em batalha também consome ouro e compete com esse investimento. [C]
   Fonte ou destino
   Valor
   Status
   Vitória normal
   200 G (área 1) a 450 G (área 132), fixo por área com pequena variação por inimigo
   [C]
   Multiplicador de bônus de dinheiro
   350 → 700 uma vez na área 25
   [P]
   Inimigo de ouro (bônus !!!)
   5.000 G e 1 EXP
   [C]
   LUC
   Aumenta o ouro ganho. Datamined: 1 + LUC/BEIT × 0,77, mais degraus, até ×4
   [C texto da UI + EXT]
   Cura em batalha
   floor((ouro + HPmáx)/2) + 3000: o custo sobe com o ouro guardado, o que impede abusar da cura quando se está rico
   [C]
   Slots de acessório
   1 aberto. Os demais custam 5.000, 30.000, 250.000, 500.000 e 750.000 G, mais 4 slots com custo não lido (10 no total). O desbloqueio de 5.000 G foi feito e debitado na hora.
   [C]
   Loja
   Preços de 300 G a 1.700.000 G (catálogo abaixo)
   [C preços]
   Fim de partida
   "Money cannot be carried over": o ouro zera; equipamento e Character Abilities LV ficam
   [C]
   Meta-loop [C]: no game over o jogo convida a "use your remaining money to buy strong equipment". Cada partida termina convertendo ouro em itens permanentes, e o próximo recorde depende disso.
   O ouro de uma partida (14.400 G) cobre os itens iniciais da loja. Os do fim do catálogo (1,4 M G) exigem várias partidas ou áreas bem mais altas. [C+P]
   Equipamentos
   Armas e armaduras têm dois números: um valor bruto (+ATK/+DEF) e um multiplicador percentual (×%). Esse multiplicador escala o atributo inteiro, e por isso em nível alto vale mais que o valor bruto. [C valores · EXT semântica] Também há 1 slot de arma, 1 de armadura e até 10 de acessório. [C]
   Regras:
   • Duplicatas: "If you obtain multiple copies of weapons and armors, they get stronger. Enemies' drop rates will decline after the second weapon or armor drop." [C texto da UI] O limite é de 10 cópias de arma ou armadura e 3 de acessório, e o drop cai ×0,55 por cópia já possuída. [EXT] A fórmula do reforço por cópia é [NV].
   • Semântica [EXT]: stat_final = (base + alocação + gemas + bruto) × (1 + (% − 100%) + outros %). Exemplo: 225% equivale a +125%.
   • Itens "?" são vistos só por drop ou em estágio avançado. Statistics conta 82 armas, 36 armaduras e 72 acessórios; a loja lista 57 / 23 / 57 entradas. [C] As entradas 58–82 são variantes +1/+2 do Hard Mode. [EXT]
   • Estado inicial: Dagger (ATK 5, ×100%) e Leather Armor (DEF 5, ×100%). [C]
   Armas à venda [C]
   Nº
   Nome
   +ATK
   ×ATK
   Preço (G)
   1
   Dagger
   5
   100%
   inicial
   2
   Bowie Knife
   30
   110%
   300
   4
   Iron Sword
   140
   125%
   6.000
   5
   Bronze Sword
   400
   130%
   17.000
   6
   Iron Axe
   1.400
   135%
   44.000
   7
   Steel Sword
   800
   160%
   83.000
   9
   Broadsword
   1.200
   180%
   110.000
   10
   Francisca
   2.300
   175%
   144.000
   11
   Scimitar
   1.100
   225%
   228.000
   13
   Glaive
   2.700
   180%
   244.000
   23
   Silver Sword
   1.700
   260%
   470.000
   25
   Samurai Sword
   5.000
   225%
   580.000
   37
   Mace
   8.000
   250%
   800.000
   30
   Knight Sword
   1.600
   290%
   820.000
   34
   Samurai Longsword
   12.000
   225%
   1.400.000
   Armaduras à venda [C]
   Nº
   Nome
   +DEF
   ×DEF
   Preço (G)
   1
   Leather Armor
   5
   100%
   inicial
   2
   Iron Armor
   40
   110%
   1.000
   3
   Bronze Armor
   200
   125%
   8.000
   4
   Steel Armor
   550
   140%
   22.000
   5
   Scale Armor
   880
   145%
   64.000
   6
   Spike Armor
   920
   160%
   130.000
   8
   Half Plate Armor
   700
   210%
   230.000
   9
   Silver Armor
   700
   250%
   480.000
   10
   Samurai Armor
   1.400
   240%
   600.000
   13
   Knight Armor
   800
   280%
   800.000
   Acessórios à venda [C]
   Família
   Tier base → +3: efeito (preço G)
   HP Gem
   +400 (2.000) · +2.000 (40.000) · +5.000 (150.000) · +15.000 (580.000)
   ATK Gem
   +200 (3.000) · +1.000 (50.000) · +3.000 (150.000) · +10.000 (640.000)
   DEF Gem
   +200 (3.000) · +1.000 (50.000) · +3.000 (150.000) · +10.000 (640.000)
   AGI Gem
   +150 (2.000) · +800 (40.000) · +2.000 (140.000) · +7.000 (500.000)
   LUC Gem
   +100 (2.000) · +500 (40.000) · +1.200 (140.000) · +4.000 (500.000)
   EXP Gem
   +10% EXP (5.000) · +20% (120.000) · +30% (500.000)
   Play Gem
   ATK×, DEF× e AGI× crescem com o nº de partidas jogadas; 40% de chance de não ter efeito (7.000)
   Critical Damage Ring
   Aumenta o dano crítico (170.000)
   First Critical Ring
   O primeiro ataque é sempre crítico (210.000)
   Small Recovery Necklace
   Recupera 2% do dano causado (1.700.000)
   Encounter Reduction / Increase / Instant Ring
   Gauge mais lento (50.000) / mais rápido (1.000) / encontro instantâneo (80.000)
   Movement Gem / +1
   Mais velocidade no mapa (10.000 / 200.000)
   Battle Point Ring / +1
   +1 BP (10.000) / +3 BP (400.000)
   As gemas de atributo têm progressão de preço geométrica, cerca de ×3–4 por tier, para um efeito ×3–5. O Battle Point Ring é o item mais estratégico, porque aumenta o recurso que limita a partida.
   Personagens, Base Abilities, chefes e mundos
   Esta é a camada de progressão de longo prazo. Quase toda a informação veio de fora, porque a partida testada não chegou a nenhum chefe. No jogo só se confirmaram a grade de 16 personagens, o contador "Base Abilities: 0LV" e o aviso "Character Ability information is removed when a boss is defeated". [C]
   • Grade 4×4 [EXT]: cada posição tem multiplicadores (KP) que favorecem um atributo. O topo puxa para ATK, a direita para LUC, a base para DEF, a esquerda para AGI e o centro para HP.
   • Bônus de personagem [EXT]: BPL = (nívelJogador + nívelPersonagem) × 0,25 + 0,75. Depois, bônus% = KP × BPL × {HP 0,06; ATK 0,07; DEF 0,07; AGI 0,075; LUC 0,08}.
   • Nível do personagem [EXT]: os níveis somados na partida viram EXP do personagem. Os limiares são 10 mil, 100 mil, 700 mil, 1,8 milhão e assim por diante, até 170 milhões no nível 20 (máximo).
   • Base Abilities [EXT]: +1 na primeira vez que se mata cada chefe-marco, no máximo +1 por partida. Os chefes ficam nos níveis 710, 2.000, 2.222, 20.000, 25.555, 36.000, 37.777, 41.111 e 450.000, e o máximo são 18 (9 chefes × 2 modos).
   • Chefes [EXT]: dão de +2 a +7 BP. Os que teleportam abrem o mundo seguinte, e não há volta.
   • Mundos [EXT]: são 9, de LV 1–5.200 até LV 256 mil–450 mil.
   • Hard Mode [EXT]: abre no LV 100.000. Começa com 10 BP e tem 10 vidas recarregáveis. Dá EXP ×24 e ouro ×5; os inimigos têm HP ×10 e ATK ×8,5.
   • Ranking em tempo real: só entra com LV ≥ 5.000 ("Real-time rankings Conditions: 5000LV"). [C]
   Dependências entre sistemas
   Tudo começa na escolha de área, que é limitada pelos BP. A vitória divide a recompensa em dois circuitos: o da EXP, que vira níveis e atributos dentro da partida, e o do ouro, que vira equipamento para as próximas partidas ou paga uma cura que evita os −3 BP da derrota.
   Balanceamento
   O jogo controla a dificuldade com um único recurso escasso, os 30 BP, e com uma única decisão recorrente: em qual área lutar. Risco (perder 3 BP) e recompensa (EXP muito maior) crescem juntos com o nível da área. [C+P]
   Alavancas observadas:
   Alavanca
   Como funciona
   Efeito no jogador
   BP fixo (30)
   −1 por encontro, −3 por derrota
   Cada batalha tem custo de oportunidade; a derrota pesa o triplo
   EXP por área ≫ need(L)
   EXP da área 1 → 132 cresce ~×90; need cresce ~×10
   Pular de área dá crescimento exponencial ("inflação")
   Stat Points manuais
   4 por nível, sem crescimento automático
   Esquecer de alocar deixa o personagem fraco; a ordem de prioridade (HP/ATK/DEF) é uma decisão real
   HP cheio por batalha
   Cada encontro é independente
   A pergunta é só "venço este inimigo de uma vez?"; não há desgaste
   Cura cara e proporcional ao ouro
   (ouro + HPmáx)/2 + 3000
   Salva de uma derrota, mas tira dinheiro do meta-progresso
   Ouro não persiste, equipamento sim
   Conversão no fim da partida
   Cria o meta-loop: cada run fortalece a seguinte
   Multiplicadores (×%) nos itens
   Escalam o atributo inteiro
   Mantêm os itens relevantes mesmo com atributos na casa dos milhares
   Bônus de área migratórios
   Temporários, de 1 a 6 batalhas
   Obrigam o jogador a se mover e replanejar a rota
   Encontro aleatório
   Gauge + anéis
   Controla o ritmo, não a dificuldade
   Recomendações para um jogo inspirado:
1. Mantenha um recurso de partida curto e fixo (BP) e faça a derrota custar múltiplos dele.
2. Faça a recompensa por zona crescer mais rápido que o custo de nível. Use degraus na curva de need(L), como 50/100/200/300, para criar platôs de decisão.
3. Separe as moedas: EXP serve à partida e ouro serve ao meta-progresso. O ouro de uma run deve comprar só o início do catálogo.
4. Use multiplicadores percentuais em equipamentos para evitar obsolescência, e duplicatas com retorno decrescente para alongar a coleta.
5. Deixe o mapa aberto, com aviso de perigo em vez de bloqueio: a decisão de risco é o próprio jogo.
6. Mantenha AGI e LUC com tetos baixos (combo até 50%, crítico até 35%), para que não dominem ATK, HP e DEF.
   Registro de testes
   Partida única com o personagem 1, de 2026-10-13. "?" indica valor não lido porque a batalha se resolveu instantaneamente.
#
Área
LV antes → depois
Ouro
EXP
BP após
Observação
1
1
1 → 23
200
250
29
Slime: 6–9 normal, 18–27 crítico, combos até 4; HP 100 → 50
2
1
23 → 31
200
250
28
Galinha morta com 1 golpe de 162 (ATK 207)
3
72
31 → 31
0
0
25
WARNING LV 72; derrota (−3 BP)
4
25
31 → 52
350
?
24
need(52) = 108
5
25
52 → 63
700
?
23
Provável bônus de dinheiro
6–8
25
63 → 87
350 cada
?
20
Batalhas instantâneas
9
72
87 → 106
400
6.040
19
HP 265 → 230
10–12
72
106 → 141
400 cada
?
16

13
90
141 → 155
400
9.040
15
Golpe 550; recebeu 87
14
90 (EXP ×1,5)
155 → 175
400
13.831
14
487–561 normal
15
90 (EXP ×1,5)
175 → 193
400
13.560
14
= 9.040 × 1,5
16
90
193 → 207
400
13.831
13

17
90
207 → 215
400
9.220
12
Pausa: cura = 6.152 com 5.700 G
18–19
90
215 → 229
400 cada
9.220 / 9.040
10
Pausa: cura = 6.552 com 6.500 G
20
90
229 → 237
400
9.220
8

21
90 (!!!)
237 → 237
5.000
1
7
Inimigo sombra especial
22
132
237 → 254
450
22.640
6
Terminou com HP 20/605
23
132
254 → 270
450
22.640
5
Crítico em combo de 1.184
24
132
270 → 285
400
22.640
4
Críticos de 1.111 e 987
25
132
285 → 300
400
22.640
3
Terminou com HP 3/605
26
132
300 → 313
400
22.640
2

27
132
313 → 313
0
0
0
Derrota com 2 BP → BP = 0 → GAME OVER
Atributos na maior parte da partida: HP 605, ATK 658(+5), DEF 181(+5), AGI 95, LUC 2. Os Stat Points ganhos depois do LV 106 não foram distribuídos, de propósito, para forçar uma derrota em área alta.
Lacunas e limitações
A principal lacuna é a compra de itens. No Google Play Games para PC, os toques nas linhas da loja não foram registrados (6 tentativas, com toques de vários tipos), enquanto botões comuns funcionaram. Por isso o efeito real de equipar ou empilhar itens não foi medido.
[ ] Comprar e equipar uma arma (por exemplo, a Iron Sword) e medir o novo ATK. Isso valida (base + bruto) × %. Precisa de outro dispositivo ou emulador.
[ ] Medir o reforço por cópia duplicada.
[ ] Fórmula de dano ATK × DEF do inimigo e de DEF do jogador. Teste: mesmo inimigo, variando um atributo por vez.
[ ] Ler a EXP das áreas 25 e 72 em batalhas não instantâneas, para completar a curva de EXP por área.
[ ] Testar os outros 15 personagens (ganho por ponto e bônus da grade).
[ ] Chegar a um chefe (LV 710+), verificar BP extra e Base Ability, e descobrir o que muda em "Character Ability".
[ ] Custo dos 4 slots de acessório pequenos.
[ ] Comportamento do bônus "!!!": inimigo de ouro ou portal, como diz a wiki?
Outras limitações:
• Toques no emulador às vezes contam em dobro (por exemplo, "Half" aplicado duas vezes), o que pode pular telas.
• Batalhas contra inimigos fracos se resolvem sem animação, então parte dos valores de EXP ficou sem leitura.
• Os dados externos vêm de uma wiki de fãs (datamined da v1.5.4) e podem divergir da versão atual.
Fontes
Tudo marcado como [C] vem da observação direta no jogo. As fontes [EXT] foram reunidas por um agente de pesquisa; elas não foram reabertas individualmente para esta redação.
• Inflation RPG Wiki (Fandom) — Basics
• Fandom — Combo Rate
• Fandom — Critical Hits
• Fandom — Item Drop
• Fandom — Gold Reward
• Fandom — Player Values
• Fandom — Bonus
• Fandom — Maps
• Fandom — Bosses
• Fandom — Hard Mode
• Fandom — Patch Notes
• Gamerch JP — wiki インフレRPG
• App Store JP — インフレーションRPGクエスト