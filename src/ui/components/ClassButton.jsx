import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../stores/gameStore.js';
import { fmtFull, fmtShort } from '../components/format.js';
import { heroClass, classChildren, classLine, classAncestor, classPathOf, runClassNode, canPromoteClass, nextClassOptions, autoClassBranch, AUTO_CLASS_MIN_BASE, classResetCost, classResetStatus, subclassOwned, subclassIndex, STAT_GROWTH, classGrowth, accountProgress } from '../../core/progression/classes.js';
import { subclassKind } from '../../core/progression/unlocks.js';
import AccountUnlock from './AccountUnlock.jsx';
import { bossLevel } from '../../core/progression/characters.js';
import { useT } from '../i18n/index.js';
import PixelIcon from './PixelIcon.jsx';

const CLASS_ICONS = { warrior: 'warrior', mage: 'mage', thief: 'thief' };

const pctLabel = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;

/** Passive of a class node, written from its modifiers (so the text always matches the effect). */
export function classPassiveText(t, node, account = null) {
  const m = node?.mods ?? {};
  const parts = [];
  // a stat growing with the player's progress (fighter / adventurer lines): each source, then what it gives now
  const stat = m.growth ? t(`stat.${m.growth.stat}`) : '';
  for (const src of m.growth?.sources ?? []) {
    const g = STAT_GROWTH[src];
    parts.push(t(`class.mod.grow.${src}`, { n: +(g.pct * 100).toFixed(2), per: g.per, max: Math.round(g.max * 100), stat }));
  }
  if (m.growth?.cap) parts.push(t('class.mod.growCap', { max: +(m.growth.cap * 100).toFixed(1), stat }));
  if (m.growth && account) parts.push(t('class.mod.growNow', { n: +(classGrowth(node, account).pct * 100).toFixed(1), stat }));
  if (m.critDamage) parts.push(t('class.mod.critDamage', { n: Math.round(m.critDamage * 100) }));
  if (m.critRate) parts.push(t('class.mod.critRate', { n: Math.round(m.critRate * 100) }));
  if (m.combo) parts.push(t('class.mod.combo', { n: Math.round(m.combo * 100) }));
  if (m.exp) parts.push(t('class.mod.exp', { n: Math.round(m.exp * 100) }));
  if (m.forcedCrit) parts.push(m.forcedCrit === 1 ? t('class.mod.forcedCrit1') : t('class.mod.forcedCritN', { n: m.forcedCrit }));
  if (m.drain) parts.push(t('class.mod.drain'));
  else if (m.drainSmall) parts.push(t('class.mod.drainSmall'));
  if (m.deathGuard) parts.push(t('class.mod.deathGuard', { n: +(m.deathGuard * 100).toFixed(1) }));
  if (m.bp) parts.push(t('class.mod.bp', { n: m.bp }));
  const text = parts.join(', ');
  return text ? text[0].toUpperCase() + text.slice(1) + '.' : '';
}

/**
 * State of a node for the run: past (reached, before the current one), current, option (a next
 * promotion), future (further down the current line), closed (on a path not taken).
 */
function nodeState(n, run, cur, path) {
  if (n.id === cur.id) return 'current';
  const picked = [heroClass(run.classId).root.id, ...path];
  if (picked.includes(n.id)) return 'past';
  if (n.parent === cur.id) return 'option';
  if (classAncestor(cur.id, n)) return 'future';
  return 'closed';
}

/**
 * Map HUD button labelled with the current class (icon and "Class" in the map dock, or just the
 * icon with `iconOnly`); glows when a promotion is available and opens the class tree as a flow:
 * the base class at the top, its three subclasses (one is chosen at LV 200), and under each
 * its line of specialisations evolved in order (LV 1000, 2000, 5000); the path taken highlighted. Tapping a class shows it; a next choice can be
 * promoted into from there.
 */
