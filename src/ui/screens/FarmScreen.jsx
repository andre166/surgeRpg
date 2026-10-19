import React, { useEffect, useState } from 'react';
import { useGame, SCREEN, data } from '../stores/gameStore.js';
import FarmIcon from '../components/FarmIcon.jsx';
import { effectText, usableOnMap } from '../components/farmText.js';
import CropSprite from '../components/CropSprite.jsx';
import {
  CROPS, MATERIALS, POTIONS, CAULDRON, ELIXIRS, MINE_MAX_LEVEL, farmSeedCost, farmBrewFee, potionRechargeLeft, farmLabs, labSlotsOwned, freeLabSlot, creatureWage, onStrike, WAGE_PERIOD, itemCount, canAfford, plotState, mineRates, mineStored,
  mineUpgradeCost, canUpgradeMine, mineCollectCost, labState, farmDef, cropTimeMult, mineSpeed, labTimeMult,
  CREATURES, STABLE_SLOTS, adoptStatus, creatureNextIn, plotsOwned, plotBuyStatus, PLOT_PRICES,
  AUTO_REPLANT_MIN_BASE, autoReplantUnlocked, HARVEST_ALL_MIN_BASE, harvestAllUnlocked,
  UNLOCK_PRICES, ownedCount, isOwned, unlockBuyStatus,
} from '../../core/farm.js';
import { bossLevel } from '../../core/progression/characters.js';
import { slimeKingWins } from '../../core/bestiary.js';
import { fmtShort } from '../components/format.js';
import { Creature } from '../components/Sprite.jsx';
import { useT } from '../i18n/index.js';
import PixelIcon from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';

const TABS = ['garden', 'mine', 'lab', 'stable', 'store'];
const TAB_ICONS = { garden: 'sprout', mine: 'pickaxe', lab: 'flask', stable: 'paw', store: 'chest' };

