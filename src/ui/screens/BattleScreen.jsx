import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../stores/gameStore.js';
import { Creature, Hero, EchoSpirit } from '../components/Sprite.jsx';
import { heroEcho } from '../../core/echoes.js';
import { fmt, fmtFull, fmtShort } from '../components/format.js';
import { isOver, currentHealCost, freeHealBlock } from '../../core/battle/engine.js';
import { sfx } from '../../game/systems/audio.js';
import { useT } from '../i18n/index.js';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import PixelIcon from '../components/PixelIcon.jsx';
import FarmIcon from '../components/FarmIcon.jsx';

const STEP_MS = 520;
// pause on the final blow before the result screen opens
const END_DELAY_MS = 1300;

export default function BattleScreen() {
  const t = useT();
  const battle = useGame((s) => s.battle);
  const run = useGame((s) => s.run);
  const advance = useGame((s) => s.battleAdvance);
  const heal = useGame((s) => s.battleHeal);
  const canHeal = useGame((s) => s.battleCanHeal);
  const endBattle = useGame((s) => s.endBattle);
  const usePotion = useGame((s) => s.battleUsePotion);
  const [paused, setPaused] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const forfeit = useGame((s) => s.battleForfeit);
  const [floats, setFloats] = useState([]);
  const [shake, setShake] = useState('');
  const [echoCast, setEchoCast] = useState(''); // '' | 'cast' | 'resonance'
  // who is lunging this step ('atk-player' | 'atk-enemy') and whether it was a critical hit
  const [act, setAct] = useState('');
  const [crit, setCrit] = useState(false);
  const profile = useGame((s) => s.profile);
  const idRef = useRef(0);

  // the fight starts as soon as the screen opens
  useEffect(() => { sfx.start(); }, []);

  // when it is over, the result screen opens by itself (that one waits for a tap)
  const over = !!battle && isOver(battle.state);
  useEffect(() => {
    if (!over) return undefined;
    const id = setTimeout(() => endBattle(), END_DELAY_MS);
    return () => clearTimeout(id);
  }, [over, endBattle]);

  useEffect(() => {
    if (!battle || paused || isOver(battle.state)) return undefined;
    const timer = setInterval(() => {
      const events = advance();
      for (const ev of events) {
        if (ev.type === 'playerHit') {
          sfx.hit(ev.critical);
          push(`-${fmtFull(ev.damage)}${ev.critical ? ' !' : ''}`, 'enemy', ev.critical);
          setShake('shake-enemy');
          setAct('atk-player');
          if (ev.critical) setCrit(true);
        } else if (ev.type === 'enemyHit') {
          sfx.hurt();
          push(`-${fmtFull(ev.damage)}`, 'player', false);
          setShake('shake-player');
          setAct('atk-enemy');
        } else if (ev.type === 'combo') {
          push(t('battle.comboFloat', { n: ev.combo }), 'combo', true);
        } else if (ev.type === 'echoSkill' || ev.type === 'echoResonance') {
          const big = ev.type === 'echoResonance';
          setEchoCast(big ? 'resonance' : 'cast');
          setTimeout(() => setEchoCast(''), big ? 900 : 500);
          if (ev.kind === 'heal') { sfx.heal(); push(`+${fmtFull(ev.amount)}`, 'heal', big); } else { sfx.hit(true); push(`✦ -${fmtFull(ev.damage)}`, 'echo', true); }
          if (big) setShake('shake-enemy');
        } else if (ev.type === 'healed') {
          sfx.heal();
          push(t('battle.fullHeal'), 'heal', true);
        }
      }
      setTimeout(() => { setShake(''); setAct(''); setCrit(false); }, 260);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [battle, paused, advance, t]);

  function push(text, kind, big) {
    idRef.current += 1;
    const id = idRef.current;
    setFloats((f) => [...f.slice(-8), { id, text, kind, big, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
  }

  if (!battle || !run) return null;
  const st = battle.state;
  const enemy = st.enemy;
  const player = st.player;
  const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
  const ehpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  const echo = heroEcho(profile, run.characterIndex);
  const isBoss = battle.bossId >= 0 || !!battle.slime;
  const outcome = over ? (player.hp > 0 ? 'won' : 'lost') : '';

  // tapping during the fight pauses it (heal / potion); nothing to do once it is over
  function onTap() {
    if (over) return;
    setPaused(true);
  }

  return (
    <div className={`screen battle wood-screen ${shake} ${act} ${crit ? 'crit' : ''} ${outcome}`} onClick={onTap}>
      <WoodBackdrop />
      <div className="crit-flash" aria-hidden="true" />
      <div className="battle-stage">
        <div className="enemy-side">
          <div className="nameplate">
            {(isBoss || battle.area) && (
              <div className="enemy-tags">
                {isBoss && <span className="tag boss">{t('battle.boss')}</span>}
                {/* the enemy's level: a map boss's or slime king's own, else the area's (hidden in abyssal mode, as on the map HUD) */}
                {battle.area && <span className="tag enemy-lv">{run.hardMode ? 'LV ? ? ?' : `LV ${fmtShort(battle.enemyDef?.level ?? battle.area.level)}`}</span>}
              </div>
            )}
            <b>{enemy.name}</b>
            <div className="bar enemy"><div className="lag" style={{ width: `${ehpPct}%` }} /><div className="fill" style={{ width: `${ehpPct}%` }} /></div>
            <span className="small">{fmt(enemy.hp)} / {fmt(enemy.maxHp)}</span>
          </div>
          <div className="actor enemy-actor">
            <Creature sprite={enemy.id} size={isBoss ? 260 : 200} boss={isBoss} className={shake === 'shake-enemy' ? 'flash' : ''} />
          </div>
        </div>
        <div className="floats">
          {floats.map((f) => (
            <span key={f.id} className={`float ${f.kind} ${f.big ? 'big' : ''}`} style={{ left: `${f.x}%` }}>{f.text}</span>
          ))}
        </div>
        <div className="player-side">
          <div className="hero-party">
            <div className="actor hero-actor">
              <Hero index={run.characterIndex} size={120} className={shake === 'shake-player' ? 'flash' : ''} />
            </div>
            {echo && (
              <EchoSpirit
                echo={echo}
                size={84}
                className={`in-battle ${echoCast} ${shake === 'shake-player' ? 'flash' : ''}`}
              />
            )}
          </div>
          <div className="nameplate">
            <b>LV {fmtFull(run.level)}</b>
            <div className="bar player"><div className="lag" style={{ width: `${hpPct}%` }} /><div className="fill" style={{ width: `${hpPct}%` }} /></div>
            <span className="small">{fmtFull(player.hp)} / {fmtFull(player.maxHp)}</span>
          </div>
        </div>
      </div>
      <div className="battle-log">
        {battle.playGemNullified && <p className="warn small">{t('battle.gemFailed')}</p>}
        {battle.log.slice(-4).map((e, i) => <p key={i} className={e.type === 'combo' ? 'log-combo' : undefined}>{describe(e, t)}</p>)}
      </div>
      {paused && (
        <PauseMenu
          t={t}
          st={st}
          enemy={enemy}
          run={run}
          hpPct={hpPct}
          ehpPct={ehpPct}
          potions={profile?.farm?.items?.healing_potion ?? 0}
          canHeal={canHeal()}
          confirmForfeit={confirmForfeit}
          setConfirmForfeit={setConfirmForfeit}
          onHeal={() => { heal(); setPaused(false); }}
          onPotion={() => { if (usePotion()) setPaused(false); }}
          onResume={() => { setPaused(false); setConfirmForfeit(false); }}
          onForfeit={() => { setPaused(false); setConfirmForfeit(false); forfeit(); }}
        />
      )}
    </div>
  );
}

/**
 * Pause menu of a battle (tap during the fight): where the fight stands (both HP bars, the gold),
 * then the ways to recover as two option cards (full heal for gold, or a healing potion), each
 * saying why when it cannot be used; Continue as the main button (a tap outside the panel also
 * resumes) and giving up at the bottom, behind a confirmation.
 */
function PauseMenu({ t, st, enemy, run, hpPct, ehpPct, potions, canHeal, confirmForfeit, setConfirmForfeit, onHeal, onPotion, onResume, onForfeit }) {
  const cost = currentHealCost(st);
  const healNote = st.healQueued ? t('battle.queued') : st.gold < cost ? t('battle.noGold') : null;
  // potions: one per battle, only against bosses and Slime Kings
  const block = freeHealBlock(st);
  const potionNote = block === 'queued' ? t('battle.queued') : block === 'notBoss' ? t('battle.potionBossOnly') : block === 'used' ? t('battle.potionUsed') : potions < 1 ? t('battle.noPotion') : null;
  return (
    <div className="modal pause-modal" onClick={(e) => { e.stopPropagation(); onResume(); }}>
      <div className="panel pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title" onClick={(e) => e.stopPropagation()}>
        <header className="pause-head">
          <h2 id="pause-title"><span className="pause-glyph" aria-hidden="true">❚❚</span>{t('battle.paused')}</h2>
          <span className="hero-chip"><PixelIcon name="coins" size={16} /><b>{fmtFull(st.gold)} G</b></span>
        </header>

        {/* where the fight stands */}
        <div className="pause-status">
          <div className="pause-fighter">
            <span className="pause-who">{t('battle.you')} · LV {fmtFull(run.level)}</span>
            <div className="bar player"><div className="fill" style={{ width: `${hpPct}%` }} /></div>
            <span className="small">{fmtFull(st.player.hp)} / {fmtFull(st.player.maxHp)}</span>
          </div>
          <span className="pause-vs" aria-hidden="true">VS</span>
          <div className="pause-fighter enemy">
            <span className="pause-who">{enemy.name}</span>
            <div className="bar enemy"><div className="fill" style={{ width: `${ehpPct}%` }} /></div>
            <span className="small">{fmt(enemy.hp)} / {fmt(enemy.maxHp)}</span>
          </div>
        </div>

        {st.healQueued && <p className="pause-ready">✓ {t('battle.healReady')}</p>}

        {/* ways to recover */}
        <h3 className="pause-sub">{t('battle.recover')}</h3>
        <div className="pause-options">
          <button className="pause-option" disabled={!canHeal} onClick={onHeal}>
            <span className="pause-option-icon"><PixelIcon name="heart" size={30} /></span>
            <span className="pause-option-text">
              <span className="pause-option-title">
                <b>{t('battle.healTitle')}</b>
                <span className={`pause-option-cost ${healNote ? 'off' : ''}`}>{healNote ?? <><PixelIcon name="coins" size={14} />{fmtFull(cost)} G</>}</span>
              </span>
              <span className="pause-option-desc">{t('battle.healDesc')}</span>
            </span>
          </button>
          <button className="pause-option" disabled={!!potionNote} onClick={onPotion}>
            <span className="pause-option-icon"><FarmIcon id="healing_potion" size={30} /></span>
            <span className="pause-option-text">
              <span className="pause-option-title">
                <b>{t('battle.potionTitle')}</b>
                <span className={`pause-option-cost ${potionNote ? 'off' : ''}`}>{potionNote ?? t('battle.potionCount', { n: potions })}</span>
              </span>
              <span className="pause-option-desc">{t('battle.potionDesc')}</span>
            </span>
          </button>
        </div>

        <button className="btn primary pause-resume" data-primary data-escape onClick={onResume}>{t('battle.resume')}</button>

        {/* give up: counts as a defeat; a second tap confirms */}
        <div className="pause-forfeit">
          {!confirmForfeit ? (
            <button className="pause-forfeit-link" onClick={() => setConfirmForfeit(true)}>{t('battle.forfeit')}</button>
          ) : (
            <div className="pause-forfeit-confirm">
              <span className="small">{t('battle.forfeitWarn')}</span>
              <div className="row">
                <button className="btn small" onClick={() => setConfirmForfeit(false)}>{t('common.cancel')}</button>
                <button className="btn small danger" onClick={onForfeit}>{t('battle.forfeitConfirm')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function describe(e, t) {
  switch (e.type) {
    case 'playerHit': return `${t('log.playerHit', { damage: fmtFull(e.damage) })}${e.combo > 1 ? t('log.comboSuffix', { n: e.combo }) : ''}${e.critical ? t('log.critical') : ''}${e.drain ? ` +${e.drain} HP` : ''}`;
    case 'enemyHit': return `${t('log.enemyHit', { damage: fmtFull(e.damage) })}${e.guarded ? t('log.guarded') : ''}`;
    case 'combo': return t('log.combo', { n: e.combo });
    case 'echoSkill': return e.kind === 'heal' ? t('log.echoHeal', { n: fmtFull(e.amount) }) : t('log.echoBurst', { damage: fmtFull(e.damage) });
    case 'echoResonance': return e.kind === 'heal' ? t('log.resHeal', { n: fmtFull(e.amount) }) : t('log.resSpirit', { damage: fmtFull(e.damage) });
    case 'healed': return t('log.healed');
    case 'won': return t('log.won');
    case 'lost': return t('log.lost');
    default: return '';
  }
}
