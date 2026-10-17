/**
 * Renderer-side Steam facade. Achievements and stats are declared here by
 * name; the Electron bridge forwards them to steamworks.js when the Steam
 * client and an App ID are present, and silently ignores them otherwise.
 *
 * Achievement API names must match the ones configured in Steamworks.
 */
export const ACHIEVEMENTS = Object.freeze({
  FIRST_RUN: 'ACH_FIRST_RUN',
  LEVEL_100: 'ACH_LEVEL_100',
  LEVEL_1000: 'ACH_LEVEL_1000',
  LEVEL_10000: 'ACH_LEVEL_10000',
  FIRST_BOSS: 'ACH_FIRST_BOSS',
  LAST_BOSS: 'ACH_LAST_BOSS',
  COMBO_10: 'ACH_COMBO_10',
  COLLECTOR_20: 'ACH_COLLECTOR_20',
});

export const STATS = Object.freeze({
  RUNS: 'STAT_RUNS',
  HIGHEST_LEVEL: 'STAT_HIGHEST_LEVEL',
  BOSSES: 'STAT_BOSSES',
});

let api = null;
let status = { available: false };

export const steam = {
  async init(bridge) {
    api = bridge.steam;
    try {
      status = await api.status();
    } catch {
      status = { available: false };
    }
    return status;
  },
  status() {
    return status;
  },
  async unlock(id) {
    if (!api || !status.available) return false;
    return api.unlockAchievement(id);
  },
  async setStat(name, value) {
    if (!api || !status.available) return false;
    return api.setStat(name, value);
  },
  onBattleEnd(result, run, profile) {
    if (!status.available) return;
    if (result.won && result.bossId >= 0 && result.bossId <= 28) this.unlock(ACHIEVEMENTS.FIRST_BOSS);
    if (result.lastBoss) this.unlock(ACHIEVEMENTS.LAST_BOSS);
    if (run.highestCombo >= 10) this.unlock(ACHIEVEMENTS.COMBO_10);
    if (run.level >= 100) this.unlock(ACHIEVEMENTS.LEVEL_100);
    if (run.level >= 1000) this.unlock(ACHIEVEMENTS.LEVEL_1000);
    if (run.level >= 10000) this.unlock(ACHIEVEMENTS.LEVEL_10000);
    const bosses = Object.keys(profile.bossWins).length;
    this.setStat(STATS.BOSSES, bosses);
  },
  onPurchase() {},
  onRunEnd(run, profile) {
    if (!status.available) return;
    this.unlock(ACHIEVEMENTS.FIRST_RUN);
    this.setStat(STATS.RUNS, profile.gameOverCount);
    this.setStat(STATS.HIGHEST_LEVEL, profile.highestLevel);
    const kinds = run.inventory.weapons.filter((n) => n > 0).length + run.inventory.armors.filter((n) => n > 0).length;
    if (kinds >= 20) this.unlock(ACHIEVEMENTS.COLLECTOR_20);
  },
};
