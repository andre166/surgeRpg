import React from 'react';
import { useGame, SCREEN, data } from '../stores/gameStore.js';
import { fmtFull } from '../components/format.js';
import { scaledWeaponStats } from '../../core/equipment/items.js';
import { baseAbilityLevel } from '../../core/progression/characters.js';
import { SLOT } from '../../core/equipment/slots.js';
import { useT } from '../i18n/index.js';
import PixelIcon, { LEVEL_ICON, STAT_ICONS } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';

/**
 * Lifetime statistics (port of PlayerInfo.as): discoveries, collection, best level
 * with the stats and equipment it was reached with, best combo and best hit.
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

function owned(list) {
  return (list ?? []).filter((n) => n >= 1).length;
}

export default function StatisticsScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const go = useGame((s) => s.go);
  if (!profile) return null;
  const { catalog } = data;
  const rec = profile.gameOverCount >= 1 ? profile.highestRecord : null;
  const mapsFound = Object.keys(profile.mapsSeen ?? {}).length;
  const bossesFound = Object.keys(profile.bossesSeen ?? {}).filter((k) => Number(k) < NORMAL_BOSS_COUNT).length;

  return (
    <div className="screen statistics hero-screen wood-screen">
      <WoodBackdrop />
      <header className="hero-head">
        <h1><PixelIcon name="stats" size={24} />{t('statsx.title')}</h1>
      </header>
      <div className="stats-cols">
        <div className="panel px-card">
          <Line icon="map" label={t('statsx.maps')}>{mapsFound}</Line>
          <Line icon="paw" label={t('statsx.bosses')}>{bossesFound}</Line>
          <Line icon="skull" label={t('statsx.runs')}>{fmtFull(profile.gameOverCount)}</Line>
          <Line icon={LEVEL_ICON.name} colors={LEVEL_ICON.colors} label={t('statsx.baseAbility')}>LV {baseAbilityLevel(profile.bossWins)}</Line>
          <Line icon="sword" label={t('statsx.weapons')}>{owned(profile.inventory.weapons)} / {catalog.weapons.length}</Line>
          <Line icon="shield" label={t('statsx.armors')}>{owned(profile.inventory.armors)} / {catalog.armors.length}</Line>
          <Line icon="clover" label={t('statsx.accessories')}>{owned(profile.inventory.accessories)} / {catalog.accessories.length}</Line>
          <Line icon="star" label={t('statsx.bestCombo')}>{fmtFull(profile.highestCombo)} Combo</Line>
          <Line icon="swords" label={t('statsx.bestHit')}>{fmtFull(profile.highestDamage)}</Line>
        </div>
        <div className="panel px-card">
          <h2>{t('statsx.bestLevel')} · <span className="px-gold">LV {rec ? fmtFull(rec.level) : 0}</span></h2>
          {!rec ? (
            <p className="muted small">{t('statsx.noRecord')}</p>
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
