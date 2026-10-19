import React, { useMemo, useState } from 'react';
import { useGame, data } from '../stores/gameStore.js';
import { fmtFull, fmtShort } from '../components/format.js';
import { ITEM_TYPE, copyBonus } from '../../core/equipment/items.js';
import { useT } from '../i18n/index.js';
import ItemIcon from '../components/ItemIcon.jsx';
import { runSets, nextSetCost, nextSetNeed, setUnlockStatus, BOSS_SET } from '../../core/equipment/sets.js';
import { EQUIPMENT_SET_COUNT } from '../../core/equipment/slots.js';
import { buyStatus, equipStatus, ownedCount, slotUnlockCost, slotUnlockNeed, slotUnlockStatus, SLOT, maxRankForSlot, ACCESSORY_SLOTS } from '../../core/equipment/slots.js';
import { bossLevel } from '../../core/progression/characters.js';
import { slimeKingWins } from '../../core/bestiary.js';
import UnlockNeed from '../components/UnlockNeed.jsx';
import PixelIcon, { HeroPortrait, STAT_ICONS } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';

const STATS = ['hp', 'atk', 'def', 'speed', 'luck'];
const WEAPON_SLOT = 0;
const ARMOR_SLOT = 1;

/** Item type a slot takes: 0 weapon, 1 armor, 2..11 accessories. */
/** "Base LV cur/needed" or Slime King victories, red until reached (like the farm plots); nothing when none is needed. */
function BaseNeed({ need, base, slimes, t }) {
  if (!need || !(need.baseLevel || need.slimeKings)) return null;
  return <UnlockNeed price={need} base={base} slimes={slimes} t={t} />;
}

const slotType = (slot) => (slot === WEAPON_SLOT ? ITEM_TYPE.WEAPON : slot === ARMOR_SLOT ? ITEM_TYPE.ARMOR : ITEM_TYPE.ACCESSORY);

/**
 * Equipment, as in Inflation RPG (StMapMenu_soubi / StMapMenu_SoubiList): the hero's slots
 * and stats; tapping a slot opens the shop for that kind of item, tapping an item there
 * offers Buy / Equip (into that slot). Locked accessory slots are bought from the grid.
 */
