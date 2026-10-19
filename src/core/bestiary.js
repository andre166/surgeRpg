/**
 * Bestiary (not in the original game). Lists every enemy the world can spawn and
 * records, per profile, how often each one was met and defeated.
 *
 * Entry keys are the battle enemy ids (enemyPick.js): `<pool>#<index>` for area
 * enemies, `boss#<id>` for map bosses, `slime#<id>` for slime bosses and `event#<id>` for event bosses, so the
 * portrait drawn in the bestiary is the same one seen in battle.
 */

import { slimeDef, SLIME_IDS } from './encounters/slimeBosses.js';
import { areaAt } from './world/world.js';
import { tpLevel } from './progression/talents.js';

/**
 * Builds the static list of entries from the game data.
 * @returns {Array<{ key, kind:'enemy'|'rare'|'boss'|'slime'|'event', name, sprite, hp, atk, gold, drops, levels:number[], maps:number[], hard:boolean }>}
 */
export function buildBestiary(world, enemyPools, bossData) {
  const byKey = new Map();
  const add = (key, base) => {
    if (!byKey.has(key)) byKey.set(key, { ...base, key, levels: [], maps: [] });
    return byKey.get(key);
  };
  const note = (entry, level, mapId) => {
    // level 0: the white / black rooms (maps 13, 14), which have no area level (raw EXP)
    if (level > 0 && !entry.levels.includes(level)) entry.levels.push(level);
    if (mapId != null && !entry.maps.includes(mapId)) entry.maps.push(mapId);
  };

  for (const map of world.maps) {
    for (const area of map.areas) {
      for (const [poolKey, hard] of [[area.pool, false], [area.poolHard, true]]) {
        const pool = poolKey ? enemyPools[poolKey] : null;
        if (!pool) continue;
        pool.forEach((e, idx) => {
          const entry = add(`${poolKey}#${idx}`, {
            // the white / black rooms (maps 13, 14: area level 0) hold the rare monsters
            kind: area.level > 0 ? 'enemy' : 'rare', name: e.name, sprite: e.sprite, hp: e.hp, atk: e.atk, gold: e.gold, drops: e.drops ?? [], hard,
          });
          if (!hard) entry.hard = false;
          note(entry, area.level, map.id);
        });
      }
    }
    for (const b of map.bosses ?? []) {
      const def = bossData.mapBosses[b.id];
      if (!def) continue;
      const entry = add(`boss#${b.id}`, {
        kind: 'boss', name: def.name, sprite: def.sprite, hp: def.hp, atk: def.atk, gold: def.gold, drops: def.drops ?? [], hard: false,
      });
      // its level: the one of the area it stands in (as in docs/chefes-inflation.md)
      note(entry, map.grid ? areaAt(map, b.x, b.y).level : null, map.id);
    }
  }
  // placed only by the map editor's boss triggers (not in world.json): listed without a map;
  // slime kings likewise
  for (const [id, def] of Object.entries(bossData.mapBosses)) {
    if (!def.custom || byKey.has(`boss#${id}`)) continue;
    add(`boss#${id}`, { kind: 'boss', name: def.name, sprite: def.sprite, hp: def.hp, atk: def.atk, gold: def.gold, drops: def.drops ?? [], hard: false });
  }
  for (const id of SLIME_IDS) {
    const slime = slimeDef(bossData, id, null);
    if (byKey.has(slime.id)) continue;
    add(slime.id, { kind: 'slime', name: slime.name, sprite: slime.sprite, hp: slime.hp, atk: slime.atk, gold: slime.gold, drops: [], hard: false, talentPoints: slime.talentPoints });
  }
  for (const [id, e] of Object.entries(bossData.eventBosses)) {
    const line = e.normal;
    add(`event#${id}`, {
      kind: 'event', name: line.name, sprite: line.sprite, hp: line.hp, atk: line.atk, gold: line.gold, drops: line.drops ?? [], hard: false,
    });
  }

  const entries = [...byKey.values()];
  for (const e of entries) e.levels.sort((a, b) => a - b);
  const kindOrder = { enemy: 0, rare: 1, boss: 2, slime: 3, event: 4 };
  // weakest first: by the lowest level met at, then (and for the ones without a level, listed
  // after those with one) by HP; slime kings keep their order (their HP scales with the area)
  const lvl = (e) => e.levels[0] ?? Infinity;
  return entries.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || (lvl(a) === lvl(b) ? 0 : lvl(a) - lvl(b)) || (a.kind === 'slime' ? 0 : a.hp - b.hp));
}

/** Records one encounter (`won` undefined) or its outcome (`won` true) for an enemy id. */
export function recordBestiary(profile, key, won) {
  if (!profile || !key) return profile;
  const prev = profile.bestiary?.[key] ?? { seen: 0, defeated: 0 };
  const next = won ? { ...prev, defeated: prev.defeated + 1 } : { ...prev, seen: prev.seen + 1 };
  return { ...profile, bestiary: { ...profile.bestiary, [key]: next } };
}

/**
 * The account's SK: +1 for every different Slime King beaten (either mode), the same number as the
 * talents' level (progression/talents.js tpLevel). Every "slimeKings" requirement (echoes, farm, slots,
 * unlocks, class growth) reads it; beating the same Slime King again adds nothing.
 */
export function slimeKingWins(profile) {
  return tpLevel(profile);
}

/**
 * Cheat: reveals every entry of the bestiary (`entries` from buildBestiary). Unseen entries get
 * one encounter; counts already recorded are kept.
 */
export function revealBestiary(profile, entries) {
  if (!profile) return profile;
  const book = { ...profile.bestiary };
  for (const { key } of entries) {
    const prev = book[key];
    if (!prev || prev.seen < 1) book[key] = { seen: 1, defeated: prev?.defeated ?? 0 };
  }
  return { ...profile, bestiary: book };
}

/** Cheat: forgets the whole bestiary (every entry back to unseen, encounter counts cleared). */
export function resetBestiary(profile) {
  if (!profile) return profile;
  return { ...profile, bestiary: {} };
}

/**
 * Victories needed before an entry's drops show in the bestiary, per kind: regular monsters are
 * met all the time, map bosses, slime kings and the rare monsters (white / black rooms) far less,
 * rare (event) bosses seldom.
 */
export const DROP_REVEAL_KILLS = { enemy: 60, rare: 10, boss: 20, slime: 10, event: 3 };

/** Wins needed to reveal an entry's drops. */
export const dropRevealKills = (entry) => DROP_REVEAL_KILLS[entry.kind] ?? 1;

/** True once the entry has been defeated at least once: where it lives (maps, levels) shows from then on. */
export function whereRevealed(record) {
  return (record?.defeated ?? 0) >= 1;
}

/** True once the entry has been defeated often enough to show its drops. */
export function dropsRevealed(entry, record) {
  return (record?.defeated ?? 0) >= dropRevealKills(entry);
}
