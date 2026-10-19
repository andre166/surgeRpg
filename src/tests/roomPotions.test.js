import { describe, it, expect } from 'vitest';
import { createProfile } from '../core/persistence/profile.js';
import { createWorld } from '../core/world/world.js';
import { startRun, startBattle, finishBattle, inSecretRoom, roomBattlesLeft } from '../core/session/session.js';
import { encodeBonus, BONUS_TYPE } from '../core/encounters/bonus.js';
import { createFarm, buyUnlock, brewPotion, useRoomPotion, ROOM_POTIONS, UNLOCK_PRICES, itemCount } from '../core/farm.js';
import worldData from '../data/world.json';
import enemyData from '../data/enemies.json';
import bossData from '../data/bosses.json';
import catalog from '../data/items.json';

const world = createWorld(worldData);
const never = { next: () => 0.999 };

/** A run standing in the white room (map 13) with `charges` battles left on its counter. */
function inWhiteRoom(charges, roomExtra = 0) {
  const profile = createProfile();
  const map = world.map(13);
  const area = map.areas[0];
  const run = {
    ...startRun({ profile, characterIndex: 0, hardMode: false, world, catalog }),
    base: { hp: 1e9, atk: 1e9, def: 1e9, speed: 1e6, luck: 1e6 },
    map: { id: 13, x: area.x + 1, y: area.y + 1, gauge: 0 },
    returnTo: { id: 1, x: 10, y: 10 },
    bonuses: { 13: [encodeBonus(BONUS_TYPE.IN_WHITE_ROOM, charges)] },
    roomExtra,
  };
  return { profile, run };
}

/** One battle won where the run stands. */
function win({ profile, run }) {
  const sb = startBattle({ run, profile, world, catalog, enemyPools: enemyData.pools, bossData }, -1, never);
  return finishBattle({ run: sb.run, profile, battle: { ...sb.battle, phase: 'won', gold: 0, highestCombo: 1, highestDamage: 1 }, enemy: sb.enemy, bossId: sb.bossId, drop: null, world, catalog }, never);
}

describe('threshold potions (secret rooms)', () => {
  it('three potions, +2 / +3 / +5, bought on their own at the cauldron', () => {
    expect(ROOM_POTIONS.map((p) => p.effect.amount)).toEqual([2, 3, 5]);
    expect(UNLOCK_PRICES.roomPotions).toHaveLength(ROOM_POTIONS.length);
    const t = 0;
    let f = { ...createFarm(t), items: { shade_herb: 9, pale_mushroom: 9, moon_cap: 9, dark_crystal: 9 } };
    expect(brewPotion(f, 'threshold_drop', t)).toBe(f); // not bought yet
    f = buyUnlock(f, 'roomPotions', t);
    expect(itemCount(brewPotion(f, 'threshold_drop', t), 'threshold_drop')).toBe(1);
  });

  it('only drinkable inside a secret room', () => {
    const farm = { ...createFarm(0), items: { threshold_drop: 1 } };
    const { run } = inWhiteRoom(1);
    expect(useRoomPotion(farm, run, 'threshold_drop', false).run).toBe(run);
    const used = useRoomPotion(farm, run, 'threshold_drop', inSecretRoom(run));
    expect(used.run.roomExtra).toBe(2);
    expect(itemCount(used.farm, 'threshold_drop')).toBe(0);
    expect(roomBattlesLeft(used.run)).toBe(3);
    // one per visit
    const again = useRoomPotion({ ...used.farm, items: { threshold_essence: 1 } }, used.run, 'threshold_essence', true);
    expect(again.run).toBe(used.run);
  });

  it('the extra battles keep the hero in the room once the counter runs out', () => {
    let s = inWhiteRoom(1, 2); // 1 battle on the counter + 2 from a potion
    for (let i = 0; i < 2; i += 1) {
      const fin = win(s);
      expect(fin.run.map.id).toBe(13);
      s = { profile: fin.profile, run: fin.run };
    }
    expect(s.run.roomExtra).toBe(0);
    const last = win(s);
    expect(last.run.map.id).toBe(1); // back where the hero came from
  });
});
