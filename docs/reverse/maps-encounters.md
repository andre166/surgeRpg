# Inflation RPG - Maps, Movement, Encounters, Bosses, Battle Points

Reverse-engineered from the decompiled AS3 under `reverse/decomp/scripts/`. All line references are `file:line` in that directory. Machine-readable companion: `reverse/extracted/maps.json` (generated; 77 maps, every area with its enemy pool, boss rects, neighbours).

Vocabulary used by the code: `teki` = enemy, `tekisei LV` = recommended level, `encount` = encounter gauge, `kikendo` = danger level, `nokoriBattleTimes` = battles consumed (BP = MAX - consumed), `Bonas/Bounasu` = area bonus, `mapnx/mapny` = current tile column/row in the global tile grid, `sX/sY` = player sprite screen position, `backSpx/backSpy` = scroll offset of the map layer.

---

## 1. Map model

### 1.1 Counts and containers

| Constant | Value | Source |
|---|---|---|
| Number of maps (`MapData.MapTimes`) | **77** (ids 1..77) | `Include_GameData/MapData.as:6` |
| Discovered-map flags `HakkenmapV` | `Vector.<int>(MapTimes+1)` = 78 slots, index = map id | `Class/GameSaveData.as:128` |
| Global streaming tile grid | **115 rows x 30 cols** of tiles (`StageMapBitD`, `StageMapData`) | `StageMapVar.as:144-158` |
| Per-tile record `StageMapData[row][col]` | `[mapId, mapTileX, mapTileY, localCol, localRow, tilesW, tilesH, cacheState]` | `Include_GameData/MapData.as:35-42` |
| Screen constants | `staW=640`, `staH=860`, `pstaH=100` (top HUD band) | `StageMap.as:34-38` |

There is no "mapsu" identifier in the sources; the map count is `MapData.MapTimes = 77`. `AppRaterMana` prompts for a review once `count(HakkenmapV,1) >= 64` (`AppRaterMana.as:72,144`).

### 1.2 Three layers per map

Every map id has three independent data layers:

1. **Bitmap** (`GameData_Stage_Enemy/StageMapBitData.as:14-295`). A PNG per map (sizes from the embed stubs `stagemapNNpng.as`, `smyadaNNpng.as`). Maps 13 and 14 are plain 1200x1200 bitmaps (white `0xFFFFFF` / black `0`) (`StageMapBitData.as:63-70`). Maps 61-72 are a background PNG (`stagemapback61/62/63png`) with the map PNG blended on top (hardlight 0.7 + normal 0.25; `StageMapBitData.as:257-260`); maps 73-77 are `stagemapback73png` + map PNG (`:262-290`). Maps 6 and 7 share `stagemap06_7png`; many "yada" maps (17-55) share `smyadaNNpng` images.
2. **Collision MovieClip** (`GameData_Stage_Enemy/StageMapBlockData.as:13-254`): a vector shape `mapblockNNmc` / `mbNNmc` per map; the player cannot walk where the shape is opaque (`hitTestPoint(..., true)`). Maps 13 and 14 both use `mapblock13mc` (`:60-67`).
3. **Level grid + tile placement** (`Include_GameData/MapData.as:48-178`): `StageLvMap[id-1]` is a rows x cols grid of **area indices** stretched over the full bitmap; `StageLvData[id-1][area] = [tekiseiLv, labelX%, labelY%]`. `StageMapDataSet(id, tileX, tileY, tilesW, tilesH)` (`MapData.as:179-255`) places the map's tiles in the global 115x30 tile grid; adjacent maps are adjacent in this grid.

Tile pixel size = bitmap size / (tilesW, tilesH) (`StageMapVar.as:232-235`); it is 400x400 for almost all maps (1600/4, 800/2, 1200/3), 400x405 for 1216-high maps, 400x448 for map 56 (800x2240 / 2x5), 400x457 for map 72 (800x3200 / 2x7).

Area cell pixel size = bitmap size / (cols, rows) of `StageLvMap` (`StageMapVar.as:337-338`, `StageMap.as:1440-1443`).

### 1.3 Which area the player is in

`StageSLVGetSetting` (`StageMap.as:1430-1540`), evaluated every frame while not switching tiles (`:1117`):

```
px  = StageMapData[mapny][mapnx][3] * mapSizeW + sX - backSpx      // :1438  (localTileCol*tileW + player offset inside tile)
py  = StageMapData[mapny][mapnx][4] * mapSizeH + sY - backSpy      // :1439
col = int(px / bitmapW * cols);  row = int(py / bitmapH * rows)    // :1442-1443, clamped to [0, cols-1]/[0, rows-1] (:1444-1459)
StageSLV = StageLvMap[MapNum-1][row][col]                          // :1464-1466
tekiseiLv = StageLvData[MapNum-1][StageSLV][0]                     // :1467
```

When the area changes, the **danger level** `kikendo` is recomputed from player level `lv` (`StageMap.as:1468-1500`):

| kikendo | condition (`T` = area tekisei LV, `L` = player LV) |
|---|---|
| 4 | `T >= L*1.4 + 50` |
| 3 | `T >= L*1.2 + 25` |
| 2 | `T >= L*1.1 + 8` |
| 1 | `T >= L*1.05 + 1` |
| -2 | `T <= L*0.58 - 12` |
| -1 | `T <= L*0.74 - 6` |
| 0 | otherwise |
| 2 (forced) | hard mode (`GDataW.IsHardMode()`), `:1497-1500` |

`kikendo > 0` shows the red "danger" frame and the text "ここは適正レベル[T]で" (`:1506-1518`); the bottom HUD shows "適正LV:[T]" plus the area bonus if any (`:1519-1538`; hard mode prints `? ? ? ?`, `:1520-1523`).

Border colours of area outlines on the map use the 13-step table `TekiseiLvLineColor` with thresholds in `StageMap_MakeMap.as:87-150` (same breakpoints as kikendo plus finer under-level steps: `<= T*0.5-15`, `0.58-12`, `0.66-9`, `0.74-6`, `0.82-3`, `0.9`; within +-10% -> index 6; hard mode -> index 9). Area labels ("適正レベル: N" + bonus text) are drawn at `(bitmapW*labelX%/100 - 120, bitmapH*labelY%/100 - 40)` (`StageMapVar.as:472-473`); `labelX% = -100` means no label.

### 1.4 Tile streaming and map transitions

