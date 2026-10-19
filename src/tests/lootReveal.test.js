import { describe, it, expect } from 'vitest';
import { forceDrop } from '../core/battle/drops.js';
import { createSequenceRng } from '../core/rng/rng.js';
import { CHEAT_TOGGLES } from '../core/session/cheats.js';

describe('always-drop cheat', () => {
  it('picks one of the enemy drop entries, ignoring chances; nothing without a drop table', () => {
    const drops = [{ type: 0, itemId: 3, chance: 0.0001 }, null, { type: 2, itemId: 9, chance: 0.0001 }];
    expect(forceDrop(drops, createSequenceRng([0]))).toEqual({ type: 0, itemId: 3 });
    expect(forceDrop(drops, createSequenceRng([0.99]))).toEqual({ type: 2, itemId: 9 });
    expect(forceDrop([null, null, null], createSequenceRng([0.5]))).toBeNull();
    expect(CHEAT_TOGGLES.ALWAYS_DROP).toBe('alwaysDrop');
  });
});

describe('loot reveal rarity', () => {
  it('weapons and armors by power among their kind, accessories by rank, hard items one tier up', async () => {
    const { dropTier } = await import('../ui/screens/ResultScreen.jsx');
    const list = Array.from({ length: 11 }, (_, i) => ({ flat: i * 10 }));
    expect(dropTier(list[0], 0, list)).toBe('rare');
    expect(dropTier(list[6], 0, list)).toBe('epic'); // top 40%
    expect(dropTier(list[10], 0, list)).toBe('legendary'); // top 10%
    expect(dropTier({ ...list[0], hard: 1 }, 0, list)).toBe('epic');
    expect(dropTier({ ...list[6], hard: 1 }, 1, list)).toBe('legendary');
    expect(dropTier({ rank: 1 }, 2)).toBe('rare');
    expect(dropTier({ rank: 2 }, 2)).toBe('epic');
    expect(dropTier({ rank: 3 }, 2)).toBe('legendary');
  });
});
