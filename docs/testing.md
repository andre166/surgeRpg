# Testing

## Unit / integration tests (Vitest)

```
npm test            # run once
npm run test:watch  # watch mode
```

Suites in `src/tests/`:

- `expTable.test.js` – EXP table seeds, bump rules, monotonicity over 125k levels, closed form.
- `damage.test.js` – player / enemy damage with scripted RNG, death guard, drain, combo chance, heal cost.
- `rates.test.js` – enemy point, divisor, combo / crit / item / gold rates and caps.
- `stats.test.js` – equipment and ability combination, modifiers from effect codes.
- `progression.test.js` – multi level-ups, stat points, battle-point accounting.
- `engine.test.js` – enemy setup (bonus kinds, hard mode), deterministic battles, combo, heal, drops.
- `equipment.test.js` – duplicate scaling, slot rules, buy / equip statuses, unlock costs.
- `encounters.test.js` – gauge increments and checkpoints, weighted pick bias, bonus encoding / spawning, hidden bosses, teleports.
- `session.test.js` – data integrity (77 maps, pools exist), full run loop (30 battles → game over), boss win, stat confirm, game-over commit.

Determinism: every rule takes an `rng`; tests use `createSeededRng(seed)` or `createSequenceRng([...])`.

## End-to-end smoke test (Electron)

```
npm run dev            # terminal 1
npm run smoke          # terminal 2
```

`scripts/smoke.cjs` boots the real Electron shell (same preload / IPC, temporary save directory), plays through title → character select → map → a battle → result → stats → equipment, writes a save and checks there are no console errors. Set `SMOKE_SHOTS=<dir>` to also capture screenshots.

## Manual checklist

1. New run, walk until an encounter, win, allocate points, equip a drop.
2. Touch the boss on the first map; confirm the BP refund and the "base ability" message.
3. Lose a battle on purpose: BP drops by 3.
4. Quit to title mid-run, relaunch, Continue restores position, gauge and bonuses.
5. Reach BP 0: game-over screen, spend gold in the shop, return to title; records updated.
6. Packaged build: `npm run dist:win`, run `release/win-unpacked/Surge RPG.exe`, confirm saves land in `%APPDATA%/Surge RPG/saves/`.