- The view holds a **3x3 window of tiles** `StageMapBit[3][3]` around `(mapny, mapnx)` (`StageMapVar.as:113-126`, `StageMap.as:562-612`). Tiles are rendered lazily (`t_0`, `t_lrud` in `StageMap_MakeMap.as:199-234`): the full current map plus the one adjacent row/column of each neighbour map.
- Neighbours come from `StageMapAroundData.GetStageMapAroundData(id)` -> `dataSet(s1,s2,s3,s4)` (`GameData_Stage_Enemy/StageMapAroundData.as:21-370`). Semantics from the loader `StageBitDSetStageLvSetFunc` (`StageMap.as:528-560`): `s1` -> load its **bottom row** ("d") => map **above**; `s2` -> left column ("l") => map to the **right**; `s3` -> top row ("u") => map **below**; `s4` -> right column ("r") => map to the **left**. (`-1` = nothing.) The full neighbour table is in section 7 and in `maps.json`.
- The current tile index advances when the scroll offset crosses a tile edge (`StageMap.as:1055-1092`): moving left `mapnx--` when `backSpx - leftTileW > 0` (same map) or `backSpx > sX` (next tile belongs to another map); right `mapnx++` when `backSpx + tileW + rightTileW < 640` or `backSpx + tileW < sX`; up/down analogous with `pstaH` (100) and `pstaH + 800` as the thresholds (`:1081`, `:1089`).
- `MapSetStart(dx,dy)` (`:422-436`): if the new tile's `mapId != info.MapNum` the whole map is reloaded (`MapLoadStart(0)`), otherwise only the 3x3 window is re-laid (`StageMapBitSeiretu`).
- `MapLoadStart(kind)` (`:438-518`): stops BGM, marks `HakkenmapV[MapNum] = 1` (`:462`), rotates the bonus tables (section 5), runs the staged loader `mapLoadEEF` (`:292-420`): frame 6 renders the map and, for `kind 0/5` (walked across / teleport), **re-centres the camera** so the player sits at screen centre offset by `mukindx*60` / `mukindy*100` px and nudged `12` px in the move direction (`:331-358`); frames 8/10/12/14 render the four neighbour edges; frame 16 frees unused tiles; 22 HUD update; 24 relayout; 25 fog; 30 `MapLoadEnd` -> BGM `bgmstartf(3, MapNum)` and `MapEEFStart` (`:520-526`).
- Load kinds: `0` tile crossing, `1` back from battle (same map), `3` new game / continue / bonus reload, `5` back from battle with map change (`:1906-1908`, `:2019-2026`).

### 1.5 Blocked regions and unlocks

There is no per-area lock flag. Progression is gated purely by **geometry** (`mapblock` collision shapes) and by **teleports granted on boss wins** (`WinBoss_MapCH.as`), plus the "???" bonus bosses. Maps reachable by walking (per `StageMapAroundData` + `StageMapDataSet`):

- Overworld cluster: 1 (start) <-> 2 (below), 3 (right), 4 (left), 5 (above); 5 <-> 6 (above); 4 <-> 60 (left); 7 (twin of 6, same tiles 18 rows lower) -> 8 (below) -> 9 -> {10 right, 11 left, 12 below}; 12 -> 15 -> 16 -> 59.
- "Yada" maze 17-55 (2x2 tile maps laid out in rows 42-56 of the tile grid) linked through the around table (note map 22 lists map 1 as its right-hand neighbour, `StageMapAroundData.as:109`: a data-only link back to the start map, not geometric adjacency).
- 61..68 cluster (rows 73-83), 69..72 column (rows 52-82 at col 25), 73..77 cross (rows 98-109).
- Isolated (no neighbours): 13, 14, 56, 57, 58 (entered only by teleport).

Teleports on boss win, `WinBoss_MapCH.GetMapChData(ga, info, bossIndex, tileW, tileH)` (`Include_GameData/WinBoss_MapCH.as:22-173`), called from `RestartToBattleFunc` (`StageMap.as:1906`):

| Boss index won | Destination | Details |
|---|---|---|
| 3 (ene6_ba, map 6) | map 7, same tile `mapny += 18` | `:25-30` (map 7's tiles are 18 rows below map 6's; maps share bitmap/grid) |
| 8 (ene15_ba, map 15) | random of 4: map 17 (13,42), 18 (17,42), 28 (11,48), 50 (17,54) | `:31-63`; sX=320, sY=480, back=(120,280) |
| 9 (ene17_ba, map 35) | map 56 tile (5,58) | `:64-74`; back=(-40,320) |
| 12 (ene56_ba, map 56) | map 57 tile (10,60), sX=260, sY=430, centred | `:75-85` |
| 90 (bonus boss, type 16) | map 58 tile (16,63), sX=120, sY=230 | `:86-96` |
| 13 or 19 (ene57_ba / ene58_bf) | map 61 tile (16,81), centred | `:97-107` |
| 25 (ene68_ba, map 68) | map 69 tile (26,82), sX=120 | `:108-118` |
| 60 or 62 (white-room boss) | **map 13** tile (18,22), saves return position in `*2` fields, sets `BonasDataMapNum[2]=13`, `StageLvBonasData3[0] = 140 + int(random*4+1.5)` (type 14, 1..5 charges) | `:119-139` |
| 66 or 68 (black-room boss) | **map 14** tile (18,25), same scheme, `150 + ...` (type 15) | `:140-160` |
| 26 or 27 (ene70_bb / ene70_ba, map 72) | map 73 tile (13,107), sX=420, sY=600 | `:161-171` |

Return from the white/black rooms: in `RestartToBattleFunc`, if `MapNum == 13` (or 14) and the room's bonus counter `StageLvBonasData1[0] == 0`, the saved `MapNum2/mapnx2/...` are restored (`StageMap.as:1923-1956`). Because each battle decrements every bonus by 1 (`:1621-1649`), the room lasts 1..5 battles.

`LastBossID = 28` (`Include_GameData/EneData_Boss.as:8`) = `ene73_ba` on map 74. Winning it (or `128` in hard mode) sets `CurrentVarLastBoss_BackMapFastFlag` and shows "おめでとうございます！最後のボス" on return to the map (`StageMap.as:1917-1920`, `:634-640`).

Hard mode: `GData.NewGame(1)` (`Class/GData.as:366-376`). New game resets `bossHanteiV`/`bossWinV` (`:432-438`); `HakkenbossV`/`WinbossV` (200 slots, hard-mode boss `idx+100`) persist in `GameSaveData` (`Class/GameSaveData.as:126-127`, `BattlePackage/DataMana_WinOrLose.as:91-92`).

### 1.6 Start state

New game (`StageMap.as:201-242`): `MapNum=1`, tile `(mapnx,mapny)=(11,12)` (local tile (1,2) of map 1 whose tiles start at (10,10)), `sX = 320`, `sY = 480`, `backSpx=-80`, `backSpy=460`, `encount=0`; the starting area 0 of map 1 receives bonus `StageLvBonasData1[0] = 25` = type 2 ("会心連続率上昇", crit/combo up) with 5 charges (`:224-226`). Continue restores `StageMap_MapInfo` from the SharedObject (`StageMap_MapInfo.as:533-566`, `StageMap.as:244-263`).

Game-over counter and ad: `StageMap_Title_Transitions.as:282-285, 360-363` (interstitial after `gameovercount > 2`).

---

## 2. Movement

`MapEEF` (`StageMap.as:669-1376`) runs every `enterFrame`; movement happens only while the pointer is held (`ga.mousedown`, `:731`) and the press did not land on a top-menu button (`MenuSousaKaizen2`, `StageMapTopMenu.as:279-318`).

