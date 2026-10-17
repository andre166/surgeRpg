import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../stores/gameStore.js';
import { Creature, Hero, EchoSpirit } from '../components/Sprite.jsx';
import { heroEcho } from '../../core/echoes.js';
import { fmt, fmtFull } from '../components/format.js';
import { isOver, currentHealCost } from '../../core/battle/engine.js';
import { sfx } from '../../game/systems/audio.js';
import { useT } from '../i18n/index.js';
import WoodBackdrop from '../components/WoodBackdrop.jsx';

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
            {isBoss && <span className="tag boss">{t('battle.boss')}</span>}
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
        {battle.log.slice(-4).map((e, i) => <p key={i}>{describe(e, t)}</p>)}
      </div>
      {paused && (
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="panel">
            <h2>{t('battle.paused')}</h2>
            <p>{t('battle.healOffer')} <b>{fmtFull(currentHealCost(st))} G</b></p>
            <p className="small muted">{t('battle.youHave', { gold: fmtFull(st.gold) })}{st.healQueued ? t('battle.healQueued') : ''}</p>
            <div className="row">
              <button className="btn" disabled={!canHeal()} onClick={() => { heal(); setPaused(false); }}>{t('battle.buyHeal')}</button>
              <button className="btn" disabled={!(profile?.farm?.items?.healing_potion > 0) || st.healQueued} onClick={() => { if (usePotion()) setPaused(false); }}>
                {t('battle.usePotion', { n: profile?.farm?.items?.healing_potion ?? 0 })}
              </button>
              <button className="btn primary" data-escape onClick={() => setPaused(false)}>{t('battle.resume')}</button>
            </div>
          </div>
        </div>
      )}
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
