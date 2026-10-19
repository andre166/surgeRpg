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
import { sfx, bgm, setOutputBoost } from '../game/systems/audio.js';
import { bridge } from '../platform/desktop/bridge.js';
import { useLang } from './i18n/index.js';
import { PHASE } from '../core/battle/engine.js';

const FARM_TICK_MS = 10000;

// Phone speakers play the synthesized audio far quieter than desktop ones.
if (bridge.isAndroid) setOutputBoost(3);

export default function App() {
  const screen = useGame((s) => s.screen);
  const boot = useGame((s) => s.boot);
  useEffect(() => {
    boot();
  }, [boot]);
  useKeyboardNav();
  useMenuSounds();

  // the farm works in the background on every screen, not only on the Farm: stable creatures
  // (harvests, brews, wages) catch up every FARM_TICK_MS; battles are left alone (next tick catches up)
  useEffect(() => {
    const tick = () => {
      const s = useGame.getState();
      if (s.profile?.farm && s.screen !== SCREEN.BATTLE) s.farmDo('tick');
    };
    tick();
    const id = setInterval(tick, FARM_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const options = useGame((s) => s.profile?.options);
  useEffect(() => {
    if (!options) return;
    sfx.setVolume(options.sfx);
    // music plays while switched on with some volume (the Options slider sets both)
    bgm.setVolume(options.bgm ?? 1);
    bgm.setEnabled(options.bgmOn && (options.bgm ?? 1) > 0);
  }, [options]);
  // <html lang> follows the chosen language: screen readers, and the browser's font fallback picks
  // the right CJK system font for Japanese / Korean (the pixel font has no such glyphs)
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // music: boss fights (map bosses, Slime Kings) get the tense theme, other fights the
  // battle theme, a won fight the victory fanfare + loop from the killing blow through the result
  // screen (like Inflation RPG's win1_bgm), everything else the cozy main loop
  const track = useGame((s) => {
    if (s.screen === SCREEN.RESULT && s.result?.won) return 'victory';
    if (s.screen !== SCREEN.BATTLE || !s.battle) return 'main';
    // won: the victory music starts on the killing blow (while the enemy falls) and carries on
    // into the result screen
    if (s.battle.state?.phase === PHASE.WON) return 'victory';
    return s.battle.bossId >= 0 || s.battle.slime ? 'boss' : 'battle';
  });
  useEffect(() => {
    bgm.setTrack(track);
  }, [track]);
  useEffect(() => {
    // Audio may only start after a user gesture. A touch pointerdown is not one
    // (only its pointerup/touchend/click are), so mobile needs those too.
    const unlock = () => bgm.unlock();
    const events = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
    events.forEach((e) => window.addEventListener(e, unlock));
    return () => events.forEach((e) => window.removeEventListener(e, unlock));
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
