# Known differences from the reference game

Deliberate (content / legal):

- All names, descriptions, art, audio and map images are original. Enemies are procedural SVG creatures; maps are drawn from the area grid with a tiered palette; sounds are synthesised.
- No ads, no online ranking, no social sharing, no cloud transfer, no daily "bonus map" / gold buttons (the daily-bonus rules are documented in `docs/reverse/maps-encounters.md` 3.7 but not implemented; they depended on review / share prompts).
- Tutorial dialogs are replaced by in-screen hints.
- Accessories can be removed from a slot (the original had no explicit unequip).

Functional approximations (documented, candidates for later fidelity work):

- **Collision shapes**: the original gates progression with per-map vector collision clips. Our maps have no walls; the area grid, recommended levels, enemy pools, boss positions, neighbours and boss-win teleports are preserved, so the progression order is the same but travel inside a map is free.
- **Low-HP battle bonuses** use the real HP ratio; the original read the animated HP bar value, which lags by a few frames.
- **Level-up animation cap**: the original caps visual level-ups per frame; we apply all level-ups at once (same final values).
- **Teleport landing spots** are expressed as fractions of the destination map instead of tile coordinates.
- **Play gem (effect 35)** is implemented (runs × 3/17/40 ATK-DEF, × 3/12/30 AGI, 40% per-battle nullify).
- **Equipment sets (5 saved loadouts)** are modelled in the profile but have no UI yet.
- **Hard mode** rules are implemented (BP 10, multipliers, hidden boss restrictions); the original also limits hard-mode plays per day with a recharge timer, which is not implemented.
- **EXP table 120000..124999**: reproduced exactly (closed form with monotonic guard).
- **Ranking-type start bonus** (`startRealTimeRankingType`, +x% to one stat from the online ranking) is not implemented (always 0).
- Walk animation, camera soft-follow box and autosave cadence differ cosmetically.
