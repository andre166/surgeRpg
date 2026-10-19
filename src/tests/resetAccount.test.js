import { describe, it, expect } from 'vitest';
import { createProfile } from '../core/persistence/profile.js';
import { migrateProfile, resetAccountProfile } from '../core/persistence/saveStore.js';
import { cheatShards } from '../core/progression/limitBreak.js';
import { cheatPassiveShards } from '../core/progression/passiveShards.js';

describe('reset account cheat', () => {
  it('wipes every progress field and keeps only the options', () => {
    let p = migrateProfile(createProfile());
    p = cheatPassiveShards(cheatShards(p, 50), 30);
    p = {
      ...p,
      bossWins: { 13: 1, 113: 1 },
      bestiary: { e1: { seen: 3, defeated: 2 } },
      inventory: { weapons: [1, 5, 9], armors: [1, 4], accessories: [7] },
      characterExp: p.characterExp.map(() => 999),
      gameOverCount: 12,
      run: { characterIndex: 0 },
      options: { ...p.options, language: 'pt', bgm: 0.3 },
    };
    const r = resetAccountProfile(p);
    const fresh = migrateProfile(null);
    const { createdAt: _a, options: o1, ...rest } = r;
    const { createdAt: _b, options: o2, ...freshRest } = fresh;
    expect(rest).toEqual(freshRest);
    expect(o1).toEqual({ ...o2, language: 'pt', bgm: 0.3 });
    expect(r.run).toBeNull();
  });
});
