const { v4: uuidv4 } = require('uuid');
const BattleSystem = require('../systems/BattleSystem');
const QuestSystem = require('../systems/QuestSystem');
const InventorySystem = require('../systems/InventorySystem');
const Logger = require('../utils/Logger');

class RPGEngine {
  constructor() {
    this.players = new Map();
    this.gameData = null;
    
    // Initialize core systems
    this.battleSystem = new BattleSystem(this);
    this.questSystem = new QuestSystem(this);
    this.inventorySystem = new InventorySystem(this);
  }

  async init() {
    try {
      await this._loadGameData();
      Logger.info('RPG Engine initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize RPG Engine:', error);
      throw error;
    }
  }

  async createPlayer(userId, className) {
    try {
      const baseStats = this.getBaseStats(className);
      const player = {
        userId,
        className,
        level: 1,
        exp: 0,
        gold: 0,
        stats: baseStats,
        inventory: {
          items: []
        }
      };
      
      this.players.set(userId, player);
      return player;
    } catch (error) {
      throw new Error(`Failed to create player: ${error.message}`);
    }
  }

  getBaseStats(className) {
    const stats = {
      warrior: { hp: 100, mp: 50, attack: 15, defense: 10, speed: 8 },
      mage: { hp: 70, mp: 100, attack: 8, defense: 5, speed: 7 },
      archer: { hp: 80, mp: 60, attack: 12, defense: 7, speed: 12 }
    };
    return stats[className] || stats.warrior;
  }

  async _loadGameData() {
    // Load game data from configuration
    this.gameData = require('../data/gameData.json');
  }

  async _giveStarterItems(player) {
    const starterItems = this.gameData.starterItems[player.class];
    for (const item of starterItems) {
      await this.inventorySystem.addItem(player, item);
    }
  }

  generateId() {
    return uuidv4();
  }
}

module.exports = new RPGEngine();