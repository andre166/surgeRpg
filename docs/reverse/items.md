# Inflation RPG – Items & Equipment (reverse-engineered)

Source: decompiled AS3 under `reverse/decomp/scripts/`. All line numbers below refer to files in that tree. Machine-readable table: `reverse/extracted/items.json`.

Vocabulary used by the code: *soubi* = equipment, *buki* = weapon (`syu`=0), *bougu* = armor (`syu`=1), *akusesari/akuse* = accessory (`syu`=2), *houseki* = gem, *kakaku* = price, *kazu/times* = number of copies owned, *zyoui* = "upper tier", *kaihuku* = heal, *kakuritu* = probability.

## 1. Item model (`Class/Item.as`)

| Field | Set by | Meaning |
|---|---|---|
| `listnum:int` | ItemData | Item id inside its type. Ids are dense: weapons 0..81, armors 0..35, accessories 0..71. **Table order ≠ id order** (the shop list is displayed in table order; `ItemuXXX_ListNum` is the id-indexed lookup, `ItemDataMana.as:78-102`). |
| `syu:int` | ItemData | 0 weapon, 1 armor, 2 accessory (`ItemData.as:243,258,284`). |
| `name:String` | ItemData | Localised name (`L.Get(key)`, optional `"+1"` suffix). |
| `kakaku:int` | ItemData | Shop price in G. **0 = not for sale** (drop only; `StMapMenu_SoubiList.as:617-621` shows "[x] is not for sale"). |
| `baset1:int` | ItemData | Weapon/armor: flat ATK/DEF bonus. Accessory: **effect code** (see §4). |
| `baset2:int` | ItemData | Weapon/armor: percent bonus (displayed as `baset2+100 %`). Accessory: effect value (0 when the effect has no magnitude). |
| `hardmode:int` | ItemData | 1 = hard-mode item (red "H" numbering, hidden from lists while `gamesavedata.Highlv < 100000`, `StMapMenu_SoubiList.as:831,1015,1252`). Also used to skip them in the tap-index mapping (`StMapMenu_SoubiList.as:549-587`). |
| `setumei:String` | ItemData | Accessory description text. |
| `rank:int` | ItemData | Accessory star rank: R1=0 (1★), R2=1 (2★), R3=2 (3★), R4=3 (4★) (`ItemData.as:10-16`; stars drawn in `list.as:153-185`). Weapons/armor keep the default 0. |
| `plus:int`, `multi:int` | `SetItemTimes(n)` | Effective flat / percent bonus after duplicate-copy scaling (§3). |
| `plusStr`, `multiStr` | `SetItemTimes` | Display strings (`"5"`, `"100%"`, or `"5 +20"`, `"100% +2%"`). |
| `pt1`, `pt2`, `fontsize` | – | UI only / unused. |
| `BitD` | ItemData | Icon = 24×24 tile (col=`param3`, row=`param4`) of `item0png`/`item1png`/`item2png`, scaled ×2 (`ItemData.as:241,256,278`). |

Stats are therefore stored as **flat + percent** for weapons/armor and as **(effect code, value)** for accessories. Nothing is per-level: the only scaling is by number of copies owned (§3).

Ownership (`Class/GDataItemMana.as`) is three `Vector.<int>` counters `ItemBUKIKazu / ItemBOUGUKazu / ItemAKUSEKazu`, indexed by `listnum`. New save: weapon 0 and armor 0 owned ×1, everything else 0 (`GDataItemMana.as:34-57`).

Accessory upgrade chains (`ItemZyouiGokan`, `ItemData.as:262-266`) are only used by the "show upper tier" list filter (§7.4), not by gameplay.

## 2. Counts

* 82 weapons (`ItemBUKIpush`, `ItemData.as:31-112`) – 25 flagged hard-mode.
* 36 armors (`ItemBOUGUpush`, `ItemData.as:113-148`) – 13 flagged hard-mode.
* 72 accessories (`ItemAkusesaripush`, `ItemData.as:149-228`) – 15 flagged hard-mode; 9 upgrade chains.

Full tables in §11.

## 3. Weapon / armor bonus and duplicate scaling (`Class/Item.as:251-280`)

`SetItemTimes(n)` is called with `n = copies owned` whenever the count changes (`GDataItemMana.as:235-265`, on new game, load and every `AddOneItemKazu`). Note `lvup_plus` and `lvup_multi` are `int`, so each assignment truncates.

```
if n >= 2:
    lvup_multi = int(baset2 * 0.01 + 0.9);      if lvup_multi < 1: lvup_multi = 1
    lvup_plus  = int(baset1 * 0.05 + lvup_multi * 10);  if lvup_plus < 10: lvup_plus = 10
    lvup_plus -= lvup_plus % 10                 // round down to multiple of 10
    lvup_plus  *= n
    lvup_multi *= n
    plus  = baset1 + lvup_plus
    multi = baset2 + lvup_multi
else:
    plus = baset1; multi = baset2
```

Examples: Dagger (5, 0%) with n=2 → lvup_multi=1, lvup_plus=10 → ×2 → plus=25, multi=2 (shown "5 +20", "100% +2%"). Excalibur (10000, 230%) with n=3 → lvup_multi=int(3.2)=3, lvup_plus=int(500+30)=530→530, ×3 → plus=11590, multi=239.

Copies come only from drops (weapons/armor can be bought only when owned==0, §7.1); drops cap at 10 copies (§8). The explanation dialog in the shop says: "If you obtain multiple copies of weapons and armors, they get stronger. Enemies' drop rates will decline after the second weapon or armor drop." (`StMapMenu_SoubiList.as:359`, `LocData.as:194`).

## 4. Accessory effect codes (`baset1`) and how each is applied

All applied in `Class/GData.as:603-735` (`EqStUpdate`), looping slots 2..11, skipping values < 0.

| code | effect (value = `baset2`) | code line | notes |
|---|---|---|---|
| 30 | `ephp += v` | GData.as:612 | HP Gem |
| 31 | `epatk += v` | :616 | ATK Gem |
| 32 | `epdef += v` | :620 | DEF Gem |
| 33 | `epspeed += v` | :624 | AGI Gem |
| 34 | `epluk += v` | :628 | LUC Gem |
| 35 | Play Gem: `PlayHouseki.SetData(gameovercount, v, inBattle)`; `epatk += ATKDEF; epdef += ATKDEF; epspeed += SPE` | :632-637 | `GData_PlayHouseki.as:37-65`: v=1 → k=3/3, v=2 → 17/12, v=3 → 40/30; ATKDEF = gameovercount·k1, SPE = gameovercount·k2. `Init(true)` (called from battle, `BattleVar.as:248`) rolls `Math.random()<0.4` → the bonus is zeroed for that battle (`GData_PlayHouseki.as:26-33,58-62`). Description: "[x]% probability of no effect" with 40. |
| 40 | all five `ep*` += v | :639-645 | Hero Gem |
| 41 | `epatk, epdef, epspeed += v` | :647-651 | God of War Gem |
| 42 | `ephp, epatk, epdef, epspeed += v` | :653-658 | Four Gods Gem |
| 60 | `expbairitu += v/100` | :660-662 | EXP gems stack additively; `EneExp *= expbairitu` (`BattleVar.as:142`) |
| 700 | `GetPlusStPt = 1` if still 0 | :668-670 | Stat points per level-up = `4 + GetPlusStPt` (`GData.as:770,778`, `Battle.as:739`) → 5 |
| 701 | `GetPlusStPt = 2` | :664-666 | → 6 per level; wins over 700 |
| 820 | `kyarakutaNouryokuUp += v` | :732-734 | Proof of the Hero: character-ability multiplier `(1 + v/100)` (`GData.as:743`) |
| 200 | `crihPlusKakuritu += 0.08` | :672-674 | stacks; `criKakuritu += …`, capped 0.6 (`BattleVar.as:150-154`) |
| 210 | `crihplusdamage += 0.2` | :676-678 | stacks; crit dmg `(atk+1)*(1.75+k/5)*crihplusdamage+4` (`Battle.as:923`) |
| 310 / 311 / 312 | `TimesDamageCrihOn` = 1 / 2 / 3 | :680-691 | highest wins; own attacks while `myTurnEndCount < TimesDamageCrihOn` are forced crits (`Battle.as:905-908`) |
| 250 | `renzokuPlusKakuritu = 0.09` | :692-694 | not stacking; combo chance capped 0.7 (`BattleVar.as:144-148`) |
| 1201 | `DamegeKaihukuOn0 = true` | :696-698 | Small Recovery Necklace: heal `floor(dmg*0.0198+1)` per own hit (`Battle.as:357-364`) |
| 1200 | `DamegeKaihukuOn = true` | :700-702 | Recovery Necklace: heal `floor(dmg*0.039+1)` – **only if 1201 is not equipped** (else-if, `Battle.as:365`) |
| 1210 | `SokusiKaihiKakuritu += 1` | :704-706 | Revival Necklace |
| 1211 | `SokusiKaihiKakuritu += 10` | :708-710 | Revival Necklace+1. Survival roll (`Battle.as:402-414`): `a = S % 10`, `b = int(S / 10)`, `p = [0,0.45,0.62,0.74,0.745,0.75,0.755][a+b] + [0,0.02,0.03,0.04][b]`; if `random < p` HP becomes 1 instead of 0 (not when HP was already 1). |
| 10 | `encountBairitu -= 0.15` | :712-714 | Encounter Reduction Ring (stacks) |
| 12 | `encountBairitu += 0.2` | :716-718 | Encounter Increase Ring (stacks). Gauge gain per step: `(base + encountBairitu - 1) * encountBairitu`, clamped [0.15, 0.999] (`StageMap.as:1258-1267`) |
| 14 | `sokuencountOn = true` | :720-722 | shows the instant-encounter button (`StageMapTopMenu.as:104`) |
| 100 | `MoveSpeed += v/100` | :724-726 | base 10 (`GData.as:582`); 60 → +0.6, 100 → +1.0, stacks |
| 500 | `MAXnokoriBattleTimes += v` | :728-730 | base 30 (normal) / 10 (hard) (`GData.as:583-590`); stacks |

