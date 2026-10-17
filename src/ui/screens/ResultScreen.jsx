import React, { useEffect, useState } from 'react';
import { useGame, data } from '../stores/gameStore.js';
import { fmtFull, fmtShort } from '../components/format.js';
import { battlePointsLeft } from '../../core/progression/battlePoints.js';
import { expForLevel } from '../../core/progression/expTable.js';
import { sfx } from '../../game/systems/audio.js';
import { useT } from '../i18n/index.js';
import ItemIcon from '../components/ItemIcon.jsx';
import PixelIcon, { LEVEL_ICON } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';

// reward rows slide in one after another (see .result-row in styles.css)
const ROW_DELAY = 0.12;
const ROW_STEP = 0.07;
const ROW_ANIM = 0.3;

/** One reward line: icon, label, value and an optional note; `hl` tints it gold. */
function Row({ icon, label, value, note, hl, i }) {
  return (
    <div className={`result-row ${hl ? 'hl' : ''}`} style={{ animationDelay: `${ROW_DELAY + i * ROW_STEP}s` }}>
      <span className="result-icon">{icon}</span>
      <span className="result-label">{label}</span>
      <b className="result-value">{value}</b>
      {note && <span className="result-note">{note}</span>}
    </div>
  );
}

/** After a battle: what was won (or lost) and the BP left; any tap goes back to the map. */
export default function ResultScreen() {
  const t = useT();
  const result = useGame((s) => s.result);
  const run = useGame((s) => s.run);
  const leave = useGame((s) => s.leaveResult);
  // taps only leave once everything has been shown
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (result?.won && result.levelsGained > 0) sfx.levelUp();
    if (result && !result.won) sfx.hurt();
  }, [result]);
  // effects run after render, so the rows are in the DOM: wait for the last one to land
  useEffect(() => {
    if (!result) return undefined;
    const rows = document.querySelectorAll('.result-row').length;
    const ms = (rows ? ROW_DELAY + (rows - 1) * ROW_STEP + ROW_ANIM : 0.35) * 1000 + 150;
    const id = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(id);
  }, [result]);
  if (!result || !run) return null;
  const bp = battlePointsLeft(run);
  const dropItem = result.drop ? [data.catalog.weapons, data.catalog.armors, data.catalog.accessories][result.drop.type][result.drop.itemId] : null;
  const next = expForLevel(run.level);

  const rows = [];
  if (result.won) {
    rows.push({ key: 'gold', icon: <PixelIcon name="coins" size={22} />, label: t('result.gold'), value: `+${fmtShort(result.gold)}`, note: `→ ${fmtShort(run.gold)}` });
    rows.push({ key: 'exp', icon: <PixelIcon name="star" size={22} />, label: t('result.exp'), value: `+${fmtShort(result.exp)}`, note: t('result.toNext', { exp: fmtShort(run.exp), next: fmtShort(next) }) });
    if (result.levelsGained > 0) {
      rows.push({ key: 'lv', hl: true, icon: <PixelIcon name={LEVEL_ICON.name} colors={LEVEL_ICON.colors} size={22} />, label: t('result.levelUp'), value: `LV ${fmtFull(run.level)}`, note: `+${fmtFull(result.levelsGained)} · ${t('result.statPoints', { n: fmtFull(result.statPointsGained) })}` });
    }
    if (dropItem) rows.push({ key: 'drop', hl: true, icon: <ItemIcon item={dropItem} size={26} />, label: t('result.itemFound'), value: dropItem.name, note: dropItem.description ?? '' });
    if (result.bossId >= 0 && result.bossId <= 28) rows.push({ key: 'boss', hl: true, icon: <PixelIcon name="skull" size={22} />, label: t('result.bossDefeated'), value: t('result.bpBonus', { n: result.bpBonus }) });
    if (result.talentPoints > 0) rows.push({ key: 'tp', hl: true, icon: <PixelIcon name="tree" size={22} />, label: t('result.talentPoints'), value: `+${result.talentPoints} TP`, note: t('result.talentHint') });
    if (result.echoXp) rows.push({ key: 'echoXp', hl: result.echoXp.levelUp, icon: <PixelIcon name="orb" size={22} />, label: t('echo.mastery'), value: `${t(`echo.name.${result.echoXp.id}`)} +${result.echoXp.amount} XP`, note: result.echoXp.levelUp ? t('echo.masteryUp', { n: result.echoXp.level }) : t('echo.masteryLv', { n: result.echoXp.level }) });
    if (result.echo) rows.push({ key: 'echo', hl: true, icon: <PixelIcon name="orb" size={22} />, label: t('echo.obtained'), value: t(`echo.name.${result.echo}`), note: t('echo.obtainedHint') });
    if (result.abilityLevelUp) rows.push({ key: 'ability', hl: true, icon: <PixelIcon name="hero" size={22} />, label: t('result.baseAbility'), value: t('result.abilityUp') });
    if (result.teleport) rows.push({ key: 'tele', icon: <PixelIcon name="map" size={22} />, label: t('result.pathOpens'), value: result.teleport.returned ? t('result.back') : result.teleport.room ? t('result.room') : t('result.newLand') });
    if (result.lastBoss) rows.push({ key: 'last', hl: true, icon: <PixelIcon name="star" size={22} />, label: '★', value: t('result.finalBoss') });
  }

  return (
    <div className={`screen result hero-screen wood-screen ${result.won ? 'won' : 'lost'}`} onClick={() => { if (ready) leave(); }}>
      <WoodBackdrop />
      <div className="result-card">
        <h1 className="result-title">
          <PixelIcon name={result.won ? 'swords' : 'skull'} size={34} />
          {result.won ? t('result.victory') : t('result.defeat')}
        </h1>
        {result.won ? (
          <div className="result-rows">
            {rows.map(({ key, ...r }, i) => <Row key={key} i={i} {...r} />)}
          </div>
        ) : (
          <p className="result-lost">{t('result.noReward')}{run.hardMode ? t('result.hardCost') : ''}.</p>
        )}
        <div className="result-foot">
          <span className={`hero-chip ${bp <= 3 ? 'warn-chip' : ''}`}><PixelIcon name="swords" size={16} />{t('result.bpLeft')} <b>{bp}</b></span>
          {/* no handler: the click bubbles up to the screen (leave once ready); Enter clicks it (data-primary);
              enabled once every row has landed */}
          <button className="btn primary result-continue" data-primary disabled={!ready}>{bp > 0 ? t('result.toMap') : t('result.toFinal')}</button>
        </div>
      </div>
    </div>
  );
}
