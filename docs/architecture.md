# Architecture

Surge RPG is a desktop 2D incremental RPG written in plain JavaScript (ES2022 modules, no TypeScript).

```
src/
  core/          pure game rules, no DOM / Phaser / React / Electron imports
    attributes/  derived stats (equipment + character ability), effect codes
    battle/      enemy setup, battle rates, damage formulas, turn engine, drops
    encounters/  danger level, encounter gauge, weighted picks, area bonuses, hidden bosses, enemy selection
    equipment/   item scaling, slots, buying / equipping rules
    progression/ EXP table, level ups, battle points, characters
    persistence/ profile (permanent) and run (per-run) models, save migration
    session/     the run loop: start run, start battle, finish battle, game over
    world/       maps, area lookup, neighbours, boss teleports
    rng/         injectable random sources (Math.random, seeded, scripted)
    util/        AS3-compatible numeric helpers (int truncation, 2-decimal truncation)
  data/          generated JSON: world, enemies, bosses, items, characters (see scripts/build-data.mjs)
  game/          Phaser: MapScene (terrain, hero, bosses, pointer movement), procedural art, synth audio
  ui/            React: screens, components, the Zustand store that wires everything
  platform/      desktop bridge (Electron preload or browser fallback), Steam facade
  tests/         Vitest unit and integration tests
electron/        main process, preload (contextIsolation, sandbox), save files, Steam bridge, IPC
scripts/         build-data (extraction -> game data), smoke (Electron end-to-end test)
reverse/         reverse-engineering material (git-ignored decompilation + extracted JSON)
docs/            this documentation
```

## Layers and rules

- **core** is framework-free and serialisable. Every function takes plain objects and an `rng` with `next()`; nothing reads globals. This is what the tests exercise.
- **data** is generated, never edited by hand. `npm run build:data` regenerates it from `reverse/extracted/*.json`, generating all names / descriptions so no original text ships.
- **ui/stores/gameStore.js** is the only module that calls into `core` with live state. Screens read from the store and call its actions. Persistence (debounced autosave) also lives here.
- **game/scenes/MapScene.js** owns movement and rendering of the map. It reports positions to the store (`movedTo`), which runs the gauge / boss rules and decides when a battle starts. The scene never computes rules itself.
- **electron/** exposes a minimal IPC surface (`save:*`, `app:*`, `steam:*`) through a preload with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. A CSP is applied to the packaged app.

## State model

- `profile` (permanent): inventory counts, equipped slots, unlocked slots, records, boss wins (normal id / hard id + 100), character exp, options, and an optional `run` snapshot for Continue.
- `run` (per run): level, exp inside the level, base stats, stat points, gold, battle counters, map position and gauge, area-bonus tables per map, per-run boss flags, a copy of inventory / slots (committed to the profile at game over).
- `battle`: the pure battle state from `core/battle/engine.js` plus the resolved enemy and the pre-rolled drop.

## Data flow of one battle

1. `MapScene.update` moves the hero and calls `store.movedTo(x, y)`.
2. `session.tickGauge` advances the encounter gauge; `session.bossAt` checks boss nodes.
3. `session.startBattle` books BP, decrements area bonuses, rolls a hidden boss, picks the enemy, derives stats (`computeStats`), builds the enemy (`setupEnemy`), pre-rolls the drop and creates the battle state.
4. `BattleScreen` advances the engine one action at a time (`store.battleAdvance`) and renders events.
5. `session.finishBattle` applies EXP / level ups / gold / drops / boss flags / teleports / bonus spawning, then the result screen shows it.
6. If BP reaches 0 the game-over screen commits the run into the profile (`commitGameOver`).

## Randomness

All randomness goes through `rng.next()`. Tests use `createSeededRng` and `createSequenceRng` to make outcomes deterministic.
