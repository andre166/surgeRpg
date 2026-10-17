import React from 'react';
import { useGame, SCREEN } from '../stores/gameStore.js';
import { bridge } from '../../platform/desktop/bridge.js';
import { sfx } from '../../game/systems/audio.js';
import { useT, useLang, LANGUAGES } from '../i18n/index.js';
import PixelIcon from '../components/PixelIcon.jsx';
import WoodBackdrop from '../components/WoodBackdrop.jsx';

/** A labelled options row: icon, label, then its control on the right. */
function Opt({ icon, label, children }) {
  return (
    <div className="opt-row">
      <span className="opt-label"><PixelIcon name={icon} size={20} />{label}</span>
      <div className="opt-control">{children}</div>
    </div>
  );
}

/** Volume slider 0..100% with its value beside it. */
function Volume({ value, onChange, label }) {
  return (
    <>
      <input type="range" min="0" max="1" step="0.05" value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="opt-value">{Math.round(value * 100)}%</span>
    </>
  );
}

export default function OptionsScreen() {
  const t = useT();
  const lang = useLang();
  const profile = useGame((s) => s.profile);
  const run = useGame((s) => s.run);
  const setOptions = useGame((s) => s.setOptions);
  const go = useGame((s) => s.go);
  const backToMap = useGame((s) => s.backToMap);
  const mapReturn = useGame((s) => s.mapReturnScreen);
  if (!profile) return null;
  const o = profile.options;
  // older saves only had the on/off switch: off reads as 0%
  const music = o.bgmOn ? (o.bgm ?? 0.6) : 0;

  function back() {
    if (run && mapReturn) backToMap();
    else go(SCREEN.TITLE);
  }

  return (
    <div className="screen options hero-screen wood-screen">
      <WoodBackdrop />
      <header className="hero-head">
        <h1><PixelIcon name="cog" size={24} />{t('opt.title')}</h1>
      </header>
      <div className="opt-list">
        <Opt icon="globe" label={t('opt.language')}>
          <select value={lang} onChange={(e) => setOptions({ language: e.target.value })}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </Opt>
        <Opt icon="note" label={t('opt.music')}>
          <Volume value={music} label={t('opt.music')} onChange={(v) => setOptions({ bgm: v, bgmOn: v > 0 })} />
        </Opt>
        <Opt icon="speaker" label={t('opt.sfx')}>
          <Volume value={o.sfx} label={t('opt.sfx')} onChange={(v) => { setOptions({ sfx: v }); sfx.setVolume(v); sfx.click(); }} />
        </Opt>
        <Opt icon="swords" label={t('opt.afterBattle')}>
          <div className="opt-seg" role="group">
            <button className={`btn small ${o.afterBattle === 0 ? 'active' : ''}`} aria-pressed={o.afterBattle === 0} onClick={() => setOptions({ afterBattle: 0 })}>{t('opt.afterBattle.map')}</button>
            <button className={`btn small ${o.afterBattle === 2 ? 'active' : ''}`} aria-pressed={o.afterBattle === 2} onClick={() => setOptions({ afterBattle: 2 })}>{t('opt.afterBattle.stats')}</button>
          </div>
        </Opt>
        <Opt icon="expand" label={t('opt.fullscreen')}>
          <button className={`btn small ${o.fullscreen ? 'active' : ''}`} onClick={async () => { const on = await bridge.app.toggleFullscreen(); setOptions({ fullscreen: on }); }}>
            {o.fullscreen ? t('common.on') : t('common.off')}
          </button>
        </Opt>
      </div>
      <p className="hero-help">{t('opt.keys')}</p>
      <footer className="hero-foot">
        <div className="row">
          {bridge.isElectron && <button className="btn danger" onClick={() => bridge.app.quit()}>{t('opt.quit')}</button>}
          <button className="btn" data-escape onClick={back}>{t('common.back')}</button>
        </div>
      </footer>
    </div>
  );
}
