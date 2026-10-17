# Inflation RPG — Progression, Characters, BP, Run Lifecycle, Save Data

Reverse-engineered from the decompiled AS3 under `reverse/decomp/scripts/`. All paths below are relative to that directory; `file:line` cites the decompiled source. Companion data: `reverse/extracted/characters.json`. Combat damage, enemies, items and maps are documented separately.

Vocabulary used by the code: `sutetasu` = stats, `kyarakuta` = character, `nokoriBattleTimes` = consumed battle points, `stPt` = unspent stat points, `tukattastpt` = spent stat points, `houseki` = gem, `hikitugi` = data transfer, `tyutoriaru` = tutorial, `soubi` = equipment, `kaihuku` = heal, `hardmode` = hard mode, `g` = gold, `sumg` = total gold earned.

---

## 1. Core state (`Class/GData.as`)

Per-run state lives in `GData`; permanent state in `Class/GameSaveData.as`. Both are mirrored into one Flash `SharedObject` (see section 7).

| Field | Meaning | New-game value (`GData.as:366-440`) |
|---|---|---|
| `hardmode` | 0 normal / 1 hard | from menu choice (`:369-376`) |
| `lv` | character level | 1 (`:387`) |
| `lvC2` | anti-cheat shadow of level (0.5 per level) | 0.5 (`:388`) |
| `hp, atk, def, speed, luk` | base stats (5 stats; UI labels HP/ATK/DEF/AGI/LUC) | 100 / 10 / 10 / 5 / 1 (`:389-393`) |
| `stPt` | unspent stat points | 0 (`:394`) |
| `tukattastpt` | stat points spent so far | 0 (`:395`) |
| `deadcount` | battles lost this run | 0 (`:396`) |
| `g`, `sumg` | gold, total gold earned | 0, 0 (`:397`) |
| `exp` | EXP **within the current level** (resets at each level-up) | 0 (`:398`) |
| `onenextexp` / `onecurrentlvexp` | EXP needed to finish current level / previous level's requirement | `OneExpTableFunc(lv)` / `OneExpTableFunc(lv-1)` (`:785-796`) |
| `nokoriBattleTimes` | **consumed** battle points (BP) | 0 (`:400`) |
| `BattleTimes` | battles started this run | 0 (`:401`) |
| `MAXnokoriBattleTimes` | BP pool size (30 normal / 10 hard + items) | recomputed in `EqStUpdate` (`:583-590`) |
| `oneBounas1_usecount`, `oneBounas2_usecount` | daily-bonus uses this run | 0 (`:402-403`) |
| `startRealTimeRankingType` | which stat gets the real-time-ranking bonus (0 HP, 1 ATK, 2 DEF, 3 AGI, 4 LUC) | 0 at NewGame (`:404`); re-rolled by `NetRealTimeRanking.as:100` with weights [4,5,3,2,3] when a new run is registered online |
| `startGameVersion` | app version the run started on | `Const.getAppVar()` (`:405`) |
| `ItemEquip[16]` | equip slots: [0] weapon id, [1] armor id, [2..11] accessory ids, -1 = empty, -2 = locked | first ever run: `[0,0,-1,-2 x13]` (`:406-415`); later runs: copied from `gamesavedata.gameItemEquip` (`:421-427`) |
| `bossHanteiV[128]`, `bossWinV[128]` | per-run: boss beaten flag / boss win count | all 0 (`:432-437`) |
| `heronum` | selected character 0..15 | set by Title (`TitleVar.as:67`) |
| `gameon`, `isGameOverNow` | run in progress / game-over screen pending | true / false (`:385-386`) |

Hard-mode bookkeeping at NewGame (`GData.as:377-384`): if `hardlefttimes == 0` then `hardtime = now`; `hardlefttimes++`.

---

## 2. Characters (16)

