# Surge RPG

A desktop 2D incremental RPG: every run is a race of thirty battles, your level climbs by the hundreds, and only equipment and hero abilities persist. Plain JavaScript, Phaser 3, React, Electron.

## Run

```
npm install
npm run dev            # browser at http://localhost:5173 (localStorage saves)
npm run dev:electron   # Electron window against the dev server
npm run dev:electron:sandbox  # same, in sandbox mode: Cheats menu + separate save (profile-sandbox)
npm run dev:sandbox    # browser, sandbox mode
npm run build:sandbox  # bundle with sandbox on (testing only; never ship it)
npm test               # Vitest
npm run smoke          # Electron end-to-end smoke test (needs `npm run dev` running)
npm run build          # web bundle in dist/
npm run dist:win       # Windows x64: release/win-unpacked + NSIS installer
npm run build:data     # regenerate src/data from reverse/extracted
```

Saves: `%APPDATA%/Surge RPG/saves/profile.json` (atomic writes, three rotating backups). In the browser build they live in localStorage.

## Documentation

- `docs/game-mechanics.md` – every rule and formula
- `docs/architecture.md` – layers, state model, data flow
- `docs/reverse-engineering-mapping.md` – traceability matrix (rule → source → implementation → test)
- `docs/known-differences.md` – deliberate and pending differences
- `docs/implementation-progress.md`, `docs/testing.md`, `docs/steam-release-checklist.md`
- `docs/reverse/` – detailed reverse-engineering reports (not part of the distributed game)

`reverse/decomp` (decompiled reference) and `reverse/extracted` are reference material only and are excluded from builds; `reverse/decomp` is git-ignored.
