import React, { useEffect } from 'react';
import { useGame, SCREEN } from './stores/gameStore.js';
import TitleScreen from './screens/TitleScreen.jsx';
import CharacterScreen from './screens/CharacterScreen.jsx';
import MapScreen from './screens/MapScreen.jsx';
import BattleScreen from './screens/BattleScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import StatsScreen from './screens/StatsScreen.jsx';
import EquipmentScreen from './screens/EquipmentScreen.jsx';
import GameOverScreen from './screens/GameOverScreen.jsx';
import OptionsScreen from './screens/OptionsScreen.jsx';
import StatisticsScreen from './screens/StatisticsScreen.jsx';
import BestiaryScreen from './screens/BestiaryScreen.jsx';
import TalentsScreen from './screens/TalentsScreen.jsx';
import CraftingScreen from './screens/CraftingScreen.jsx';
import EchoesScreen from './screens/EchoesScreen.jsx';
import FarmScreen from './screens/FarmScreen.jsx';
import Toast from './components/Toast.jsx';
import { useKeyboardNav } from './components/useKeyboardNav.js';
import { useMenuSounds } from './components/useMenuSounds.js';
import { sfx, bgm } from '../game/systems/audio.js';

export default function App() {
  const screen = useGame((s) => s.screen);
  const boot = useGame((s) => s.boot);
  useEffect(() => {
    boot();
  }, [boot]);
  useKeyboardNav();
  useMenuSounds();

  const options = useGame((s) => s.profile?.options);
  useEffect(() => {
    if (!options) return;
    sfx.setVolume(options.sfx);
    // music plays while switched on with some volume (the Options slider sets both)
    bgm.setVolume(options.bgm ?? 0.6);
    bgm.setEnabled(options.bgmOn && (options.bgm ?? 0.6) > 0);
  }, [options]);
  // music: boss fights (map bosses, Slime Kings) get the tense theme, other fights the
  // battle theme, everything else the cozy main loop
  const track = useGame((s) => {
    if (s.screen !== SCREEN.BATTLE || !s.battle) return 'main';
    return s.battle.bossId >= 0 || s.battle.slime ? 'boss' : 'battle';
  });
  useEffect(() => {
    bgm.setTrack(track);
  }, [track]);
  useEffect(() => {
    // Audio may only start after a user gesture.
    const unlock = () => bgm.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  let view = null;
  switch (screen) {
    case SCREEN.TITLE: view = <TitleScreen />; break;
    case SCREEN.CHARACTER: view = <CharacterScreen />; break;
    case SCREEN.MAP: view = <MapScreen />; break;
    case SCREEN.BATTLE: view = <BattleScreen />; break;
    case SCREEN.RESULT: view = <ResultScreen />; break;
    case SCREEN.STATS: view = <StatsScreen />; break;
    case SCREEN.EQUIPMENT: view = <EquipmentScreen />; break;
    case SCREEN.GAME_OVER: view = <GameOverScreen />; break;
    case SCREEN.OPTIONS: view = <OptionsScreen />; break;
    case SCREEN.STATISTICS: view = <StatisticsScreen />; break;
    case SCREEN.BESTIARY: view = <BestiaryScreen />; break;
    case SCREEN.TALENTS: view = <TalentsScreen />; break;
    case SCREEN.CRAFTING: view = <CraftingScreen />; break;
    case SCREEN.ECHOES: view = <EchoesScreen />; break;
    case SCREEN.FARM: view = <FarmScreen />; break;
    default: view = <div className="screen center"><p className="muted">Loading…</p></div>;
  }
  return (
    <div className="app">
      {view}
      <Toast />
    </div>
  );
}
