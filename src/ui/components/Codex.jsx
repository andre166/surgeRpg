import React from 'react';
import { createPortal } from 'react-dom';
import { useGame, data } from '../stores/gameStore.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';
import { bossLevel, baseAbilityLevel, BASE_LEVEL_MAX, ABILITY_BOSSES, ABYSS_UNLOCK_BASE } from '../../core/progression/characters.js';
import { tpLevel, TP_MAX, TALENT_MILESTONES, MILESTONE_BONUS } from '../../core/progression/talents.js';
import { ACCOUNT_UNLOCK_PRICES } from '../../core/progression/unlocks.js';
import { emblemCount, EMBLEM_DROP_CHANCE } from '../../core/progression/classEmblems.js';
import { LB_UNLOCK_BOSS, LB_DROP_CHANCE, LB_COSTS, LB_MAX_EXTRA, LB_MAX_EXTRA_PER_STAT, LB_MAX_PER_STAT, lbUnlocked } from '../../core/progression/limitBreak.js';
import {
  passiveShardCount, PASSIVE_REROLL_COST, PASSIVE_ROLL_MIN, PASSIVE_ROLL_MAX, PASSIVE_SHARD_DROP, PASSIVE_SHARD_DROP_LAST,
} from '../../core/progression/passiveShards.js';
import { heroPassive } from '../../core/attributes/characterPower.js';

const pct = (x) => `${Math.round(x * 1000) / 10}%`;
const bossName = (id) => data.bossData.mapBosses?.[id]?.name ?? `#${id}`;

/**
 * Codex (map menu): how the account systems work (base level, base ability, hero arrows, TP, classes,
 * Limit Break, passives, echoes), each with the player's current value. The numbers come from the
 * rules themselves, so the text follows any rebalance.
 */
export default function Codex({ onClose }) {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const wins = profile?.bossWins ?? {};
  const classes = ACCOUNT_UNLOCK_PRICES.classes;
  const sections = [
    {
      key: 'base', icon: 'stats', title: t('codex.base'), value: `${bossLevel(wins)}/${BASE_LEVEL_MAX}`,
      body: [t('codex.baseText', { max: BASE_LEVEL_MAX, abyss: ABYSS_UNLOCK_BASE })],
    },
    {
      key: 'ability', icon: 'helmet', title: t('char.baseAbility'), value: `${baseAbilityLevel(wins)}/${ABILITY_BOSSES.length * 2}`,
      body: [t('codex.abilityText', { n: ABILITY_BOSSES.length, max: ABILITY_BOSSES.length * 2 })],
    },
    { key: 'arrows', icon: 'heart', title: t('char.heroBonus'), body: [t('codex.arrowsText')] },
    {
      key: 'tp', icon: 'slimeKing', title: t('codex.tp'), value: `${tpLevel(profile)}/${TP_MAX}`,
      body: [t('tal.howTo', { max: TP_MAX, pct: pct(MILESTONE_BONUS), milestones: TALENT_MILESTONES.join(', ') })],
    },
    {
      key: 'classes', icon: 'swords', title: t('codex.classes'), value: `${emblemCount(profile)} ${t('emblem.name')}`,
      body: [t('codex.classesText', {
        b2: classes[1].baseLevel, e2: classes[1].emblems, b3: classes[2].baseLevel, e3: classes[2].emblems, chance: pct(EMBLEM_DROP_CHANCE),
      })],
    },
    {
      key: 'lb', icon: 'abyssEye', title: t('lb.title'), value: lbUnlocked(profile) ? `${profile.limitBreak?.shards ?? 0} ${t('lb.shards')}` : '🔒',
      body: [t('codex.lbText', {
        boss: bossName(LB_UNLOCK_BOSS), chance: pct(LB_DROP_CHANCE), extra: LB_MAX_EXTRA, perStat: LB_MAX_EXTRA_PER_STAT, cap: LB_MAX_PER_STAT, costs: LB_COSTS.join(' / '),
      })],
    },
    {
      key: 'passive', icon: 'star', title: t('codex.passive'), value: lbUnlocked(profile) ? `${passiveShardCount(profile)} ${t('ps.shards')}` : '🔒',
      body: [t('codex.passiveText', {
        base: pct(heroPassive(0)?.pct ?? 0), cost: PASSIVE_REROLL_COST, min: pct(PASSIVE_ROLL_MIN), max: pct(PASSIVE_ROLL_MAX), drop: PASSIVE_SHARD_DROP, last: PASSIVE_SHARD_DROP_LAST,
      })],
    },
    { key: 'echoes', icon: 'orb', title: t('echo.title'), body: [t('echo.ruleAccount'), t('echo.ruleObtain')] },
  ];
  // portal: the map dock / menu around it would trap a fixed overlay (it rendered off-centre)
  return createPortal(
    <div className="modal auto-modal class-auto-modal codex-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); e.stopPropagation(); }}>
      <div className="auto-panel codex-panel" role="dialog" aria-label={t('codex.title')}>
        <div className="auto-head">
          <h2><PixelIcon name="redBook" size={20} />{t('codex.title')}</h2>
        </div>
        <div className="codex-list">
          {sections.map((sec) => (
            <section key={sec.key} className="codex-section">
              <h3>
                <PixelIcon name={sec.icon} size={16} />
                <span>{sec.title}</span>
                {sec.value != null && <b className="codex-value">{sec.value}</b>}
              </h3>
              {sec.body.map((p, i) => <p key={i}>{p}</p>)}
            </section>
          ))}
        </div>
        <div className="row auto-foot">
          <button className="btn primary" data-escape data-primary onClick={onClose}>{t('common.gotIt')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