Flags reset every `EqStUpdate` (`GData.as:578-599`), so nothing persists when an item is removed.

## 5. How equipment combines with base stats (`Class/GData.as:551-761`)

Base stats `hp, atk, def, speed, luk` (start 100/10/10/5/1, `GData.as:389-393`) include allocated stat points. Equipment never modifies them; it produces separate `e*` values:

```as
// GData.as:561-577
ephp = epatk = epdef = epspeed = epluk = 0;        // flat part
ebhp = ebatk = ebdef = ebspeed = ebluk = 0;        // percent part (as fraction)
weapon = GetItemListNum(0, ItemEquip[0]); if (weapon) { epatk = weapon.plus; ebatk = weapon.multi * 0.01; }
armor  = GetItemListNum(1, ItemEquip[1]); if (armor)  { epdef = armor.plus;  ebdef = armor.multi * 0.01; }
// ... accessories add to ep* (section 4) ...
// GData.as:740-749  character-power bonus (hero class), also goes into the percent part
k = kyarakutalv > 0 ? ((kyarakutalv + getCurrentKyaraLv()) * 0.25 + 0.75) * (1 + kyarakutaNouryokuUp / 100) : 0;
ebhp += KPhp*k*0.06; ebatk += KPatk*k*0.07; ebdef += KPdef*k*0.07; ebspeed += KPspeed*k*0.075; ebluk += KPluk*k*0.08;
// GData.as:750-754  final equipment bonus
ehp    = ephp    + (ephp    + hp)    * ebhp;
eatk   = epatk   + (epatk   + atk)   * ebatk;
edef   = epdef   + (epdef   + def)   * ebdef;
espeed = epspeed + (epspeed + speed) * ebspeed;
eluk   = epluk   + (epluk   + luk)   * ebluk;
```

So: **flat bonuses are added first, then the percent multiplier applies to (base + flat)**, i.e. effective stat = `(base + flat) * (1 + pct)`. The weapon percent multiplies the ATK gems too (they are all in `epatk`). No rounding is done here (all `Number`).

Consumption: battle copies `myhp = hp + ehp`, `myatk = atk + eatk`, … (`BattleVar.as:241-245`); menus show `floor(base)` with `(+floor(e*))` (`StMapMenu_soubi.as:175-199`). The "current / after equip" preview in the shop uses `int(atk + eatk)` (`StMapMenu_SoubiList.as:651-654`).

Also computed at the end (`GData.as:755-761`): `speedwariai`/`lukwariai` = share of `(speed+espeed)/2` and `(luk+eluk)/1` in `hp/5 + atk/3 + def/3 + speed/2 + luk/1` (ints), used for crit/combo/drop rates.

`EqStUpdate` runs on new game (`GData.as:439`), after every equip/unequip/buy (`StMapMenu_SoubiList.as:787`), when opening the equipment menu (`StMapMenu_soubi.as:213`), and at battle start when a Play Gem is equipped (`BattleVar.as:247-258`).

## 6. Slots

`gdata.ItemEquip` is a `Vector.<int>(16)` (`GData.as:165`). Value `-2` = locked, `-1` = empty, `>=0` = item id. Only indices 0..11 are reachable from the UI (`StMapMenu_soubi.as:80-119`, 12 buttons); 12..15 stay `-2`.

| slot | content | notes |
|---|---|---|
| 0 | weapon | exactly one, never empty |
| 1 | armor | exactly one, never empty |
| 2..7 | accessory (full slots) | any rank |
| 8..9 | accessory "mini" slot | only rank ≤ 1 (1★–2★) (`StMapMenu_SoubiList.as:597-610`) |
| 10..11 | accessory "mini" slot | only rank 0 (1★) |

Initial state on the very first game: `[0,0,-1,-2,…,-2]` (`GData.as:408-414`); later games reload `gamesavedata.gameItemEquip` (`GData.as:421-427`).

**Unlocking accessory slots** (`StMapMenu_soubi.as:351-375`, costs `Game.as:1159`): tapping a locked slot `s` opens a Yes/No dialog if `g >= AKUSESlotLockMONEY[s-2]`; Yes → `g -= cost`, `ItemEquip[s] = -1`, and the slot is unlocked in all 5 equipment sets (`GData_ItemEquipSet.as:125-132`). Costs:

| slot | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|
| G | 0 (open) | 5,000 | 30,000 | 250,000 | 500,000 | 750,000 | 5,000,000 | 5,000,000 | 3,500,000 | 3,500,000 |

Slots can be unlocked in any order; there is no prerequisite besides gold. Max 10 accessory slots (6 full + 4 mini).

**Equipment sets** (`Class/GData_ItemEquipSet.as`, `StMapMenu_soubiSet.as`): 5 saved copies of `ItemEquip`. Set 1 is free; sets 2..5 are unlocked in order for `[300000, 1500000, 2100000, 4000000]` G (`StMapMenu_soubiSet.as:23`, check `moneyArr[k] <= g` :250, deduct :264 in `lockFunc` :261-276). `SetNum(k)` copies the set into `ItemEquip` (`GData_ItemEquipSet.as:149-178`); `EqStUpdate` writes `ItemEquip` back into the active set (`:93-123`). With all 4 unlocked, set buttons can be shown on the map (`gameItemSetMapDirectOFFON`, `GameSaveData_ItemEquipSet.as:65-75`).

## 7. Shop / equip rules (`Class_StMapMenu/StMapMenu_SoubiList.as`)

### 7.1 Buying
Tapping an item opens a 3-button dialog (Buy / Equip / Close) (`:720-722`). With `price = kakaku`, `owned = GetItemTimes_Item`:

* `price == 0` → "not for sale", Buy disabled (`:617-621`).
* Buy enabled when `(owned < 3 && slot >= 2) || (owned == 0 && slot <= 1)` **and** `g >= price` (`:622-633`). Otherwise "sold out" (`:635-639`) or "not enough money" (`:630-633`).
  * weapons/armor: at most **1** purchase each; accessories: up to **3** copies.
* Buy (`:740-767`): `g -= price; AddOneItemKazu_Item(item)` (recomputes `SetItemTimes` for weapons/armor) then asks "Equip [x]?".
* Unknown items (`price + owned == 0`) are displayed as "？？？？" with a "?" icon (`:613-616`, `list.as:234-240,314-319`).
* Prices are flat constants; no price formula and no discounts.
* `ItemDataMana.GetItemMinMoney()` (`ItemDataMana.as:138-188`) = cheapest unowned purchasable item (used elsewhere for hints).

### 7.2 Equipping
* weapon/armor (`:640-694`): needs `owned >= 1`; if already in the slot → "equipped". Dialog shows "current ATK → after-equip ATK" by temporarily equipping and calling `EqStUpdate`.
* accessory (`:695-718`): needs `owned >= 1`; not already in **this** slot; and `GetEquipSumTimes_Item(item) < owned` — i.e. the same accessory can be equipped in several slots, at most once per owned copy (`Class/GDataW.as:42-67` counts occurrences in slots 2..15).
* mini-slot rank limit (`:597-610,719-735`): slots 8–9 refuse rank ≥ 2, slots 10–11 refuse rank ≥ 1.
* Equip (`:769-791`): `ItemEquip[slot] = item.listnum; EqStUpdate(false)`.
* There is **no explicit unequip**: an accessory slot only becomes `-1` on unlock or on save-sanitisation; weapons/armor are always replaced. (Accessories can be swapped between items freely.)

### 7.3 List visibility
* Hard-mode items (`hardmode==1`) are hidden while `gamesavedata.Highlv < 100000` (`:831-844`) and numbered separately with a red "H" prefix (`list.as:196-200`).
* The weapon/armor list shows `owned` and `(equipped-count)`; price text only when `owned == 0` (`list.as:252-292`); accessory list shows the price while `owned < 6` (`list.as:346-353`).

### 7.4 "Show upper tier" filter (`zyouimode`)
Button appears for weapons when ≥15 distinct weapons owned, armor ≥10 (`:799-817`), accessories when any chain has two consecutive members owned ≥3 (`:1187-1228`). When on, items dominated by another owned item (`plus <= other.plus && multi <= other.multi`, `zyouiC.syori`, `:1479-1486`) collapse to a one-line row; for accessories, chain item *i* collapses when items *i+1* and *i+2* are owned ≥3 (`syoriAksue`, `:1487-1493`), and everything earlier in the chain is collapsed too (`:1305-1313`).