- **Speed**: `MapMoveSpeed = gdata.MoveSpeed` (`:211`, `:2056`). Base `MoveSpeed = 10` px/frame (`Class/GData.as:582`); accessory effect id `100` adds `value/100` per equipped item (`Class/GData.as:724-727`). Refreshed on equipment change via `SetMapUseData` (`:2053-2057`).
- **Target**: the current pointer position `(mouseX, mouseY)` in map-sprite space (`:733-734`). Per axis, if `|target - pos| < MapMoveSpeed` the axis is snapped (`:739-756`), so the sprite stops within one step of the finger.
- **Direction**: `angle = atan2(dy, dx)` in degrees, **quantised to 5 degree steps** (`:757-765`). Flags `left/up/right/down` from the angle (`:768-803`): pure vertical/horizontal in the +-5 degree bands around 0/90/180, diagonal otherwise. Sprite facing `SBitMUKI` 0..7 (`:808-845`: 0 down, 1 left, 2 right, 3 up, 4 down-left, 5 up-left, 6 down-right, 7 up-right).
- **Step**: `dx = cos(a)*speed`, `dy = sin(a)*speed` (`:850-851`), applied axis by axis.
- **Screen bounds**: sprite must stay `16` px inside the 640-wide layer (`:859-866`) and within `[16, pstaH+staH-16]` vertically (`:941-948`).
- **Collision** (`:869-935`, `:951-1018`): three probes against the map's collision clip `StageMapCurrentBlock.hitTestPoint(x, y, true)` 16 px ahead (`_loc30_ = 16*scale`) at `y`, `y-8`, `y+8` for horizontal moves; for vertical moves the probes are at `x`, `x-8`, `x+8`, at `y - 6 + 16` (down) or `y - 16` (up). If blocked, the move is retried with **half the step** (`:901-935`, `:983-1017`), giving wall-sliding along the free axis. Collision is tested in stage coordinates (`ga.co`, `Scr.ContentScale`, `:735-736`, `:852-855`).
- **Camera**: when the sprite exits the inner box `OutLineL=260, OutLineR=380, OutLineU=400, OutLineD=660` (`:116-119`), 20% of the overshoot per frame is transferred from the sprite to the scroll offset (`:1031-1054`) (soft follow).
- **Walk animation**: frame advances only when `SBitMotion` changes (i.e. a move attempt happened). `MoveSpeed <= 10`: 9-step cycle, frame `int(SBitMotion*0.34)`; faster: 6-step cycle, frame `int(SBitMotion*0.5)` (`:1212-1227`).
- **No pathfinding**: straight line toward the finger with wall slide. Boss nodes act as solid obstacles that immediately start the boss battle (section 3.5).
- **Autosave** of position every 90 frames (`:1368-1372`) and at every `MapEEFStart` (`:620-623`).
- The map scene checks game-over every 10 frames while the pointer is down (`:1023-1029`).

Top menu buttons (`StageMapTopMenu.as:88-93`): Menu (`MenuMouseDown`), Encounter (`KyouseiEnkauntoMouseDown`, visible only when `gdata.sokuencountOn` = accessory effect id `14`, `Class/GData.as:720-723`), Bonus (`BounasukaMMD`). All require `encount != -1`, no loading in progress and `MapEEFStartTime >= 7` frames since the map resumed (`StageMap.as:2177-2230`).

---

## 3. Encounter system

### 3.1 Gauge increment

`info.encount` is a `Number` 0..100 (`StageMap_MapInfo.as:525`), persisted in the save. Per frame in `MapEEF` (`StageMap.as:1208-1274`), **only if the sprite attempted a move this frame** (`_loc51_ != SBitMotion + 100*SBitMUKI`, `:1210`), the base increment depends on the danger level:

| kikendo | base increment per moving frame | source |
|---|---|---|
| 4 | 0.98 | `:1228-1231` |
| 3 | 0.85 | `:1232-1235` |
| 2 | 0.72 | `:1236-1239` |
| 1 | 0.64 | `:1240-1243` |
| 0 | 0.58 | `:1244-1247` |
| -1 | 0.40 | `:1248-1251` |
| -2 | 0.32 | `:1252-1255` |

Then (`:1256-1272`):
```
inc += encountBairitu - 1;  inc *= encountBairitu;   // equipment multiplier (base 1; accessory id 10: -0.15 each, id 12: +0.2 each, GData.as:712-719)
inc = clamp(inc, 0.15, 0.999)
encount = min(100, encount + inc)
```
Note the step is per **frame of movement**, not per pixel: it is independent of `MoveSpeed`, and moving into a wall still charges the gauge (the animation counter increments whenever the pointer is held and the target differs from the position, `:1021`).

### 3.2 Trigger

Checked every frame (`:1275-1299`):

```
if int(prevEncount) < int(encount):                        // crossed an integer
    if (int(e) % 5 == 0 and int(e) > 50) or int(e) % 10 == 0:    // checkpoints 10,20,30,40,50,55,60,...,95
        p = e / 100
        if p >= 0.08 and (0.5*p^2 + 0.5*p^3) > random() * 1.1:  battle = true
if encount >= 100: battle = true                           // guaranteed at 100
```
So the per-checkpoint chance is `min(1, (p^2 + p^3) / 2.2)`: 10%: 0.5%, 20%: 2.2%, 30%: 5.3%, 40%: 8.4%, 50%: 17%, 60%: 26%, 70%: 38%, 80%: 52%, 90%: 70%, 95%: 80%, 100%: 100%.

HUD bar: `enb.scaleX = encount/100 +- 1%` jitter while rising, `+-0.4%` when idle (`:1289`, `:1293`, `:1308-1311`).

Forced encounter button: `KyouseiEnkauntoMouseDown` -> `BattleStertFunc()` regardless of gauge (`:2192-2205`).

### 3.3 Battle start (`BattleStertFunc`, `StageMap.as:1566-1886`)

1. Abort if `GDataW.GetBattlePoint() <= 0` (`:1604`).
2. Stop map loop, hide top menu, `encount = -1` (sentinel "in battle"; `:1608-1610`).
3. `GDataW.AddNkoriBattlePoint(1)`, `BattleTimes++` (`:1611-1612`).
4. Bonus type of current area `BounasSyu = StageLvBonasData1[StageSLV] / 10` (or -1) (`:1613-1620`); then **every** bonus slot in the current and two previous maps is decremented by one charge and cleared when it hits 0 (`:1621-1649`).
5. If this is not a map-boss battle, the area bonus can spawn a hidden boss (`:1650-1877`), see 3.5.
6. `ga.battle.eneDataLoad(BounasSyu, MapNum, StageSLV, BossSyu)` (`:1879`) -> `BattleVar.eneDataLoad` (`BattleVar.as:88-100`) -> `EneData.eneload(ga, BossSyu, map, lv, isWinBoss)` (`Include_GameData/EneData.as:27`).

### 3.4 Enemy selection for an area

