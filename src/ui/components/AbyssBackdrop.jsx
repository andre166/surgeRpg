import React, { useEffect, useRef } from 'react';

const HOME_ART = `${import.meta.env.BASE_URL}assets/ui/home.png`;

// eldritch glyphs rising through the dark: column (%), size (px), duration and delay (s), glyph
const GLYPHS = ['ᛟ', 'ᚦ', 'ᛉ', '⍜', 'ᚸ', '⟁', 'ᛞ', '⌬', 'ᛝ', '⍟', 'ᚹ', '⊛'];
const RUNES = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 41 + 7) % 100,
  size: 14 + (i % 4) * 5,
  dur: 11 + ((i * 7) % 9),
  delay: -((i * 11) % 19),
  glyph: GLYPHS[i % GLYPHS.length],
}));

// tentacles rising from the bottom edges: anchor (left %, or right % when `right`), height (vh),
// sway period (s), delay (s) and a tilt (deg)
const TENTACLES = [
  { left: -2, h: 62, dur: 7.5, delay: -1, tilt: 12 },
  { left: 9, h: 42, dur: 6.2, delay: -3.4, tilt: 4 },
  { right: -2, h: 66, dur: 8.1, delay: -2.2, tilt: -12, flip: true },
  { right: 11, h: 40, dur: 6.8, delay: -4.6, tilt: -5, flip: true },
];

/** One tentacle: a tapering curve with sucker rings along its inner side. */
function Tentacle({ flip }) {
  return (
    <svg viewBox="0 0 120 400" preserveAspectRatio="none" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <defs>
        <linearGradient id="abyss-tent" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#030807" />
          <stop offset="0.6" stopColor="#0c2a24" />
          <stop offset="1" stopColor="#1f5a48" />
        </linearGradient>
      </defs>
      <path d="M20 400 C10 300 70 260 50 190 C35 135 95 105 80 50 C76 30 88 12 100 4 C92 22 90 40 96 58 C110 112 58 140 72 195 C88 262 40 305 70 400 Z" fill="url(#abyss-tent)" />
      {[[58, 330, 7], [52, 270, 6], [62, 215, 5], [76, 160, 4.5], [82, 110, 3.6], [90, 68, 2.8]].map(([cx, cy, r]) => (
        <circle key={cy} cx={cx} cy={cy} r={r} fill="none" stroke="#6fe0b0" strokeOpacity="0.35" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/**
 * Backdrop of the hero select in abyssal mode (H. P. Lovecraft's dread): the key art drowned in
 * deep green-black, drifting fog, a giant eye that blinks and follows the pointer, tentacles
 * swaying up from the bottom edges, glyphs rising and fading and a slow pulsing vignette.
 * Replaces WoodBackdrop on a .wood-screen.abyss (theme tokens in styles.css).
 */
export default function AbyssBackdrop() {
  const pupil = useRef(null);
  useEffect(() => {
    // the pupil looks toward the pointer (a few px at most), eased by a CSS transition
    const move = (e) => {
      const el = pupil.current;
      if (!el) return;
      const dx = (e.clientX / window.innerWidth - 0.5) * 2;
      const dy = (e.clientY / window.innerHeight - 0.35) * 2;
      el.style.transform = `translate(${Math.max(-1, Math.min(1, dx)) * 26}px, ${Math.max(-1, Math.min(1, dy)) * 10}px)`;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return (
    <div className="abyss-backdrop" aria-hidden="true">
      <div className="abyss-art" style={{ backgroundImage: `url(${HOME_ART})` }} />
      <div className="abyss-fog f1" />
      <div className="abyss-fog f2" />
      <div className="abyss-eye">
        <svg viewBox="0 0 400 180">
          <defs>
            <radialGradient id="abyss-iris" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#d6ff6a" />
              <stop offset="0.45" stopColor="#4fd38f" />
              <stop offset="1" stopColor="#0b3a2c" />
            </radialGradient>
            <clipPath id="abyss-lids"><path d="M10 90 Q200 -40 390 90 Q200 220 10 90 Z" /></clipPath>
          </defs>
          <path d="M10 90 Q200 -40 390 90 Q200 220 10 90 Z" fill="#0a1512" stroke="#2c6b55" strokeWidth="3" />
          <g clipPath="url(#abyss-lids)">
            {/* veins */}
            <path d="M30 92 Q80 70 120 84 M370 88 Q320 112 280 96 M60 120 Q110 112 140 104" stroke="#5a1d2a" strokeWidth="2" fill="none" opacity="0.7" />
            <g ref={pupil} className="abyss-pupil">
              <circle cx="200" cy="90" r="62" fill="url(#abyss-iris)" />
              <ellipse cx="200" cy="90" rx="9" ry="52" fill="#020403" />
              <circle cx="182" cy="66" r="7" fill="#f2fff4" opacity="0.55" />
            </g>
            {/* lids closing for a blink */}
            <rect className="abyss-lid top" x="0" y="-180" width="400" height="180" fill="#06100d" />
            <rect className="abyss-lid bottom" x="0" y="180" width="400" height="180" fill="#06100d" />
          </g>
        </svg>
      </div>
      {TENTACLES.map((tc, i) => (
        <div
          key={i}
          className="abyss-tentacle"
          style={{ ...(tc.right != null ? { right: `${tc.right}%` } : { left: `${tc.left}%` }), height: `${tc.h}vh`, animationDuration: `${tc.dur}s`, animationDelay: `${tc.delay}s`, '--tilt': `${tc.tilt}deg` }}
        >
          <Tentacle flip={tc.flip} />
        </div>
      ))}
      <div className="abyss-runes">
        {RUNES.map((r, i) => (
          <span key={i} style={{ left: `${r.x}%`, fontSize: r.size, animationDuration: `${r.dur}s`, animationDelay: `${r.delay}s` }}>{r.glyph}</span>
        ))}
      </div>
      <div className="abyss-vignette" />
    </div>
  );
}