## 8. Enemy drops (random item outcome) – `BattlePackage/BattleItemMana.as:16-132`

Each enemy definition passes up to 3 drop candidates `[type, id, baseProb]` (plus 3 hard-mode overrides used instead when in hard mode, `BattleVar.as:132-137`). Rolled once at battle load (`BattleVar.as:230`, not for already-beaten bosses), granted on win via `AddOneItemKazu` (`BattleItemMana.as:139-147`, `DataMana_WinOrLose.as:82-85`).

```
n = number of candidates (1..3)
pick = int(Math.random() * n * 0.85 * ((itemKakuritu + 1) / 2) + 1), clamped to [0, n]  // higher luck → later candidate
cand = candidates[pick-1]; owned = GetItemTimes(type, id)
p = cand.baseProb * itemKakuritu
if type == 2 (accessory): if owned >= 3 → p = -1 (no drop)
else (weapon/armor):
    if owned >= 10 → p = -1
    else if owned >= 1:
        if p >= 0.15: p = p*0.1 + 0.135
        if Highlv < 2000: p *= 0.1
        p *= 0.55                       // owned>=1
        if owned >= 2: p *= 0.55
        if owned >= 3: p *= 0.6
        if owned >= 4: p *= 0.65
        for i in 4..owned-1: p *= 0.75
        if owned >= 7: p *= 0.5
        p = min(p, 0.15)
        if p < 0.001:  p = 0.00025 + p*0.75
        if p < 0.0001: p = 0.000075 + p*0.25
drop if Math.random() <= p
```

`itemKakuritu` (`BattleVar.as:386-439`) depends on luck: `myluk/T*0.65 + 0.3` + `min(myluk/2000,1)*0.15` (0.16 when ≥) + `min(myluk/25000,1)*0.15` (0.16) + `min(myluk/300000,1)*0.3` (0.31) + `min(myluk/500000,1)*0.35` (0.36) + `min(myluk/1000000,1)*0.15` (0.16); then `if >1: (x+1.7)/2.7`, `if >2: (x+3.5)/2.75`, cap 3.5, truncated to 2 decimals. `T` is an enemy-strength divisor (`BattleVar.as:319-335`): `enePoint<=500: (enePoint*4+1000)/6`, `<=1000: (enePoint*4+2000)/6`, `<=2000: (enePoint*4+4000)/6`, else `(enePoint*3+4000)/5`. The complete per-enemy candidate list is exported in `items.json → enemy_drops` (144 enemies, 288 entries) and summarised in §12.

## 9. Persistence between runs

Everything item-related is **permanent** (meta-progression):

* owned counts → `gamesavedata.gameItem{BUKI,BOUGU,AKUSE}Kazu` on game over (`GDataItemMana.as:83-104`, `GameOver.as:349`), reloaded on the next run (`:59-81`).
* equipped slots → `gameItemEquip` (`GameOver.as:343-347`) and reloaded (`GData.as:421-427`); unlock state is implied by `-2` values.
* equipment sets + unlocked-set count → `GameSaveData_ItemEquipSet` (`GData_ItemEquipSet.as:76-91`).
* gold `g` persists too (it is read directly in the shop), so buying is a between-runs activity.
* Mid-run everything is also written to the shared object (`sodataFunc_Status`, `GData.as:268-282`).
* Save sanitisation on version upgrade (`GameSaveData.as:147-213`): weapon/armor counts >10 reset to 1; accessory counts ≥4 reset to 2 and that item is cleared from all set slots (`ResetOne`, `GameSaveData_ItemEquipSet.as:35-63`).
* High-score snapshot `HighItemEquip/HighItemKazu` (`GameOver.as:430-433`) is display/ranking only.

## 10. Battle HP recovery (the only item-like purchase in battle)

`BattlePackage/DataMana_WinOrLose.as:47-50`:

```
cost = int(g * 0.5 + maxHP * 0.5 + 3000)      // maxHP = hp + ehp (myhpm)
```

Offered from the pause menu when not already pending (`Battle.as:198-205`); button disabled if `g < cost` (`Battle.as:1055-1065`). Paying (`Battle.as:230-238`, `StartKaihukuON`: `g -= cost`) fully restores HP at the start of the player's next turn (`Battle.as:480-483`). No consumable items exist otherwise.

## 11. Item tables

Columns: `id` = `listnum`; `#` = position in the shop list; `flat` = `baset1`, `%` = `baset2` (display `baset2+100 %`); `H` = hard-mode flag. Price 0 = drop only.

### 11.1 Weapons (slot 0) – 82