`EneData.eneload` is one giant `if(map == N)` / `if(lv == K)` tree (`EneData.as:120-3062`). For each (map, area):
- `tekiseiLvBai` is set (EXP multiplier; `-2` means "exp is the literal 5th arg"),
- `eneSyu = kakuritu([w0, w1, ...])` picks an index with weighted random: `r = int(total*random + 0.5)`, first index whose cumulative weight `>= r` (`EneData.as:77-103`; `kakuritu` returns `eneSyu` directly if already fixed),
- `eneLoad(new sprite(), scale, HP, ATK, expParam, G, skills[], drop1, drop2, drop3, hardDrop1..3)` (`EneData.as:22-25` -> `BattleVar.eneLoad`, `BattleVar.as:102-237`): hard mode `HP*10, ATK*8.5, G*5` (`:107-112`); `EXP = OneExpTable(tekiseiLv) * tekiseiLvBai * (1 + expParam/50)` or `= expParam` when `tekiseiLvBai == -2` (`:116-124`), x12 in hard mode (x24 for non-bonus bosses) (`:125-131`), then `* expbairitu`; bonus effects 0..8 applied at `:156-226`.
- Special structures: maps 17-55 share one table keyed by area index (`EneData.as:1963-2127`); maps 61-68 use shared pools named by tekisei LV (`map47500 ... map93333`, `:2317-2558`) selected per (map, lv) (`:2559-2741`); maps 69-72 and 73-77 use one shared sprite pool each with per-(map,lv) base `HP/ATK` (`_loc1_/_loc2_`) multiplied per sprite (`:2743-3049`); maps 13/14 have a normal and a hard-mode pool (`:1735-1846`); map 57 ignores the area index (`:2216-2248`). The fallback `map >= 1 && map <= 99` (`:3051-3063`) is a dummy 50x50 enemy for unmapped ids (unreachable in practice).

The complete pool table (sprite, weight, HP, ATK, expParam, G, skills, drops) is in `maps.json -> enemyPools`, referenced by `maps[].areas[].enemyPool` / `enemyWeights`.

### 3.5 Bosses

**Placed map bosses** (`Include_GameData/MapBossSet.as:218-313`, drawn by `bossWrite` `:315-353`): a magic-circle (`mahouzinpng`, 74x64) and the boss sprite are stamped into the map bitmap at `(x, y)` with `scale`, **only if `gdata.bossHanteiV[index] == 0`** (not yet beaten this run, `:319`). Collision rect (`:345-348`):
```
rect.x = x - spriteW*scale/2 - 4;  rect.y = y - spriteH*scale/2 - 4
rect.w = spriteW*scale + 8;         rect.h = spriteH*scale - 8
```
Each frame after a move (`StageMap.as:1316-1366`), the player's map-local position `(sX - CurrentBlockX - backSpx, sY - CurrentBlockY - backSpy)` is tested against every rect; on overlap the player is pushed back to the pre-move position (or along one axis, `:1334-1358`) and `BattleStertFunc(bossIndex)` starts the boss battle. Bosses are not subject to the gauge (`encount != -1` only).

| idx | sprite | map | x,y | scale | sprite size | rect (x,y,w,h) | BP on win | source |
|---|---|---|---|---|---|---|---|---|
| 0 | ene1_ba | 1 | 800,200 | 2.5 | 72x48 | 706,136,188,112 | 3 | `MapBossSet.as:47` |
| 1 | ene3_ba | 3 | 1326,1410 | 0.75 | 167x220 | 1259,1324,133,157 | 7 | `MapBossSet.as:51` |
| 2 | ene5_ba | 5 | 818,640 | 0.8 | 286x200 | 700,556,237,152 | 4 | `MapBossSet.as:55` |
| 3 | ene6_ba | 6 | 816,200 | 1 | 190x113 | 717,140,198,105 | 3 | `MapBossSet.as:59` |
| 4 | ene9_ba | 9 | 440,880 | 1.8 | 88x104 | 357,782,166,179 | 3 | `MapBossSet.as:63` |
| 5 | ene9_bb | 9 | 1280,1000 | 1.8 | 88x104 | 1197,902,166,179 | 3 | `MapBossSet.as:64` |
| 6 | ene10_ba | 10 | 790,260 | 1.8 | 80x104 | 714,162,152,179 | 4 | `MapBossSet.as:68` |
| 7 | ene11_ba | 11 | 150,500 | 1.8 | 96x104 | 60,402,181,179 | 4 | `MapBossSet.as:72` |
| 8 | ene15_ba | 15 | 835,920 | 1.15 | 142x143 | 749,834,171,156 | 4 | `MapBossSet.as:76` |
| 9 | ene17_ba | 35 | 400,400 | 1.2 | 142x143 | 311,310,178,164 | 4 | `MapBossSet.as:80` |
| 10 | ene17_bb | 20 | 550,550 | 1.8 | 96x128 | 460,431,181,222 | 3 | `MapBossSet.as:84` |
| 11 | ene17_bc | 40 | 250,550 | 1.8 | 96x128 | 160,431,181,222 | 3 | `MapBossSet.as:88` |
| 12 | ene56_ba | 56 | 400,2060 | 1.2 | 143x143 | 310,1970,180,164 | 5 | `MapBossSet.as:92` |
| 13 | ene57_ba | 57 | 800,900 | 1 | 208x204 | 692,794,216,196 | 3 | `MapBossSet.as:96` |
| 14 | ene58_ba (tint 0.25,0.5) | 58 | 800,1300 | 2 | 32x88 | 764,1208,72,168 | 2 | `MapBossSet.as:100` |
| 15 | ene58_bb (tint 1,0.2,0.3) | 58 | 1350,760 | 2 | 32x88 | 1314,668,72,168 | 2 | `MapBossSet.as:101` |
| 16 | ene58_bc (tint 0.25,1,0.3) | 58 | 215,850 | 2 | 32x88 | 179,758,72,168 | 2 | `MapBossSet.as:102` |
| 17 | ene58_bd (tint 0.35,0.9,1) | 58 | 1180,220 | 2 | 32x88 | 1144,128,72,168 | 2 | `MapBossSet.as:103` |
| 18 | ene58_be (tint 1,0.95,0.25) | 58 | 355,250 | 2 | 32x88 | 319,158,72,168 | 2 | `MapBossSet.as:104` |
| 19 | ene58_bf | 58 | 800,800 | 2 | 32x88 | 764,708,72,168 | 4 | `MapBossSet.as:105` |
| 20 | ene59_ba | 59 | 430,450 | 1.25 | 186x195 | 310,324,241,236 | 6 | `MapBossSet.as:109` |
| 21 | ene63_bb | 65 | 540,700 | 0.9 | 181x226 | 455,594,171,195 | 4 | `MapBossSet.as:113` |
| 22 | ene64_ba | 66 | 200,520 | 0.9 | 240x214 | 88,420,224,185 | 5 | `MapBossSet.as:117` |
| 23 | ene64_bb | 66 | 550,150 | 0.9 | 230x230 | 443,43,215,199 | 4 | `MapBossSet.as:118` |
| 24 | ene63_ba | 63 | 150,360 | 1 | 221x217 | 36,248,229,209 | 4 | `MapBossSet.as:122` |
| 25 | ene68_ba | 68 | 570,550 | 0.8 | 344x188 | 428,471,283,142 | 4 | `MapBossSet.as:126` |
| 26 | ene70_bb | 72 | 270,1600 | 1.5 | 111x118 | 183,1508,175,169 | 4 | `MapBossSet.as:130` |
| 27 | ene70_ba | 72 | 550,1590 | 1.5 | 135x111 | 445,1503,211,159 | 4 | `MapBossSet.as:131` |
| 28 | ene73_ba | 74 | 800,600 | 0.65 | 193x256 | 733,513,133,158 | 5 | `MapBossSet.as:135` |