Selection grid is 4x4; `heronum = row*4 + col` (`Title.as:965-1000`). Sprite sheets per hero: `GameVar.as:31-129` (`heropng{N}_0/_2/_5`). All 16 characters have **identical starting stats** (HP 100, ATK 10, DEF 10, AGI 5, LUC 1 — `GData.as:389-393`). The only difference is the "character power" weights `KPhp/KPatk/KPdef/KPspeed/KPluk` (`GData.as:448-507`):

| Rule (`GData.as`) | Heroes | Effect |
|---|---|---|
| `:468` | 5, 6, 9, 10 (centre 2x2) | KPhp +2 |
| `:472` | 1, 2, 4, 7, 8, 11, 13, 14 (edge-middles) | KPhp +1 |
| `:476` | 0-3 (row 0) | KPatk +2 |
| `:480` | 4-7 (row 1) | KPatk +1 |
| `:484` | 12-15 (row 3) | KPdef +2 |
| `:488` | 8-11 (row 2) | KPdef +1 |
| `:492` | 0, 4, 8, 12 (col 0) | KPspeed +2 |
| `:496` | 1, 5, 9, 13 (col 1) | KPspeed +1 |
| `:500` | 3, 7, 11, 15 (col 3) | KPluk +2 |
| `:504` | 2, 6, 10, 14 (col 2) | KPluk +1 |

Corners (0, 3, 12, 15) have KPhp 0. Full per-hero table is in `characters.json`.

### 2.1 Character power -> stat multiplier (`GData.as:740-749`)

```
L = gamesavedata.kyarakutalv            // "base ability LV", 0..18, shared by all heroes
c = gamesavedata.getCurrentKyaraLv()    // this hero's own ability LV, 0..20(+)
m = (L > 0) ? ((L + c) * 0.25 + 0.75) * (1 + kyarakutaNouryokuUp / 100) : 0
ebhp    += KPhp    * m * 0.06
ebatk   += KPatk   * m * 0.07
ebdef   += KPdef   * m * 0.07
ebspeed += KPspeed * m * 0.075
ebluk   += KPluk   * m * 0.08
```
`kyarakutaNouryokuUp` is the sum of accessory `baset1 == 820` values (`GData.as:732-735`). While `kyarakutalv == 0` (no qualifying boss beaten yet) characters give **no** bonus at all; the selection screen hides the ability LV labels (`Title.as:699-720`).

### 2.2 Effective stats (`GData.as:750-761`)

```
ehp    = ephp    + (ephp    + hp)    * ebhp      // likewise eatk/edef/espeed/eluk
speedwariai = int((speed+espeed)/2) / (int((hp+ehp)/5)+int((atk+eatk)/3)+int((def+edef)/3)+int((speed+espeed)/2)+int((luk+eluk)/1))
lukwariai   = int((luk+eluk)/1)     / (same denominator)
```
`ep*` = flat bonus from equipment (weapon `plus` -> epatk, armor `plus` -> epdef, accessories baset 30-34/40-42, play gem baset 35), `eb*` = fractional multipliers (weapon/armor `multi*0.01` + character power). Battle uses `base + e*` (`BattleVar.as:240-245`), then multiplies one stat by `1 + realtimeRankingBonus%` (`BattleVar.as:258-279`; bonus = `int(((1-rank/players)^3*0.885 + (1-rank/players)*0.15)*15*10)/10`, max 15 — `NetRealTimeRanking.as:375-394`).

### 2.3 Base ability LV (`kyarakutalv`, permanent)

`WinBoss_UpKyrakutaPowerLv.as:11-29`: count of `gamesavedata.WinbossV[i] == 1` for `i` in {0,1,2,8,9,12,13,19,28} (normal) and {100,101,102,108,109,112,113,119,128} (hard, = id+100). Max 18. Recomputed after every boss win; only ever raised (`StageMap.as:1909-1916`), then `EqStUpdate` and a dialog "base ability [0]LV: stat multiplier bonus added" on return to the map (`StageMap.as:625-631`).

### 2.4 Per-character ability LV (`kyarakutaKozinExp[20]`, permanent)