| # | id | name (en) | name (ja) | flat | % | price | H | src |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | Dagger | ダガー | 5 | 0 | 0 |  | ItemData.as:31 |
| 2 | 1 | Bowie Knife | ボウイナイフ | 30 | 10 | 300 |  | ItemData.as:32 |
| 3 | 2 | Kukri Knife | ククリナイフ | 30 | 35 | 0 |  | ItemData.as:33 |
| 4 | 75 | Kukri Knife+1 | ククリナイフ+1 | 3000 | 250 | 0 | H | ItemData.as:34 |
| 5 | 3 | Iron Sword | アイアンソード | 140 | 25 | 6000 |  | ItemData.as:35 |
| 6 | 4 | Bronze Sword | ブロンズソード | 400 | 30 | 17000 |  | ItemData.as:36 |
| 7 | 5 | Iron Axe | アイアンアックス | 1400 | 35 | 44000 |  | ItemData.as:37 |
| 8 | 6 | Steel Sword | スチールソード | 800 | 60 | 83000 |  | ItemData.as:38 |
| 9 | 7 | Steel Axe | スチールアックス | 3000 | 40 | 0 |  | ItemData.as:39 |
| 10 | 78 | Steel Axe+1 | スチールアックス+1 | 90000 | 200 | 0 | H | ItemData.as:40 |
| 11 | 8 | Broadsword | ブロードソード | 1200 | 80 | 110000 |  | ItemData.as:41 |
| 12 | 9 | Francisca | フランキスカ | 2300 | 75 | 144000 |  | ItemData.as:42 |
| 13 | 10 | Scimitar | シミター | 1100 | 125 | 228000 |  | ItemData.as:43 |
| 14 | 58 | Scimitar+1 | シミター+1 | 12000 | 260 | 3000000 | H | ItemData.as:44 |
| 15 | 11 | Battle Axe | バトルアックス | 5000 | 45 | 0 |  | ItemData.as:45 |
| 16 | 12 | Glaive | グレイブ | 2700 | 80 | 244000 |  | ItemData.as:46 |
| 17 | 13 | Trident | トライデント | 1800 | 130 | 0 |  | ItemData.as:47 |
| 18 | 77 | Trident+1 | トライデント+1 | 8000 | 280 | 0 | H | ItemData.as:48 |
| 19 | 14 | Wind Sword | ウィンドウーソード | 1000 | 150 | 0 |  | ItemData.as:49 |
| 20 | 40 | Wind Sword+1 | ウィンドウーソード+1 | 1400 | 170 | 0 |  | ItemData.as:50 |
| 21 | 70 | Wind Sword+2 | ウィンドウーソード+2 | 40000 | 280 | 0 | H | ItemData.as:51 |
| 22 | 15 | Fire Sword | ファイアーソード | 2000 | 120 | 0 |  | ItemData.as:52 |
| 23 | 41 | Fire Sword+1 | ファイアーソード+1 | 2800 | 140 | 0 |  | ItemData.as:53 |
| 24 | 71 | Fire Sword+2 | ファイアーソード+2 | 100000 | 260 | 0 | H | ItemData.as:54 |
| 25 | 16 | Ice Sword | アイスソード | 600 | 170 | 0 |  | ItemData.as:55 |
| 26 | 42 | Ice Sword+1 | アイスソード+1 | 800 | 190 | 0 |  | ItemData.as:56 |
| 27 | 72 | Ice Sword+2 | アイスソード+2 | 10000 | 300 | 0 | H | ItemData.as:57 |
| 28 | 17 | Thunder Sword | ライジングソード | 150 | 190 | 0 |  | ItemData.as:58 |
| 29 | 43 | Thunder Sword+1 | ライジングソード+1 | 200 | 210 | 0 |  | ItemData.as:59 |
| 30 | 73 | Thunder Sword+2 | ライジングソード+2 | 2000 | 340 | 0 | H | ItemData.as:60 |
| 31 | 18 | Silver Sword | シルバーソード | 1700 | 160 | 470000 |  | ItemData.as:61 |
| 32 | 19 | Silver Spear | シルバースピアー | 1600 | 180 | 0 |  | ItemData.as:62 |
| 33 | 20 | Samurai Sword | 刀 | 5000 | 125 | 580000 |  | ItemData.as:63 |
| 34 | 76 | Samurai Sword+1 | 刀+1 | 120000 | 250 | 7000000 | H | ItemData.as:64 |
| 35 | 21 | Dark Sword | デビルソード | 2000 | 160 | 0 |  | ItemData.as:65 |
| 36 | 22 | Dark Scythe | デビルアックス | 9000 | 40 | 0 |  | ItemData.as:66 |
| 37 | 23 | Rare Sword | レアソード | 500 | 190 | 0 |  | ItemData.as:67 |
| 38 | 24 | Rare Gladius | レアグラディウス | 50 | 230 | 0 |  | ItemData.as:68 |
| 39 | 25 | Knight Sword | ナイトソード | 1600 | 190 | 820000 |  | ItemData.as:69 |
| 40 | 26 | Knight Rapier | ナイトレイピア | 250 | 240 | 0 |  | ItemData.as:70 |
| 41 | 55 | Knight Rapier+1 | ナイトレイピア+1 | 5000 | 360 | 0 | H | ItemData.as:71 |
| 42 | 27 | Knight Spear | ナイトスピア | 3500 | 180 | 0 |  | ItemData.as:72 |
| 43 | 44 | Tomahawk | トマホーク | 35000 | 10 | 0 |  | ItemData.as:73 |
| 44 | 45 | Samurai Longsword | 太刀 | 12000 | 125 | 1400000 |  | ItemData.as:74 |
| 45 | 46 | Estoc | エストック | 0 | 250 | 0 |  | ItemData.as:75 |
| 46 | 50 | Estoc+1 | エストック+1 | 0 | 280 | 0 |  | ItemData.as:76 |
| 47 | 57 | Estoc+2 | エストック+2 | 0 | 420 | 0 | H | ItemData.as:77 |
| 48 | 47 | Mace | メイス | 8000 | 150 | 800000 |  | ItemData.as:78 |
| 49 | 28 | Hard Sword | ハードソード | 3000 | 200 | 0 |  | ItemData.as:79 |
| 50 | 29 | Hard Axe | ハードアックス | 10000 | 130 | 0 |  | ItemData.as:80 |
| 51 | 30 | Hard Lance | ハードランス | 5000 | 180 | 0 |  | ItemData.as:81 |
| 52 | 31 | Gold Sword | ゴールドソード | 5000 | 240 | 0 |  | ItemData.as:82 |
| 53 | 32 | Gold Axe | ゴールドアックス | 25000 | 130 | 0 |  | ItemData.as:83 |
| 54 | 48 | Green Light Sword | 緑光剣 | 3000 | 270 | 0 |  | ItemData.as:84 |
| 55 | 59 | Green Light Sword+1 | 緑光剣+1 | 20000 | 430 | 0 | H | ItemData.as:85 |
| 56 | 49 | Red Light Sword | 赤光剣 | 14000 | 220 | 0 |  | ItemData.as:86 |
| 57 | 60 | Red Light Sword+1 | 赤光剣+1 | 140000 | 370 | 0 | H | ItemData.as:87 |
| 58 | 51 | Crystal Hammer | クリスタルハンマー | 20000 | 190 | 0 |  | ItemData.as:88 |
| 59 | 54 | Crystal Lance | クリスタルランス | 10000 | 260 | 0 |  | ItemData.as:89 |
| 60 | 56 | Crystal Lance+1 | クリスタルランス+1 | 40000 | 390 | 0 | H | ItemData.as:90 |
| 61 | 52 | Four Gods/Red Lance | 四神・赤槍 | 25000 | 280 | 0 |  | ItemData.as:91 |
| 62 | 61 | Four Gods/Red Lance+1 | 四神・赤槍+1 | 125000 | 410 | 0 | H | ItemData.as:92 |
| 63 | 53 | Four Gods/Blue Sword | 四神・青剣 | 100 | 320 | 0 |  | ItemData.as:93 |
| 64 | 62 | Four Gods/Blue Sword+1 | 四神・青剣+1 | 1000 | 520 | 0 | H | ItemData.as:94 |
| 65 | 79 | Wing Lance | ウイングランス | 20000 | 280 | 0 |  | ItemData.as:95 |
| 66 | 80 | Wing Sword | ウィングソード | 30000 | 310 | 0 |  | ItemData.as:96 |
| 67 | 81 | Wing Sword+1 | ウィングソード+1 | 30000 | 560 | 0 | H | ItemData.as:97 |
| 68 | 33 | Lvateinn/Cursed Sword | 魔剣・レーヴァテイン | 1500 | 205 | 0 |  | ItemData.as:98 |
| 69 | 63 | Lvateinn/Cursed Sword+1 | 魔剣・レーヴァテイン+1 | 15000 | 370 | 0 | H | ItemData.as:99 |
| 70 | 34 | Kujang/Cursed Dagger | 魔剣・クジャン | 60 | 250 | 0 |  | ItemData.as:100 |
| 71 | 64 | Kujang/Cursed Dagger+1 | 魔剣・クジャン+1 | 600 | 420 | 0 | H | ItemData.as:101 |
| 72 | 35 | Durandal/Cursed Axe | 魔斧・デュランダル | 20000 | 100 | 0 |  | ItemData.as:102 |
| 73 | 65 | Durandal/Cursed Axe+1 | 魔斧・デュランダル+1 | 200000 | 270 | 0 | H | ItemData.as:103 |
| 74 | 36 | GaeBolg/Cursed Lance | 魔槍・ゲイボルグ | 5000 | 190 | 0 |  | ItemData.as:104 |
| 75 | 66 | GaeBolg/Cursed Lance+1 | 魔槍・ゲイボルグ+1 | 50000 | 350 | 0 | H | ItemData.as:105 |
| 76 | 37 | Excalibur/Holy Sword | 聖剣・エクスカリバー | 10000 | 230 | 0 |  | ItemData.as:106 |
| 77 | 67 | Excalibur/Holy Sword+1 | 聖剣・エクスカリバー+1 | 50000 | 480 | 0 | H | ItemData.as:107 |
| 78 | 38 | Swanchika/Holy Axe | 聖斧・スワンチカ | 30000 | 100 | 0 |  | ItemData.as:108 |
| 79 | 68 | Swanchika/Holy Axe+1 | 聖斧・スワンチカ+1 | 250000 | 310 | 0 | H | ItemData.as:109 |
| 80 | 39 | Longinus/Holy Lance | 聖槍・ロンギヌス | 3000 | 290 | 0 |  | ItemData.as:110 |
| 81 | 69 | Longinus/Holy Lance+1 | 聖槍・ロンギヌス+1 | 5000 | 540 | 0 | H | ItemData.as:111 |
| 82 | 74 | Infinity Sword | インフィニティソード | 0 | 0 | 0 | H | ItemData.as:112 |

### 11.2 Armors (slot 1) – 36

| # | id | name (en) | name (ja) | flat | % | price | H | src |
|---|---|---|---|---|---|---|---|---|
| 1 | 0 | Leather Armor | レザーアーマー | 5 | 0 | 0 |  | ItemData.as:113 |
| 2 | 1 | Iron Armor | アイアンアーマー | 40 | 10 | 1000 |  | ItemData.as:114 |
| 3 | 2 | Bronze Armor | ブロンズアーマー | 200 | 25 | 8000 |  | ItemData.as:115 |
| 4 | 3 | Steel Armor | スチールアーマー | 550 | 40 | 22000 |  | ItemData.as:116 |
| 5 | 4 | Scale Armor | スケイルアーマー | 880 | 45 | 64000 |  | ItemData.as:117 |
| 6 | 5 | Spike Armor | スパイクアーマー | 920 | 60 | 130000 |  | ItemData.as:118 |
| 7 | 22 | Spike Armor+1 | スパイクアーマー+1 | 12000 | 210 | 4000000 | H | ItemData.as:119 |
| 8 | 6 | Magic Armor | 術師の鎧 | 5 | 180 | 0 |  | ItemData.as:120 |
| 9 | 23 | Magic Armor+1 | 術師の鎧+1 | 100 | 260 | 0 | H | ItemData.as:121 |
| 10 | 7 | Half Plate Armor | ハーフアーマー | 700 | 110 | 230000 |  | ItemData.as:122 |
| 11 | 8 | Silver Armor | シルバーアーマー | 700 | 150 | 480000 |  | ItemData.as:123 |
| 12 | 9 | Samurai Armor | 武者鎧 | 1400 | 140 | 600000 |  | ItemData.as:124 |
| 13 | 33 | Samurai Armor+1 | 武者鎧+1 | 70000 | 220 | 14000000 | H | ItemData.as:125 |
| 14 | 10 | Dark Armor | デビルアーマー | 800 | 135 | 0 |  | ItemData.as:126 |
| 15 | 11 | Rare Armor | レアアーマー | 50 | 220 | 0 |  | ItemData.as:127 |
| 16 | 12 | Knight Armor | ナイトアーマー | 800 | 180 | 800000 |  | ItemData.as:128 |
| 17 | 32 | Knight Armor+1 | ナイトアーマー+1 | 50000 | 270 | 0 | H | ItemData.as:129 |
| 18 | 17 | Full Plate Armor | フルプレート | 5000 | 160 | 0 |  | ItemData.as:130 |
| 19 | 31 | Full Plate Armor+1 | フルプレート+1 | 100000 | 250 | 0 | H | ItemData.as:131 |
| 20 | 13 | Hard Armor | ハードアーマー | 5000 | 130 | 0 |  | ItemData.as:132 |
| 21 | 14 | Gold Armor | ゴールドアーマー | 2500 | 220 | 0 |  | ItemData.as:133 |
| 22 | 18 | Light Armor | 光鎧 | 0 | 240 | 0 |  | ItemData.as:134 |
| 23 | 24 | Light Armor+1 | 光鎧+1 | 0 | 370 | 0 | H | ItemData.as:135 |
| 24 | 19 | Crystal Cape | クリスタルマント | 8000 | 190 | 0 |  | ItemData.as:136 |
| 25 | 30 | Crystal Cape+1 | クリスタルマント+1 | 20000 | 320 | 0 | H | ItemData.as:137 |
| 26 | 20 | Four Gods/White Armor | 四神・白鎧 | 12000 | 250 | 0 |  | ItemData.as:138 |
| 27 | 25 | Four Gods/White Armor+1 | 四神・白鎧+1 | 50000 | 380 | 0 | H | ItemData.as:139 |
| 28 | 21 | Four Gods/Black Armor | 四神・黒鎧 | 75000 | 150 | 0 |  | ItemData.as:140 |
| 29 | 26 | Four Gods/Black Armor+1 | 四神・黒鎧+1 | 400000 | 240 | 0 | H | ItemData.as:141 |
| 30 | 34 | Wing Armor | ウィングアーマ | 30000 | 260 | 0 |  | ItemData.as:142 |
| 31 | 35 | Wing Armor+1 | ウィングアーマ+1 | 100000 | 420 | 0 | H | ItemData.as:143 |
| 32 | 15 | Megin Gjord/Cursed Armor | 魔鎧・メギンギョルズ | 2000 | 200 | 0 |  | ItemData.as:144 |
| 33 | 27 | Megin Gjord/Cursed Armor+1 | 魔鎧・メギンギョルズ+1 | 10000 | 340 | 0 | H | ItemData.as:145 |
| 34 | 16 | Aegis/Holy Armor | 聖鎧・イージス | 5000 | 240 | 0 |  | ItemData.as:146 |
| 35 | 28 | Aegis/Holy Armor+1 | 聖鎧・イージス+1 | 80000 | 420 | 0 | H | ItemData.as:147 |
| 36 | 29 | Infinity Armor | インフィニティアーマ | 0 | 0 | 0 | H | ItemData.as:148 |

