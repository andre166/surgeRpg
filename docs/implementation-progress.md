# Implementation progress

Updated: 2026-10-14

## Stage 1 – Engineering and foundation: done
- 845 decompiled scripts inspected; four subsystem reports in `docs/reverse/` with file:line citations.
- Data pipeline `scripts/build-data.mjs` → `src/data/*.json` (77 maps, 124 enemy pools / 780 enemy lines, 29 map bosses + 20 hidden bosses, 82 weapons, 36 armors, 72 accessories, 16 heroes) with generated original names.
- Vite + React + Phaser + Electron + Vitest configured; 74 tests passing.

## Stage 2 – Minimum playable loop: done
- Hero select, map with pointer movement, encounter gauge, battle with combos / crits / heal, rewards, level ups, stat allocation, BP consumption, game over. Verified by the Electron smoke test.

## Stage 3 – Full progression: mostly done
- Equipment shop, duplicate scaling, accessory slots and unlocks, drops, boss nodes with BP refunds, boss-win teleports, white / black rooms, hidden bosses, area bonuses, hard mode rules, permanent progression (inventory, slots, hero ability), autosave with backups and migration.
- Pending: equipment-set loadouts UI, daily bonus buttons (see `docs/known-differences.md`).

## Stage 4 – Identity and interface: first pass
- Original visual identity (procedural creatures / terrain, dark UI), HUD, menus, transitions, synthesised SFX, keyboard navigation, 16:9 layout, fullscreen toggle.
- Pending: music, richer map tiles and walk animation, enemy attack animations, localisation.

## Stage 5 – Desktop and Steam: in progress
- Electron shell with contextIsolation / sandbox / CSP, atomic saves in userData, electron-builder config (dir + NSIS, x64), decoupled Steam bridge and achievement facade.
- Pending: real App ID, `steamworks.js` install, SteamPipe scripts, achievements artwork.

## Stage 6 – Validation: in progress
- Unit + integration tests, Electron smoke test with screenshots. Pending: packaged-build install test, long-run performance pass, balance play-through on later maps.