* At game over, if `kyarakutalv != 0`, the hero gains `exp += final lv` (`GameOver.as:351-354`, `GameSaveData.as:450-458`), but only while `exp < kyaraExpTable[19]` (= 170,000,000; `okKyaraLvUp`, `GameSaveData.as:481-488`).
* `getkyaraLv(exp)` = `(largest i with exp >= kyaraExpTable[i]) + 1`, else 0 (`GameSaveData.as:465-479`). Table (`GameSaveData.as:232-259`):

| LV | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| exp >= | 10k | 100k | 700k | 1.8M | 3.6M | 6M | 10M | 14M | 18M | 22M | 28M | 34M | 40M | 50M | 65M | 80M | 100M | 120M | 140M | 170M | 200M | 240M | 280M |

`SeigenKyaraLv = 20` is the intended cap (`GameSaveData.as:10`); because exp is only gated *before* adding, a single huge level total can overshoot into LV 21-23 (table has 23 entries).

* Game-over screen text (`GameOver.as:140-169`) shows old LV -> new LV, or "cannot raise further" when at cap.

---

## 3. Level & EXP

### 3.1 EXP table (`Game.as:270-275, 280-1158`)

`OneExpTableFunc(i)` = EXP needed to go from level `i` to `i+1` (**per-level, not cumulative**). Table has 125,000 entries; beyond that it is the closed formula.

```
T[0..9] = 3,3,4,4,6,6,6,8,8,8
for i in 10..119999:                     // loop body is unrolled 10x by the decompiler; all copies identical
    v = T[i-1]
    if      i%121==0: v+=30
    elif    i%103==0: v+=26
    elif    i%97==0:  v+=23
    elif    i%83==0:  v+=17
    elif    i%79==0:  v+=16
    elif    i%67==0:  v+=15
    elif    i%43==0:  v+=13
    elif    i%37==0:  v+=11
    elif    i%23==0:  v+=8
    elif    i%21==0:  v+=6
    elif    i%13==0:  v+=4
    elif    i%7==0:   v+=2
    elif    i%3==0:   v+=int(i*0.02)
    if   i%3000==0: v+=400  elif i%1000==0: v+=200
    if   i%500==0:  v+=200
    if   i%50==0:   v+=20
    if   i%200==0:  v+=300  elif i%100==0:  v+=150
    if   i%15==0:   v+=1
    T[i] = v
for i in 120000..120499: T[i] = max(T[i-1], floor(i*(i*0.0022385+6.35)))   // Game.as:1111-1144
for i in 120500..124999: T[i] = floor(i*(i*0.0022385+6.35))                 // Game.as:1145-1158
OneExpTableFunc(i) = i < 125000 ? T[i] : floor(i*(i*0.0022385+6.35))        // Game.as:270-275
```
Sample values: T[1]=3, T[2]=4, T[5]=6, T[10]=8, T[13]=12, T[15]=15, T[21]=21, T[30]=36, T[50]=103, T[100]=436, T[200]=1134, T[500]=3415, T[1000]=8292, T[3000]=38440, T[10000]=284974, T[50000]=5918264, T[100000]=23034443, T[119999]=33000775, T[120500]=33268754, T[125000]=35770312.

`lvUpdata()` (`GData.as:785-796`): `onenextexp = OneExpTableFunc(lv)`, `onecurrentlvexp = OneExpTableFunc(lv-1)` (lv>0).

### 3.2 Level-up (`GData.as:764-783`)

```
lvupFunc():
  cap = hardmode ? 30_000_000 : 10_000_000
  if lv <= cap:  stPt += 4 + GetPlusStPt;  lv += 1;  lvC2 += 0.5;  lvUpdata()
```
So max level is cap+1. Stat points per level = **4**, +1 with an accessory of `baset1 == 700`, +2 with `701` (701 wins; `GData.as:664-671`). `lvC2` is about lv/2 and is used only for the ranking anti-cheat (`GameOver.as:379-385, 445-447`).