### 11.3 Accessories (slots 2..11) – 72

`code` = `baset1` effect code (§4), `val` = `baset2`, `★` = rank+1.

| # | id | name (en) | name (ja) | code | effect | val | ★ | price | H | description | src |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | HP Gem | HP宝石 | 30 | flat_hp | 400 | 1 | 2000 |  | HP increases by 400 | ItemData.as:149 |
| 2 | 1 | HP Gem+1 | HP宝石+1 | 30 | flat_hp | 2000 | 1 | 40000 |  | HP increases by 2000 | ItemData.as:150 |
| 3 | 2 | HP Gem+2 | HP宝石+2 | 30 | flat_hp | 5000 | 1 | 150000 |  | HP increases by 5000 | ItemData.as:151 |
| 4 | 3 | HP Gem+3 | HP宝石+3 | 30 | flat_hp | 15000 | 1 | 580000 |  | HP increases by 15000 | ItemData.as:152 |
| 5 | 39 | HP Gem+4 | HP宝石+4 | 30 | flat_hp | 30000 | 1 | 0 |  | HP increases by 30000 | ItemData.as:153 |
| 6 | 46 | HP Gem+5 | HP宝石+5 | 30 | flat_hp | 200000 | 2 | 0 |  | HP increases by 200000 | ItemData.as:154 |
| 7 | 59 | HP Gem+6 | HP宝石+6 | 30 | flat_hp | 0 | 2 | 0 | H | HP increases by 0 | ItemData.as:155 |
| 8 | 4 | ATK Gem | 攻撃力宝石 | 31 | flat_atk | 200 | 1 | 3000 |  | ATK increases by 200 | ItemData.as:157 |
| 9 | 5 | ATK Gem+1 | 攻撃力宝石+1 | 31 | flat_atk | 1000 | 1 | 50000 |  | ATK increases by 1000 | ItemData.as:158 |
| 10 | 6 | ATK Gem+2 | 攻撃力宝石+2 | 31 | flat_atk | 3000 | 1 | 150000 |  | ATK increases by 3000 | ItemData.as:159 |
| 11 | 7 | ATK Gem+3 | 攻撃力宝石+3 | 31 | flat_atk | 10000 | 1 | 640000 |  | ATK increases by 10000 | ItemData.as:160 |
| 12 | 40 | ATK Gem+4 | 攻撃力宝石+4 | 31 | flat_atk | 20000 | 1 | 0 |  | ATK increases by 20000 | ItemData.as:161 |
| 13 | 47 | ATK Gem+5 | 攻撃力宝石+5 | 31 | flat_atk | 130000 | 2 | 0 |  | ATK increases by 130000 | ItemData.as:162 |
| 14 | 60 | ATK Gem+6 | 攻撃力宝石+6 | 31 | flat_atk | 0 | 2 | 0 | H | ATK increases by 0 | ItemData.as:163 |
| 15 | 8 | DEF Gem | 防御力宝石 | 32 | flat_def | 200 | 1 | 3000 |  | DEF increases by 200 | ItemData.as:165 |
| 16 | 9 | DEF Gem+1 | 防御力宝石+1 | 32 | flat_def | 1000 | 1 | 50000 |  | DEF increases by 1000 | ItemData.as:166 |
| 17 | 10 | DEF Gem+2 | 防御力宝石+2 | 32 | flat_def | 3000 | 1 | 150000 |  | DEF increases by 3000 | ItemData.as:167 |
| 18 | 11 | DEF Gem+3 | 防御力宝石+3 | 32 | flat_def | 10000 | 1 | 640000 |  | DEF increases by 10000 | ItemData.as:168 |
| 19 | 41 | DEF Gem+4 | 防御力宝石+4 | 32 | flat_def | 20000 | 1 | 0 |  | DEF increases by 20000 | ItemData.as:169 |
| 20 | 48 | DEF Gem+5 | 防御力宝石+5 | 32 | flat_def | 130000 | 2 | 0 |  | DEF increases by 130000 | ItemData.as:170 |
| 21 | 61 | DEF Gem+6 | 防御力宝石+6 | 32 | flat_def | 0 | 2 | 0 | H | DEF increases by 0 | ItemData.as:171 |
| 22 | 12 | AGI Gem | 素早さ宝石 | 33 | flat_speed | 150 | 1 | 2000 |  | AGI increases by 150 | ItemData.as:173 |
| 23 | 13 | AGI Gem+1 | 素早さ宝石+1 | 33 | flat_speed | 800 | 1 | 40000 |  | AGI increases by 800 | ItemData.as:174 |
| 24 | 14 | AGI Gem+2 | 素早さ宝石+2 | 33 | flat_speed | 2000 | 1 | 140000 |  | AGI increases by 2000 | ItemData.as:175 |
| 25 | 15 | AGI Gem+3 | 素早さ宝石+3 | 33 | flat_speed | 7000 | 1 | 500000 |  | AGI increases by 7000 | ItemData.as:176 |
| 26 | 42 | AGI Gem+4 | 素早さ宝石+4 | 33 | flat_speed | 14000 | 1 | 0 |  | AGI increases by 14000 | ItemData.as:177 |
| 27 | 49 | AGI Gem+5 | 素早さ宝石+5 | 33 | flat_speed | 80000 | 2 | 0 |  | AGI increases by 80000 | ItemData.as:178 |
| 28 | 62 | AGI Gem+6 | 素早さ宝石+6 | 33 | flat_speed | 0 | 2 | 0 | H | AGI increases by 0 | ItemData.as:179 |
| 29 | 16 | LUC Gem | 運宝石 | 34 | flat_luk | 100 | 1 | 2000 |  | LUC increases by 100 | ItemData.as:181 |
| 30 | 17 | LUC Gem+1 | 運宝石+1 | 34 | flat_luk | 500 | 1 | 40000 |  | LUC increases by 500 | ItemData.as:182 |
| 31 | 18 | LUC Gem+2 | 運宝石+2 | 34 | flat_luk | 1200 | 1 | 140000 |  | LUC increases by 1200 | ItemData.as:183 |
| 32 | 19 | LUC Gem+3 | 運宝石+3 | 34 | flat_luk | 4000 | 1 | 500000 |  | LUC increases by 4000 | ItemData.as:184 |
| 33 | 43 | LUC Gem+4 | 運宝石+4 | 34 | flat_luk | 8000 | 1 | 0 |  | LUC increases by 8000 | ItemData.as:185 |
| 34 | 50 | LUC Gem+5 | 運宝石+5 | 34 | flat_luk | 50000 | 2 | 0 |  | LUC increases by 50000 | ItemData.as:186 |
| 35 | 63 | LUC Gem+6 | 運宝石+6 | 34 | flat_luk | 0 | 2 | 0 | H | LUC increases by 0 | ItemData.as:187 |
| 36 | 44 | Play Gem | プレイ宝石 | 35 | play_gem | 1 | 3 | 7000 |  | ATKx3, DEFx3, and AGIx3 increase by depending on the times played 40% probability of no effect | ItemData.as:189 |
| 37 | 45 | Play Gem+1 | プレイ宝石+1 | 35 | play_gem | 2 | 4 | 0 |  | ATKx17, DEFx17, and AGIx12 increase by depending on the times played 40% probability of no effect | ItemData.as:190 |
| 38 | 51 | Play Gem+2 | プレイ宝石+2 | 35 | play_gem | 3 | 4 | 0 |  | ATKx40, DEFx40, and AGIx30 increase by depending on the times played 40% probability of no effect | ItemData.as:191 |
| 39 | 20 | EXP Gem | 経験値宝石 | 60 | exp_percent | 10 | 3 | 5000 |  | EXP obtained increases by 10% | ItemData.as:193 |
| 40 | 21 | EXP Gem+1 | 経験値宝石+1 | 60 | exp_percent | 20 | 3 | 120000 |  | EXP obtained increases by 20% | ItemData.as:194 |
| 41 | 22 | EXP Gem+2 | 経験値宝石+2 | 60 | exp_percent | 30 | 3 | 500000 |  | EXP obtained increases by 30% | ItemData.as:195 |
| 42 | 23 | EXP Gem+3 | 経験値宝石+3 | 60 | exp_percent | 50 | 4 | 0 |  | EXP obtained increases by 50% | ItemData.as:196 |
| 43 | 52 | EXP Gem+4 | 経験値宝石+4 | 60 | exp_percent | 60 | 4 | 0 |  | EXP obtained increases by 60% | ItemData.as:197 |
| 44 | 64 | Hero Gem | 勇者の宝石 | 40 | flat_all | 30000 | 1 | 0 |  | All stats increase by 30000 | ItemData.as:199 |
| 45 | 65 | Hero Gem+1 | 勇者の宝石+1 | 40 | flat_all | 60000 | 2 | 0 | H | All stats increase by 60000 | ItemData.as:200 |
| 46 | 69 | Hero Gem+2 | 勇者の宝石+2 | 40 | flat_all | 120000 | 2 | 0 | H | All stats increase by 120000 | ItemData.as:201 |
| 47 | 66 | God of War Gem | 戦神の宝石 | 41 | flat_atk_def_speed | 50000 | 1 | 0 | H | ATK, DEF, and AGI increase by 50000 | ItemData.as:202 |
| 48 | 67 | God of War Gem+1 | 戦神の宝石+1 | 41 | flat_atk_def_speed | 0 | 2 | 0 | H | ATK, DEF, and AGI increase by 0 | ItemData.as:203 |
| 49 | 70 | Four Gods/Gem | 四神・宝珠 | 42 | flat_hp_atk_def_speed | 90000 | 2 | 0 |  | HP, ATK, DEF, and AGI increase by 90000 | ItemData.as:204 |
| 50 | 71 | Four Gods/Gem+1 | 四神・宝珠+1 | 42 | flat_hp_atk_def_speed | 360000 | 2 | 0 | H | HP, ATK, DEF, and AGI increase by 360000 | ItemData.as:205 |
| 51 | 24 | Stat Point Crystal | ステータスPTクリスタル | 700 | stat_points_5 | 1 | 3 | 0 |  | The number of Stat Points obtained is now 5 | ItemData.as:206 |
| 52 | 55 | Stat Point Crystal+1 | ステータスPTクリスタル+1 | 701 | stat_points_6 | 1 | 3 | 0 | H | The number of Stat Points obtained is now 6 | ItemData.as:207 |
| 53 | 68 | Proof of the Hero | 勇者の証 | 820 | character_ability_percent | 50 | 2 | 0 | H | Character Ability effect increases by 50% | ItemData.as:208 |
| 54 | 25 | Critical Rate Ring | 会心率上昇リング | 200 | crit_rate | 0 | 2 | 0 |  | Critical rate increases | ItemData.as:209 |
| 55 | 26 | Critical Damage Ring | 会心威力上昇リング | 210 | crit_damage | 0 | 3 | 170000 |  | Critical damage increases | ItemData.as:210 |
| 56 | 27 | First Critical Ring | 初撃会心リング | 310 | guaranteed_crit_1 | 0 | 2 | 210000 |  | The first attack is always a critical | ItemData.as:211 |
| 57 | 56 | 2 Critical Ring | 2連撃会心リング | 311 | guaranteed_crit_2 | 0 | 3 | 2000000 | H | Up to 2 attacks will be critical hits | ItemData.as:212 |
| 58 | 57 | 3 Critical Ring | 3連撃会心リング | 312 | guaranteed_crit_3 | 0 | 3 | 0 | H | Up to 3 attacks will be critical hits | ItemData.as:213 |
| 59 | 28 | Combo Rate Ring | 連続率上昇リング | 250 | combo_rate | 0 | 2 | 0 |  | Chance of combo attack increases | ItemData.as:215 |
| 60 | 54 | Small Recovery Necklace | 回復ネックレスミニ | 1201 | lifesteal_small | 0 | 3 | 1700000 |  | Recover 2% of damage dealt when attacking | ItemData.as:216 |
| 61 | 29 | Recovery Necklace | 回復ネックレス | 1200 | lifesteal | 0 | 4 | 0 |  | Recover 4% of damage dealt when attacking | ItemData.as:217 |
| 62 | 30 | Revival Necklace | 起死回生ネックレス | 1210 | survive_lethal | 0 | 3 | 0 |  | Chance of avoiding death when dealt a blow that would reduce HP to 0 | ItemData.as:218 |
| 63 | 58 | Revival Necklace+1 | 起死回生ネックレス+1 | 1211 | survive_lethal_plus | 0 | 4 | 0 | H | Chance of avoiding death when dealt a blow that would reduce HP to 0 | ItemData.as:219 |
| 64 | 31 | Encounter Reduction Ring | エンカウントリング+ | 10 | encounter_slower | 0 | 2 | 50000 |  | The Encounter Gauge fills slower | ItemData.as:220 |
| 65 | 32 | Encounter Increase Ring | エンカウントリング- | 12 | encounter_faster | 0 | 1 | 1000 |  | The Encounter Gauge fills faster | ItemData.as:221 |
| 66 | 33 | Instant Encounter Ring | 即エンカウントリング | 14 | instant_encounter | 0 | 1 | 80000 |  | Enables instant encounters | ItemData.as:222 |
| 67 | 34 | Movement Gem | 移動速度宝石 | 100 | move_speed | 60 | 2 | 10000 |  | Movement speed on the overworld increases slightly | ItemData.as:223 |
| 68 | 35 | Movement Gem+1 | 移動速度宝石+1 | 100 | move_speed | 100 | 2 | 200000 |  | Movement speed on the overworld increases | ItemData.as:224 |
| 69 | 36 | Battle Point Ring | 残り戦闘リング | 500 | battle_points | 1 | 3 | 10000 |  | Battle Points increase by 1 | ItemData.as:225 |
| 70 | 37 | Battle Point Ring+1 | 残り戦闘リング+1 | 500 | battle_points | 3 | 3 | 400000 |  | Battle Points increase by 3 | ItemData.as:226 |
| 71 | 38 | Battle Point Ring+2 | 残り戦闘リング+2 | 500 | battle_points | 5 | 3 | 0 |  | Battle Points increase by 5 | ItemData.as:227 |
| 72 | 53 | Battle Point Ring+3 | 残り戦闘リング+3 | 500 | battle_points | 7 | 4 | 0 |  | Battle Points increase by 7 | ItemData.as:228 |

