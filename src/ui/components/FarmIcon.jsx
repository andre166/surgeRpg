import React from 'react';
import { oreGrid, oreRuns, ORE_SIZE } from '../oreArt.js';
import PotionSprite, { hasPotionSprite } from './PotionSprite.jsx';
import { CropItem, hasCropItem } from './CropSprite.jsx';
import OreSprite, { hasOreSprite } from './OreSprite.jsx';

/** Item colours (dark-fantasy palette). */
const COLORS = {
  shade_herb: '#6fbf73', pale_mushroom: '#d9d2c3', bloodroot: '#c0392b', moon_cap: '#8fa8ff',
  ruin_bloom: '#b07cff', abyss_truffle: '#4a3b5c',
  healing_potion: '#ff5c7a', vigor_tonic: '#58d68d', ruin_draught: '#b07cff', blood_tonic: '#d63a2e',
  fury_elixir: '#ff7a3d', stoneskin_elixir: '#9aa3b2', insight_elixir: '#5aa9ff', swift_elixir: '#4fe0b8', titan_elixir: '#d02a4a',
};
const KIND = {
  shade_herb: 'herb', bloodroot: 'herb', ruin_bloom: 'herb',
  pale_mushroom: 'mushroom', moon_cap: 'mushroom', abyss_truffle: 'mushroom',
  healing_potion: 'potion', vigor_tonic: 'potion', ruin_draught: 'potion', blood_tonic: 'potion',
  fury_elixir: 'elixir', stoneskin_elixir: 'elixir', insight_elixir: 'elixir', swift_elixir: 'elixir', titan_elixir: 'elixir',
};

function shape(kind, c) {
  switch (kind) {
    case 'herb':
      return <><path d="M12 21V11" stroke="#2c4a2e" strokeWidth="1.6" /><path d="M12 12C6 12 4 7 5 3c4 0 8 3 7 9z" fill={c} /><path d="M12 14c5 0 7-4 6-8-4 0-7 3-6 8z" fill={c} opacity=".8" /></>;
    case 'mushroom':
      return <><path d="M9 13h6l-1 7h-4z" fill="#e8e0cf" /><path d="M3 13c0-5 4-9 9-9s9 4 9 9z" fill={c} /><circle cx="9" cy="9" r="1.3" fill="#fff" opacity=".7" /><circle cx="14.5" cy="7.5" r="1" fill="#fff" opacity=".7" /></>;
    case 'potion':
      return <><path d="M10 3h4v5l4 6a5 5 0 0 1-12 0l4-6z" fill="#1d2233" stroke="#8d95ab" strokeWidth="1.2" /><path d="M7.5 14.5h9a4.5 4.5 0 0 1-9 0z" fill={c} /></>;
    default:
      return <><path d="M9 2h6v3h-1v4l5 3v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8l5-3V5H9z" fill="#1d2233" stroke="#8d95ab" strokeWidth="1.2" /><path d="M6 13l6-2 6 2v7H6z" fill={c} /><circle cx="12" cy="16" r="1.5" fill="#fff" opacity=".7" /></>;
  }
}

/** Mine materials are pixel art (src/ui/oreArt.js), rasterised once per id. */
const ORE_RECTS = new Map();
function oreRects(id) {
  if (!ORE_RECTS.has(id)) {
    const g = oreGrid(id);
    ORE_RECTS.set(id, g && oreRuns(g).map(([x, y, w, c]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={c} />));
  }
  return ORE_RECTS.get(id);
}

/** Farm item icon; potions, elixirs and mine materials use pixel-art sprites. */
export default function FarmIcon({ id, size = 28 }) {
  if (hasPotionSprite(id)) return <PotionSprite id={id} size={size} />;
  if (hasCropItem(id)) return <CropItem crop={id} size={size} />;
  const ore = oreRects(id);
  if (ore) {
    return (
      <svg className="farm-icon ore" viewBox={`0 0 ${ORE_SIZE} ${ORE_SIZE}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
        {ore}
      </svg>
    );
  }
  return (
    <svg className="farm-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {shape(KIND[id], COLORS[id] ?? '#aaa')}
    </svg>
  );
}
