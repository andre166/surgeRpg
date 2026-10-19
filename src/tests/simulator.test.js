import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame, reachableMaps } from '../../scripts/sim/world.mjs';
import { createBot } from '../../scripts/sim/bot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('balance simulator', () => {
  it('loads the world with the map editor files applied, like the map scene', () => {
    const game = loadGame(root);
    expect(game.edited.length).toBeGreaterThan(0);
    expect(reachableMaps(game.world, game.exits, game.world.start.map)).toContain(game.world.start.map);
    expect(loadGame(root, { original: true }).edited).toEqual([]);
  });

  it('plays whole runs the same way for the same seed, and carries the profile over', () => {
    const game = loadGame(root);
    const bot = createBot(game);
    const a = bot.playRun(bot.newProfile(), 5);
    const b = bot.playRun(bot.newProfile(), 5);
    expect(a.stats.battles).toBeGreaterThan(0);
    expect(a.stats.level).toBeGreaterThan(1);
    expect(b.stats).toEqual(a.stats);
    expect(a.profile.gameOverCount).toBe(1);
    expect(bot.playRun(a.profile, 6).profile.gameOverCount).toBe(2);
  });
});
