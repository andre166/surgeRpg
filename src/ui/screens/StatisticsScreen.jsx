import React, { useState } from 'react';
import { useGame, SCREEN, data } from '../stores/gameStore.js';
import { fmtFull } from '../components/format.js';
import { scaledWeaponStats } from '../../core/equipment/items.js';
import { baseAbilityLevel, bossLevel, BASE_LEVEL_MAX, ABILITY_BOSSES, abyssUnlocked, ABYSS_UNLOCK_BASE } from '../../core/progression/characters.js';
import { emptyModeStats } from '../../core/progression/modeStats.js';
import { SLOT } from '../../core/equipment/slots.js';
import { farmStats, CREATURES } from '../../core/farm.js';
import { useT } from '../i18n/index.js';
import PixelIcon, { LEVEL_ICON, STAT_ICONS } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import AbyssBackdrop from '../components/AbyssBackdrop.jsx';

/**
 * Lifetime statistics (port of PlayerInfo.as): discoveries, collection, best level
 * with the stats and equipment it was reached with, best combo and best hit.
 * Split in two tabs, normal and abyssal (hard mode), each in its own theme: records come from
 * profile.modeStats, bosses found / beaten from the mode's ids (hard = id + 100), the collection
 * from the mode's items (abyssal: the hard-mode items). Maps found and the base level are shared.
 * A third tab shows the farm's lifetime counters (core/farm.js farmStats).
 */
const STAT_KEYS = ['hp', 'atk', 'def', 'speed', 'luck'];
const NORMAL_BOSS_COUNT = 32; // PlayerInfo counts HakkenbossV[0..31] only

/** One statistics line: pixel icon, label, value. */
function Line({ icon, colors, label, children }) {
  return (
    <div className="px-line">
      <PixelIcon name={icon} colors={colors} size={20} />
      <span className="px-line-label">{label}</span>
      <b className="px-line-value">{children}</b>
    </div>
  );
}

/** Items of a mode (normal: regular items, abyssal: hard-mode items): [owned, total]. */
function collection(catalogList, inventory, abyss) {
  const ids = catalogList.map((it, i) => (!!it.hard === abyss ? i : -1)).filter((i) => i >= 0);
  return [ids.filter((i) => (inventory?.[i] ?? 0) >= 1).length, ids.length];
}

const TABS = [
  { key: 'normal', icon: 'swords', label: 'mode.normal' },
  { key: 'abyss', icon: 'skull', label: 'mode.abyss' },
  { key: 'farm', icon: 'sprout', label: 'statsx.farm' },
];

/** Farm tab: what the farm produced and the run gold it cost, over the whole account. */
function FarmStats({ farm, t }) {
  const s = farmStats(farm);
  const gold = s.goldSeeds + s.goldWages + s.goldBrew + s.goldHaul;
  return (
    <div className="stats-cols" role="tabpanel">
      <div className="panel px-card">
        <h2>{t('statsx.farmMade')}</h2>
        <Line icon="sprout" label={t('statsx.farm.harvested')}>{fmtFull(s.harvested)}</Line>
        <Line icon="flask" label={t('statsx.farm.potions')}>{fmtFull(s.potions)}</Line>
        <Line icon="flask" label={t('statsx.farm.elixirs')}>{fmtFull(s.elixirs)}</Line>
        <Line icon="pickaxe" label={t('statsx.farm.ores')}>{fmtFull(s.ores)}</Line>
        <Line icon="paw" label={t('statsx.farm.creatureWork')}>{fmtFull(s.creatureWork)}</Line>
        <Line icon="paw" label={t('statsx.farm.creatures')}>{(farm?.stable ?? []).length} · {t('statsx.farm.found', { n: (farm?.found ?? []).length, total: CREATURES.length })}</Line>
      </div>
      <div className="panel px-card">
        <h2>{t('statsx.farmGold')} · <span className="px-gold">{fmtFull(gold)} G</span></h2>
        <Line icon="sprout" label={t('statsx.farm.goldSeeds')}>{fmtFull(s.goldSeeds)} G</Line>
        <Line icon="paw" label={t('statsx.farm.goldWages')}>{fmtFull(s.goldWages)} G</Line>
        <Line icon="flask" label={t('statsx.farm.goldBrew')}>{fmtFull(s.goldBrew)} G</Line>
        <Line icon="pickaxe" label={t('statsx.farm.goldHaul')}>{fmtFull(s.goldHaul)} G</Line>
        <Line icon="pickaxe" label={t('statsx.farm.mineLevel')}>LV {farm?.mine?.level ?? 1}</Line>
      </div>
    </div>
  );
}