### 3.3 Applying battle EXP (`Battle.as:533-806`)

Only on a **win**. `EneExp` is computed in `BattleVar.as:117-123, 125-130, 142, 227` (`OneExpTableFunc(stageLv) * tekiseiLvBai * (1 + x/50)`, x12 in hard mode and x2 more when `BossSyu < 32` [i.e. normal enemies and bosses 0-31], x `expbairitu` [1 + sum of baset 60 values/100], floored).

```
getExpNokori = exp + EneExp                      // Battle.as:552
each result frame, up to N level-ups:
  ratio = getExpNokori / onenextexp
  N = 1 + (ratio*1.22 + lvupsitanum*0.3) / (76 + min(40, pow(ratio,0.48)*0.5))
  N = min(N, lv*100); if N < 1 and ratio > 1000: N = 30; N = clamp(N, 1, 11111)      // Battle.as:670-696
  loop N times: if getExpNokori < onenextexp: exp = getExpNokori; done
                else getExpNokori -= onenextexp; lvupFunc(); lvupsitanum++           // Battle.as:699-720
```
Net effect: unlimited multi-level-ups per battle (spread over frames); leftover EXP carries; `exp` always ends `< onenextexp`. Result text shows `lvupsitanum * (4 + GetPlusStPt)` stat points gained (`Battle.as:739`). Losing a battle gives no EXP or gold.

### 3.4 Continue sanity clamp (`TitleVar.as:68-77`)

On "continue", if `exp > OneExpTableFunc(lv + 5)` then `exp = OneExpTableFunc(lv - 1) + 1`.

---

## 4. Stat point distribution (`Class_StMapMenu/StMapMenu_sutetasu.as`)

One stat point gives (`:379-395`, `:484-500`, `:520-536`):

| Stat | per point |
|---|---|
| HP | **+5** |
| ATK | **+3** |
| DEF | **+3** |
| AGI (speed) | **+2** |
| LUC | **+1** |

No growing costs, no caps other than available `stPt`. Allocation is staged (`php/patk/pdef/pspeed/pluk`, `tstPt`) and only applied on **Confirm** (`:259-265`: `hp += php ... stPt -= tstPt; tukattastpt += tstPt; EqStUpdate(false); save`). **Cancel** (`:216-256`) clears the staged values. There is **no undo after confirm**. Pressing Back with staged points shows a Y/N dialog "not applied unless you press Confirm" (`:306-320`).

Input helpers:
* Hold-to-repeat: `PtPlusTiming()` (`:673-801`) returns the number of points added this frame: 1 at frames 0, 5, 9, 11 of a hold, then ramps with hold length `sutetasueefi` and remaining points (e.g. >=30 frames & >3 left -> 2, >=45 -> 5, >=100 -> 21, >=300 -> 161, >=1000 & >50,000 left -> 20,311 per frame).
* All-in (`PtPlusGokuhuri`, `:628-655`): keeps calling `PtPlusTiming` with `1 + eefi/4` iterations per frame until `tstPt == stPt`.
* Half (`PtPlusHanhuri`, `:657-671`): target `hanhuristpt = int((stPt + tstPt)/2 + 0.5)`, adds 1 point per iteration with accelerating iterations (`:514-568`).
* The screen also previews the multiplied gain `floor(p * eb*)` (`:570-626`).

Opened from the map menu (`StMapMenu_top.as:98-103`); the stat button is highlighted by the tutorial until `stPt == 0` (`:303-309`, `Tyutoriaru.as:61-81`).

---

## 5. Battle Points (BP) and the run lifecycle

### 5.1 Pool

`MAXnokoriBattleTimes = hardmode ? 10 : 30` plus the sum of `baset2` of equipped accessories with `baset1 == 500` (`GData.as:583-590, 728-731`). Remaining BP shown = `MAX - nokoriBattleTimes`, clamped to >=0 for display only (`GDataW.as:17-20`, `StageMap.as:1550-1555`). `nokoriBattleTimes` can go negative (boss refunds), so remaining can exceed MAX.

