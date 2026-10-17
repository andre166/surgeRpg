import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { creatureSvg, heroSvg, echoSvg } from '../../game/animations/procedural.js';
import { heroArtUrl, heroArtPixel } from '../../game/heroArt.js';
import { hasMonsterArt, monsterPixels, MONSTER_SIZE } from '../monsterArt.js';
import { hasBossArt, bossPixels, BOSS_SIZE } from '../bossArt.js';
import { hasStableArt, stablePixels, STABLE_SIZE } from '../stableArt.js';

/**
 * Creature portrait: pixel art for bosses (bossArt.js, 48x48), monsters (monsterArt.js,
 * 32x32) and farm stable creatures (stableArt.js, 32x32) that have it, each drawn on one small
 * canvas, else procedural (unique per sprite key).
 * `silhouette` draws the unknown-creature shadow.
 */
export function Creature({ sprite, size = 160, boss = false, silhouette = false, className = '' }) {
  const kind = hasBossArt(sprite) ? 'boss' : hasStableArt(sprite) ? 'stable' : !boss && hasMonsterArt(sprite) ? 'monster' : null;
  const svg = useMemo(() => (kind ? '' : creatureSvg(sprite, boss)), [kind, sprite, boss]);
  if (kind) {
    return (
      <div className={`creature creature-art ${silhouette ? 'silhouette' : ''} ${className}`} style={{ width: size, height: size }}>
        {kind === 'boss'
          ? <PixelCanvas sprite={sprite} silhouette={silhouette} pixels={bossPixels} side={BOSS_SIZE} />
          : kind === 'stable'
            ? <PixelCanvas sprite={sprite} silhouette={silhouette} pixels={stablePixels} side={STABLE_SIZE} />
            : <PixelCanvas sprite={sprite} silhouette={silhouette} pixels={monsterPixels} side={MONSTER_SIZE} />}
      </div>
    );
  }
  return <div className={`creature ${className}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Small canvas with the creature's cached pixels, scaled up crisply by CSS. */
function PixelCanvas({ sprite, silhouette, pixels, side }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const img = pixels(sprite, silhouette);
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, side, side);
    if (img) ctx.putImageData(img, 0, 0);
  }, [sprite, silhouette, pixels, side]);
  return <canvas ref={ref} width={side} height={side} />;
}

export function Hero({ index, size = 96, className = '' }) {
  const art = heroArtUrl(index);
  const svg = useMemo(() => (art ? '' : heroSvg(index)), [index, art]);
  if (art) {
    return (
      <div className={`hero hero-art ${className}`} style={{ width: size, height: size }}>
        <img src={art} alt="" draggable={false} style={heroArtPixel(index) ? { imageRendering: 'pixelated' } : undefined} />
      </div>
    );
  }
  return <div className={`hero ${className}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Ancestral Echo spirit portrait (echo definition from src/core/echoes.js). */
export function EchoSpirit({ echo, size = 96, className = '' }) {
  const svg = useMemo(() => echoSvg(echo), [echo]);
  return <div className={`echo-spirit ${className}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