export default function EquipmentScreen() {
  const t = useT();
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const stats = useGame((s) => s.heroStats)();
  const buy = useGame((s) => s.buyItem);
  const equip = useGame((s) => s.equip);
  const unequip = useGame((s) => s.unequip);
  const unlock = useGame((s) => s.unlockSlot);
  const switchEquipSet = useGame((s) => s.switchEquipSet);
  const unlockEquipSet = useGame((s) => s.unlockEquipSet);
  const back = useGame((s) => s.backToMap);
  const toast = useGame((s) => s.showToast);
  const [shopSlot, setShopSlot] = useState(null);
  // the locked slot / set button that was just clicked answers: { key, kind: 'denied' | 'unlocked-now', n }
  const [flash, setFlash] = useState(null);

  if (!run || !stats) return null;
  const { slots, gold } = run;
  const sets = runSets(run);
  const base = bossLevel(profile?.bossWins ?? {});
  const slimes = slimeKingWins(profile);
  /**
   * A locked slot or set was clicked: a friendly toast that says what is missing and how much (gold still
   * to earn, base level / SK needed), or celebrates the unlock; the button wiggles or glows (flash).
   */
  function answerUnlock(key, st, cost, need, name) {
    const n = Date.now();
    setFlash({ key, kind: st === 'ok' ? 'unlocked-now' : 'denied', n });
    setTimeout(() => setFlash((f) => (f?.n === n ? null : f)), 800);
    if (st === 'ok') return toast(t('eq.toast.unlocked', { name }), 3000, { kind: 'ok', icon: 'star', detail: t('eq.toast.unlockedHint') });
    if (st === 'level') {
      const detail = [
        need?.baseLevel > base && t('eq.toast.needBase', { n: need.baseLevel, cur: base }),
        need?.slimeKings > slimes && t('eq.toast.needSk', { n: need.slimeKings, cur: slimes }),
      ].filter(Boolean).join(' · ');
      return toast(t('eq.toast.lockedTitle'), 3000, { kind: 'warn', icon: 'stats', detail });
    }
    return toast(t('eq.toast.goldTitle'), 3000, { kind: 'warn', icon: 'coins', detail: t('eq.toast.goldMissing', { n: fmtFull(Math.max(0, cost - gold)), cost: fmtFull(cost) }) });
  }
  const flashOf = (key) => (flash?.key === key ? flash : null);

  function slotItem(slot) {
    const v = slots[slot];
    if (v == null || v < 0) return null;
    const type = slotType(slot);
    return type === ITEM_TYPE.WEAPON ? data.catalog.weapons[v] : type === ITEM_TYPE.ARMOR ? data.catalog.armors[v] : data.catalog.accessories[v];
  }
  function slotLabel(slot) {
    if (slot === WEAPON_SLOT) return t('eq.weapon');
    if (slot === ARMOR_SLOT) return t('statsx.armor');
    const mini = slot >= 8 ? (slot >= 10 ? ' (1★)' : ' (≤2★)') : '';
    return `${t('eq.slot', { n: slot - 1 })}${mini}`;
  }
  function onSlot(slot) {
    if (slots[slot] === SLOT.LOCKED) {
      const st = slotUnlockStatus(slots, slot, gold, base, slimes);
      const cost = slotUnlockCost(slot);
      answerUnlock(`slot${slot}`, st === 'ok' && !unlock(slot) ? 'gold' : st, cost, slotUnlockNeed(slot), slotLabel(slot));
      return;
    }
    setShopSlot(slot);
  }

  return (
    <div className="screen equipment hero-screen wood-screen">
      <WoodBackdrop />
      {shopSlot != null && (
        <EquipShop slot={shopSlot} slotLabel={slotLabel(shopSlot)} current={slotItem(shopSlot)} onClose={() => setShopSlot(null)}
          run={run} profile={profile} buy={buy} equip={equip} unequip={unequip} toast={toast} />
      )}
      <header className="hero-head">
        <h1><PixelIcon name="helmet" size={24} />{t('eq.title')}</h1>
        <div className="hero-chips">
          <span className="hero-chip gold"><PixelIcon name="coins" size={16} /><b title={`${fmtFull(gold)} G`}>{fmtShort(gold)}</b></span>
        </div>
      </header>

      <div className="equip-main">
        <section className="equip-hero">
          <HeroPortrait index={run.characterIndex} size={96} />
          <dl className="equip-stats">
            {STATS.map((k) => (
              <React.Fragment key={k}>
                <dt><PixelIcon name={STAT_ICONS[k]} size={16} />{t(`stat.${k}`)}</dt>
                <dd>
                  <b>{fmtFull(stats.total[k])}</b>
                  {stats.bonus[k] ? <span className={stats.bonus[k] > 0 ? 'up' : 'down'}>{stats.bonus[k] > 0 ? '+' : ''}{fmtFull(stats.bonus[k])}</span> : null}
                </dd>
              </React.Fragment>
            ))}
            <dt><PixelIcon name="swords" size={16} />{t('eq.bpMax')}</dt>
            <dd><b>{stats.modifiers.maxBattlePoints}</b></dd>
          </dl>
        </section>

        <section className="equip-slots">
          <div className="equip-slots-main">
            {[WEAPON_SLOT, ARMOR_SLOT].map((s) => {
              const item = slotItem(s);
              return (
                <button key={s} className="equip-slot big filled" onClick={() => onSlot(s)}>
                  <ItemIcon item={item} size={40} />
                  <span className="equip-slot-text">
                    <span className="equip-slot-label">{slotLabel(s)}</span>
                    <b>{item ? item.name : '—'}</b>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="equip-slots-acc">
            {ACCESSORY_SLOTS.map((s) => {
              const v = slots[s];
              if (v === SLOT.LOCKED) {
                return (
                  <button key={flashOf(`slot${s}`) ? `${s}-${flash.n}` : s} className={`equip-slot locked ${flashOf(`slot${s}`)?.kind ?? ''}`} onClick={() => onSlot(s)}>
                    <span className="equip-slot-label">{slotLabel(s)}</span>
                    <b>🔒 {fmtShort(slotUnlockCost(s))}</b>
                    <BaseNeed need={slotUnlockNeed(s)} base={base} slimes={slimes} t={t} />
                  </button>
                );
              }
              const item = slotItem(s);
              return (
                <button key={flashOf(`slot${s}`) ? `${s}-${flash.n}` : s} className={`equip-slot ${item ? 'filled' : 'empty'} ${flashOf(`slot${s}`)?.kind ?? ''}`} onClick={() => onSlot(s)}>
                  {item && <ItemIcon item={item} size={28} />}
                  <span className="equip-slot-text">
                    <span className="equip-slot-label">{slotLabel(s)}</span>
                    <b>{item ? item.name : t('eq.empty')}</b>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="set-bar" title={sets.active === BOSS_SET ? t('eq.bossSetEditing') : t('eq.setsHelp')}>
            {Array.from({ length: EQUIPMENT_SET_COUNT }, (_, i) => {
              const boss = i === BOSS_SET;
              const label = boss ? `♛ ${t('eq.bossSet')}` : t('eq.set', { n: i + 1 });
              if (i < sets.unlocked) {
                return <button key={i} className={`set-btn ${boss ? 'boss' : ''} ${sets.active === i ? 'active' : ''}`} onClick={() => switchEquipSet(i)}>{label}</button>;
              }
              if (i === sets.unlocked) {
                return (
                  <button key={flashOf('set') ? `${i}-${flash.n}` : i} className={`set-btn locked ${boss ? 'boss' : ''} ${flashOf('set')?.kind ?? ''}`} onClick={() => { const st = setUnlockStatus(run, base, slimes); const cost = nextSetCost(run); const need = nextSetNeed(run); answerUnlock('set', st === 'ok' && !unlockEquipSet() ? 'gold' : st, cost, need, label); }}>
                    {label} · 🔒 {fmtShort(nextSetCost(run))} <BaseNeed need={nextSetNeed(run)} base={base} slimes={slimes} t={t} />
                  </button>
                );
              }
              return <span key={i} className={`set-btn locked disabled ${boss ? 'boss' : ''}`}>{label} · 🔒</span>;
            })}
          </div>
        </section>
      </div>

      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape onClick={() => back()}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}

/** Shop for one slot: items of its type, Buy / Equip into this slot (accessories: Remove too). */
function EquipShop({ slot, slotLabel, current, onClose, run, profile, buy, equip, unequip, toast }) {
  const t = useT();
  const type = slotType(slot);
  const [sel, setSel] = useState(null);
  const { slots, inventory, gold } = run;

  const list = useMemo(() => {
    const src = type === ITEM_TYPE.WEAPON ? data.catalog.weapons : type === ITEM_TYPE.ARMOR ? data.catalog.armors : data.catalog.accessories;
    return src.filter((it) => !it.hard || profile.highestLevel >= 100000 || run.hardMode);
  }, [type, profile, run]);

  const owned = (it) => ownedCount(inventory, it.type, it.id);
  const known = (it) => it.price > 0 || owned(it) > 0;
  const equippedCount = (it) => (it.type === ITEM_TYPE.ACCESSORY ? slots.slice(2, 12).filter((s) => s === it.id).length : slots[it.type] === it.id ? 1 : 0);
  // weapon / armor: base values, then what the extra copies add (like the original's "5 +20" / "100% +2%")
  function statText(it) {
    if (it.type === ITEM_TYPE.ACCESSORY) return it.description;
    const b = copyBonus(it, owned(it));
    const stat = it.type === ITEM_TYPE.WEAPON ? t('stat.atk') : t('stat.def');
    return (
      <>
        {stat} +{fmtFull(it.flat)}{b.plus > 0 && <span className="copy-bonus"> +{fmtFull(b.plus)}</span>}
        {' · '}{100 + it.percent}%{b.multi > 0 && <span className="copy-bonus"> +{b.multi}%</span>}
      </>
    );
  }
  /** Copies bonus of the selected weapon / armor, and what one more copy would give. */
  function bonusText(it) {
    if (it.type === ITEM_TYPE.ACCESSORY) return null;
    const n = owned(it);
    const now = copyBonus(it, n);
    const next = copyBonus(it, Math.max(2, n + 1));
    return (
      <span className="equip-copy-bonus small">
        {n >= 2 ? <b className="copy-bonus">{t('eq.copyBonus', { n, plus: fmtFull(now.plus), pct: now.multi })}</b> : <span className="muted">{t('eq.copyBonusNone')}</span>}
        {' · '}<span className="muted">{t('eq.copyBonusNext', { n: Math.max(2, n + 1), plus: fmtFull(next.plus), pct: next.multi })}</span>
      </span>
    );
  }
  function onBuy(it) {
    const st = buy(it);
    toast({ ok: t('eq.msg.bought', { name: it.name }), 'not-for-sale': t('eq.msg.notForSale'), 'sold-out': t('eq.msg.soldOut'), 'no-gold': t('eq.msg.noGold') }[st]);
  }
  function onEquip(it) {
    const st = equip(it, slot);
    toast({ ok: t('eq.msg.equipped', { name: it.name }), 'not-owned': t('eq.msg.notOwned'), already: t('eq.msg.already'), rank: t('eq.msg.rank'), 'all-equipped': t('eq.msg.allEquipped'), locked: t('eq.msg.locked') }[st]);
    if (st === 'ok') onClose();
  }

  function onUnequip(it) {
    unequip(slot);
    toast(t('eq.msg.unequipped', { name: it.name }));
  }

  const selected = sel ? list.find((x) => x.id === sel) : null;
  const rankCap = type === ITEM_TYPE.ACCESSORY ? maxRankForSlot(slot) : null;

  return (
    <div className="modal equip-shop-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="equip-shop" role="dialog" aria-label={slotLabel}>
        <div className="equip-shop-head">
          <h2>{slotLabel}</h2>
          <span className="hero-chip gold"><PixelIcon name="coins" size={14} /><b>{fmtShort(gold)}</b></span>
          <button className="btn small" onClick={onClose} aria-label={t('common.back')}>✕</button>
        </div>
        <div className="item-list equip-shop-list">
          {list.map((it) => {
            const n = owned(it);
            const eq = equippedCount(it);
            const isKnown = known(it);
            const tooHigh = rankCap != null && (it.rank ?? 0) > rankCap;
            // the item worn in this slot gets its own Unequip button (weapons and armor too); the row is
            // a div so the button can sit inside it
            const wornHere = slots[slot] === it.id;
            return (
              <div
                key={it.id}
                role="button"
                tabIndex={0}
                className={`item-row ${sel === it.id ? 'selected' : ''} ${eq ? 'equipped' : ''} ${isKnown ? '' : 'unknown'} ${tooHigh ? 'too-high' : ''}`}
                onClick={() => setSel(it.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setSel(it.id); }}
              >
                <span className="item-name">
                  <ItemIcon item={it} size={26} unknown={!isKnown} />
                  {it.hard ? <span className="tag hard">H</span> : null}
                  {isKnown ? it.name : '????'}
                  {it.type === ITEM_TYPE.ACCESSORY ? <span className="stars">{'★'.repeat((it.rank ?? 0) + 1)}</span> : null}
                </span>
                <span className="item-stat">{isKnown ? statText(it) : '—'}</span>
                <span className="item-meta">
                  {n > 0 ? `x${n}${eq ? ` ${t('eq.equippedShort', { n: eq })}` : ''}` : it.price > 0 ? `${fmtShort(it.price)} G` : t('eq.drop')}
                  {wornHere && (
                    <button className="btn tiny danger item-unequip" onClick={(e) => { e.stopPropagation(); onUnequip(it); }}>{t('eq.unequip')}</button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div className="equip-shop-foot">
          {selected ? (
            <>
              <span className="equip-shop-sel"><b>{known(selected) ? selected.name : '????'}</b> · {t('eq.owned', { n: owned(selected) })}{selected.price > 0 ? ` · ${fmtShort(selected.price)} G` : ` · ${t('eq.dropOnly')}`}{known(selected) && bonusText(selected)}</span>
              <button className="btn" disabled={buyStatus(selected, owned(selected), gold) !== 'ok'} onClick={() => onBuy(selected)}>{t('eq.buy')}</button>
              {/* equipped in this slot: Unequip (weapon / armor go back to the starting item, which stays on) */}
              {slots[slot] === selected.id
                ? <button className="btn danger" onClick={() => onUnequip(selected)}>{t('eq.unequip')}</button>
                : <button className="btn primary" disabled={equipStatus({ item: selected, slot, slots, inventory }) !== 'ok'} onClick={() => onEquip(selected)}>{t('eq.equip')}</button>}
            </>
          ) : <span className="equip-shop-sel muted">{t('eq.select')}</span>}
        </div>
      </div>
    </div>
  );
}
