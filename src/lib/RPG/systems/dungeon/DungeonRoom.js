class DungeonRoom {
  constructor(type, level, difficulty) {
    this.id = `room_${Date.now()}`;
    this.type = type;
    this.level = level;
    this.difficulty = difficulty;
    this.completed = false;
    this.obstacles = this._generateObstacles();
    this.enemies = this._generateEnemies();
  }

  activate(playerId) {
    if (this.completed) return { status: 'already_completed' };

    const result = {
      obstacles: this.obstacles,
      enemies: this.enemies,
      rewards: this._calculateRoomRewards()
    };

    return result;
  }

  _generateObstacles() {
    const obstacles = [];
    const types = ['trap', 'puzzle', 'barrier'];

    for (let i = 0; i < this.level; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      obstacles.push({
        id: `obstacle_${Date.now()}_${i}`,
        type,
        difficulty: this._calculateDifficulty(),
        solved: false
      });
    }

    return obstacles;
  }

  _generateEnemies() {
    const enemies = [];
    const count = Math.ceil(this.level * 0.5);

    for (let i = 0; i < count; i++) {
      enemies.push({
        id: `enemy_${Date.now()}_${i}`,
        level: this.level,
        type: this._selectEnemyType(),
        stats: this._generateEnemyStats()
      });
    }

    return enemies;
  }

  _calculateDifficulty() {
    const base = this.level * 10;
    const multiplier = {
      easy: 0.8,
      normal: 1,
      hard: 1.5
    }[this.difficulty];

    return Math.floor(base * multiplier);
  }

  _selectEnemyType() {
    const types = ['minion', 'elite', 'boss'];
    return types[Math.floor(Math.random() * types.length)];
  }

  _generateEnemyStats() {
    const baseStats = {
      hp: this.level * 50,
      attack: this.level * 5,
      defense: this.level * 3
    };

    const multiplier = {
      easy: 0.8,
      normal: 1,
      hard: 1.5
    }[this.difficulty];

    Object.keys(baseStats).forEach(stat => {
      baseStats[stat] = Math.floor(baseStats[stat] * multiplier);
    });

    return baseStats;
  }

  _calculateRoomRewards() {
    return {
      exp: this.level * 20,
      gold: this.level * 10,
      items: []
    };
  }
}

module.exports = DungeonRoom;