Boss result bookkeeping (`BattlePackage/DataMana_WinOrLose.as:71-98`): on win `bossHanteiV[idx]=1` (removes the node from the map for this run), `gamesavedata.WinbossV[idx + hardmode*100] = 1`; `HakkenbossV[idx] = 1` is set as soon as the battle loads (`EneData.as:108-111`). `bossWinV[idx]` counts wins within the run; a repeat fight against an already-won boss (`isWinBoss`) gives no item drop (`DataMana_WinOrLose.as:35-44`, `:82-85`).

**Hidden bonus bosses** (`StageMap.as:1650-1877`), rolled when a normal encounter starts in an area whose bonus type is:

| Bonus type (text) | Chance | Boss id |
|---|---|---|
| 9 ("？？？") | 40% | `32 + int(random*4)` (32..35, `ene0_0a..d`) |
| 10 ("？？？") | 44% | `40 + t`, `t` by area LV: `<=1000` -> 0; `<1600` -> w[12,6,0]; `<2000` -> [10,11,2]; `<3600` -> [7,11,3]; `<5000` -> [6,11,4]; else [4,10,4] |
| 11 ("？？？", HARDGOLD) | 35% | `48 + t`: LV `<3000` -> [10,10,10]; `<8000` -> [12,12,12,9,7,7]; else [10,10,10,9,7,7] |
| 12 (" ！ ", SIRO / white room) | 24% | 61 unless: normal mode and `HakkenbossV[60] >= 1` -> 60; hard and `HakkenbossV[62] >= 1` -> 62; else if owned weapon kinds `>= (weaponsInMode - 4) * 0.7` (hard: `*0.85`) -> 60 (hard: 62) (`:1711-1769`) |
| 13 ("！！！", KURO / black room) | 26% | 67 unless `HakkenbossV[66/68]` or weapon kinds `>= (n-8)*0.4` (hard `0.7`) or armour kinds `>= (n-3)*0.6` (hard `0.8`) -> 66 (hard 68) (`:1770-1869`) |
| 16 ("！？", map 57 only) | 26% | 90 (`:1870-1876`) |

Bonus types come from `BounasuKakurituData.getBonasuSyu(ga, areaLv, targetArea, currentArea)` (`Include_GameData/BounasuKakurituData.as:17-149`): base weights depend on whether the target area is the current one (`[8,8,26,15,17,13,8,22,18,6,6,5,4,3]`), lower (`[7,4,25,14,20,16,8,16,32,4,4,3,3,3]`) or higher (`[26,26,36,2,16,16,5,22,14,6,6,5,4,4]`) (`:55-69`), with rare overrides by area LV (`>=600` 6% ... `>=20000` 10% uniform over 14 types, `:20-54`) and downgrades (type 9 needs LV>800, 11 needs LV>2300, 10 needs LV>350/500, types 5/6 need `gameovercount` > 3/5, hard-mode restrictions, `:70-147`). Type index -> text: `BonasTxt` (`StageMap.as:179-183`): 0 enemy HP x0.5, 1 enemy ATK x0.5, 2 crit/combo up, 3 coins x2, 4 x3, 5 x4, 6 x7, 7 EXP x1.5 (hard x2), 8 EXP x2 (hard x3), 9-11 "？？？", 12 " ！ ", 13 "！！！", 14 " ！ ", 15 "！！！", 16 "！？". Storage: `StageLvBonasData1[area] = type*10 + charges` (charges 1..9).

### 3.6 After a battle (`RestartToBattleFunc(result, bossId)`, `StageMap.as:1888-2027`)

- `encount = 0` (`:1901`).
- On a win against a boss: map teleport check (`WinBoss_MapCH`), character power level `KyrakutaPowerLv` = number of won "key" bosses among indices {0,1,2,8,9,12,13,19,28} (+100 for hard) (`Include_GameData/WinBoss_UpKyrakutaPowerLv.as:11-29`) -> if it grew, `kyarakutalv` is raised and a dialog is shown (`:1910-1916`, `:627-633`).
- **Bonus spawning** on every win (`:1957-2015`): with 50% (always when `nokoriBattleTimes % 5 == 0`) pick area `StageSLV + int(random*5 - 2.5)` (re-roll `+-2` if it equals the current one), clamp to the map's area count; if empty, set `type*10 + int(random*3.5 + 1.5)` (1..4 charges). Additionally 30%: random area, 1..3 charges; 5%: random area, 1..2 charges; on map 57 35%: type 16 with 1..3 charges.
- Then `MapLoadStart(5)` if the map changed else `MapLoadStart(1)`.
- On returning, if the "open status screen after battle" setting is 2 the status menu opens, if 1 a Y/N dialog (`:643-655`).

### 3.7 Bonus button (`BounasukaMMD`, `StageMap.as:2207-2330`)

Two daily bonuses, counters reset at 04:00 (`:2233-2247`): **map bonus** `BounasuMapSet` (`:2078-2115`): fills every empty area of the current map with a bonus of `BounasuKa` type and `int(random*4 + 2.5)` (2..6) charges (map 57: 42% chance of a type-16 bonus with 3..5 charges first); limit 5/day (6 if the player has used the LINE/Twitter share), 1 per run (2 if the app was rated). **Gold bonus** `BounasuGetG` (`:2117-2162`): `G = int(random*(500 + n*500) + n*200 + 500) * (1 + int(n/10)/10) + n*450 + n*n/2 + 4000`, soft-capped above 50k/100k/150k/200k/250k, hard cap 300000 (`n` = lifetime uses); 1/day, 1/run.

---

## 4. Battle Points (BP)