Upgrade chains (`ItemZyouiGokan`): `[0,1,2,3,39,46,59]` (HP Gem → HP Gem+1 → HP Gem+2 → HP Gem+3 → HP Gem+4 → HP Gem+5 → HP Gem+6); `[4,5,6,7,40,47,60]` (ATK Gem → ATK Gem+1 → ATK Gem+2 → ATK Gem+3 → ATK Gem+4 → ATK Gem+5 → ATK Gem+6); `[8,9,10,11,41,48,61]` (DEF Gem → DEF Gem+1 → DEF Gem+2 → DEF Gem+3 → DEF Gem+4 → DEF Gem+5 → DEF Gem+6); `[12,13,14,15,42,49,62]` (AGI Gem → AGI Gem+1 → AGI Gem+2 → AGI Gem+3 → AGI Gem+4 → AGI Gem+5 → AGI Gem+6); `[16,17,18,19,43,50,63]` (LUC Gem → LUC Gem+1 → LUC Gem+2 → LUC Gem+3 → LUC Gem+4 → LUC Gem+5 → LUC Gem+6); `[44,45,51]` (Play Gem → Play Gem+1 → Play Gem+2); `[20,21,22,23,52]` (EXP Gem → EXP Gem+1 → EXP Gem+2 → EXP Gem+3 → EXP Gem+4); `[27,56,57]` (First Critical Ring → 2 Critical Ring → 3 Critical Ring); `[36,37,38,53]` (Battle Point Ring → Battle Point Ring+1 → Battle Point Ring+2 → Battle Point Ring+3)

## 12. Drop sources per item

