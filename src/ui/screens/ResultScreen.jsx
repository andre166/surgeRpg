import React, { useEffect, useState } from 'react';
import { useGame, data } from '../stores/gameStore.js';
import { fmtFull, fmtShort } from '../components/format.js';
import { battlePointsLeft } from '../../core/progression/battlePoints.js';
import { isMapBossId } from '../../core/encounters/customBosses.js';
import { expForLevel } from '../../core/progression/expTable.js';
import { sfx } from '../../game/systems/audio.js';
import { useT } from '../i18n/index.js';
import ItemIcon from '../components/ItemIcon.jsx';
import PixelIcon, { LEVEL_ICON } from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';
import { Creature, EchoSpirit } from '../components/Sprite.jsx';
import { echoDef } from '../../core/echoes.js';
import { farmDef } from '../../core/farm.js';
import RelicSprite from '../components/RelicSprite.jsx';
import RelicDiscovery from '../components/RelicDiscovery.jsx';
import { ownedRelic } from '../../core/crafting.js';

// reward rows slide in one after another (see .result-row in styles.css)
const ROW_DELAY = 0.12;
const ROW_STEP = 0.07;
const ROW_ANIM = 0.3;

/** One reward line: icon, label, value and an optional note; `hl` tints it gold. */
/** The account's base level going up: its own banner under the title (it gates every unlock). */
function BaseLevelBanner({ from, to, t }) {
  return (
    <div className="base-level-up" role="status">
      <span className="blu-label">{t('result.baseLevel')}</span>
      <span className="blu-levels">
        <span className="blu-from">{from}</span>
        <span className="blu-arrow">→</span>
        <b className="blu-to">{to}</b>
      </span>
      <span className="blu-note">{t('result.baseLevelNote')}</span>
    </div>
  );
}

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

/**
 * Rarity of a dropped item, for the loot reveal (every drop is rare in this game, so the lowest
 * tier is 'rare'): weapons and armors by their power among the same kind (`list`: top 10%
 * legendary, next 30% epic), accessories by rank (2 epic, 3 legendary); hard-mode items one tier up.
 */
const TIERS = ['rare', 'epic', 'legendary'];
export function dropTier(item, type, list = []) {
  let i = 0;
  if (type === 2) i = item.rank >= 3 ? 2 : item.rank >= 2 ? 1 : 0;
  else {
    const weaker = list.filter((x) => (x.flat ?? 0) < (item.flat ?? 0)).length;
    const pct = list.length > 1 ? weaker / (list.length - 1) : 0;
    i = pct >= 0.9 ? 2 : pct >= 0.6 ? 1 : 0;
  }
  if (item.hard) i += 1;
  return TIERS[Math.min(i, 2)];
}
/** How long the reveal holds the screen after the item shows (taps wait for it), by rarity. */
const DROP_HOLD = { rare: 0.9, epic: 1.2, legendary: 1.7 };
const SPARKS = 12;
/** The roulette starts once the card has landed (SPIN_START s) and rolls for about SPIN_TIME s. */
const SPIN_START = 0.3;
const SPIN_TIME = 1.6;
/** Gaps (ms) between the roulette's steps: fast, then slowing down, adding up to SPIN_TIME. */
const SPIN_GAPS = (() => {
  const gaps = [];
  for (let g = 45, sum = 0; sum + g <= SPIN_TIME * 1000; g *= 1.16) { gaps.push(Math.round(g)); sum += g; }
  return gaps;
})();
/** Seconds from the start of the roulette to its last step (the real item's shadow). */
const SPIN_LAND = SPIN_GAPS.slice(0, -1).reduce((a, g) => a + g, 0) / 1000;
/** Suspense between landing and the reveal (drumroll). */
const SUSPENSE = 0.45;
/** Seconds from the row's slide-in to the item's reveal. */
export const REVEAL_AT = SPIN_START + SPIN_LAND + SUSPENSE;

/**
 * The loot reveal. First a roulette: shadowed silhouettes of items of the same kind roll by like a
 * slot reel, fast then slowing down with a tick each over a rising whoosh, on a neutral card (the
 * rarity stays hidden); it lands on the real item's shadow with a clack and a short drumroll. Then
 * the reveal: light rays spinning behind the item, which pops in with a glow, sparks and a shine
 * sweep in the rarity's colour, with its fanfare; "NEW!" is stamped on a first copy, else how many
 * are owned. `delay` (s) lines it up with the reward rows sliding in.
 */
