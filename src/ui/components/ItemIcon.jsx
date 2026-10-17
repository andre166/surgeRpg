import React, { useMemo } from 'react';
import { itemIconUrl } from '../itemIcons.js';
import { ITEM_TYPE } from '../../core/equipment/items.js';
import { weaponRuns, ART_SIZE } from '../weaponArt.js';
import { accessoryRuns, ACC_SIZE } from '../accessoryArt.js';

/** Generated pixel art drawn from the item name: weapons (weaponArt.js), accessories (accessoryArt.js). */
const GENERATED = {
  [ITEM_TYPE.WEAPON]: { runs: weaponRuns, grid: ART_SIZE },
  [ITEM_TYPE.ACCESSORY]: { runs: accessoryRuns, grid: ACC_SIZE },
};

/** A generated item sprite, unique per item. */
function ItemSprite({ type, name, size, unknown, className }) {
  const art = GENERATED[type];
  const runs = useMemo(() => art.runs(name), [art, name]);
  return (
    <svg
      className={`item-icon item-sprite ${unknown ? 'unknown' : ''} ${className}`}
      viewBox={`0 0 ${art.grid} ${art.grid}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {runs.map((r) => <rect key={`${r.y}-${r.x}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />)}
    </svg>
  );
}

/**
 * Item icon: weapons and accessories get their generated sprite, other items their icon from
 * src/ui/itemIcons.js; `unknown` shows a silhouette. Renders nothing for items without one.
 */
export default function ItemIcon({ item, size = 32, unknown = false, className = '' }) {
  if (GENERATED[item?.type]) return <ItemSprite type={item.type} name={item.name} size={size} unknown={unknown} className={className} />;
  const src = itemIconUrl(item);
  if (!src) return null;
  return (
    <img
      className={`item-icon ${unknown ? 'unknown' : ''} ${className}`}
      src={src}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}
