# Steam release checklist

The game runs without Steam. Steam integration is optional and activates only when `steamworks.js` is installed and an App ID is available.

## Integration layer

- `electron/steam.cjs` loads `steamworks.js` lazily; every call is a no-op when unavailable.
- App ID source: env `SURGE_STEAM_APP_ID` or a `steam_appid.txt` next to the executable (development only; the Steam client injects it in production).
- Renderer facade: `src/platform/steam/steam.js` declares achievement API names (`ACH_FIRST_RUN`, `ACH_LEVEL_100`, `ACH_LEVEL_1000`, `ACH_LEVEL_10000`, `ACH_FIRST_BOSS`, `ACH_LAST_BOSS`, `ACH_COMBO_10`, `ACH_COLLECTOR_20`) and stats (`STAT_RUNS`, `STAT_HIGHEST_LEVEL`, `STAT_BOSSES`). Create them with the same names in the Steamworks admin.
- Overlay: `electronEnableSteamOverlay()` is attempted after init.
- Cloud: `steam:cloudWrite/cloudRead` IPC exist; wire them to the save store once Steam Cloud is enabled for the app (or use Steam Auto-Cloud on `%APPDATA%/Surge RPG/saves`).

## Steps

1. Create the app in Steamworks; note the App ID. Never commit it or any key to the repo.
2. `npm install steamworks.js` (native module; prebuilt binaries for Electron on Windows). Add `steamworks.js` to `build.files` / asarUnpack in `package.json` so the `.node` binary is unpacked.
3. Configure achievements / stats with the names above; add artwork.
4. Build: `npm run dist:win` → `release/win-unpacked/` (SteamPipe content root) and an NSIS installer for non-Steam distribution.
5. SteamPipe: depot = `release/win-unpacked`, launch option = `Surge RPG.exe`. Use the Steamworks SDK `ContentBuilder` with `app_build_<appid>.vdf` / `depot_build_<depotid>.vdf` (templates in `steam/`, fill in the IDs).
6. Test with the Steam client running: overlay (Shift+Tab), achievements unlocking, stats.
7. Verify saves survive updates: they live in `app.getPath('userData')/saves`, outside the install directory, with atomic writes and three rotating backups.
8. Store page, age rating questionnaire, pricing, review build.

Do not upload or publish without explicit authorisation.