function DropReveal({ item, list, tier, isNew, count, delay, t }) {
  const [step, setStep] = useState(-1); // roulette step shown (-1: before it starts)
  const [landed, setLanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reel] = useState(() => {
    // a silhouette per step, never the same twice in a row; the last one is the real item
    const pool = list.filter((x) => x && x !== item);
    const out = [];
    for (let i = 0; i < SPIN_GAPS.length - 1; i += 1) {
      let pick = pool[Math.floor(Math.random() * pool.length)] ?? item;
      if (pool.length > 1 && pick === out[i - 1]) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
      out.push(pick);
    }
    return [...out, item];
  });
  useEffect(() => {
    const ids = [];
    const begin = (delay + SPIN_START) * 1000;
    ids.push(setTimeout(() => sfx.reelSpin(SPIN_LAND), begin));
    let at = begin;
    reel.forEach((_, i) => {
      const last = i === reel.length - 1;
      ids.push(setTimeout(() => {
        setStep(i);
        if (last) { setLanded(true); sfx.reelStop(SUSPENSE); } else sfx.reelTick(i / reel.length);
      }, at));
      at += SPIN_GAPS[i] ?? 0;
    });
    ids.push(setTimeout(() => {
      setRevealed(true);
      sfx.loot(tier);
      if (tier !== 'rare') navigator.vibrate?.(tier === 'legendary' ? [40, 60, 90] : 40);
    }, (delay + REVEAL_AT) * 1000));
    return () => ids.forEach(clearTimeout);
  }, [delay, reel, tier]);

  if (!revealed) {
    const shown = reel[Math.max(0, step)];
    return (
      <div className={`result-row drop-reveal spinning ${landed ? 'landed' : ''}`} style={{ '--d': delay }}>
        <div className="drop-stage" aria-hidden="true">
          <span className="drop-glow" />
          <span className="drop-item drop-reel">
            {step >= 0 && <span key={step} className="drop-shadow"><ItemIcon item={shown} size={44} /></span>}
          </span>
        </div>
        <div className="drop-text">
          <span className="drop-tier">{t('result.itemFound')}</span>
          <b className="drop-name drop-unknown">? ? ?</b>
        </div>
      </div>
    );
  }
  // revealed: everything inside restarts its timing from now (--d: 0)
  return (
    <div className={`result-row drop-reveal revealed tier-${tier}`} style={{ '--d': delay }}>
      <div className="drop-body" style={{ '--d': 0 }}>
        <div className="drop-stage" aria-hidden="true">
          <span className="drop-rays" />
          <span className="drop-glow" />
          {Array.from({ length: SPARKS }, (_, i) => (
            <span key={i} className="drop-spark" style={{ '--a': `${(360 / SPARKS) * i + (i % 2) * 12}deg`, '--r': `${38 + (i % 3) * 10}px` }} />
          ))}
          <span className="drop-item"><ItemIcon item={item} size={44} /></span>
        </div>
        <div className="drop-text">
          <span className="drop-tier">{t('result.itemFound')} · {t(`result.tier.${tier}`)}</span>
          <b className="drop-name">{item.name}</b>
          {item.description && <span className="drop-desc">{item.description}</span>}
          {!isNew && count > 1 && <span className="drop-owned">{t('result.owned', { n: count })}</span>}
        </div>
        {isNew && <span className="drop-new">{t('result.new')}</span>}
        <span className="drop-shine" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Echo rarity -> card colours (the drop card's tiers; commons get their own violet). */
const ECHO_CARD_TIER = { common: 'echo', rare: 'rare', epic: 'epic', legendary: 'legendary' };

/** An echo a boss revealed: a card like the item drop's, with the echo's portrait and rarity. */
function EchoReveal({ id, delay, t }) {
  const echo = echoDef(id);
  useEffect(() => {
    const at = setTimeout(() => sfx.loot(echo?.rarity === 'legendary' ? 'legendary' : 'epic'), (delay + 0.15) * 1000);
    return () => clearTimeout(at);
  }, [delay, echo]);
  if (!echo) return null;
  return (
    <div className={`result-row drop-reveal revealed echo-reveal tier-${ECHO_CARD_TIER[echo.rarity] ?? 'echo'}`} style={{ '--d': delay }}>
      <div className="drop-body">
        <div className="drop-stage" aria-hidden="true">
          <span className="drop-rays" />
          <span className="drop-glow" />
          {Array.from({ length: SPARKS }, (_, i) => (
            <span key={i} className="drop-spark" style={{ '--a': `${(360 / SPARKS) * i + (i % 2) * 12}deg`, '--r': `${38 + (i % 3) * 10}px` }} />
          ))}
          <span className="drop-item"><EchoSpirit echo={echo} size={46} /></span>
        </div>
        <div className="drop-text">
          <span className="drop-tier">{t('result.echoFound')} · {t(`echo.rarity.${echo.rarity}`)}</span>
          <b className="drop-name">{t(`echo.name.${id}`)}</b>
          <span className="drop-desc">{t('result.echoEquip')}</span>
        </div>
        <span className="drop-new">{t('result.new')}</span>
        <span className="drop-shine" aria-hidden="true" />
      </div>
    </div>
  );
}

/** A relic a boss dropped (after its full-screen RelicDiscovery): a card like the echo's, in eldritch green. */
function RelicReveal({ id, delay, t }) {
  return (
    <div className="result-row drop-reveal revealed relic-reveal tier-relic" style={{ '--d': delay }}>
      <div className="drop-body">
        <div className="drop-stage" aria-hidden="true">
          <span className="drop-rays" />
          <span className="drop-glow" />
          {Array.from({ length: SPARKS }, (_, i) => (
            <span key={i} className="drop-spark" style={{ '--a': `${(360 / SPARKS) * i + (i % 2) * 12}deg`, '--r': `${38 + (i % 3) * 10}px` }} />
          ))}
          <span className="drop-item"><RelicSprite id={id} size={46} /></span>
        </div>
        <div className="drop-text">
          <span className="drop-tier">{t('relic.found')}</span>
          <b className="drop-name">{t(`relic.name.${id}`)}</b>
          <span className="drop-desc">{t('relic.foundNote')}</span>
        </div>
        <span className="drop-new">{t('result.new')}</span>
        <span className="drop-shine" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Catalog list of a result's dropped item (weapons / armors / accessories), or null. */
const dropListOf = (result) => (result?.drop ? [data.catalog.weapons, data.catalog.armors, data.catalog.accessories][result.drop.type] : null);
/** Rarity of a result's dropped item (dropTier), or null without a drop. */
function dropTierOf(result) {
  const list = dropListOf(result);
  const item = list?.[result.drop.itemId];
  return item ? dropTier(item, result.drop.type, list) : null;
}

/** After a battle: what was won (or lost) and the BP left; any tap goes back to the map. */
export default function ResultScreen() {
  const t = useT();
  const result = useGame((s) => s.result);
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const leave = useGame((s) => s.leaveResult);
  // a relic drop plays its full-screen discovery first; the rewards come in after it
  const [relicSeen, setRelicSeen] = useState(() => !(result?.won && result.relic));
  // taps only leave once everything has been shown
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (result?.won && result.levelsGained > 0) sfx.levelUp();
    // a win plays the victory music (App: 'victory' track); a loss a short sting
    if (result && !result.won) sfx.defeat();
  }, [result]);
  // effects run after render, so the rows are in the DOM: wait for the last one to land (and for
  // the loot reveal, the last row, to spin and play out; DropReveal plays its own sounds)
  useEffect(() => {
    if (!result || !relicSeen) return undefined;
    const rows = document.querySelectorAll('.result-row').length;
    const last = rows ? ROW_DELAY + (rows - 1) * ROW_STEP : 0;
    const tier = dropTierOf(result);
    const ms = tier
      ? (last + REVEAL_AT + DROP_HOLD[tier]) * 1000
      : (rows ? last + ROW_ANIM : 0.35) * 1000 + 150;
    const id = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(id);
  }, [result, relicSeen]);
  if (!result || !run) return null;
  const bp = battlePointsLeft(run);
  const dropList = dropListOf(result);
  const dropItem = dropList ? dropList[result.drop.itemId] : null;
  const tier = dropTierOf(result);
  const next = expForLevel(run.level);

  const rows = [];
  if (result.won) {
    rows.push({ key: 'gold', icon: <PixelIcon name="coins" size={22} />, label: t('result.gold'), value: `+${fmtShort(result.gold)}`, note: `→ ${fmtShort(run.gold)}` });
    rows.push({ key: 'exp', icon: <PixelIcon name="star" size={22} />, label: t('result.exp'), value: `+${fmtShort(result.exp)}`, note: t('result.toNext', { exp: fmtShort(run.exp), next: fmtShort(next) }) });
    if (result.levelsGained > 0) {
      rows.push({ key: 'lv', hl: true, icon: <PixelIcon name={LEVEL_ICON.name} colors={LEVEL_ICON.colors} size={22} />, label: t('result.levelUp'), value: `LV ${fmtFull(run.level)}`, note: `+${fmtFull(result.levelsGained)} · ${t('result.statPoints', { n: fmtFull(result.statPointsGained) })}` });
    }
    if (isMapBossId(result.bossId)) rows.push({ key: 'boss', hl: true, icon: <PixelIcon name="skull" size={22} />, label: t('result.bossDefeated'), value: t('result.bpBonus', { n: result.bpBonus }) });
    if (result.creature) {
      const c = farmDef(result.creature);
      const cost = Object.entries(c.cost).map(([id, n]) => `${n} ${t(`farm.item.${id}`)}`).join(', ');
      rows.push({ key: 'creature', hl: true, icon: <Creature sprite={`stable:${c.id}`} size={26} />, label: t('result.creatureFound'), value: t(`farm.cr.${c.id}`), note: t('result.creatureAdopt', { cost }) });
    }
    if (result.talentPoints > 0) rows.push({ key: 'tp', hl: true, icon: <PixelIcon name="slimeKing" size={22} />, label: t('result.talentPoints'), value: `TP ${result.tpLevel}`, note: t('result.talentHint') });
    if (result.echoXp) rows.push({ key: 'echoXp', hl: result.echoXp.levelUp, icon: <PixelIcon name="orb" size={22} />, label: t('echo.mastery'), value: `${t(`echo.name.${result.echoXp.id}`)} +${result.echoXp.amount} XP`, note: result.echoXp.levelUp ? t('echo.masteryUp', { n: result.echoXp.level }) : t('echo.masteryLv', { n: result.echoXp.level }) });
    if (result.shards) rows.push({ key: 'shards', hl: true, icon: <PixelIcon name="abyssEye" size={22} />, label: t('result.shards'), value: `+${result.shards} ${t('lb.shards')}`, note: t('result.shardsNote') });
    if (result.emblems) rows.push({ key: 'emblems', hl: true, icon: <PixelIcon name="swords" size={22} />, label: t('emblem.found'), value: `+${result.emblems} ${t('emblem.name')}`, note: t('emblem.foundNote') });
    if (result.passiveShards) rows.push({ key: 'passiveShards', hl: true, icon: <PixelIcon name="star" size={22} />, label: t('result.passiveShards'), value: `+${result.passiveShards} ${t('ps.shards')}`, note: t('result.passiveShardsNote') });
    if (result.abilityLevelUp) rows.push({ key: 'ability', hl: true, icon: <PixelIcon name="hero" size={22} />, label: t('result.baseAbility'), value: t('result.abilityUp') });
    if (result.teleport) rows.push({ key: 'tele', icon: <PixelIcon name="map" size={22} />, label: t('result.pathOpens'), value: result.teleport.returned ? t('result.back') : result.teleport.room ? t('result.room') : t('result.newLand') });
    if (result.lastBoss) rows.push({ key: 'last', hl: true, icon: <PixelIcon name="star" size={22} />, label: '★', value: t('result.finalBoss') });
    // a relic and an echo a boss revealed, then the item drop: the climax, each as its own card
    if (result.relic) rows.push({ key: 'relic', relicReveal: true });
    if (result.echo) rows.push({ key: 'echo', echoReveal: true });
    if (dropItem) rows.push({ key: 'drop', reveal: true });
  }

  return (
    <div
      className={`screen result hero-screen wood-screen ${result.won ? 'won' : 'lost'} ${tier && relicSeen ? `has-drop drop-${tier}` : ''}`}
      style={tier && relicSeen ? { '--d': ROW_DELAY + (rows.length - 1) * ROW_STEP + REVEAL_AT } : undefined}
      onClick={() => { if (ready) leave(); }}
    >
      <WoodBackdrop />
      {!relicSeen && <RelicDiscovery id={result.relic} state={ownedRelic(profile, result.relic)} t={t} onDone={() => setRelicSeen(true)} />}
      {relicSeen && (
      <div className="result-card">
        <h1 className="result-title">
          <PixelIcon name={result.won ? 'swords' : 'skull'} size={34} />
          {result.won ? t('result.victory') : t('result.defeat')}
        </h1>
        {result.won && result.baseLevelUp && <BaseLevelBanner from={result.baseLevelUp.from} to={result.baseLevelUp.to} t={t} />}
        {result.won ? (
          <div className="result-rows">
            {rows.map(({ key, reveal, echoReveal, relicReveal, ...r }, i) => {
              if (relicReveal) return <RelicReveal key={key} id={result.relic} delay={ROW_DELAY + i * ROW_STEP} t={t} />;
              if (echoReveal) return <EchoReveal key={key} id={result.echo} delay={ROW_DELAY + i * ROW_STEP} t={t} />;
              if (reveal) return <DropReveal key={key} item={dropItem} list={dropList} tier={tier} isNew={!!result.drop.isNew} count={result.drop.count ?? 1} delay={ROW_DELAY + i * ROW_STEP} t={t} />;
              return <Row key={key} i={i} {...r} />;
            })}
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
      )}
    </div>
  );
}