- Definition: `GDataW.GetBattlePoint() = MAXnokoriBattleTimes - nokoriBattleTimes` (`Class/GDataW.as:17-20`); `AddNkoriBattlePoint(n)` adds to the consumed counter (`:22-25`).
- `MAXnokoriBattleTimes = 30` (normal) / `10` (hard) (`Class/GData.as:583-590`) plus accessory effect id `500` value per item (`:728-731`). `nokoriBattleTimes = 0` at new game (`:400`).
- Consumption per battle: `+1` when the map starts the battle (`StageMap.as:1611`), `+2` (hard `+4`) when the enemy loads (`DataMana_WinOrLose.as:23-32`), `-2` (hard `-4`) on win (`:71-80`), `- WinBossGetBattlePoint(bossId)` on win (`:86-87`). Net: **win = -1 BP, loss = -3 BP (hard -5)**, boss win = `-1 + bonusBP`.
- Boss BP bonus `WinBoss_PlusNokoriBattleTimes.WinBossGetBattlePoint` (`Include_GameData/WinBoss_PlusNokoriBattleTimes.as:11-120`): idx 0:3, 1:7, 2:4, 3:3, 4:3, 5:3, 6:4, 7:4, 8:4, 9:4, 10:3, 11:3, 12:5, 13:3, 14-18:2, 19:4, 20:6, 21:4, 22:5, 23:4, 24:4, 25:4, 26:4, 27:4, 28:5, others 0 (so hidden bosses 32+, 40+, 48+, 60+, 66+, 90 give no BP).
- The battle result text previews the remaining count as `BP + 2 (+bossBP)` (`Battle.as:759-793`).
- HUD shows `max(0, BP)` (`StageMap.as:1550-1555`).
- `deadcount` is `++` at battle load and `--` on win, i.e. counts losses (`DataMana_WinOrLose.as:33`, `:81`).

### Game over from the map

`GameOverHanteiFunc` (`StageMap.as:2064-2076`): if `BP <= 0 || gdata.isGameOverNow` -> stop the loop, hide menu, snapshot the map as background, `new GameOver(ga).startf()`. It is evaluated when the map resumes after a battle (`MapEEFStart`, `:641`) and every 10 frames while the pointer is held (`:1023-1029`). `BattleStertFunc` also refuses to start at `BP <= 0` (`:1604`). `GameOver.startf` sets `isGameOverNow = true` and saves (`GameOver.as:69-70`); its result screen counts beaten bosses as `bossHanteiV[0..31] == 1` (`:187-194`). `GameOver.endf` (`:330-374`) calls `gdata.EndGame()`, `gameovercount++`, copies equipment to the save, awards character EXP, then `ga.stagemap.EndToMenuGoToTitleFunc()` -> `StageMap_Title_Transitions.TransStart()` (`StageMap_Title_Transitions.as:258-385`): saves status/map, tears down the map (`endf1/endf2`), runs an interstitial if `gameovercount > 2`, and returns to the title.

---

## 5. Area-bonus bookkeeping across maps

`gdata.BonasDataMapNum[0..2]` and `StageLvBonasData1/2/3[10]` hold the bonus tables of the current map and the two previous ones (`Class/GData.as:92-98`, `:177-184`). On every `MapLoadStart` except kind 1 (return to the same map) the tables rotate (`StageMap.as:463-514`): if the new map is slot 2 -> rotate 3-way; slot 1 -> swap; otherwise push and start with a zeroed table. `StageLvBonasData1[area]` encodes `type*10 + charges`.

---

## 6. Hard mode differences (map side)

- `MAXnokoriBattleTimes = 10` (`GData.as:589`); BP cost 4 per loss step.
- `kikendo` forced to 2 (0.72 gauge/frame) and the HUD hides the recommended level (`StageMap.as:1497-1523`, `StageMapVar.as:457-461`).
- Map 13/14 use the hard pools (`EneData.as:1754-1770`, `:1810-1846`).
- Boss win flags stored at index `+100` (`DataMana_WinOrLose.as:92`); teleport for `LastBossID + 100` (`StageMap.as:1917`).

---

## 7. Map table

Columns: bitmap size; tile origin in the 115x30 global tile grid and tile count; area grid (cols x rows of `StageLvMap`); neighbours `U/R/D/L` (`StageMapAroundData`); areas as `index:tekiseiLV`; placed bosses as `index(sprite)`.

