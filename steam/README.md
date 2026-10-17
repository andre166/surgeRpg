# SteamPipe templates

Copy the two `.template` files without the suffix, replace `__APP_ID__`, `__DEPOT_ID__` and `__VERSION__`, then from the Steamworks SDK:

```
builder\steamcmd.exe +login <account> +run_app_build <path>\steam\app_build.vdf +quit
```

Never commit real IDs or credentials. See `docs/steam-release-checklist.md`.