function fmtTime(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function Cost({ cost, farm, t }) {
  return (
    <span className="farm-cost">
      {Object.entries(cost).map(([id, n]) => (
        <span key={id} className={itemCount(farm, id) >= n ? '' : 'short'} title={t(`farm.item.${id}`)}>
          <FarmIcon id={id} size={16} /> {itemCount(farm, id)}/{n}
        </span>
      ))}
    </span>
  );
}

function creatureText(t, c) {
  if (c.role === 'harvester') return t('farm.crx.harvester', { n: c.plots, time: fmtTime(c.every) });
  if (c.role === 'brewer') return t('farm.crx.brewer', { potion: t(`farm.item.${c.potion}`), time: fmtTime(c.every) });
  const [k, v] = Object.entries(c.passive)[0];
  const pct = k === 'mineSpeed' ? Math.round((v - 1) * 100) : Math.round((1 - v) * 100);
  return t(`farm.crx.${k}`, { n: pct });
}

/** Where each creature works: the farm areas its effect touches. */
function creatureArea(c) {
  if (c.role === 'harvester') return 'garden';
  if (c.role === 'brewer') return 'cauldron';
  if (c.passive?.cropTime) return 'garden';
  if (c.passive?.mineSpeed) return 'mine';
  if (c.passive?.labTime) return 'lab';
  return null;
}

/** Avatar stack of the stable creatures working in one farm area (hover for details). */
/** A creature's wage: gold paid from the run every WAGE_PERIOD. */
function Wage({ id, ctx, t }) {
  const wage = creatureWage(id, ctx);
  return (
    <span className={`small plot-price creature-wage ${ctx.gold < wage ? 'short' : ''}`} title={t('farm.wageHint')}>
      <PixelIcon name="coins" size={14} />{t('farm.wage', { gold: fmtShort(wage), time: fmtTime(WAGE_PERIOD) })}
    </span>
  );
}

function CreatureStack({ farm, area, now, t }) {
  const working = (farm.stable ?? []).map((st) => ({ st, c: farmDef(st.creature) })).filter(({ c }) => c && creatureArea(c) === area);
  if (!working.length) return null;
  return (
    <div className="avatar-stack" aria-label={t('farm.stable')}>
      {working.map(({ st, c }) => {
        const next = creatureNextIn(st, now);
        const label = `${t(`farm.cr.${c.id}`)}: ${creatureText(t, c)}`;
        return (
          <span key={c.id} className={`avatar role-${c.role}`} tabIndex={0} aria-label={label}>
            <Creature sprite={`stable:${c.id}`} size={30} />
            {next != null && <span className="avatar-ring" style={{ '--p': `${(1 - next / c.every) * 360}deg` }} />}
            <span className="avatar-tip" role="tooltip">
              <span className="avatar-tip-head">
                <Creature sprite={`stable:${c.id}`} size={40} />
                <span>
                  <b>{t(`farm.cr.${c.id}`)}</b>
                  <span className="tag role">{t(`farm.role.${c.role}`)}</span>
                </span>
              </span>
              <span className="avatar-tip-fx">{creatureText(t, c)}</span>
              {next != null && (
                <span className="avatar-tip-next">
                  <span className="bar farm-bar"><span className="fill" style={{ width: `${(1 - next / c.every) * 100}%` }} /></span>
                  <span className="muted">{t('farm.nextAction', { time: fmtTime(next) })}</span>
                </span>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** "Base LV cur/needed", red until the shared base level is reached. */
function UnlockNeed({ price, base, t }) {
  return (
    <span className={`small plot-need ${base >= price.baseLevel ? 'met' : ''}`}>
      {t('farm.plotBaseLevel', { cur: Math.min(base, price.baseLevel), n: price.baseLevel })}
    </span>
  );
}

/** What a plot or unlock needs: the base level, Slime King victories, or both (the last plots). */
function PlotNeed({ price, base, slimes, t }) {
  if (!price.slimeKings) return <UnlockNeed price={price} base={base} t={t} />;
  return (
    <>
      {price.baseLevel > 0 && <UnlockNeed price={price} base={base} t={t} />}
      <span className={`small plot-need ${slimes >= price.slimeKings ? 'met' : ''}`}>
        {t('farm.plotSlimeKings', { cur: Math.min(slimes, price.slimeKings), n: price.slimeKings })}
      </span>
    </>
  );
}

/**
 * A crop / vein / recipe / stall not bought yet (farm.UNLOCK_PRICES): padlock, its name and the base
 * level it needs; the next one in order also gets the buy button with its gold price.
 */
function Locked({ kind, index, farm, base, slimes, gold, onBuy, t, className = 'recipe', icon = null, name = null }) {
  const price = UNLOCK_PRICES[kind][index];
  const next = index === ownedCount(farm, kind);
  const buy = next ? unlockBuyStatus(farm, kind, gold, base, slimes) : 'locked';
  return (
    <div className={`${className} unlock-locked`} aria-label={t('farm.plotLocked')}>
      <span className="plot-lock">{buy === 'ok' || buy === 'gold' ? '🔓' : '🔒'}</span>
      {icon}
      <div className="recipe-body">
        {name && <b>{name}</b>}
        <PlotNeed price={price} base={base} slimes={slimes} t={t} />
      </div>
      {next && (
        <button className={`btn small unlock-buy ${buy === 'ok' ? 'primary' : ''}`} disabled={buy !== 'ok'} onClick={(e) => { e.stopPropagation(); onBuy(kind); }} aria-label={`${t('farm.buyUnlock')} ${fmtShort(price.gold)}`} title={t('farm.buyUnlock')}>
          <span className={`plot-price ${buy === 'gold' ? 'short' : ''}`}><PixelIcon name="coins" size={14} />{fmtShort(price.gold)}</span>
        </button>
      )}
    </div>
  );
}


/** Farm help: how every part of the farm works (the "?" tab). */
const HELP = ['unlocks', 'costs', 'garden', 'mine', 'lab', 'cauldron', 'stable', 'store'];
function FarmHelp({ t, onClose }) {
  return (
    <div className="modal auto-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auto-panel echo-info farm-help" role="dialog" aria-label={t('farm.help.title')}>
        <div className="auto-head">
          <h2><PixelIcon name="info" size={20} />{t('farm.help.title')}</h2>
        </div>
        <ul className="echo-info-list">
          {HELP.map((k) => (
            <li key={k}><b>{t(`farm.help.${k}.title`)}</b> {t(`farm.help.${k}`, { wage: fmtTime(WAGE_PERIOD) })}</li>
          ))}
        </ul>
        <div className="row auto-foot">
          <button className="btn primary" data-escape data-primary onClick={onClose}>{t('common.gotIt')}</button>
        </div>
      </div>
    </div>
  );
}

/** Farm: Corrupted Garden, Abandoned Mine, Laboratory and the Storehouse. */
export default function FarmScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const mapReturn = useGame((s) => s.mapReturnScreen);
  const go = useGame((s) => s.go);
  const backToMap = useGame((s) => s.backToMap);
  const farmDo = useGame((s) => s.farmDo);
  const useItem = useGame((s) => s.useFarmItem);
  const toast = useGame((s) => s.showToast);
  const buyPlot = useGame((s) => s.buyFarmPlot);
  const buyFarmUnlock = useGame((s) => s.buyFarmUnlock);
  const [tab, setTab] = useState('garden');
  const [help, setHelp] = useState(false);
  const [picking, setPicking] = useState(null); // plot index choosing a crop
  const [removing, setRemoving] = useState(null); // plot index asking to confirm removal
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // stable creatures also work in the background on every screen (App.jsx); here they catch up on open and every 5 s
  useEffect(() => {
    farmDo('tick');
    const id = setInterval(() => farmDo('tick'), 5000);
    return () => clearInterval(id);
  }, [farmDo]);
  const [releasing, setReleasing] = useState(null);
  if (!profile?.farm) return null;
  const farm = profile.farm;
  const fromRun = !!(run && mapReturn);
  const cropMult = cropTimeMult(farm);
  const readyPlots = farm.plots.filter((p) => plotState(p, now, cropMult).status === 'ready').length;
  const stored = mineStored(farm.mine, now, mineSpeed(farm), ownedCount(farm, 'veins'));
  const base = bossLevel(profile.bossWins);
  const slimes = slimeKingWins(profile);
  const gold = run?.gold ?? 0;
  const onBuy = (kind) => { if (buyFarmUnlock(kind) === 'ok') toast(t('farm.unlockBought'), 1400); };
  const lockProps = { farm, base, slimes, gold, onBuy, t };
  const wageCtx = { gold, baseLevel: base, slimeWins: slimes };
  const labs = farmLabs(farm);
  const labSlots = labSlotsOwned(farm);
  const labFree = freeLabSlot(farm) >= 0;
  const labReady = labs.some((l) => labState(l, now, labTimeMult(farm)).status === 'ready');
  const badge = { garden: readyPlots, mine: Object.values(stored).some((n) => n > 0) ? '•' : 0, lab: labReady ? '•' : 0, stable: 0, store: 0 };

  return (
    <div className="screen farm hero-screen wood-screen">
      <WoodBackdrop />
      <nav className="hero-tabs farm-tabs" role="tablist">
        {TABS.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`hero-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)} title={t(`farm.tab.${k}`)}>
            <PixelIcon name={TAB_ICONS[k]} size={22} />
            <span className="hero-tab-label">{t(`farm.tabShort.${k}`)}</span>
            {badge[k] ? <span className="hero-tab-dot" aria-label={t('farm.ready')} /> : null}
          </button>
        ))}
        <button className="hero-tab farm-help-tab" onClick={() => setHelp(true)} title={t('farm.help.title')} aria-label={t('farm.help.title')}>
          <PixelIcon name="info" size={22} />
          <span className="hero-tab-label">{t('farm.help.short')}</span>
        </button>
      </nav>
      {help && <FarmHelp t={t} onClose={() => setHelp(false)} />}

      {tab === 'garden' && (
        <section className="panel farm-panel garden">
          <div className="farm-panel-head">
            <h2>{t('farm.garden')}</h2>
            {/* Harvest all on the title line, at the right, compact (golden when something is ready) */}
            {/* unlocks with the base level: until then it is locked and shows what it needs */}
            {harvestAllUnlocked(bossLevel(profile.bossWins)) ? (
              <button className={`btn small harvest-all ${readyPlots ? 'primary' : ''}`} disabled={!readyPlots} onClick={() => farmDo('harvestAll')}>
                <PixelIcon name="sprout" size={18} />{t('farm.harvestAll')}
              </button>
            ) : (
              <button className="btn small harvest-all stats-auto" disabled title={t('farm.harvestAll')}>
                🔒 {t('farm.harvestAll')} <span className="stats-auto-state">{t('farm.needsBase', { n: HARVEST_ALL_MIN_BASE })}</span>
              </button>
            )}
            <div className="row farm-actions">
              <CreatureStack farm={farm} area="garden" now={now} t={t} />
            </div>
          </div>
          <div className="plots">
            {farm.plots.map((p, i) => {
              // plots are bought in order: the first one not owned is the purchase tile, the rest stay locked
              const owned = plotsOwned(farm);
              if (i >= owned) {
                // every plot not bought yet shows a padlock and the base level it needs (current/needed)
                const price = PLOT_PRICES[i];
                const need = <PlotNeed price={price} base={base} slimes={slimes} t={t} />;
                if (i > owned) {
                  return (
                    <div key={i} className="plot plot-locked" aria-label={t('farm.plotLocked')}>
                      <span className="plot-lock">🔒</span>
                      {need}
                    </div>
                  );
                }
                const buy = plotBuyStatus(farm, run?.gold ?? 0, base, slimes);
                return (
                  <button
                    key={i}
                    className={`plot plot-buy ${buy === 'ok' ? 'can-buy' : ''}`}
                    disabled={buy !== 'ok'}
                    onClick={() => { if (buyPlot() === 'ok') toast(t('farm.plotBought'), 1400); }}
                    aria-label={t('farm.buyPlot')}
                    title={t('farm.buyPlot')}
                  >
                    <span className="plot-lock">{buy === 'level' ? '🔒' : '🔓'}</span>
                    {need}
                    {buy !== 'level' && <span className={`small plot-price ${buy === 'gold' ? 'short' : ''}`}><PixelIcon name="coins" size={14} />{fmtShort(price.gold)}</span>}
                  </button>
                );
              }
              const st = plotState(p, now, cropMult);
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  className={`plot ${st.status}`}
                  onClick={() => (st.status === 'empty' ? setPicking(i) : st.status === 'ready' ? farmDo('harvest', i) : null)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }}
                >
                  {st.status !== 'empty' && (
                    removing === i ? (
                      <button className="plot-remove confirm" title={t('farm.removeConfirm')} onClick={(e) => { e.stopPropagation(); farmDo('removePlant', i); setRemoving(null); }}>{t('farm.removeConfirm')}</button>
                    ) : (
                      <button className="plot-remove" title={t('farm.remove')} aria-label={t('farm.remove')} onClick={(e) => { e.stopPropagation(); setRemoving(i); }}>✕</button>
                    )
                  )}
                  {st.status === 'empty' ? (
                    <><CropSprite size={64} /><span className="small muted">{t('farm.plant')}</span></>
                  ) : (
                    <>
                      <CropSprite crop={p.crop} progress={st.progress} ready={st.status === 'ready'} size={64} delay={-(i * 0.37) % 3} />
                      <span className="small">{t(`farm.item.${p.crop}`)}</span>
                      {st.status === 'growing' ? (
                        <><div className="bar farm-bar"><div className="fill" style={{ width: `${st.progress * 100}%` }} /></div><span className="small muted">{fmtTime(st.left)}</span></>
                      ) : <span className="small ready-tag">{t('farm.harvestN', { n: farmDef(p.crop).yield })}</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {/* under the plots, at the right: Auto replant */}
          <div className="farm-garden-foot">
            {/* auto replant unlocks with the base level: until then it shows what it needs */}
            {autoReplantUnlocked(bossLevel(profile.bossWins)) ? (
              <button
                className={`btn small auto-replant stats-auto ${farm.autoReplant ? 'on' : ''}`}
                aria-pressed={!!farm.autoReplant}
                title={t('farm.autoReplantHint')}
                onClick={() => farmDo('setAutoReplant', !farm.autoReplant)}
              >
                ↻ {t('farm.autoReplant')} <span className="stats-auto-state">{farm.autoReplant ? t('common.on') : t('common.off')}</span>
              </button>
            ) : (
              <button className="btn small auto-replant stats-auto" disabled title={t('farm.autoReplantHint')}>
                🔒 {t('farm.autoReplant')} <span className="stats-auto-state">{t('farm.needsBase', { n: AUTO_REPLANT_MIN_BASE })}</span>
              </button>
            )}
          </div>
          {picking != null && (
            <div className="crop-picker">
              <div className="farm-panel-head"><b>{t('farm.choose', { n: picking + 1 })}</b><button className="btn small" onClick={() => setPicking(null)}>✕</button></div>
              <div className="crop-grid">
                {CROPS.map((c, ci) => { const seed = farmSeedCost(farm, c.id, { gold, baseLevel: base, slimeWins: slimes }); return (!isOwned(farm, 'crops', ci) ? (
                  <Locked key={c.id} kind="crops" index={ci} {...lockProps} className="crop-opt" name={t(`farm.item.${c.id}`)} />
                ) : (
                  <button key={c.id} className="crop-opt" disabled={gold < seed} title={!run ? t('farm.seedNoRun') : undefined} onClick={() => { farmDo('plant', picking, c.id); setPicking(null); }}>
                    {/* the ripe crop, as it will look when ready to harvest */}
                    <CropSprite crop={c.id} ready size={52} delay={-(ci * 0.41) % 3} />
                    <b>{t(`farm.item.${c.id}`)}</b>
                    <span className="small muted">{fmtTime(c.time * cropMult)} · {t('farm.yields', { n: c.yield })}</span>
                    <span className={`small plot-price ${gold < seed ? 'short' : ''}`}><PixelIcon name="coins" size={14} />{fmtShort(seed)}</span>
                  </button>
                )); })}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === 'mine' && (() => {
        const rates = mineRates(farm.mine.level, mineSpeed(farm), ownedCount(farm, 'veins'));
        const cost = mineUpgradeCost(farm.mine.level);
        const haul = mineCollectCost(farm, now); // gold of the run to haul what is stored
        const anyStored = Object.values(stored).some((n) => n > 0);
        const collect = (only) => { if (!run) toast(t('farm.haulNoRun'), 1600); else farmDo('collectMine', only); };
        return (
          <section className="panel farm-panel mine">
            <div className="farm-panel-head">
              {/* title with the mine level under it as a subtitle */}
              <div className="farm-title">
                <h2>{t('farm.mine')}</h2>
                <span className="farm-subtitle muted small">{t('farm.level', { n: farm.mine.level, max: MINE_MAX_LEVEL })}</span>
              </div>
              {/* Collect on the title line, at the right, compact (like Harvest all in the garden) */}
              <button className="btn primary small harvest-all" disabled={!anyStored || (run && gold < haul.total)} onClick={() => collect(null)} title={t('farm.haulHint')}>
                <PixelIcon name="pickaxe" size={18} />{t('farm.collect')}
                {anyStored && <span className={`plot-price ${gold < haul.total ? 'short' : ''}`}><PixelIcon name="coins" size={14} />{fmtShort(haul.total)}</span>}
              </button>
              <div className="row farm-actions">
                <CreatureStack farm={farm} area="mine" now={now} t={t} />
              </div>
            </div>
            {/* Dig deeper right under the title, before the veins */}
            {farm.mine.level < MINE_MAX_LEVEL ? (
              <div className="recipe">
                <div className="recipe-body">
                  <b>{t('farm.upgrade', { n: farm.mine.level + 1 })}</b>
                  <span className="small muted">{t('farm.upgradeDesc')}</span>
                  <Cost cost={cost} farm={farm} t={t} />
                </div>
                <button className="btn small" disabled={!canUpgradeMine(farm)} onClick={() => farmDo('upgradeMine')}>{t('farm.upgradeBtn')}</button>
              </div>
            ) : <p className="small good">{t('farm.mineMax')}</p>}
            <div className="mine-rows">
              {MATERIALS.map(({ id, forge }, vi) => {
                const r = rates[id]; // undefined while the vein is not bought
                if (!r) return <Locked key={id} kind="veins" index={vi} {...lockProps} className="mine-row" icon={<FarmIcon id={id} size={34} />} name={t(`farm.item.${id}`)} />;
                const fx = t('farm.forgeFx', { stat: t(`stat.${forge.stat}`), n: Math.round(forge.pct * 100) });
                return (
                  <div key={id} className="mine-row">
                    <FarmIcon id={id} size={34} />
                    <div className="recipe-body">
                      <b>{t(`farm.item.${id}`)} <span className="muted small">· {t('farm.stock', { n: itemCount(farm, id) })} · {fx}</span></b>
                      <div className="bar farm-bar"><div className="fill" style={{ width: `${(stored[id] / r.cap) * 100}%` }} /></div>
                      <span className="small muted">{t('farm.stored', { n: stored[id], cap: r.cap })} · {t('farm.rate', { s: Math.round(r.seconds) })}</span>
                    </div>
                    {stored[id] > 0 && (
                      <button className="btn small unlock-buy" disabled={run && gold < haul[id]} onClick={() => collect(id)} title={t('farm.haulHint')} aria-label={`${t('farm.collect')} ${fmtShort(haul[id])}`}>
                        <span className={`plot-price ${gold < haul[id] ? 'short' : ''}`}><PixelIcon name="coins" size={14} />{fmtShort(haul[id])}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {tab === 'lab' && (
        <div className="farm-cols">
          <section className="panel farm-panel lab">
            <div className="farm-panel-head">
              <h2>{t('farm.lab')}</h2>
              <CreatureStack farm={farm} area="lab" now={now} t={t} />
            </div>
            {/* alembics: the first is free, the others are bought like the stalls */}
            <div className="lab-slots">
              {labs.map((l, i) => {
                if (i >= labSlots) return <Locked key={i} kind="labSlots" index={i - 1} {...lockProps} className="lab-brewing lab-locked" name={t('farm.labSlot', { n: i + 1 })} />;
                if (!l) return <div key={i} className="lab-brewing idle"><span className="small muted">{t('farm.labSlot', { n: i + 1 })} · {t('farm.labIdle')}</span></div>;
                const st = labState(l, now, labTimeMult(farm));
                return (
                  <div key={i} className={`lab-brewing ${st.status}`}>
                    <FarmIcon id={l.elixir} size={40} />
                    <div className="recipe-body">
                      <b>{t(`farm.item.${l.elixir}`)}</b>
                      <div className="bar farm-bar"><div className="fill" style={{ width: `${st.progress * 100}%` }} /></div>
                      <span className="small muted">{st.status === 'ready' ? t('farm.labReady') : fmtTime(st.left)}</span>
                    </div>
                    <button className="btn primary small" disabled={st.status !== 'ready'} onClick={() => farmDo('collectElixir', i)}>{t('farm.collect')}</button>
                  </div>
                );
              })}
            </div>
            {ELIXIRS.map((e, ei) => { const fee = farmBrewFee(farm, e.id, { gold, baseLevel: base, slimeWins: slimes }); return (!isOwned(farm, 'elixirs', ei) ? (
              <Locked key={e.id} kind="elixirs" index={ei} {...lockProps} icon={<FarmIcon id={e.id} size={36} />} name={t(`farm.item.${e.id}`)} />
            ) : (
              <div key={e.id} className="recipe">
                <FarmIcon id={e.id} size={36} />
                <div className="recipe-body">
                  <b>{t(`farm.item.${e.id}`)} <span className="muted small">x{itemCount(farm, e.id)} · {fmtTime(e.time * labTimeMult(farm))}</span></b>
                  <span className="small">{effectText(t, e)}</span>
                  <Cost cost={e.cost} farm={farm} t={t} />
                </div>
                <button className="btn small lab-brew" disabled={!labFree || !canAfford(farm, e.cost) || gold < fee} title={!run ? t('farm.brewNoRun') : undefined} onClick={() => farmDo('startElixir', e.id)}>
                  {t('farm.brew')} <span className={`plot-price ${gold < fee ? 'short' : ''}`}><PixelIcon name="coins" size={14} />{fmtShort(fee)}</span>
                </button>
              </div>
            )); })}
          </section>
          <section className="panel farm-panel cauldron">
            <div className="farm-panel-head">
              <h2>{t('farm.cauldron')}</h2>
              <CreatureStack farm={farm} area="cauldron" now={now} t={t} />
            </div>
            {/* the potions, then the threshold potions (bought on their own: farm.js CAULDRON) */}
            {CAULDRON.map(({ def: p, kind, index: pi }) => { const wait = potionRechargeLeft(farm, p.id, now); return (!isOwned(farm, kind, pi) ? (
              <Locked key={p.id} kind={kind} index={pi} {...lockProps} icon={<FarmIcon id={p.id} size={36} />} name={t(`farm.item.${p.id}`)} />
            ) : (
              <div key={p.id} className="recipe">
                <FarmIcon id={p.id} size={36} />
                <div className="recipe-body">
                  <b>{t(`farm.item.${p.id}`)} <span className="muted small">x{itemCount(farm, p.id)}</span></b>
                  <span className="small">{effectText(t, p)}{p.recharge ? ` · ${t('farm.recharge', { time: fmtTime(p.recharge) })}` : ''}</span>
                  <Cost cost={p.cost} farm={farm} t={t} />
                </div>
                <button className="btn small" disabled={!canAfford(farm, p.cost) || wait > 0} onClick={() => { farmDo('brewPotion', p.id); toast(t('farm.brewed', { name: t(`farm.item.${p.id}`) }), 1200); }}>{wait > 0 ? fmtTime(wait) : t('farm.brew')}</button>
              </div>
            )); })}
          </section>
        </div>
      )}

      {tab === 'stable' && (
        <section className="panel farm-panel stable">
          <h2>{t('farm.stable')} <span className="muted">· {farm.stable.length}/{ownedCount(farm, 'stalls')}</span></h2>
          <div className="stalls">
            {Array.from({ length: STABLE_SLOTS }, (_, i) => {
              const stall = farm.stable[i];
              if (!isOwned(farm, 'stalls', i)) return <Locked key={i} kind="stalls" index={i} {...lockProps} className="stall" />;
              if (!stall) return <div key={i} className="stall empty"><span className="muted small">{t('farm.emptyStall')}</span></div>;
              const c = farmDef(stall.creature);
              const next = creatureNextIn(stall, now);
              return (
                <div key={i} className={`stall role-${c.role} ${onStrike(stall) ? 'striking' : ''}`}>
                  {releasing === i ? (
                    <button className="plot-remove confirm" onClick={() => { farmDo('release', i); setReleasing(null); }}>{t('farm.releaseConfirm')}</button>
                  ) : (
                    <button className="plot-remove" title={t('farm.release')} aria-label={t('farm.release')} onClick={() => setReleasing(i)}>✕</button>
                  )}
                  <Creature sprite={`stable:${c.id}`} size={40} />
                  <div className="stall-body">
                    <b>{t(`farm.cr.${c.id}`)} <span className="tag role">{t(`farm.role.${c.role}`)}</span></b>
                    <span className="small">{creatureText(t, c)}</span>
                    {onStrike(stall)
                      ? <span className="small plot-need">{t('farm.onStrike')}</span>
                      : next != null && <span className="small muted">{t('farm.nextAction', { time: fmtTime(next) })}</span>}
                    <Wage id={c.id} ctx={wageCtx} t={t} />
                  </div>
                </div>
              );
            })}
          </div>
          <h3 className="small muted stable-adopt-title">{t('farm.adopt')}</h3>
          <div className="adopt-grid">
          {CREATURES.map((c) => {
            const st = adoptStatus(farm, c.id, base, slimes);
            if (st === 'unknown') {
              // not dropped yet: a shadow, like the bestiary; the boss is named once it was met
              const boss = data.bossData.mapBosses[c.drop.boss];
              const met = (profile.bestiary?.[`boss#${c.drop.boss}`]?.seen ?? 0) >= 1;
              return (
                <div key={c.id} className="recipe creature-unknown">
                  <Creature sprite={`stable:${c.id}`} size={32} silhouette />
                  <div className="recipe-body">
                    <b>????</b>
                    <span className="small muted">{t('farm.crDrop', { boss: met ? boss.name : '????' })}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={c.id} className="recipe">
                <Creature sprite={`stable:${c.id}`} size={32} />
                <div className="recipe-body">
                  <b>{t(`farm.cr.${c.id}`)} <span className="tag role">{t(`farm.role.${c.role}`)}</span></b>
                  <span className="small">{creatureText(t, c)}</span>
                  <Wage id={c.id} ctx={wageCtx} t={t} />
                  {st === 'level' && <PlotNeed price={c.need} base={base} slimes={slimes} t={t} />}
                  <Cost cost={c.cost} farm={farm} t={t} />
                </div>
                <button className="btn small" disabled={st !== 'ok'} onClick={() => { farmDo('adopt', c.id); toast(t('farm.adopted', { name: t(`farm.cr.${c.id}`) }), 1400); }}>
                  {st === 'owned' ? t('farm.inStable') : st === 'full' ? t('farm.stableFull') : st === 'level' ? `🔒 ${t('farm.adoptBtn')}` : t('farm.adoptBtn')}
                </button>
              </div>
            );
          })}
          </div>
        </section>
      )}

      {tab === 'store' && (
        <section className="panel farm-panel store">
          <h2>{t('farm.store')}</h2>
          {[['farm.group.crops', CROPS], ['farm.group.materials', MATERIALS], ['farm.group.potions', POTIONS], ['farm.group.elixirs', ELIXIRS]].map(([label, list]) => (
            <div key={label} className="store-group">
              <h3 className="small muted">{t(label)}</h3>
              <div className="store-grid">
                {list.map((d) => {
                  const n = itemCount(farm, d.id);
                  const usable = n > 0 && run && usableOnMap(d);
                  return (
                    <div key={d.id} className={`store-item ${n ? '' : 'empty'}`}>
                      <FarmIcon id={d.id} size={22} />
                      <div className="store-item-body">
                        <span className="store-item-name">{t(`farm.item.${d.id}`)}</span>
                        {(d.effect || d.buff) && <span className="store-item-fx">{effectText(t, d)}{d.effect?.kind === 'battleHeal' && n > 0 ? ` · ${t('farm.inBattle')}` : ''}</span>}
                      </div>
                      <b className="store-item-count">x{n}</b>
                      {usable && <button className="btn tiny" onClick={() => { useItem(d.id); toast(t('farm.used', { name: t(`farm.item.${d.id}`) }), 1200); }}>{t('farm.use')}</button>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {run?.buffs?.length > 0 && (
            <div className="store-group">
              <h3 className="small muted">{t('farm.activeBuffs')}</h3>
              {run.buffs.map((b) => <p key={b.id} className="small"><b>{t(`farm.item.${b.id}`)}</b> · {t('farm.fx.battles', { n: b.battlesLeft })}</p>)}
            </div>
          )}
          {!run && <p className="small muted">{t('farm.useInRun')}</p>}
        </section>
      )}
      <footer className="hero-foot">
        <div className="row">
          <button className="btn" data-escape onClick={() => (fromRun ? backToMap() : go(SCREEN.TITLE))}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}
