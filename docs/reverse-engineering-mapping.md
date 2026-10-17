# Reverse-engineering traceability matrix

Source scripts live in `reverse/decomp/scripts` (git-ignored, decompiled with JPEXS FFDec from the published APK). Detailed per-subsystem reports with `file:line` citations are in `docs/reverse/`:

- `docs/reverse/enemies.md` – enemy / boss tables, exp pipeline, bonus probabilities
- `docs/reverse/items.md` – item model, scaling, slots, shop, drops
- `docs/reverse/maps-encounters.md` – maps, movement, gauge, bosses, BP
- `docs/reverse/progression-save.md` – characters, EXP, stat points, run lifecycle, save data

Classification used throughout: **[C]** confirmed in code and reproduced, **[P]** probable (reproduced from code but not observed in play), **[NV]** not verified.

| Rule | Origin (script) | Implementation | Test | Status |
|---|---|---|---|---|
| EXP table (`OneExpTableFunc`) | `Game.as:269-1158` | `core/progression/expTable.js` | `expTable.test.js` | [C] |
| Level up: +4 stat points, caps | `Class/GData.as lvupFunc` | `core/progression/levels.js` | `progression.test.js` | [C] |
| Stat point gains 5/3/3/2/1 | `StMapMenu_sutetasu.as:379-395` | `core/progression/characters.js` | `session.test.js` | [C] |
| Derived stats (flat + (flat+base)·pct) | `Class/GData.as EqStUpdate` | `core/attributes/stats.js` | `stats.test.js` | [C] |
| Accessory effect codes | `Class/GData.as:600-739` | `core/attributes/effects.js`, `stats.js` | `stats.test.js` | [C] |
| Hero ability weights / factor | `Class/GData.as SBitLoad_KrakutaPower`, `:740-749` | `core/attributes/characterPower.js` | `stats.test.js` | [C] |
| Base ability level from key bosses | `WinBoss_UpKyrakutaPowerLv.as` | `core/progression/characters.js` | `session.test.js` | [C] |
| Hero exp / level table | `GameSaveData.as:232-259, 450-488` | `core/progression/characters.js` | – | [P] |
| Enemy point (threat score) | `BattleVar.as enePointGet` | `core/battle/rates.js` | `rates.test.js` | [C] |
| Combo / crit / item / gold rates | `BattleVar.as KakurituBairituGet` | `core/battle/rates.js` | `rates.test.js` | [C] |
| Enemy setup (hard mode, exp, bonus kinds) | `BattleVar.as eneLoad` | `core/battle/enemySetup.js` | `engine.test.js` | [C] |
| Player damage incl. critical | `Battle.as myGetDameSkNumFunc` | `core/battle/damage.js` | `damage.test.js` | [C] |
| Enemy damage | `Battle.as eneGetDameSkNumFunc` | `core/battle/damage.js` | `damage.test.js` | [C] |
| Turn flow, combo continuation, low-HP bonuses | `Battle.as EEFBattleFunc` | `core/battle/engine.js` | `engine.test.js` | [C] |
| Drain, death guard | `Battle.as:404-449` | `core/battle/damage.js`, `engine.js` | `damage.test.js` | [C] |
| Pause heal cost and timing | `DataMana_WinOrLose.as GetKaihukuCost`, `Battle.as` | `core/battle/engine.js` | `engine.test.js` | [C] |
| Drop roll and duplicate penalties | `BattleItemMana.as EneDropItemInit` | `core/battle/drops.js` | `engine.test.js` | [C] |
| Battle points: +1, provisional +2/+4, boss refunds | `StageMap.as:1604-1612`, `DataMana_WinOrLose.as`, `WinBoss_PlusNokoriBattleTimes.as` | `core/progression/battlePoints.js` | `progression.test.js` | [C] |
| EXP application with multi level-ups | `Battle.as:699-720` | `core/progression/levels.js` | `progression.test.js` | [C] |
| Item duplicate scaling | `Class/Item.as:251-280` | `core/equipment/items.js` | `equipment.test.js` | [C] |
| Slots, unlock costs, rank limits | `Game.as:1159`, `StMapMenu_soubi.as`, `StMapMenu_SoubiList.as` | `core/equipment/slots.js` | `equipment.test.js` | [C] |
| Buy / equip rules | `StMapMenu_SoubiList.as:617-791` | `core/equipment/slots.js` | `equipment.test.js` | [C] |
| Danger level (kikendo) | `StageMap.as:1468-1500` | `core/encounters/gauge.js` | `session.test.js` | [C] |
| Encounter gauge and checkpoints | `StageMap.as:1208-1299` | `core/encounters/gauge.js` | `encounters.test.js` | [C] |
| Weighted pick with +0.5 bias | `EneData.as:77-103` | `core/encounters/weighted.js` | `encounters.test.js` | [C] |
| Area bonus selection | `BounasuKakurituData.as:17-149` | `core/encounters/bonus.js` | `session.test.js` | [C] |
| Bonus spawning / decrement | `StageMap.as:1621-1649, 1957-2015` | `core/encounters/bonus.js`, `session.js` | `encounters.test.js` | [C] |
| Hidden bosses from bonus types | `StageMap.as:1650-1877` | `core/encounters/eventBoss.js` | `encounters.test.js` | [C] |
| Boss gold scaling (40-42) | `EneData_Boss.as:73-112` | `core/encounters/eventBoss.js` | `encounters.test.js` | [C] |
| Map boss placement and collision | `MapBossSet.as` | `data/world.json`, `core/world/world.js`, `MapScene.js` | `session.test.js` | [P] |
| Boss-win teleports and rooms | `WinBoss_MapCH.as` | `core/world/world.js`, `session.js` | `encounters.test.js` | [P] |
| Area grid lookup | `StageMap.as:1430-1467`, `MapData.as` | `core/world/world.js` | `session.test.js` | [C] |
| Movement speed and 5° quantisation | `StageMap.as:731-1054` | `game/scenes/MapScene.js` | smoke test | [P] |
| Game over commit (kept vs reset) | `GameOver.as:330-374` | `core/session/session.js commitGameOver` | `session.test.js` | [C] |
| Save sanitisation (counts caps) | `GameSaveData.as:147-213` | `core/persistence/saveStore.js` | – | [P] |
| Enemy / boss / item numeric tables | `EneData.as`, `EneData_Boss.as`, `ItemData.as`, `MapData.as` | `scripts/build-data.mjs` → `src/data/*.json` | `session.test.js` (integrity) | [C] |

Nothing from the original expression (names, text, sprites, music, map images) is used; see `docs/known-differences.md`.
