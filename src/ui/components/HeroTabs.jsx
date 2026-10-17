import React from 'react';
import { useGame, SCREEN } from '../stores/gameStore.js';
import { heroTalents } from '../../core/progression/talents.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';

const TABS = [
  { screen: SCREEN.STATS, icon: 'stats', label: 'map.stats' },
  { screen: SCREEN.ECHOES, icon: 'orb', label: 'echo.short' },
  { screen: SCREEN.TALENTS, icon: 'tree', label: 'title.talents' },
  { screen: SCREEN.CRAFTING, icon: 'forge', label: 'craft.title' },
];

/**
 * Tabs on top of the hero screens opened from the map (Stats, Echoes, Talents, Forge); switching
 * keeps "Back" returning to the map. Hidden when the screen was opened from the title.
 */
export default function HeroTabs() {
  const t = useT();
  const screen = useGame((s) => s.screen);
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const fromRun = useGame((s) => !!(s.run && s.mapReturnScreen));
  const openFromMap = useGame((s) => s.openFromMap);
  if (!fromRun) return null;
  const badges = { [SCREEN.TALENTS]: heroTalents(profile, run.characterIndex).points };

  return (
    <nav className="hero-tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.screen}
          role="tab"
          aria-selected={screen === tab.screen}
          className={`hero-tab ${screen === tab.screen ? 'active' : ''}`}
          onClick={() => { if (screen !== tab.screen) openFromMap(tab.screen); }}
        >
          <PixelIcon name={tab.icon} size={22} />
          <span className="hero-tab-label">{t(tab.label)}</span>
          {badges[tab.screen] > 0 && <span className="hero-tab-badge">{badges[tab.screen] > 999 ? '999+' : badges[tab.screen]}</span>}
        </button>
      ))}
    </nav>
  );
}
