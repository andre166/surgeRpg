# Known differences from the reference game

Deliberate (content / legal):

- All names, descriptions, art, audio and map images are original. Enemies are procedural SVG creatures; maps are drawn from the area grid with a tiered palette; sounds are synthesised.
- No ads, no online ranking, no social sharing, no cloud transfer, no daily "bonus map" / gold buttons (the daily-bonus rules are documented in `docs/reverse/maps-encounters.md` 3.7 but not implemented; they depended on review / share prompts).
- Tutorial dialogs are replaced by in-screen hints.
- Accessories can be removed from a slot (the original had no explicit unequip).
- **Heroes**: 9 of the 16 are playable; Sable, Ivo, Lior, Nell, Corvin, Petra and Dax (`src/core/progression/heroes.js` SKIN_ONLY_HEROES) are out of the hero select but keep their sprites, animations and data, to return as skins.
- **Hero passives** (`src/core/attributes/characterPower.js` heroPassive): each hero has one named, always-on passive (+3% on one of their affinity stats, e.g. Rook's Quick Draw +3% AGI), shown on the hero page.
- **Passive Shards** (`src/core/progression/passiveShards.js`): locked like Limit Break (shown with a lock once the abyssal mode is open, unlocked by beating Caelith the Monarch in abyssal mode); then abyssal-mode bosses drop 1 shard (3 from the final boss) on their first win of the run; 3 shards reroll a hero's passive into a random other one of the 16 (account-wide, shown on the hero page).
- **Relics** (`src/core/crafting.js`, art in `src/ui/components/RelicSprite.jsx`): not in the original. Four fixed relics after H. P. Lovecraft, each with lore and its own slot, one per stat: Drowned Idol (HP), Elder Sign (DEF), Silver Key (AGI), Shining Trapezohedron (luck). Map bosses drop them apart from their item drops, once per account (`RELIC_DROPS`: for testing bosses 0, 2, 3 and 5, always); a dropped relic sits in its slot for good (it can't be removed) and works for every hero; until then it shows as a shadow. Its percent is rolled in the relic range on drop. The Forge only improves them: upgrade +1 to +5 (+20% of the rolled percent a level) or reroll the percent, paid with mine materials and a run gold fee. Relic slots are no longer bought, and the old forged relics are dropped from saves.
- **Limit Break** (`src/core/progression/limitBreak.js`): shown on the hero page once the abyssal mode is open, locked until Caelith the Monarch (boss 13, map 57) is beaten in abyssal mode; then map bosses drop Break Shards in abyssal mode only (2, 35% on their first win of the run) that buy extra affinity arrows for a hero.
- **Combo balance** (`src/core/battle/combo.js`): Surge has more AGI / combo sources than the original (classes, talents, echoes, elixirs), so after the original rate (`rates.js` + Combo Rate Ring, cap 0.7) class / echo combo adds with diminishing returns, rates above 0.5 count 75% up to a 0.65 cap, the area combo bonus caps at 0.67 (orig. 0.72) and the low-HP bonus at 0.75 (orig. 0.8); every combo of a turn rolls the same chance, like the original.

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
