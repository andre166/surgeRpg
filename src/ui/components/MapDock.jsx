import React, { useEffect, useState } from 'react';
import { plotState, labState, cropTimeMult, labTimeMult } from '../../core/farm.js';
import { useGame, SCREEN } from '../stores/gameStore.js';
import { useT } from '../i18n/index.js';
import PixelIcon, { HeroPortrait } from './PixelIcon.jsx';
import GameMenu from './GameMenu.jsx';

/** Pixel-art icon of each dock button. */
const ICONS = { farm: 'sprout', gear: 'helmet', encounter: 'swords' };

/** Bottom map dock: Farm, Hero, Battle (in the middle, raised), Gear, then the Menu last (Class sits above the set switcher; Echoes, Talents and Forge are tabs of the Hero screen). */
export default function MapDock() {
  const t = useT();
  const openFromMap = useGame((s) => s.openFromMap);
  const forceEncounter = useGame((s) => s.forceEncounter);
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  // ready harvests / finished elixir, refreshed every few seconds
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 5000); return () => clearInterval(id); }, []);
  const now = Date.now();
  const farmReady = profile?.farm ? profile.farm.plots.filter((p) => plotState(p, now, cropTimeMult(profile.farm)).status === 'ready').length + (labState(profile.farm.lab, now, labTimeMult(profile.farm)).status === 'ready' ? 1 : 0) : 0;

  const items = [
    { key: 'farm', onClick: () => openFromMap(SCREEN.FARM), label: t('farm.short'), badge: farmReady > 0 ? farmReady : null },
    { key: 'hero', onClick: () => openFromMap(SCREEN.STATS), label: t('map.hero') },
    // Battle, the main action, in the middle (drawn raised above the bar)
    { key: 'encounter', onClick: () => forceEncounter(), label: t('map.fight') },
    { key: 'gear', onClick: () => openFromMap(SCREEN.EQUIPMENT), label: t('map.gear') },
  ];

  return (
    <nav className="map-dock" aria-label={t('map.menu')}>
      {items.map((it) => (
        <button key={it.key} className={`dock-btn dock-${it.key}`} onClick={it.onClick} title={it.label} aria-label={it.label}>
          <span className="dock-icon">{it.key === 'hero' ? <HeroPortrait index={run.characterIndex} size={40} /> : <PixelIcon name={ICONS[it.key]} size={40} />}</span>
          <span className="dock-label">{it.label}</span>
          {it.badge != null && <span className="dock-dot" aria-label={t('farm.ready')} />}
        </button>
      ))}
      <GameMenu inDock />
    </nav>
  );
}
