const DungeonGenerator = require('./DungeonGenerator');
const DungeonRoom = require('./DungeonRoom');
const Logger = require('../../utils/Logger');

class DungeonSystem {
  constructor(engine) {
    this.engine = engine;
    this.activeInstances = new Map();
    this.generator = new DungeonGenerator();
  }

  createDungeon(level, difficulty = 'normal') {
    const dungeon = {
      id: `dungeon_${Date.now()}`,
      level,
      difficulty,
      rooms: this.generator.generateRooms(level, difficulty),
      rewards: this._calculateRewards(level, difficulty),
      completed: false,
      startTime: Date.now()
    };

    this.activeInstances.set(dungeon.id, dungeon);
    return dungeon;
  }

  enterRoom(dungeonId, playerId, roomId) {
    const dungeon = this.activeInstances.get(dungeonId);
    if (!dungeon) throw new Error('Dungeon not found');

    const room = dungeon.rooms.find(r => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const result = room.activate(playerId);
    
    if (this._isDungeonComplete(dungeon)) {
      this._completeDungeon(dungeon, playerId);
    }

    return result;
  }

  _isDungeonComplete(dungeon) {
    return dungeon.rooms.every(room => room.completed);
  }

  _completeDungeon(dungeon, playerId) {
    dungeon.completed = true;
    dungeon.completedAt = Date.now();
    
    const player = this.engine.players.get(playerId);
    if (player) {
      this._grantRewards(player, dungeon.rewards);
    }
  }

  _calculateRewards(level, difficulty) {
    const multipliers = {
      easy: 1,
      normal: 1.5,
      hard: 2.5
    };

    return {
      exp: Math.floor(100 * level * multipliers[difficulty]),
      gold: Math.floor(50 * level * multipliers[difficulty]),
      items: this._generateLoot(level, difficulty)
    };
  }

  _generateLoot(level, difficulty) {
    // Implementation for loot generation
    return [];
  }

  _grantRewards(player, rewards) {
    player.gainExp(rewards.exp);
    player.gold += rewards.gold;
    rewards.items.forEach(item => player.inventory.addItem(item));
  }
}

module.exports = DungeonSystem;