Type 0 = weapon, 1 = armor, 2 = accessory. Format `enemy(baseProb)`; `H:` marks hard-mode override candidates.

| type | id | item | sources (enemy class, base prob) |
|---|---|---|---|
| 0 | 1 | Bowie Knife | ene1_0e(0.16), ene1_2c(0.16), ene3_3c(0.09) |
| 0 | 2 | Kukri Knife | ene1_3a(0.12), ene1_4c(0.12), ene1_5a(0.17), ene2_2a(0.12), ene1_ba(0.5) |
| 0 | 3 | Iron Sword | ene3_3c(0.085) |
| 0 | 5 | Iron Axe | ene1_2a(0.08), ene2_2e(0.05) |
| 0 | 6 | Steel Sword | ene3_3c(0.07), ene3_4a(0.1), ene3_5b(0.1) |
| 0 | 7 | Steel Axe | ene4_4c(0.11) |
| 0 | 10 | Scimitar | ene3_5d(0.1), ene3_5f(0.085) |
| 0 | 11 | Battle Axe | ene3_5d(0.085), ene3_5e(0.1), ene5_2a(0.07), ene5_ba(0.09) |
| 0 | 13 | Trident | ene3_6a(0.085), ene5_6a(0.12) |
| 0 | 14 | Wind Sword | ene10_2b(0.14) |
| 0 | 15 | Fire Sword | ene9_4a(0.16) |
| 0 | 16 | Ice Sword | ene11_3c(0.14) |
| 0 | 17 | Thunder Sword | ene9_6a(0.14) |
| 0 | 18 | Silver Sword | ene8_3a(0.1) |
| 0 | 19 | Silver Spear | ene8_2a(0.1) |
| 0 | 20 | Samurai Sword | ene5_5b(0.03), ene8_5b(0.12) |
| 0 | 21 | Dark Sword | ene7_8a(0.1) |
| 0 | 22 | Dark Scythe | ene6_7a(0.12) |
| 0 | 23 | Rare Sword | ene11_5b(0.09) |
| 0 | 24 | Rare Gladius | ene10_3b(0.086) |
| 0 | 26 | Knight Rapier | ene8_6a(0.11) |
| 0 | 27 | Knight Spear | ene8_6b(0.11) |
| 0 | 28 | Hard Sword | ene0_2a(0.09), ene0_2a(0.09) |
| 0 | 29 | Hard Axe | ene0_2b(0.09), ene0_2b(0.09) |
| 0 | 30 | Hard Lance | ene0_2c(0.09), ene0_2c(0.09) |
| 0 | 31 | Gold Sword | ene0_2e(0.06), ene0_2e(0.06) |
| 0 | 32 | Gold Axe | ene0_2f(0.06), ene0_2f(0.06) |
| 0 | 33 | Lvateinn/Cursed Sword | ene14_0b(0.08), ene14_0b(0.08) |
| 0 | 34 | Kujang/Cursed Dagger | ene14_0e(0.08), ene14_0e(0.08) |
| 0 | 35 | Durandal/Cursed Axe | ene14_0g(0.1), ene14_0g(0.1) |
| 0 | 36 | GaeBolg/Cursed Lance | ene14_0c(0.14), ene14_0c(0.14) |
| 0 | 37 | Excalibur/Holy Sword | ene13_0a(0.065) |
| 0 | 38 | Swanchika/Holy Axe | ene13_0a(0.065) |
| 0 | 39 | Longinus/Holy Lance | ene13_0a(0.06) |
| 0 | 40 | Wind Sword+1 | ene10_ba(0.14) |
| 0 | 41 | Fire Sword+1 | ene9_ba(0.14) |
| 0 | 42 | Ice Sword+1 | ene11_ba(0.14) |
| 0 | 43 | Thunder Sword+1 | ene9_bb(0.14) |
| 0 | 44 | Tomahawk | ene17_5a(0.08) |
| 0 | 45 | Samurai Longsword | ene17_9a(0.075) |
| 0 | 46 | Estoc | ene17_6b(0.08) |
| 0 | 47 | Mace | ene17_7b(0.08) |
| 0 | 48 | Green Light Sword | ene17_bb(0.067) |
| 0 | 49 | Red Light Sword | ene17_bc(0.072) |
| 0 | 50 | Estoc+1 | ene61_1a(0.05), H:ene61_1a(0.055), ene61_2a(0.055), H:ene61_2a(0.06) |
| 0 | 51 | Crystal Hammer | ene61_3c(0.046) |
| 0 | 52 | Four Gods/Red Lance | ene64_0f(0.008), H:ene64_0f(0.01), ene64_ba(0.02), ene64_ba(0.036) |
| 0 | 53 | Four Gods/Blue Sword | ene64_1f(0.0055), H:ene64_1f(0.0075), ene64_bb(0.017), ene64_bb(0.027) |
| 0 | 54 | Crystal Lance | ene68_1d(0.044) |
| 0 | 55 | Knight Rapier+1 | H:ene8_6a(0.04) |
| 0 | 56 | Crystal Lance+1 | H:ene68_1d(0.03) |
| 0 | 57 | Estoc+2 | H:ene61_1a(0.022), H:ene61_2a(0.026) |
| 0 | 58 | Scimitar+1 | H:ene3_5d(0.06), H:ene3_5f(0.07) |
| 0 | 59 | Green Light Sword+1 | H:ene17_bb(0.033) |
| 0 | 60 | Red Light Sword+1 | H:ene17_bc(0.038) |
| 0 | 61 | Four Gods/Red Lance+1 | H:ene64_0f(0.001), H:ene64_ba(0.012), H:ene64_ba(0.022) |
| 0 | 62 | Four Gods/Blue Sword+1 | H:ene64_1f(0.00075), H:ene64_bb(0.01), H:ene64_bb(0.02) |
| 0 | 63 | Lvateinn/Cursed Sword+1 | H:ene14_0b(0.025) |
| 0 | 64 | Kujang/Cursed Dagger+1 | H:ene14_0e(0.025) |
| 0 | 65 | Durandal/Cursed Axe+1 | H:ene14_0g(0.035) |
| 0 | 66 | GaeBolg/Cursed Lance+1 | H:ene14_0c(0.04) |
| 0 | 67 | Excalibur/Holy Sword+1 | ene13_0a(0.021) |
| 0 | 68 | Swanchika/Holy Axe+1 | ene13_0a(0.02) |
| 0 | 69 | Longinus/Holy Lance+1 | ene13_0a(0.019) |
| 0 | 70 | Wind Sword+2 | H:ene10_ba(0.07) |
| 0 | 71 | Fire Sword+2 | H:ene9_ba(0.075) |
| 0 | 72 | Ice Sword+2 | H:ene11_ba(0.07) |
| 0 | 73 | Thunder Sword+2 | H:ene9_bb(0.06) |
| 0 | 75 | Kukri Knife+1 | H:ene1_3a(0.1), H:ene1_4c(0.1), H:ene1_5a(0.12), H:ene2_2a(0.08), H:ene1_ba(0.4) |
| 0 | 76 | Samurai Sword+1 | H:ene5_5b(0.03), H:ene8_5b(0.05) |
| 0 | 77 | Trident+1 | H:ene3_6a(0.03), H:ene5_6a(0.05) |
| 0 | 78 | Steel Axe+1 | H:ene4_4c(0.022) |
| 0 | 79 | Wing Lance | ene70_0c(0.03) |
| 0 | 80 | Wing Sword | ene70_ba(0.023) |
| 0 | 81 | Wing Sword+1 | H:ene70_ba(0.021) |
| 1 | 1 | Iron Armor | ene1_5b(0.15), ene2_2d(0.15), ene2_3e(0.16), ene3_3d(0.09) |
| 1 | 2 | Bronze Armor | ene1_5b(0.1), ene2_5e(0.12), ene3_3d(0.085), ene1_ba(0.5) |
| 1 | 3 | Steel Armor | ene3_3d(0.07) |
| 1 | 4 | Scale Armor | ene4_2b(0.08) |
| 1 | 6 | Magic Armor | ene3_6b(0.075), ene3_6c(0.075) |
| 1 | 7 | Half Plate Armor | ene4_3d(0.08), ene5_5d(0.09) |
| 1 | 8 | Silver Armor | ene8_2c(0.09), ene8_3c(0.1) |
| 1 | 9 | Samurai Armor | ene8_5b(0.11) |
| 1 | 10 | Dark Armor | ene6_7_5b(0.09), ene6_7_5b(0.1) |
| 1 | 11 | Rare Armor | ene10_3a(0.075), ene11_3a(0.075) |
| 1 | 13 | Hard Armor | ene0_2a(0.09), ene0_2b(0.09), ene0_2c(0.09), ene0_2a(0.09), ene0_2b(0.09), ene0_2c(0.09) |
| 1 | 14 | Gold Armor | ene0_2e(0.08), ene0_2f(0.08), ene0_2e(0.08), ene0_2f(0.08) |
| 1 | 15 | Megin Gjord/Cursed Armor | ene14_0f(0.08), ene14_0f(0.08) |
| 1 | 16 | Aegis/Holy Armor | ene13_0c(0.07) |
| 1 | 17 | Full Plate Armor | ene17_4c(0.055), H:ene17_4c(0.09), ene17_6c(0.08), H:ene17_6c(0.1) |
| 1 | 18 | Light Armor | ene17_bb(0.066), ene17_bc(0.072) |
| 1 | 19 | Crystal Cape | ene61_0c(0.045), H:ene61_0c(0.05) |
| 1 | 20 | Four Gods/White Armor | ene63_0f(0.008), H:ene63_0f(0.01), ene63_bb(0.018), ene63_bb(0.032) |
| 1 | 21 | Four Gods/Black Armor | ene63_1f(0.0055), H:ene63_1f(0.0075), ene63_ba(0.017), ene63_ba(0.03) |
| 1 | 23 | Magic Armor+1 | H:ene3_6b(0.035), H:ene3_6c(0.035) |
| 1 | 24 | Light Armor+1 | H:ene17_bb(0.03), H:ene17_bc(0.036) |
| 1 | 25 | Four Gods/White Armor+1 | H:ene63_0f(0.001), H:ene63_bb(0.01), H:ene63_bb(0.022) |
| 1 | 26 | Four Gods/Black Armor+1 | H:ene63_1f(0.00075), H:ene63_ba(0.01), H:ene63_ba(0.021) |
| 1 | 27 | Megin Gjord/Cursed Armor+1 | H:ene14_0f(0.025) |
| 1 | 28 | Aegis/Holy Armor+1 | ene13_0c(0.016) |
| 1 | 30 | Crystal Cape+1 | H:ene61_0c(0.02) |
| 1 | 31 | Full Plate Armor+1 | H:ene17_4c(0.035), H:ene17_6c(0.045) |
| 1 | 32 | Knight Armor+1 | H:ene8_6a(0.025), H:ene8_6b(0.015) |
| 1 | 33 | Samurai Armor+1 | H:ene8_5b(0.05) |
| 1 | 34 | Wing Armor | ene70_bb(0.023) |
| 1 | 35 | Wing Armor+1 | H:ene70_bb(0.021) |
| 2 | 0 | HP Gem | ene1_0a(0.1), ene1_1b(0.1), ene1_3b(0.16) |
| 2 | 1 | HP Gem+1 | ene3_3e(0.08), ene3_6e(0.08), ene3_ba(0.16) |
| 2 | 2 | HP Gem+2 | ene5_ba(0.08) |
| 2 | 3 | HP Gem+3 | ene0_3a(0.2), ene0_4a(0.15) |
| 2 | 4 | ATK Gem | ene1_0a(0.1), ene1_1b(0.1), ene1_3b(0.17) |
| 2 | 5 | ATK Gem+1 | ene3_3e(0.09), ene3_6a(0.08), ene5_3a(0.03), ene3_ba(0.16) |
| 2 | 6 | ATK Gem+2 | ene5_ba(0.08) |
| 2 | 8 | DEF Gem | ene1_0a(0.1), ene1_1b(0.1), ene1_3b(0.17) |
| 2 | 9 | DEF Gem+1 | ene3_3e(0.1), ene3_6d(0.08), ene5_4a(0.03), ene3_ba(0.16) |
| 2 | 12 | AGI Gem | ene1_0c(0.1), ene1_4a(0.17) |
| 2 | 16 | LUC Gem | ene1_0c(0.1), ene1_4a(0.16) |
| 2 | 21 | EXP Gem+1 | ene6_ba(0.3) |
| 2 | 22 | EXP Gem+2 | ene6_ba(0.18) |
| 2 | 23 | EXP Gem+3 | ene6_ba(0.06), ene59_ba(0.035), H:ene59_ba(0.035) |
| 2 | 24 | Stat Point Crystal | ene13_0b(0.045) |
| 2 | 25 | Critical Rate Ring | ene0_0a(0.12) |
| 2 | 26 | Critical Damage Ring | ene0_2d(0.09), ene0_2d(0.09) |
| 2 | 27 | First Critical Ring | ene0_2d(0.09), ene0_2d(0.09) |
| 2 | 28 | Combo Rate Ring | ene0_0c(0.12), ene0_0c(0.12) |
| 2 | 29 | Recovery Necklace | ene0_0d(0.15), ene0_0d(0.15) |
| 2 | 30 | Revival Necklace | ene0_0b(0.15) |
| 2 | 38 | Battle Point Ring+2 | ene17_ba(0.032), ene56_ba(0.028), ene57_ba(0.03) |
| 2 | 39 | HP Gem+4 | ene14_0a(0.1), ene14_0a(0.1), ene58_ba(0.078) |
| 2 | 40 | ATK Gem+4 | ene14_0a(0.1), ene14_0a(0.1), ene58_bb(0.078) |
| 2 | 41 | DEF Gem+4 | ene14_0a(0.1), ene14_0a(0.1), ene58_bc(0.078) |
| 2 | 42 | AGI Gem+4 | ene14_0d(0.1), ene14_0d(0.1), ene58_bd(0.078) |
| 2 | 43 | LUC Gem+4 | ene14_0d(0.11), ene14_0d(0.11), ene58_be(0.078) |
| 2 | 45 | Play Gem+1 | ene15_ba(0.026), ene17_ba(0.04), ene58_bf(0.052) |
| 2 | 46 | HP Gem+5 | H:ene9_ba(0.007), H:ene9_bb(0.007), H:ene10_ba(0.007), H:ene11_ba(0.007), ene58_ba(0.044) |
| 2 | 47 | ATK Gem+5 | H:ene9_ba(0.01), ene58_bb(0.048) |
| 2 | 48 | DEF Gem+5 | H:ene10_ba(0.01), ene58_bc(0.044) |
| 2 | 49 | AGI Gem+5 | H:ene11_ba(0.01), ene58_bd(0.047) |
| 2 | 50 | LUC Gem+5 | H:ene9_bb(0.01), ene58_be(0.032) |
| 2 | 51 | Play Gem+2 | ene58_bf(0.022) |
| 2 | 52 | EXP Gem+4 | ene59_ba(0.025), H:ene59_ba(0.025) |
| 2 | 53 | Battle Point Ring+3 | ene56_ba(0.02), ene57_ba(0.025) |
| 2 | 55 | Stat Point Crystal+1 | ene13_0b(0.013) |
| 2 | 56 | 2 Critical Ring | ene0_0a(0.065) |
| 2 | 57 | 3 Critical Ring | ene0_0a(0.035) |
| 2 | 58 | Revival Necklace+1 | ene0_0b(0.05) |
| 2 | 64 | Hero Gem | H:ene6_ba(0.022), ene58_bf(0.024) |
| 2 | 65 | Hero Gem+1 | H:ene58_bf(0.042) |
| 2 | 66 | God of War Gem | H:ene5_ba(0.022), H:ene15_ba(0.03) |
| 2 | 68 | Proof of the Hero | H:ene14_0d(0.04) |
| 2 | 69 | Hero Gem+2 | H:ene58_bf(0.022) |
| 2 | 70 | Four Gods/Gem | ene68_ba(0.014), ene68_ba(0.026) |
| 2 | 71 | Four Gods/Gem+1 | H:ene68_ba(0.01), H:ene68_ba(0.018) |