| id | bitmap | size | tile origin (x,y) & count | area grid | U/R/D/L | areas index:LV | bosses |
|---|---|---|---|---|---|---|---|
| 1 | stagemap01png | 1600x1600 | (10,10) 4x4 | 9x9 | 5/3/2/4 | 0:1 1:25 2:72 3:172 4:300 5:710 | 0(ene1_ba) |
| 2 | stagemap02png | 1600x1600 | (10,14) 4x4 | 12x14 | 1/-/-/- | 0:90 1:132 2:176 3:192 4:244 5:315 | - |
| 3 | stagemap03png | 1600x1600 | (14,10) 4x4 | 6x8 | -/-/-/1 | 0:220 1:300 2:380 3:777 4:1222 5:1333 6:2222 | 1(ene3_ba) |
| 4 | stagemap04png | 1600x1600 | (6,10) 4x4 | 10x7 | -/1/-/60 | 0:300 1:470 2:630 3:810 4:1000 | - |
| 5 | stagemap05png | 1600x1600 | (10,6) 4x4 | 9x10 | 6/-/1/- | 0:750 1:830 2:950 3:1200 4:1350 5:2000 6:2300 | 2(ene5_ba) |
| 6 | stagemap06_7png | 1600x1600 | (10,2) 4x4 | 10x15 | -/-/5/- | 0:2400 1:2610 2:2690 3:2910 4:3150 5:3400 6:4110 7:4170 8:5000 9:5200 | 3(ene6_ba) |
| 7 | stagemap06_7png | 1600x1600 | (10,20) 4x4 | 10x15 | -/-/8/- | 0:7000 1:6540 2:6460 3:5870 4:5720 5:5500 6:5400 7:5400 8:5300 9:5200 | - |
| 8 | stagemap08png | 1600x1216 | (10,24) 4x3 | 11x9 | 7/-/9/- | 0:7480 1:7630 2:8330 3:8370 4:8880 5:9800 6:10000 | - |
| 9 | stagemap09png | 1600x1216 | (10,27) 4x3 | 10x11 | 8/10/12/11 | 0:10100 1:10430 2:10670 3:10750 4:10840 5:11111 6:12000 7:12222 | 4(ene9_ba) 5(ene9_bb) |
| 10 | stagemap10png | 1216x1216 | (14,27) 3x3 | 9x8 | -/-/-/9 | 0:10500 1:11600 2:12400 3:13333 | 6(ene10_ba) |
| 11 | stagemap11png | 1216x1216 | (7,27) 3x3 | 8x9 | -/9/-/- | 0:10800 1:11800 2:12600 3:13111 4:12900 5:13666 | 7(ene11_ba) |
| 12 | stagemap12png | 800x1216 | (11,30) 2x3 | 2x3 | 9/-/15/- | 0:14700 1:15800 2:16900 | - |
| 13 | BitmapData(1200,1200,white) | 1200x1200 | (17,21) 3x3 | 2x2 | -/-/-/- | 0:0 | - |
| 14 | BitmapData(1200,1200,black) | 1200x1200 | (17,24) 3x3 | 2x2 | -/-/-/- | 0:0 | - |
| 15 | stagemap15png | 1600x1216 | (10,33) 4x3 | 18x20 | 12/-/16/- | 0:16700 1:17500 2:17500 3:18400 4:18400 5:19300 6:20000 | 8(ene15_ba) |
| 16 | stagemap16png | 800x800 | (11,36) 2x2 | 2x2 | 15/59/-/- | 0:20000 | - |
| 17 | smyada01png | 800x800 | (13,42) 2x2 | 2x2 | -/-/20/- | 0:20100 1:20800 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 18 | smyada01png | 800x800 | (17,42) 2x2 | 2x2 | -/-/22/- | 0:20100 1:20800 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 19 | smyada12png | 800x800 | (11,44) 2x2 | 2x2 | -/20/23/- | 0:20100* 1:20800 2:21500 3:22600 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 20 | smyada02png | 800x800 | (13,44) 2x2 | 2x2 | 17/21/24/19 | 0:20100* 1:20800 2:21500 3:22600 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200 | 10(ene17_bb) |
| 21 | smyada13png | 800x800 | (15,44) 2x2 | 2x2 | -/22/25/20 | 0:20100* 1:20800* 2:21500 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000 9:27200* | - |
| 22 | smyada08png | 800x800 | (17,44) 2x2 | 2x2 | 18/1/26/21 | 0:20100* 1:20800 2:21500 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 23 | smyada03png | 800x800 | (11,46) 2x2 | 2x2 | 19/24/28/- | 0:20100* 1:20800* 2:21500* 3:22600 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 24 | smyada14png | 800x800 | (13,46) 2x2 | 2x2 | 20/25/29/23 | 0:20100* 1:20800* 2:21500* 3:22600 4:23700 5:24200 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 25 | smyada07png | 800x800 | (15,46) 2x2 | 2x2 | 21/26/30/24 | 0:20100* 1:20800* 2:21500* 3:22600 4:23700* 5:24200* 6:24900* 7:25555 8:26000 9:27200* | - |
| 26 | smyada05png | 800x800 | (17,46) 2x2 | 2x2 | 22/27/31/25 | 0:20100* 1:20800* 2:21500* 3:22600 4:23700* 5:24200* 6:24900* 7:25555 8:26000* 9:27200* | - |
| 27 | smyada09png | 800x800 | (19,46) 2x2 | 2x2 | -/-/32/26 | 0:20100* 1:20800* 2:21500* 3:22600 4:23700 5:24200 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 28 | smyada15png | 800x800 | (11,48) 2x2 | 2x2 | 23/29/33/- | 0:20100 1:20800 2:21500* 3:22600* 4:23700* 5:24200* 6:24900 7:25555* 8:26000* 9:27200* | - |
| 29 | smyada04png | 800x800 | (13,48) 2x2 | 2x2 | 24/30/34/28 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700 5:24200 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 30 | smyada16png | 800x800 | (15,48) 2x2 | 2x2 | 25/31/35/29 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700* 5:24200* 6:24900 7:25555 8:26000* 9:27200* | - |
| 31 | smyada06png | 800x800 | (17,48) 2x2 | 2x2 | 26/32/36/30 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700 5:24200* 6:24900 7:25555 8:26000* 9:27200* | - |
| 32 | smyada17png | 800x800 | (19,48) 2x2 | 2x2 | 27/-/37/31 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700 5:24200 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 33 | smyada11png | 800x800 | (11,50) 2x2 | 2x2 | 28/34/41/- | 0:20100 1:20800 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 34 | smyada03png | 800x800 | (13,50) 2x2 | 2x2 | 29/35/42/33 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555 8:26000* 9:27200* | - |
| 35 | smyada18png | 800x800 | (15,50) 2x2 | 2x2 | 30/36/43/34 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555 8:26000* 9:27200* | 9(ene17_ba) |
| 36 | smyada19png | 800x800 | (17,50) 2x2 | 2x2 | 31/37/44/35 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700* 5:24200* 6:24900 7:25555* 8:26000* 9:27200* | - |
| 37 | smyada10png | 800x800 | (19,50) 2x2 | 2x2 | 32/38/45/36 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700* 5:24200* 6:24900 7:25555 8:26000* 9:27200* | - |
| 38 | smyada10png | 800x800 | (21,50) 2x2 | 2x2 | -/39/46/37 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555 8:26000 9:27200* | - |
| 39 | smyada10png | 800x800 | (23,50) 2x2 | 2x2 | -/40/-/38 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000 9:27200 | - |
| 40 | smyada23png | 800x800 | (25,50) 2x2 | 2x2 | -/-/-/39 | 0:20100* 1:20800* 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200 | 11(ene17_bc) |
| 41 | smyada07png | 800x800 | (11,52) 2x2 | 2x2 | 33/42/47/- | 0:20100* 1:20800 2:21500 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 42 | smyada05png | 800x800 | (13,52) 2x2 | 2x2 | 34/43/48/41 | 0:20100* 1:20800* 2:21500* 3:22600 4:23700 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 43 | smyada06png | 800x800 | (15,52) 2x2 | 2x2 | 35/44/49/42 | 0:20100* 1:20800 2:21500* 3:22600* 4:23700* 5:24200* 6:24900 7:25555 8:26000* 9:27200* | - |
| 44 | smyada20png | 800x800 | (17,52) 2x2 | 2x2 | 36/45/50/43 | 0:20100 1:20800 2:21500* 3:22600* 4:23700* 5:24200* 6:24900 7:25555* 8:26000* 9:27200* | - |
| 45 | smyada05png | 800x800 | (19,52) 2x2 | 2x2 | 37/46/51/44 | 0:20100* 1:20800 2:21500* 3:22600* 4:23700* 5:24200 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 46 | smyada09png | 800x800 | (21,52) 2x2 | 2x2 | 38/-/52/45 | 0:20100* 1:20800* 2:21500* 3:22600 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 47 | smyada21png | 800x800 | (11,54) 2x2 | 2x2 | 41/48/-/- | 0:20100* 1:20800* 2:21500 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 48 | smyada02png | 800x800 | (13,54) 2x2 | 2x2 | 42/49/-/47 | 0:20100* 1:20800* 2:21500 3:22600 4:23700* 5:24200 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 49 | smyada04png | 800x800 | (15,54) 2x2 | 2x2 | 43/50/53/48 | 0:20100* 1:20800* 2:21500 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 50 | smyada11png | 800x800 | (17,54) 2x2 | 2x2 | 44/51/54/49 | 0:20100 1:20800 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 51 | smyada07png | 800x800 | (19,54) 2x2 | 2x2 | 45/52/55/50 | 0:20100* 1:20800* 2:21500 3:22600* 4:23700 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 52 | smyada08png | 800x800 | (21,54) 2x2 | 2x2 | 46/-/-/51 | 0:20100* 1:20800* 2:21500 3:22600 4:23700 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 53 | smyada03png | 800x800 | (15,56) 2x2 | 2x2 | 40/54/-/- | 0:20100* 1:20800* 2:21500 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 54 | smyada22png | 800x800 | (17,56) 2x2 | 2x2 | 50/55/-/53 | 0:20100* 1:20800 2:21500* 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 55 | smyada08png | 800x800 | (19,56) 2x2 | 2x2 | 51/-/-/54 | 0:20100* 1:20800 2:21500 3:22600* 4:23700* 5:24200* 6:24900* 7:25555* 8:26000* 9:27200* | - |
| 56 | stagemap56png | 800x2240 | (5,58) 2x5 | 2x5 | -/-/-/- | 0:28800 1:30000 2:33333 3:34500 4:36000 | 12(ene56_ba) |
| 57 | stagemap57png | 1600x1600 | (10,60) 4x4 | 7x7 | -/-/-/- | 0:37777 1:37777 2:37777 3:37777 4:37777 5:37777 6:37777 | 13(ene57_ba) |
| 58 | stagemap58png | 1600x1600 | (14,60) 4x4 | 2x2 | -/-/-/- | 0:41111 | 14(ene58_ba) 15(ene58_bb) 16(ene58_bc) 17(ene58_bd) 18(ene58_be) 19(ene58_bf) |
| 59 | stagemap59png | 800x800 | (13,36) 2x2 | 2x2 | -/-/-/16 | 0:20000 | 20(ene59_ba) |
| 60 | stagemap60png | 800x1600 | (4,10) 2x4 | 2x2 | -/4/-/- | 0:20000 | - |
| 61 | stagemapback61png+stagemap61png | 1216x1216 | (15,80) 3x3 | 14x11 | 62/-/-/- | 0:43000 1:44444 2:45200 3:47500 | - |
| 62 | stagemapback62png+stagemap62png | 1216x1600 | (15,76) 3x4 | 2x21 | 67/64/61/63 | 0:47500 1:54000 2:63000 3:70000 | - |
| 63 | stagemapback62png+stagemap63png | 1216x1600 | (12,76) 3x4 | 2x2 | -/62/-/65 | 0:54000 1:58000 2:75000 | 24(ene63_ba) |
| 64 | stagemapback62png+stagemap64png | 1216x1600 | (18,76) 3x4 | 7x8 | -/66/-/62 | 0:47500 1:50000 2:63000 3:67000 | - |
| 65 | stagemapback62png+stagemap65png | 1216x1600 | (9,76) 3x4 | 7x2 | -/63/-/- | 0:58000 1:75000 | 21(ene63_bb) |
| 66 | stagemapback62png+stagemap66png | 1216x1600 | (21,76) 3x4 | 3x4 | -/-/-/64 | 0:50000 1:67000 | 22(ene64_ba) 23(ene64_bb) |
| 67 | stagemapback61png+stagemap67png | 1216x1216 | (15,73) 3x3 | 8x14 | -/68/62/- | 0:70000 1:79000 | - |
| 68 | stagemapback61png+stagemap68png | 1216x1216 | (18,73) 3x3 | 22x17 | -/-/-/67 | 0:79000 1:86000 2:93333 | 25(ene68_ba) |
| 69 | stagemapback63png+stagemap69png | 800x3200 | (25,75) 2x8 | 2x17 | 70/-/-/- | 0:100000 1:111111 2:125000 3:140000 4:158000 | - |
| 70 | stagemapback63png+stagemap70png | 800x3200 | (25,67) 2x8 | 2x4 | 71/-/69/- | 0:160000 1:168000 2:175000 3:184000 | - |
| 71 | stagemapback63png+stagemap71png | 800x3200 | (25,59) 2x8 | 2x8 | 72/-/70/- | 0:184000 1:190000 2:198000 3:200000 4:210000 5:214000 6:222000 | - |
| 72 | stagemapback63png+stagemap72png | 800x3200 | (25,52) 2x7 | 2x31 | -/-/71/- | 0:222000 1:234000 2:237000 3:245000 4:250000 | 26(ene70_bb) 27(ene70_ba) |
| 73 | stagemapback73png+stagemap73png | 1600x1600 | (12,106) 4x4 | 7x13 | 74/-/-/- | 0:256000 1:266666 2:277777 | - |
| 74 | stagemapback73png+stagemap74png | 1600x1600 | (12,102) 4x4 | 15x18 | 77/76/73/75 | 0:290000 1:333333 2:450000 | 28(ene73_ba) |
| 75 | stagemapback73png+stagemap75png | 1600x1600 | (8,102) 4x4 | 4x4 | -/74/-/- | 0:300000 | - |
| 76 | stagemapback73png+stagemap76png | 1600x1600 | (16,102) 4x4 | 4x4 | -/-/-/74 | 0:305000 | - |
| 77 | stagemapback73png+stagemap77png | 1600x1600 | (12,98) 4x4 | 21x11 | -/-/74/- | 0:340000 1:360000 | - |

