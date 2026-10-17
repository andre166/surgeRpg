import React, { useMemo, useState } from 'react';
import { useGame, data } from '../stores/gameStore.js';
import { ITEM_TYPE } from '../../core/equipment/items.js';
import {
  CRAFT_SLOTS, RELIC_SLOTS, STAT_KEYS, isCraftable, spareCount, ingredientBonus, craftPreview, craftStatus, heroRelics, firstFreeRelicSlot, relicSlotsOwned, MATERIAL, materialIngredient,
} from '../../core/crafting.js';
import { useT } from '../i18n/index.js';
import { MATERIALS } from '../../core/farm.js';
import FarmIcon from '../components/FarmIcon.jsx';
import ItemIcon from '../components/ItemIcon.jsx';
import HeroTabs from '../components/HeroTabs.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import AccountUnlock from '../components/AccountUnlock.jsx';

const TABS = [
  { type: ITEM_TYPE.WEAPON, label: 'eq.weapons', list: 'weapons', icon: 'sword' },
  { type: ITEM_TYPE.ARMOR, label: 'eq.armor', list: 'armors', icon: 'shield' },
  { type: ITEM_TYPE.ACCESSORY, label: 'eq.accessories', list: 'accessories', icon: 'clover' },
  { type: MATERIAL, label: 'craft.materials', list: null, icon: 'pickaxe' },
];
const pctText = (x) => `+${Math.round(x * 1000) / 10}%`;

export function relicName(t, relic) {
  return t('craft.relicName', { quality: t(`craft.quality.${relic.quality}`), stat: t(`craft.of.${relic.main}`) });
}

function Bonuses({ bonus, t }) {
  return (
    <span className="relic-bonus">
      {STAT_KEYS.filter((k) => bonus[k] > 0).map((k) => <span key={k}>{t(`stat.${k}`)} {pctText(bonus[k])}</span>)}
    </span>
  );
}

/** Icon of an ingredient: farm materials have their own, loot items their sprite. */
function IngredientIcon({ item, size }) {
  return item.type === MATERIAL ? <FarmIcon id={item.id} size={size} /> : <ItemIcon item={item} size={size} />;
}

const sameItem = (a, b) => a && b && a.type === b.type && a.id === b.id;

/**
 * Forge, laid out like Equipment: the hero's four relic slots (pick the target) and three
 * ingredient slots; tapping an ingredient slot opens the list of spare loot to put in it.
 * Three loot items become a relic in the target slot.
 */