### 5.2 Per battle

| Event | Normal | Hard | Where |
|---|---|---|---|
| Battle starts (also `BattleTimes++`) | consumed +1 | +1 | `StageMap.as:1604-1612` (refused if remaining <= 0) |
| Enemy data loaded (provisional **loss penalty**, `deadcount++`) | +2 | +4 | `BattlePackage/DataMana_WinOrLose.as:23-34` |
| Win: penalty refunded, `deadcount--` | -2 | -4 | `DataMana_WinOrLose.as:71-81` |
| Win vs boss id `b`: refund `WinBossGetBattlePoint(b)` | -bonus | -bonus | `DataMana_WinOrLose.as:86-87` |
| Lose | nothing further | | `DataMana_WinOrLose.as:100-104` (`losebattle++`) |

Net: **win = 1 BP (minus boss bonus); loss = 3 BP normal / 5 BP hard**. Battle-result text mirrors this (`Battle.as:759-787`, `Battle.as:846-860`).

Boss BP bonus (`Include_GameData/WinBoss_PlusNokoriBattleTimes.as:11-129`): id 0->3, 1->7, 2->4, 3->3, 4->3, 5->3, 6->4, 7->4, 8->4, 9->4, 10->3, 11->3, 12->5, 13->3, 14->2, 15->2, 16->2, 17->2, 18->2, 19->4, 20->6, 21->4, 22->5, 23->4, 24->4, 25->4, 26->4, 27->4, 28->5, others 0. The bonus is granted on **every** win against that boss (re-wins only lose the item drop, `DataMana_WinOrLose.as:36-45, 82-85`).

Win also: `AddG(EneG)` (floored; `sumg` only grows, `GDataW.as:32-40`), `bossHanteiV[b]=1`, `gamesavedata.WinbossV[b + hardmode*100] = 1`, `winbattle++`, equipment used is logged, both saves flushed (`DataMana_WinOrLose.as:88-97`). Boss discovery: `HakkenbossV[b]=1` when the boss is loaded (`Include_GameData/EneData.as:108-111`). Map discovery: `HakkenmapV[mapNum]=1` on map load (`StageMap.as:454-462`).

### 5.3 In-battle heal ("kaihuku")

Tapping during battle pauses and offers a full heal for `int(g*0.5 + maxHP*0.5 + 3000)` gold (`DataMana_WinOrLose.as:47-50`, `Battle.as:203`); gold is deducted immediately (`:52-56`), HP is restored to max at the start of the next player turn (`Battle.as:500-509`). High-damage / high-combo records are updated live (`Battle.as:387-389, 459-461`).

### 5.4 Hard mode

Unlock: `Highlv >= 100000` (`Title.as:1116`, `:1072`). 10 plays (`hardlefttimes`), each recovering after 600 s from `hardtime` (`Title.as:1030-1082`). Enemy HP x10, ATK x8.5, gold x5 (`BattleVar.as:108-113`), EXP x12 (x24 for `BossSyu < 32`) (`BattleVar.as:125-130`). Boss flags stored at index +100.

### 5.5 Game over

Trigger: `GameOverHanteiFunc()` (`StageMap.as:2064-2075`) when `remaining BP <= 0 || isGameOverNow`, checked when the map resumes after a battle (`StageMap.as:641`). `GameOver.startf()` (`GameOver.as:56-206`): sets `isGameOverNow = true` and saves (`:69-70`), animates the level counter, shows: character-ability info, total gold, deaths, bosses beaten (count of `bossHanteiV[0..31]`), total battles. Buttons:
* **Equipment menu** - opens the equipment shop with the run's gold (`GameOver.as:282-285, 460-463` -> `StMapMenu.as:405-410`). Gold can be spent here before it is lost.
* **Ranking**, tweet/LINE (increments `tweetcount`/`linecount`), review (if `gameovercount >= 3`).
* **Return to title** - if `g >= cheapest item price && Highlv < 100000` shows a Y/N "gold is not carried over, equipment is" dialog (`GameOver.as:292-303`), then `endf()`.