export default function ClassButton({ run, inDock = false, iconOnly = false }) {
  const t = useT();
  const promote = useGame((s) => s.promoteClass);
  const toast = useGame((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const doReset = useGame((s) => s.resetClass);
  const autoBranch = useGame((s) => autoClassBranch(s.profile, run.classId));
  const profile = useGame((s) => s.profile);
  const baseLevel = useGame((s) => bossLevel(s.profile?.bossWins ?? {}));
  const autoUnlocked = baseLevel >= AUTO_CLASS_MIN_BASE;
  const tree = heroClass(run.classId);
  if (!tree) return null;
  const path = classPathOf(run);
  const current = runClassNode(run);
  const options = nextClassOptions(run);
  // a promotion is ready when the level allows it and at least one choice is bought (subclasses)
  const ready = canPromoteClass(run) && options.some((o) => subclassOwned(profile, o.id));
  const selected = (sel && tree.node(sel)) || (ready ? options[0] : current);

  function onPromote(node) {
    if (!promote(node.id)) return;
    toast(t('class.promoted', { name: t(`class.${node.id}`) }));
    setSel(null);
  }

  const card = (n) => {
    const state = nodeState(n, run, current, path);
    const owned = subclassOwned(profile, n.id);
    const canPick = state === 'option' && owned && run.level >= n.minLevel;
    return (
      <button
        key={n.id}
        className={`cf-node tier-${n.tier} ${state} ${canPick ? 'ready' : ''} ${selected?.id === n.id ? 'selected' : ''}`}
        onClick={() => setSel(n.id)}
        aria-pressed={selected?.id === n.id}
      >
        <b>{!owned && '🔒 '}{t(`class.${n.id}`)}</b>
        <span className="cf-lv">{state === 'current' ? t('class.current') : state === 'past' ? '✓' : `LV ${fmtFull(n.minLevel)}`}</span>
      </button>
    );
  };

  const selState = selected ? nodeState(selected, run, current, path) : null;

  return (
    <div className={`class-wrap ${inDock ? 'in-dock' : ''} ${iconOnly ? 'icon-only' : ''}`}>
      <button
        className={inDock || iconOnly ? `dock-btn dock-class ${iconOnly ? 'dock-icon-only hud-big-icon' : ''} ${ready ? 'can-promote' : ''}` : `btn small hud-btn class-btn ${ready ? 'can-promote' : ''}`}
        onClick={() => setOpen(!open)}
        title={`${t(`class.${current.id}`)} · ${ready ? t('class.ready') : t('class.panel')}`}
        aria-label={t(`class.${current.id}`)}
      >
        {iconOnly ? (
          <span className="dock-icon"><PixelIcon name={CLASS_ICONS[run.classId] ?? 'helmet'} size={40} /></span>
        ) : inDock ? (
          <>
            <span className="dock-icon"><PixelIcon name={CLASS_ICONS[run.classId] ?? 'helmet'} size={40} /></span>
            <span className="dock-label">{t('class.panel')}</span>
          </>
        ) : (
          <>
            <PixelIcon name={CLASS_ICONS[run.classId] ?? 'helmet'} />
            {t(`class.${current.id}`)}
          </>
        )}
        {ready && <span className="promo-badge" aria-label={t('class.ready')}>▲</span>}
      </button>
      {open && (
        <div className="class-menu panel wood-pop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="cheat-head">
            <b>{t('class.tree')}</b>
            <button className="btn small" onClick={() => setOpen(false)} aria-label={t('common.back')}>✕</button>
          </div>
          {autoOpen && <AutoClassModal run={run} tree={tree} saved={autoBranch} onClose={() => setAutoOpen(false)} />}
          {/* the flow: base class → 3 subclasses → 3 specialisations each */}
          <div className="class-flow">
            <div className="cf-root">{card(tree.root)}</div>
            <div className="cf-branches">
              {classChildren(tree.root.id).map((sub) => (
                <div key={sub.id} className={`cf-col ${nodeState(sub, run, current, path)}`}>
                  {card(sub)}
                  <div className="cf-leaves">{classLine(sub.id).map(card)}</div>
                </div>
              ))}
            </div>
          </div>
          {selected && (
            <div className={`cf-detail ${selState}`}>
              <div className="cf-detail-head">
                <b>{t(`class.${selected.id}`)}</b>
                <span className="small">{t(`class.state.${selState === 'current' ? 'past' : selState}`)} · LV {fmtFull(selected.minLevel)}</span>
              </div>
              <span className="class-stats">
                {Object.entries(selected.pct).filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className={v > 0 ? 'up' : 'down'}>{t(`stat.${k}`)} {pctLabel(v)}</span>
                ))}
              </span>
              {classPassiveText(t, selected, accountProgress(profile, run)) && <span className="class-passive"><b>{t('class.passiveLabel')}</b>: {classPassiveText(t, selected, accountProgress(profile, run))}</span>}
              {/* a subclass not bought yet: its unlock (base level / Slime Kings + gold) instead of promoting */}
              {!subclassOwned(profile, selected.id) && selState !== 'current' && selState !== 'past' && (
                <AccountUnlock kind={subclassKind(run.classId)} index={subclassIndex(selected.id)} />
              )}
              {selState === 'option' && subclassOwned(profile, selected.id) && (
                <button className={`btn ${run.level >= selected.minLevel ? 'primary' : ''}`} disabled={run.level < selected.minLevel} onClick={() => onPromote(selected)}>
                  {run.level >= selected.minLevel
                    ? t('class.promote', { name: t(`class.${selected.id}`) })
                    : `${t('class.promote', { name: t(`class.${selected.id}`) })} · ${t('class.requires', { level: fmtFull(selected.minLevel) })}`}
                </button>
              )}
            </div>
          )}
          {/* auto promotion: pick a branch to follow by itself (base level 16+) */}
          <div className="class-auto-row">
            {/* reset back to the base class for gold (grows with the level); asks once more before paying */}
            {classResetStatus(run) !== 'base' && (
              <button
                className={`btn small class-reset-btn ${confirmReset ? 'danger' : ''}`}
                disabled={classResetStatus(run) === 'no-gold'}
                title={t('class.resetHint')}
                onClick={() => {
                  if (!confirmReset) { setConfirmReset(true); return; }
                  if (doReset()) { toast(t('class.resetDone')); setSel(null); }
                  setConfirmReset(false);
                }}
                onBlur={() => setConfirmReset(false)}
              >
                {confirmReset ? t('class.resetConfirm') : t('class.reset')} <span className="stats-auto-state">{fmtShort(classResetCost(run.level))} G</span>
              </button>
            )}
            <button
              className={`btn small class-auto-btn ${autoBranch && autoUnlocked ? 'on' : ''}`}
              disabled={!autoUnlocked}
              onClick={() => setAutoOpen(true)}
              title={autoUnlocked ? t('class.autoTitle') : t('class.autoLocked', { n: AUTO_CLASS_MIN_BASE, cur: baseLevel })}
            >
              {autoUnlocked ? '↻' : '🔒'} {t('class.auto')} <span className="stats-auto-state">{!autoUnlocked ? `${baseLevel}/${AUTO_CLASS_MIN_BASE}` : autoBranch ? t(`class.${autoBranch}`) : t('common.off')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Auto promotion settings: pick the subclass branch to follow (or off) and save; from then on
 * the class evolves by itself into that subclass and up its line as soon as the level allows.
 */
function AutoClassModal({ run, tree, saved, onClose }) {
  const t = useT();
  const save = useGame((s) => s.setAutoClass);
  const [pick, setPick] = useState(saved);
  const path = classPathOf(run);
  const otherBranch = pick && path.length > 0 && path[0] !== pick;
  // rendered on the body: inside the map HUD a fixed overlay would be bound to the panel
  return createPortal(
    <div className="modal auto-modal class-auto-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); e.stopPropagation(); }}>
      <div className="auto-panel" role="dialog" aria-label={t('class.autoTitle')}>
        <div className="auto-head"><h2>{t('class.autoTitle')}</h2></div>
        <p className="auto-help">{t('class.autoHelp')}</p>
        <div className="class-auto-opts" role="radiogroup">
          {[null, ...classChildren(tree.root.id)].map((n) => (
            <button
              key={n?.id ?? 'off'}
              role="radio"
              aria-checked={pick === (n?.id ?? null)}
              className={`class-auto-opt ${pick === (n?.id ?? null) ? 'active' : ''}`}
              onClick={() => setPick(n?.id ?? null)}
            >
              <b>{n ? t(`class.${n.id}`) : t('class.autoOff')}</b>
              {n && <span className="small">{classLine(n.id).map((x) => t(`class.${x.id}`)).join(' → ')}</span>}
            </button>
          ))}
        </div>
        {otherBranch && <p className="auto-warn">{t('class.autoOtherBranch')}</p>}
        <div className="row auto-foot">
          <button className="btn" data-escape onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn primary" data-primary onClick={() => { save(run.classId, pick); onClose(); }}>{t('alloc.save')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