export default function CraftingScreen() {
  const t = useT();
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const back = useGame((s) => s.backToMap);
  const craftRelic = useGame((s) => s.craftRelic);
  const toast = useGame((s) => s.showToast);
  const [picks, setPicks] = useState([null, null, null]);
  const [target, setTarget] = useState(null);
  const [pickSlot, setPickSlot] = useState(null);
  if (!run || !profile) return null;

  const hero = data.characters[run.characterIndex];
  const relics = heroRelics(profile, run.characterIndex);
  const free = firstFreeRelicSlot(profile, run.characterIndex);
  const owned = relicSlotsOwned(profile); // relic slots are bought (core/progression/unlocks.js)
  const slot = target != null && target < owned ? target : (free >= 0 ? free : 0);
  const preview = craftPreview(picks);
  const status = craftStatus(run, picks, profile);

  function choose(i, item) {
    setPicks((prev) => prev.map((p, j) => (j === i ? item : p)));
    setPickSlot(null);
  }
  function onCraft() {
    const relic = craftRelic(picks, slot);
    if (!relic) return;
    toast(t('craft.done', { name: relicName(t, relic), hero: hero.name }));
    setPicks([null, null, null]);
    setTarget(null);
  }

  return (
    <div className="screen crafting hero-screen wood-screen">
      <WoodBackdrop />
      <HeroTabs />
      {pickSlot != null && (
        <IngredientPicker
          index={pickSlot} current={picks[pickSlot]} picks={picks} run={run} profile={profile} t={t}
          onChoose={(item) => choose(pickSlot, item)} onClose={() => setPickSlot(null)}
        />
      )}

      <div className="forge-main">
        <section className="panel forge-relics">
          <h2><PixelIcon name="star" size={18} />{t('craft.relics', { hero: hero.name })}</h2>
          <div className="relic-slots">
            {relics.map((r, i) => (i >= owned ? (
              <div key={i} className="relic-slot empty relic-locked">
                <span className="small muted">{t('craft.slot', { n: i + 1 })}</span>
                {r && <b className="muted">{relicName(t, r)}</b>}
                <AccountUnlock kind="relicSlots" index={i} />
              </div>
            ) : (
              <button key={i} className={`relic-slot ${r ? `q-${r.quality}` : 'empty'} ${slot === i ? 'target' : ''}`} onClick={() => setTarget(i)} aria-pressed={slot === i}>
                <span className="small muted">{t('craft.slot', { n: i + 1 })}{slot === i ? ` · ${t('craft.target')}` : ''}</span>
                {r ? <><b>{relicName(t, r)}</b><Bonuses bonus={r.bonus} t={t} /></> : <span className="muted">{t('craft.emptySlot')}</span>}
              </button>
            )))}
          </div>
          <p className="forge-note">{t('craft.bound', { n: RELIC_SLOTS })}</p>
        </section>

        <section className="panel forge-craft">
          <h2><PixelIcon name="forge" size={18} />{t('craft.ingredients')}</h2>
          <div className="forge-ingredients">
            {picks.map((p, i) => (
              <button key={i} className={`equip-slot big forge-ingredient ${p ? 'filled' : 'empty'}`} onClick={() => setPickSlot(i)}>
                {p ? <IngredientIcon item={p} size={36} /> : <span className="forge-plus" aria-hidden="true">+</span>}
                <span className="equip-slot-text">
                  <span className="equip-slot-label">{t('craft.ingredient', { n: i + 1 })}</span>
                  {p ? (
                    <>
                      <b>{p.name}</b>
                      <span className="forge-ing-bonus">{t(`stat.${ingredientBonus(p).stat}`)} {pctText(ingredientBonus(p).pct)}</span>
                    </>
                  ) : <b className="muted">{t('craft.tapToPick')}</b>}
                </span>
              </button>
            ))}
          </div>
          <div className="craft-arrow">▼</div>
          {preview ? (
            <div className={`relic-preview q-${preview.quality}`}>
              <b>{relicName(t, preview)}</b>
              <Bonuses bonus={preview.bonus} t={t} />
              {preview.setBonus && <span className="tag combo">{t('craft.setBonus')}</span>}
            </div>
          ) : <p className="forge-note">{t('craft.howTo', { n: CRAFT_SLOTS })}</p>}
          {relics[slot] && preview && <p className="warn small">{t('craft.replaces', { name: relicName(t, relics[slot]) })}</p>}
          <button className="btn primary forge-go" disabled={status !== 'ok' || slot >= owned} onClick={onCraft}>{t('craft.forge', { n: slot + 1 })}</button>
          <p className="forge-note">{t('craft.consumed')}</p>
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

/**
 * Picker for one ingredient slot (like the Equipment shop): spare loot by kind; tapping a row
 * puts it in the slot. Copies already used by the other two slots don't count as spare.
 */
function IngredientPicker({ index, current, picks, run, profile, t, onChoose, onClose }) {
  const [tab, setTab] = useState(current ? current.type : ITEM_TYPE.WEAPON);
  const tabDef = TABS.find((x) => x.type === tab);
  const others = picks.filter((p, j) => p && j !== index);
  const left = (item) => spareCount(run, item, profile) - others.filter((p) => sameItem(p, item)).length;

  const list = useMemo(() => {
    if (tabDef.type === MATERIAL) {
      return MATERIALS.map((m) => ({ ...materialIngredient(m.id), name: t(`farm.item.${m.id}`) })).filter((it) => spareCount(run, it, profile) > 0);
    }
    return data.catalog[tabDef.list].filter((it) => isCraftable(it) && spareCount(run, it) > 0);
  }, [run, tabDef, profile, t]);

  return (
    <div className="modal equip-shop-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="equip-shop forge-picker" role="dialog" aria-label={t('craft.ingredient', { n: index + 1 })}>
        <div className="equip-shop-head">
          <h2>{t('craft.ingredient', { n: index + 1 })}</h2>
          {current && <button className="btn small" onClick={() => onChoose(null)}>{t('eq.remove')}</button>}
          <button className="btn small" data-escape onClick={onClose} aria-label={t('common.back')}>✕</button>
        </div>
        <div className="tabs craft-tabs">
          {TABS.map((tb) => (
            <button key={tb.type} className={`tab ${tab === tb.type ? 'active' : ''}`} onClick={() => setTab(tb.type)}><PixelIcon name={tb.icon} size={16} /><span>{t(tb.label)}</span></button>
          ))}
        </div>
        <div className="item-list equip-shop-list">
          {list.length === 0 && <p className="muted small">{t('craft.noLoot')}</p>}
          {list.map((it) => {
            const n = left(it);
            const b = ingredientBonus(it);
            return (
              <button
                key={`${it.type}:${it.id}`}
                className={`item-row ${sameItem(current, it) ? 'selected' : ''}`}
                disabled={n <= 0 && !sameItem(current, it)}
                onClick={() => onChoose(it)}
              >
                <span className="item-name">
                  <IngredientIcon item={it} size={26} />
                  {it.hard ? <span className="tag hard">H</span> : null}
                  {it.name}
                </span>
                <span className="item-stat">{t(`stat.${b.stat}`)} {pctText(b.pct)}</span>
                <span className="item-meta">x{Math.max(0, n)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
