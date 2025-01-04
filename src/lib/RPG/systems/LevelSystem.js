const Logger = require('../utils/Logger');

class LevelSystem {
  constructor(engine) {
    this.engine = engine;
    this.maxLevel = 60;
  }

  calculateRequiredExp(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  gainExperience(player, amount) {
    if (player.level >= this.maxLevel) {
      return { leveledUp: false, newLevel: player.level };
    }

    player.exp += amount;
    let leveledUp = false;

    while (player.exp >= this.calculateRequiredExp(player.level)) {
      if (player.level >= this.maxLevel) break;

      player.exp -= this.calculateRequiredExp(player.level);
      player.level++;
      leveledUp = true;
      
      this._applyLevelUpBonuses(player);
      Logger.info(`Player ${player.id} reached level ${player.level}!`);
    }

    return { leveledUp, newLevel: player.level };
  }

  _applyLevelUpBonuses(player) {
    // Base stat increases
    player.baseStats.strength += 2;
    player.baseStats.dexterity += 2;
    player.baseStats.intelligence += 2;
    player.baseStats.vitality += 2;

    // HP and MP increases
    player.baseStats.hp += 20;
    player.baseStats.mp += 10;

    // Recalculate all stats
    player._recalculateStats();
  }
}

module.exports = LevelSystem;