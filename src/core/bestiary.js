/**
 * Bestiary (not in the original game). Lists every enemy the world can spawn and
 * records, per profile, how often each one was met and defeated.
 *
 * Entry keys are the battle enemy ids (enemyPick.js): `<pool>#<index>` for area
 * enemies, `boss#<id>` for map bosses, `slime#<id>` for slime bosses and `event#<id>` for event bosses, so the
 * portrait drawn in the bestiary is the same one seen in battle.
 */

import { slimeDef } from './encounters/slimeBosses.js';

/**
 * Builds the static list of entries from the game data.
 * @returns {Array<{ key, kind:'enemy'|'boss'|'slime'|'event', name, sprite, hp, atk, gold, drops, levels:number[], maps:number[], hard:boolean }>}
 */
export function buildBestiary(world, enemyPools, bossData) {
  const byKey = new Map();
  const add = (key, base) => {
    if (!byKey.has(key)) byKey.set(key, { ...base, key, levels: [], maps: [] });
    return byKey.get(key);
  };
  const note = (entry, level, mapId) => {
    if (level != null && !entry.levels.includes(level)) entry.levels.push(level);
    if (mapId != null && !entry.maps.includes(mapId)) entry.maps.push(mapId);
  };

  for (const map of world.maps) {
    for (const area of map.areas) {
      for (const [poolKey, hard] of [[area.pool, false], [area.poolHard, true]]) {
        const pool = poolKey ? enemyPools[poolKey] : null;
        if (!pool) continue;
        pool.forEach((e, idx) => {
          const entry = add(`${poolKey}#${idx}`, {
            kind: 'enemy', name: e.name, sprite: e.sprite, hp: e.hp, atk: e.atk, gold: e.gold, drops: e.drops ?? [], hard,
          });
          if (!hard) entry.hard = false;
          note(entry, area.level, map.id);
        });
      }
    }
    for (const b of map.bosses ?? []) {
      const slime = slimeDef(bossData, b.id, null);
      if (slime) {
        const se = add(slime.id, {
          kind: 'slime', name: slime.name, sprite: slime.sprite, hp: slime.hp, atk: slime.atk, gold: slime.gold, drops: [], hard: false, talentPoints: slime.talentPoints,
        });
        note(se, null, map.id);
      }
      const def = bossData.mapBosses[b.id];
      if (!def) continue;
      const entry = add(`boss#${b.id}`, {
        kind: 'boss', name: def.name, sprite: def.sprite, hp: def.hp, atk: def.atk, gold: def.gold, drops: def.drops ?? [], hard: false,
      });
      note(entry, null, map.id);
    }
  }
  for (const [id, e] of Object.entries(bossData.eventBosses)) {
    const line = e.normal;
    add(`event#${id}`, {
      kind: 'event', name: line.name, sprite: line.sprite, hp: line.hp, atk: line.atk, gold: line.gold, drops: line.drops ?? [], hard: false,
    });
  }

  const entries = [...byKey.values()];
  for (const e of entries) e.levels.sort((a, b) => a - b);
  const kindOrder = { enemy: 0, boss: 1, slime: 2, event: 3 };
  return entries.sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || (a.levels[0] ?? 0) - (b.levels[0] ?? 0));
}

/** Records one encounter (`won` undefined) or its outcome (`won` true) for an enemy id. */
export function recordBestiary(profile, key, won) {
  if (!profile || !key) return profile;
  const prev = profile.bestiary?.[key] ?? { seen: 0, defeated: 0 };
  const next = won ? { ...prev, defeated: prev.defeated + 1 } : { ...prev, seen: prev.seen + 1 };
  return { ...profile, bestiary: { ...profile.bestiary, [key]: next } };
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
 * met all the time, map bosses and slime kings far less, rare (event) bosses seldom.
 */
export const DROP_REVEAL_KILLS = { enemy: 60, boss: 20, slime: 10, event: 3 };

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