`*` = area index defined in `StageLvData` but not referenced by that map's `StageLvMap` grid (unreachable).

Source lines for each map's grid/data: `Include_GameData/MapData.as` lines 48-168 (`StageLvMap[i]`/`StageLvData[i]` with `i = id-1`), 119-124 (shared table for ids 17-55), 169-178 (defaults), 179-255 (`StageMapDataSet`).

---

## 8. Key constants cheat-sheet

| Item | Value | Source |
|---|---|---|
| Maps | 77 | `MapData.as:6` |
| Tile size | bitmap / tiles (400x400 typical) | `StageMapVar.as:234-235` |
| Move speed | 10 px/frame + items | `GData.as:582,724-727` |
| Angle quantisation | 5 degrees | `StageMap.as:760-764` |
| Collision probe | 16 px ahead, +-8 px lateral, half-step retry | `StageMap.as:854-855, 873-935` |
| Camera box | x 260..380, y 400..660, 20%/frame | `StageMap.as:116-119, 1031-1054` |
| Gauge per moving frame | 0.32/0.40/0.58/0.64/0.72/0.85/0.98 by kikendo -2..4, x`encountBairitu`, clamp [0.15, 0.999] | `StageMap.as:1228-1272` |
| Encounter checkpoints | every 10 (<=50) / every 5 (>50): `P = (p^2+p^3)/2.2`, forced at 100 | `StageMap.as:1276-1299` |
| Danger thresholds | 1.05L+1 / 1.1L+8 / 1.2L+25 / 1.4L+50; 0.74L-6 / 0.58L-12 | `StageMap.as:1469-1495` |
| BP max | 30 / 10 (hard) + item 500 | `GData.as:583-590,728-731` |
| BP per battle | win -1, loss -3 (-5 hard), boss win -1+bonus | `StageMap.as:1611`, `DataMana_WinOrLose.as:27-31,75-87` |
| Boss BP bonus | table idx 0..28 | `WinBoss_PlusNokoriBattleTimes.as:11-120` |
| Last boss | index 28 (`ene73_ba`, map 74) | `EneData_Boss.as:8`, `MapBossSet.as:309-312` |
| Start | map 1, tile (11,12), sX 320, sY 480, bonus 25 on area 0 | `StageMap.as:224-234` |
| Autosave | every 90 frames | `StageMap.as:1368-1372` |
| Menu/encounter/bonus button lockout | 7 frames after resume | `StageMap.as:2183,2198,2229` |