`HighLvUpdata()` (`GameOver.as:376-438`): submits score if `lv` is within the `lvC2`-derived window and the run started on the current app version; if `lv > Highlv || Highlv == 0` records `Highlv`, the stat strings `shp...sluk` ("base(+equip)"), `s*n`/`se*n` (numeric parts), `HighItemEquip[16]` and `HighItemKazu[16]`.

`endf()` (`GameOver.as:330-374`): `EndGame()` (`gameon=false`), `gameovercount++`, push into `gameovercountV[50]` history, **copy `ItemEquip` -> `gameItemEquip`**, `gdataItemMana.EndGame()` (item counts -> `gameItem*Kazu`), `gdata_ItemEquipSet.EndGame()` (sets 1-5, set index, set-unlock count), add character exp, save all, back to title.

### 5.6 What persists vs resets

| Kept across runs (GameSaveData) | Reset at NewGame (GData) |
|---|---|
| weapon/armor/accessory possession counts (= item levels) | lv=1, lvC2, hp/atk/def/speed/luk |
| equip slots incl. unlocked accessory slots, equipment sets 1-5 + unlock count + active set | stPt, tukattastpt, exp |
| base ability LV, per-character ability exp | g, sumg, deadcount, BattleTimes, nokoriBattleTimes |
| Highlv + best stats + best equipment, HighCombo, HighDamage | per-run boss flags, map position, bonus-map data |
| boss discovered/won, maps discovered, counters, bonus-use counters, options, tutorial flags | daily-bonus per-run uses |

Equipment obtained in a run is only committed to `GameSaveData` **at game over**. "Restart" from the title (`Title.as:539-547`) starts a new run from the last game-over snapshot, so the warning dialog says newly obtained equipment/unlocks would be lost.

Slot and set unlock prices (gold, per run): accessory slots 3..11 cost `AKUSESlotLockMONEY[slot-2]` = 5,000 / 30,000 / 250,000 / 500,000 / 750,000 / 5,000,000 / 5,000,000 / 3,500,000 / 3,500,000 (`Game.as:1159`, `StMapMenu_soubi.as:351-372`; slot 2 starts unlocked). Equipment sets 2-5: 300,000 / 1,500,000 / 2,100,000 / 4,000,000 (`StMapMenu_soubiSet.as:23, 261-266`).

### 5.7 New game / continue

* `gamestart_new(hero, mode)` (`TitleVar.as:63-72`): `NewGame(mode)`, save, `heronum = hero`, load sprites + compute KP, `EqStUpdate`, `startf_newmapdata()` (`newgamecount++`, `StageMap.as:201-206`).
* `gamestart_continue()` (`TitleVar.as:74-83`): reload state; exp clamp (section 3.4). A run started before app version 1.6.5 cannot be continued (`Title.as:502-509`, `root/Const.as:221-232`).
* Title shows a random hero if none saved (`Title.as:190-197`).
* Tutorial (`Tyutoriaru.as`): 4 one-shot dialogs keyed by `gamesavedata.winbattle == 0/1/2/3`, flags in `dataV[4]` saved to the SharedObject.

### 5.8 Daily bonuses (`StageMap.as:2078-2160, 2207-2270`)

Reset at 04:00 local (`:2229-2247`). **Map bonus** (`BounasuMapSet`): uses/day = 5, or 6 if `linecount + tweetcount > 0`; uses/run = 1, or 2 if `apurihyouka2 >= 1` (reviewed this version). **Gold bonus** (`BounasuGetG`): 1/day, 1/run; with `n = gameBounas2_sumusecount`:
```
r = int(rand*(500 + n*500) + n*200 + 500); r *= 1 + int(n/10)/10; r += n*450 + n*n/2; r += 4000
if r>50000:  r=(r*4+50000)/5;  if r>100000: r=(r+100000)/2;  if r>150000: r=(r+150000)/2
if r>200000: r=(r+200000)/2;   if r>250000: r=(r+250000)/2;  if r>300000: r=300000
g += r; sumg += r                                   (all int arithmetic)
```