Items with no drop source: W#0 Dagger (starting item); W#4 Bronze Sword (shop only); W#8 Broadsword (shop only); W#9 Francisca (shop only); W#12 Glaive (shop only); W#25 Knight Sword (shop only); W#74 Infinity Sword (price 0 and no drop: placeholder, unobtainable); A#0 Leather Armor (starting item); A#5 Spike Armor (shop only); A#12 Knight Armor (shop only); A#22 Spike Armor+1 (shop only); A#29 Infinity Armor (price 0 and no drop: placeholder, unobtainable); Acc#7 ATK Gem+3 (shop only); Acc#10 DEF Gem+2 (shop only); Acc#11 DEF Gem+3 (shop only); Acc#13 AGI Gem+1 (shop only); Acc#14 AGI Gem+2 (shop only); Acc#15 AGI Gem+3 (shop only); Acc#17 LUC Gem+1 (shop only); Acc#18 LUC Gem+2 (shop only); Acc#19 LUC Gem+3 (shop only); Acc#20 EXP Gem (shop only); Acc#31 Encounter Reduction Ring (shop only); Acc#32 Encounter Increase Ring (shop only); Acc#33 Instant Encounter Ring (shop only); Acc#34 Movement Gem (shop only); Acc#35 Movement Gem+1 (shop only); Acc#36 Battle Point Ring (shop only); Acc#37 Battle Point Ring+1 (shop only); Acc#44 Play Gem (shop only); Acc#54 Small Recovery Necklace (shop only); Acc#59 HP Gem+6 (price 0 and no drop: placeholder, unobtainable); Acc#60 ATK Gem+6 (price 0 and no drop: placeholder, unobtainable); Acc#61 DEF Gem+6 (price 0 and no drop: placeholder, unobtainable); Acc#62 AGI Gem+6 (price 0 and no drop: placeholder, unobtainable); Acc#63 LUC Gem+6 (price 0 and no drop: placeholder, unobtainable); Acc#67 God of War Gem+1 (price 0 and no drop: placeholder, unobtainable).
