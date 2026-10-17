# Game mechanics

All formulas below are implemented in `src/core` and covered by tests. `int()` means truncation toward zero (ActionScript semantics); `trunc2()` means `int(x*100)/100`.

## Run structure

- A run is a race of **Battle Points (BP)**: 30 (10 in hard mode) plus accessory bonuses. BP shown = max − consumed.
- Each battle consumes 1 BP. A **loss** costs 3 BP (5 in hard mode): a provisional 2 (4) is booked when the enemy appears and refunded on a win.
- Map bosses refund extra BP on a win (per boss: 3,7,4,3,3,3,4,4,4,4,3,3,5,3,2,2,2,2,2,4,6,4,5,4,4,4,4,4,5).
- BP ≤ 0 after a battle ends the run. Gold, level and stats are lost; equipment, unlocked slots, records and hero ability progress are kept.

## Stats

- Everyone starts at HP 100, ATK 10, DEF 10, AGI 5, LUCK 1, level 1.
- Each level grants 4 stat points (+1 / +2 with growth crystals). One point: HP +5, ATK +3, DEF +3, AGI +2, LUCK +1. Allocation is confirmed as a whole; no undo.
- Derived stat = `flat + (flat + base) * pct` where `flat` sums weapon / armor / gems and `pct` sums weapon / armor percent and the hero ability bonus.
- Hero ability: base ability level = number of key bosses beaten (ids 0,1,2,8,9,12,13,19,28, normal and hard). Factor `f = ((baseLv + heroLv) * 0.25 + 0.75) * (1 + abilityUp%)`. Per hero affinity weights (0..2) multiply `f * 0.06` (HP), `0.07` (ATK, DEF), `0.075` (AGI), `0.08` (LUCK).
- Hero level comes from exp = sum of final run levels (table 10k, 100k, 700k, 1.8M, ... 170M for level 20).

## EXP

- EXP to go from level L to L+1: seeded table for 0..9, then incremental bumps by divisibility (%121 +30, %103 +26, %97 +23, %83 +17, %79 +16, %67 +15, %43 +13, %37 +11, %23 +8, %21 +6, %13 +4, %7 +2, %3 +int(L*0.02); plus %3000 +400 / %1000 +200; %500 +200; %50 +20; %200 +300 / %100 +150; %15 +1). From 120000 on: `floor(L * (L * 0.0022385 + 6.35))`.
- Battle EXP is applied in a loop: level up as long as the carried total reaches the threshold; remainder stays in the level.
- Enemy EXP = `floor(expForLevel(areaLevel) * expScale * (1 + expParam/50))` (or a raw value), × equipment EXP %, × area bonus.

## Battle

Turn order: player first. After each player hit, if the enemy survives, roll the **combo** chance: success means the player attacks again (combo +1), failure gives the enemy its turn. After the enemy hit, the player acts again (a queued heal restores full HP first).

Rates (from the player's AGI / LUCK, their share of the weighted stat total, and the enemy threat score `enemyPoint`):

- `enemyPoint = int(int(hp/15 + atk/2 + exp/475000 + gold/50) * 2 + areaLevel * 3) / 5)` with drop-tier and high-level adjustments.
- `d = (ep*4+1000)/6` (≤500), `(ep*4+2000)/6` (≤1000), `(ep*4+4000)/6` (≤2000), else `(ep*3+4000)/5`.
- combo = `trunc2(min(0.5, AGI/d*0.52 + 0.06 + min(AGI/1.5M,1)*0.14 + min(LUCK/1M,1)*0.02 + agiShare*0.24) + agiShare*0.24)` (+0.09 with a cadence ring, cap 0.7). Low HP (≤25%) adds +0.13 at roll time, cap 0.8.
- crit = `trunc2(min(0.35, AGI/d*0.07 + LUCK/d*0.22 + 0.06 + min(AGI/1.5M,1)*0.1 + min(LUCK/1M,1)*0.02 + agiShare*0.11 + luckShare*0.14) + agiShare*0.11 + luckShare*0.14)` (+0.08 per keen ring, cap 0.6). Low HP adds +0.05, cap 0.7.
- item rate and gold multiplier are LUCK curves capped at 3.5 and 4.0.

Player damage:

- base = ATK (normal) or `(ATK + 1) * (1.75 + tier/5) * critMultiplier + 4` (critical, tier 0..5 from `int(rand * 6 * (crit*3 + 0.2))`).
- enemy defence `d = int(enemyPoint)` (×1.1 hard); if `d > base`: `d = int((d*3 + base*2)/5)`; `d = int(d*0.3)`; if `d >= base*0.32`: `d = int((d + base*0.32*99)/100)`; `d = int(d + rand*ep*0.02 + ep*0.02)`; if `d >= base*0.44`: `d = int((d + base*0.44*199)/200)`.
- damage = `floor((base − d) * 0.88 ± 10% + rand*4 − 2)`, minimum roll `rand*10 + 1` (or 9% of enemy max HP below 100).

Enemy damage: `a = enemyATK; d = (2a + 12(a − DEF/2)) / 14`, blended toward 50% / 30% / 20% / 10% of `a` when lower; ±10% spread, `+ rand*4 − 2 + rand*a*0.0225 + a*0.0025`, floored.

Other: drain pendants heal `floor(dmg*0.0198+1)` / `floor(dmg*0.039+1)` per hit; last-breath pendants give a table-based chance to survive a lethal hit at 1 HP; the pause-screen heal costs `int(gold/2 + maxHP/2 + 3000)` and applies at the start of the next player turn.

## Enemies and areas

- 77 maps; each map is an area grid; each area has a recommended level, an enemy pool with weights, and optional hard-mode pool.
- Hard mode: HP ×10, ATK ×8.5, gold ×5, EXP ×12 (×24 for regular enemies and map bosses).
- Danger level vs player level drives the gauge speed: 4 (T ≥ 1.4L+50) → 0.98 per moving frame, 3 → 0.85, 2 → 0.72, 1 → 0.64, 0 → 0.58, −1 (T ≤ 0.74L−6) → 0.40, −2 (T ≤ 0.58L−12) → 0.32. Equipment: `inc = (inc + m − 1) * m`, clamp 0.15..0.999.
- A battle is rolled when the gauge crosses a checkpoint (every 10 up to 50, every 5 above) with chance `(p² + p³)/2.2`, and forced at 100.
- Area bonuses (type × 10 + charges) modify the next battles in an area: enemy HP ½, ATK ½, crit/combo up, gold ×2/3/4/7, EXP ×1.5/×2, or hidden bosses. They spawn after wins (50% / 30% / 5% rolls) and lose a charge every battle.

## Items

- Weapons and armor: flat + percent. Owning n ≥ 2 copies scales them: `lvMulti = max(1, int(pct*0.01 + 0.9))`, `lvPlus = max(10, int(flat*0.05 + lvMulti*10))` rounded down to tens, both × n.
- Accessories carry an effect code and value (see `src/core/attributes/effects.js`). Ranks 1★..4★; mini slots accept ≤2★ (slots 7-8) and 1★ (slots 9-10).
- Shop: price 0 = drop only; weapons / armor can be bought once, accessories up to 3 copies. Accessory slots unlock for 5k, 30k, 250k, 500k, 750k, 5M, 5M, 3.5M, 3.5M gold.
- Drops are rolled when the battle starts (tier pick `int(rand * tiers * 0.85 * ((itemRate+1)/2) + 1)`), granted on a win; repeat copies are heavily reduced (accessories stop at 3, gear at 10).