---

## 6. Accessory effect codes touching progression (`GData.as:600-739`)

| `baset1` | effect |
|---|---|
| 30/31/32/33/34 | +baset2 flat HP/ATK/DEF/AGI/LUC |
| 35 | Play gem: ATK&DEF += `gameovercount * k1`, AGI += `gameovercount * k2`; baset2 1->(3,3), 2->(17,12), 3->(40,30). Each battle has a 40 % chance it does not trigger (`GData_PlayHouseki.as:192-238`, `BattleVar.as:246-256`, message at `Battle.as:132-135`). |
| 40 | +baset2 to all five; 41 ATK/DEF/AGI; 42 HP/ATK/DEF/AGI |
| 60 | EXP x(1 + baset2/100) (additive across items) |
| 700 / 701 | +1 / +2 stat points per level |
| 500 | +baset2 max BP |
| 820 | +baset2 % character-power multiplier |
| 200 / 210 / 250 / 310-312 / 1200-1211 / 10 / 12 / 14 / 100 | combat/encounter/move-speed modifiers (see combat report) |

---

## 7. Save data

Storage: `SharedObject.getLocal("sodata","/")` with a mirror `"sodataBackUp"` restored if the main one lacks `ok == 1` (`SoData.as:152-183`); `flush()` sets `ok = 1`. Separate `"sd2e"` holds `newappvar` (`SoData2E.as`). All vectors are loaded leniently (missing -> default) via `soDataLoad_VecterInt` (`GameSaveData.as:396-417`, `GData.as:312-333`).

### 7.1 Permanent - `GameSaveData.sodataFunc` (`GameSaveData.as:307-394`)

| Key | Type / default | Meaning |
|---|---|---|
| `playerid`, `playername` | Number (random: `((year%3+1970) date ms)*10000 + rand(10000)`), "" | identity (`:261-295`) |
| `mvar`, `fvar` | version strings | current / first-installed app version (`:140-225`) |
| `playTimes` | int 0 | app launches (`Game.as:160`) |
| `hardtime`, `hardlefttimes` | Number, int | hard-mode play counter (section 5.4) |
| `Highlv` | int 0 | best level |
| `shp,satk,sdef,sspeed,sluk` | String | best-run stats "base(+equip)" |
| `shpn...slukn`, `sehpn...selukn` | String | numeric base / equip parts |
| `HighCombo`, `HighDamage` | int | records |
| `HighItemEquip[16]` (-2), `HighItemKazu[16]` (0) | vectors | equipment at best level |
| `gameItemEquip[16]` (-2) | vector | equip slots carried to next run |
| `gameItemBUKIKazu[]`, `gameItemBOUGUKazu[]`, `gameItemAKUSEKazu[]` | vectors (0) | times each weapon/armor/accessory obtained (= level) |
| `gameItemSetMapDirectOFFON`, `gameItemEquipSetLockOkNum`, `gameItemEquipSetNum`, `gameItemEquipSet1..5[16]` | ints, vectors (default `[0,0,-1,-2 x13]`) | equipment sets (`GameSaveData_ItemEquipSet.as:323-358`) |
| `winbattle`, `losebattle`, `newgamecount`, `gameovercount` | int 0 | counters |
| `gameovercountTime` <- `gameovercountV[50]` | vector | history (note key rename, `:367, 381`) |
| `kyarakutalv` | int 0 | base ability LV |
| `kyarakutaKozinLv` <- `kyarakutaKozinExp[20]` | vector | per-hero exp (key rename, `:368, 382`) |
| `gameBounas1_usecount`, `gameBounas1_date`, `gameBounas2_usecount`, `gameBounas2_date`, `gameBounas2_sumusecount` | | daily bonuses |
| `sentousyuuryougoSettei` | int 0 | after-battle option (section 8) |
| `apurihyouka`, `apurihyouka2` | int | review prompts (apurihyouka2 reset on version change, `:216-220`) |
| `tweetcount`, `linecount` | int | share counters |
| `HakkenbossV[200]`, `WinbossV[200]`, `HakkenmapV[MapTimes+1]` | vectors 0/1 | boss seen / boss beaten (hard = +100) / map seen |
| `dataV[4]` | ints 0 | tutorial flags (`Tyutoriaru.as:93-120`) |
| bgm/se, language | | `SeBgm`, `root/L` (not covered here) |

