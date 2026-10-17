import React, { useEffect, useState } from 'react';
import { useT } from '../i18n/index.js';

/** Pixel-art ribbon (scripts/draw-ribbon.mjs), 128x40, front band at x 15..112, y 3..30. */
const RIBBON = `${import.meta.env.BASE_URL}assets/ui/ribbon.png`;

/**
 * Title screen tagline in three beats, on a ribbon pinned to the top-right corner. Each of the first two lines starts
 * as a number inflating fast (the game's runaway levels: 1 -> 30 battles, 1 -> 999 levels)
 * and then punches into its words; the last line pops in gold and keeps a slow glow pulse.
 * About 1.7 s once per visit; never blocks the menu; reduced motion shows the final text.
 */
const SWAP = 90; // a beat on the final number before the words punch in
const LINES = [
  { key: 'title.tag1', start: 200, end: 700, to: 30, curve: (p) => 1 - (1 - p) ** 2 },
  { key: 'title.tag2', start: 900, end: 1450, to: 999, curve: (p) => p ** 3 },
];
const FINAL_AT = 1650;

const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function TitleTagline() {
  const t = useT();
  // ms since mount; Infinity once everything is in (or with reduced motion)
  const [ms, setMs] = useState(() => (prefersReduced() ? Infinity : 0));

  useEffect(() => {
    if (ms === Infinity) return undefined;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const e = now - t0;
      if (e >= FINAL_AT) { setMs(Infinity); return; }
      setMs(e);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // runs once per mount: the timeline restarts on every visit to the title screen
  }, []);

  return (
    <div className="tagline" style={{ backgroundImage: `url(${RIBBON})` }}>
      <span className="sr-only">{t('title.tagline')}</span>
      {/* the text sits on the ribbon's front band */}
      <div className="tag-body">
        {LINES.map((l) => <Beat key={l.key} line={l} ms={ms} text={t(l.key)} />)}
        <span className={`tag-line tag-final ${ms >= FINAL_AT ? 'in' : ''}`} aria-hidden="true">{t('title.tag3')}</span>
      </div>
    </div>
  );
}

/** One line: empty (keeps its height), then the inflating number, then the words. */
function Beat({ line, ms, text }) {
  if (ms < line.start) return <span className="tag-line" aria-hidden="true" />;
  if (ms < line.end + SWAP) {
    const p = Math.min(1, (ms - line.start) / (line.end - line.start));
    const n = Math.max(1, Math.round(line.curve(p) * line.to));
    return <span className="tag-line" aria-hidden="true"><b key="count" className="tag-count">{n}</b></span>;
  }
  return <span className="tag-line" aria-hidden="true"><span key="words" className="tag-words">{text}</span></span>;
}
