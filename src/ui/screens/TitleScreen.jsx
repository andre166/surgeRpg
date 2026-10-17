import React from 'react';
import { useGame, SCREEN } from '../stores/gameStore.js';
import { fmtFull } from '../components/format.js';
import { useT } from '../i18n/index.js';
import { SANDBOX } from '../../config/sandbox.js';
import PixelIcon, { HeroPortrait } from '../components/PixelIcon.jsx';
import TitleTagline from '../components/TitleTagline.jsx';
import { version } from '../../../package.json';

const HOME_ART = `${import.meta.env.BASE_URL}assets/ui/home.png`;

// golden pixel motes drifting up over the art like fireflies: start column (%), size (px),
// rise duration and delay (s), sideways drift (px); spread deterministically, no randomness
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  size: 3 + (i % 3),
  dur: 9 + ((i * 7) % 8),
  delay: -((i * 13) % 17),
  drift: ((i * 29) % 41) - 20,
}));

/** One menu entry, a translucent wooden plank like the key art's sign: pixel icon, label. */
function MenuBtn({ icon, primary, onClick, children }) {
  return (
    <button className={`title-btn ${primary ? 'primary' : ''}`} data-primary={primary || undefined} onClick={onClick}>
      <span className="title-btn-icon">{icon}</span>
      <span className="title-btn-label">{children}</span>
    </button>
  );
}

export default function TitleScreen() {
  const t = useT();
  const profile = useGame((s) => s.profile);
  const go = useGame((s) => s.go);
  const continueRun = useGame((s) => s.continueRun);
  const restored = useGame((s) => s.restoredFromBackup);
  const canContinue = !!profile?.run;

  return (
    <div className="screen title">
      {/* key art (its logo is the title): blurred to fill the screen, shown whole beside the menu on desktop */}
      <div className="title-bg" style={{ backgroundImage: `url(${HOME_ART})` }} aria-hidden="true" />
      <img className="title-key-art" src={HOME_ART} alt="Surge RPG" draggable={false} />
      <div className="title-motes" aria-hidden="true">
        {MOTES.map((m, i) => (
          <span key={i} style={{ left: `${m.x}%`, width: m.size, height: m.size, animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s`, '--drift': `${m.drift}px` }} />
        ))}
      </div>
      {/* ribbon pinned to the top-right corner, tilted */}
      <TitleTagline />
      {/* sandbox builds: a quiet version-style tag in the bottom-right corner */}
      {SANDBOX && <span className="title-version" title={t('sandbox.hint')}>v{version} · sandbox</span>}
      <div className="title-main">
        <div className="title-art">
          <h1 className="sr-only">Surge RPG</h1>
        </div>
        <div className="menu">
          {canContinue && (
            <MenuBtn primary icon={<HeroPortrait index={profile.run.characterIndex} size={22} />} onClick={() => continueRun()}>
              {t('title.continue', { level: fmtFull(profile.run.level) })}
            </MenuBtn>
          )}
          <MenuBtn primary={!canContinue} icon={<PixelIcon name="sword" size={22} />} onClick={() => go(SCREEN.CHARACTER)}>
            {t('title.newRun')}
          </MenuBtn>
          <MenuBtn icon={<PixelIcon name="stats" size={22} />} onClick={() => go(SCREEN.STATISTICS)}>{t('title.statistics')}</MenuBtn>
          <MenuBtn icon={<PixelIcon name="orb" size={22} />} onClick={() => go(SCREEN.ECHOES)}>{t('echo.title')}</MenuBtn>
          <MenuBtn icon={<PixelIcon name="blueBook" size={22} />} onClick={() => go(SCREEN.BESTIARY)}>{t('title.bestiary')}</MenuBtn>
          <MenuBtn icon={<PixelIcon name="cog" size={22} />} onClick={() => go(SCREEN.OPTIONS)}>{t('title.options')}</MenuBtn>
        </div>
        {restored && <p className="muted small">{t('title.restored')}</p>}
      </div>
    </div>
  );
}