Load-time migrations (`GameSaveData.as:140-229`): `mvar == 133` -> zero accessory counts 59-63; saved version <= 1.6.1 -> weapon/armor counts >1 reset to 1; **always** (`<= 164 || true`) weapon/armor counts >10 reset to 1; accessory counts >=4 reset to 2 and purged from all equip sets; newer app version -> `mvar` updated, `apurihyouka2 = 0`.

### 7.2 Per-run - `GData.sodataFunc_Status` (`GData.as:231-292`) and friends

`startGameVersion, startRealTimeRankingType, gameon, isGameOverNow, hardmode, lv, lvC2, hp, atk, def, speed, luk, stPt, tukattastpt, deadcount, g, sumg, exp, nokoriBattleTimes, BattleTimes, oneBounas1_usecount, oneBounas2_usecount, heronum, ItemEquip[16] (-2), bossHanteiV[128], bossWinV[128]`; `ItemBUKIKazu/ItemBOUGUKazu/ItemAKUSEKazu` (`GDataItemMana.as:267-282`); `ItemEquipSetLockOkNum, ItemEquipSetNum, ItemEquipSet1..5` (`GData_ItemEquipSet.as:190-224`); `BattleEquip1A/2A/3A` (equipment ids used in wins, `GData_BattleData.as:156-170`); map bonus state `BonasDataMapNum[3] (-1), StageLvBonasData1..3[10]` (`GData.as:194-229`); map position via `StageMap info.sodataFunc_MapMove`. Saved after every battle, stat confirm, purchase, bonus, and when the map resumes (`StageMap.as:618-621`).

### 7.3 Cloud backup (`TTKGameServices/Hikitugi.as`, `NetSaveLoadMana.as`)

Option -> Data transfer (title screen only) -> Backup / Restore dialog; retry delays 60/360/600/900+ frames (`Hikitugi.as:84-103, 142-161`). Serializes the GameSaveData keys above plus `savevar` (3-digit version) and `savetime` (`NetSaveLoadMana.as:190-230`). Restore (`:242-304`) overwrites GameSaveData, **ends any current run** (`gameon=false`, `nokoriBattleTimes=99999`, `:296-300`) and, due to a typo, reads `linecount` from key `"wilinecountnbattle"` (`:292`) so it becomes 0.

---

## 8. Options (`Option.as`)

| Button | Default | Effect |
|---|---|---|
| "After battle / stat distribution setting" | `sentousyuuryougoSettei = 0` | 1st choice -> 2: open the stat screen automatically after every **won** battle; 2nd -> 1: ask "open stat screen?" Y/N; 3rd -> 0: never (`Option.as:140-158, 316-329`). Applied in `StageMap.as:643-653`, only after a win (`StageMap.as:1893-1897`) and not while a tutorial dialog or game over is pending. |
| BGM / SE | on | toggles `sebgm.bgm/se` (`:160-187`) |
| How to play | | help panel |
| Review | | store review |
| Credits | | credits |
| Language | device | ja / en / zh-TW / zh-CN / ko / es / id; also a "send correction" mail (`:205-252, 331-396`) |
| Data transfer | | cloud backup (hidden when opened in-game, `:95-99`) |
| Privacy policy | | opens URL |

Equipment-set screen has an extra toggle `gameItemSetMapDirectOFFON` (`GameSaveData_ItemEquipSet.as:311-321`).