export default function StatisticsScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const go = useGame((s) => s.go);
  const [tab, setTab] = useState('normal');
  if (!profile) return null;
  const abyssOpen = abyssUnlocked(profile.bossWins);
  const { catalog } = data;
  const abyss = tab === 'abyss';
  const ms = profile.modeStats?.[tab] ?? emptyModeStats();
  const rec = ms.runs >= 1 ? ms.highestRecord : null;
  const off = abyss ? 100 : 0; // hard-mode boss ids are id + 100
  const mapsFound = Object.keys(profile.mapsSeen ?? {}).length;
  const bossesFound = Object.keys(profile.bossesSeen ?? {}).map(Number).filter((k) => k >= off && k < off + NORMAL_BOSS_COUNT).length;
  const abilityBeaten = ABILITY_BOSSES.filter((id) => profile.bossWins?.[id + off]).length;
  const [wOwned, wTotal] = collection(catalog.weapons, profile.inventory.weapons, abyss);
  const [aOwned, aTotal] = collection(catalog.armors, profile.inventory.armors, abyss);
  const [cOwned, cTotal] = collection(catalog.accessories, profile.inventory.accessories, abyss);

  return (
    <div className={`screen statistics hero-screen wood-screen ${abyss ? 'abyss' : ''}`}>
      {abyss ? <AbyssBackdrop /> : <WoodBackdrop />}
      <header className="hero-head">
        <h1><PixelIcon name="stats" size={24} />{t('statsx.title')}</h1>
        <nav className="hero-tabs stats-mode-tabs" role="tablist" aria-label={t('mode.title')}>
          {TABS.map((tb) => {
            // the abyssal tab stays locked until the abyssal mode is (base level ABYSS_UNLOCK_BASE)
            const locked = tb.key === 'abyss' && !abyssOpen;
            return (
              <button
                key={tb.key}
                role="tab"
                aria-selected={tab === tb.key}
                disabled={locked}
                title={locked ? t('opt.battleButton.locked', { n: ABYSS_UNLOCK_BASE }) : undefined}
                className={`hero-tab ${tab === tb.key ? 'active' : ''} ${tb.key} ${locked ? 'locked' : ''}`}
                onClick={() => setTab(tb.key)}
              >
                {locked ? <span className="tab-lock" aria-hidden="true">🔒</span> : <PixelIcon name={tb.icon} size={20} />}
                <span className="hero-tab-label">{t(tb.label)}</span>
              </button>
            );
          })}
        </nav>
      </header>
      {tab === 'farm' ? <FarmStats farm={profile.farm} t={t} /> : (
      <div className="stats-cols" role="tabpanel">
        <div className="panel px-card">
          <Line icon="map" label={t('statsx.maps')}>{mapsFound}</Line>
          <Line icon="paw" label={t('statsx.bosses')}>{bossesFound}</Line>
          <Line icon="skull" label={t('statsx.runs')}>{fmtFull(ms.runs)}</Line>
          <Line icon="swords" label={t('statsx.wins')}>{fmtFull(ms.wins)}</Line>
          <Line icon={LEVEL_ICON.name} colors={LEVEL_ICON.colors} label={t('statsx.abilityBosses')}>{abilityBeaten} / {ABILITY_BOSSES.length}</Line>
          <Line icon={LEVEL_ICON.name} colors={LEVEL_ICON.colors} label={t('statsx.baseAbility')}>LV {baseAbilityLevel(profile.bossWins)}</Line>
          <Line icon={LEVEL_ICON.name} colors={LEVEL_ICON.colors} label={t('statsx.baseLevel')}>{bossLevel(profile.bossWins)} / {BASE_LEVEL_MAX}</Line>
          <Line icon="sword" label={t('statsx.weapons')}>{wOwned} / {wTotal}</Line>
          <Line icon="shield" label={t('statsx.armors')}>{aOwned} / {aTotal}</Line>
          <Line icon="clover" label={t('statsx.accessories')}>{cOwned} / {cTotal}</Line>
          <Line icon="star" label={t('statsx.bestCombo')}>{fmtFull(ms.highestCombo)} Combo</Line>
          <Line icon="swords" label={t('statsx.bestHit')}>{fmtFull(ms.highestDamage)}</Line>
        </div>
        <div className="panel px-card">
          <h2>{t('statsx.bestLevel')} · <span className="px-gold">LV {rec ? fmtFull(rec.level) : 0}</span></h2>
          {!rec ? (
            <p className="muted small">{t(abyss ? 'statsx.noRecordAbyss' : 'statsx.noRecord')}</p>
          ) : (
            <>
              {STAT_KEYS.map((k) => (
                <Line key={k} icon={STAT_ICONS[k]} label={t(`stat.${k}`)}>
                  {fmtFull(rec.base[k])}
                  {rec.bonus[k] ? <span className="muted"> (+{fmtFull(rec.bonus[k])})</span> : null}
                </Line>
              ))}
              <RecordGear rec={rec} catalog={catalog} t={t} />
            </>
          )}
        </div>
      </div>
      )}
      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape data-primary onClick={() => go(SCREEN.TITLE)}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}

function RecordGear({ rec, catalog, t }) {
  const weapon = catalog.weapons[rec.slots[0]];
  const armor = catalog.armors[rec.slots[1]];
  return (
    <div className="record-gear small">
      <GearLine label={t('statsx.weapon')} item={weapon} copies={rec.copies[0]} stat={t('stat.atk')} />
      <GearLine label={t('statsx.armor')} item={armor} copies={rec.copies[1]} stat={t('stat.def')} />
      <div className="muted">{t('statsx.accessoriesTitle')}</div>
      <ol className="record-acc">
        {rec.slots.slice(2, 12).map((id, i) => (
          <li key={i}>
            {id >= 0 ? catalog.accessories[id]?.name ?? '????' : <span className="muted">{id === SLOT.LOCKED ? t('statsx.lockedSlot') : t('statsx.notEquipped')}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function GearLine({ label, item, copies, stat }) {
  if (!item) return <div><span className="muted">{label}:</span> —</div>;
  const s = scaledWeaponStats(item, Math.max(1, copies));
  return (
    <div>
      <span className="muted">{label}:</span> <b>{item.name}</b> {stat} +{fmtFull(s.plus)} · {100 + s.multi}%
    </div>
  );
}
