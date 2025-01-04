const Logger = require('../utils/Logger');

class QuestSystem {
  constructor(engine) {
    this.engine = engine;
    this.activeQuests = new Map();
  }

  async acceptQuest(player, questId) {
    const quest = this.engine.gameData.quests[questId];
    if (!quest) {
      throw new Error('Quest not found');
    }

    if (player.level < quest.minLevel) {
      throw new Error(`Required level: ${quest.minLevel}`);
    }

    const activeQuest = {
      id: questId,
      playerId: player.id,
      progress: 0,
      startTime: Date.now(),
      status: 'ACTIVE'
    };

    this.activeQuests.set(`${player.id}-${questId}`, activeQuest);
    Logger.info(`Quest ${questId} accepted by player ${player.id}`);

    return activeQuest;
  }

  async updateProgress(player, questId, progress) {
    const quest = this.activeQuests.get(`${player.id}-${questId}`);
    if (!quest) {
      throw new Error('Quest not found');
    }

    quest.progress = progress;
    if (progress >= 100) {
      await this.completeQuest(player, questId);
    }

    return quest;
  }

  async completeQuest(player, questId) {
    const quest = this.activeQuests.get(`${player.id}-${questId}`);
    if (!quest) {
      throw new Error('Quest not found');
    }

    quest.status = 'COMPLETED';
    quest.completedAt = Date.now();

    // Give rewards
    const rewards = this.engine.gameData.quests[questId].rewards;
    player.exp += rewards.exp;
    player.gold += rewards.gold;

    Logger.info(`Quest ${questId} completed by player ${player.id}`);
    return rewards;
  }
}

module.exports = QuestSystem;