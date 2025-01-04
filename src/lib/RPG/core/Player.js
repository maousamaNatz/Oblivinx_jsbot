const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(id, className, classData) {
    this.id = id || uuidv4();
    this.className = className;
    this.level = 1;
    this.exp = 0;
    this.gold = 1000;
    this.baseStats = this._initializeStats(classData);
    this.stats = { ...this.baseStats };
    this.inventory = this._initializeInventory();
    this.equipment = this._initializeEquipment();
    this.skills = [];
    this.quests = [];
    this.achievements = [];
    this.reputation = this._initializeReputation();
    this.crafting = this._initializeCrafting();
    this.createdAt = new Date().toISOString();
  }

  _initializeStats(classData) {
    return {
      ...classData.baseStats,
      criticalRate: 5,
      dodgeRate: 3,
      accuracy: 100,
      // Advanced stats
      strength: classData.baseStats.strength,
      dexterity: classData.baseStats.dexterity,
      intelligence: classData.baseStats.intelligence,
      vitality: classData.baseStats.vitality,
      // Resistances
      fireResist: 0,
      frostResist: 0,
      lightningResist: 0,
      poisonResist: 0
    };
  }

  _initializeInventory() {
    return {
      items: [],
      maxSize: 50,
      gold: 1000,
      materials: new Map()
    };
  }

  _initializeEquipment() {
    return {
      HEAD: null,
      NECK: null,
      SHOULDERS: null,
      CHEST: null,
      BACK: null,
      WRISTS: null,
      HANDS: null,
      WAIST: null,
      LEGS: null,
      FEET: null,
      MAIN_HAND: null,
      OFF_HAND: null,
      RING1: null,
      RING2: null
    };
  }

  _initializeReputation() {
    return new Map([
      ['MERCHANTS_GUILD', 0],
      ['WARRIORS_GUILD', 0],
      ['MAGES_GUILD', 0]
    ]);
  }

  _initializeCrafting() {
    return {
      blacksmithing: { level: 1, exp: 0 },
      alchemy: { level: 1, exp: 0 },
      enchanting: { level: 1, exp: 0 }
    };
  }

  gainExp(amount) {
    this.exp += amount;
    this._checkLevelUp();
  }

  _checkLevelUp() {
    const nextLevelExp = this.level * 100;
    if (this.exp >= nextLevelExp) {
      this.level++;
      this.exp -= nextLevelExp;
      this._onLevelUp();
    }
  }

  _onLevelUp() {
    // Increase base stats
    Object.keys(this.baseStats).forEach(stat => {
      if (['strength', 'dexterity', 'intelligence', 'vitality'].includes(stat)) {
        this.baseStats[stat] += 2;
      }
    });

    // Recalculate total stats
    this._recalculateStats();
  }

  _recalculateStats() {
    // Reset to base stats
    this.stats = { ...this.baseStats };

    // Add equipment stats
    Object.values(this.equipment).forEach(item => {
      if (item) {
        const itemStats = item.calculateStats();
        Object.entries(itemStats).forEach(([stat, value]) => {
          this.stats[stat] = (this.stats[stat] || 0) + value;
        });
      }
    });

    // Calculate derived stats
    this.stats.hp = this.stats.vitality * 10 + this.baseStats.hp;
    this.stats.mp = this.stats.intelligence * 5 + this.baseStats.mp;
    this.stats.attack += Math.floor(this.stats.strength * 0.5);
    this.stats.defense += Math.floor(this.stats.vitality * 0.3);
    this.stats.criticalRate += Math.floor(this.stats.dexterity * 0.2);
  }

  gainReputation(faction, amount) {
    if (this.reputation.has(faction)) {
      const current = this.reputation.get(faction);
      this.reputation.set(faction, Math.min(1000, Math.max(-1000, current + amount)));
    }
  }

  gainCraftingExp(craft, amount) {
    if (this.crafting[craft]) {
      this.crafting[craft].exp += amount;
      this._checkCraftingLevelUp(craft);
    }
  }

  _checkCraftingLevelUp(craft) {
    const craftData = this.crafting[craft];
    const nextLevel = craftData.level * 100;
    if (craftData.exp >= nextLevel) {
      craftData.level++;
      craftData.exp -= nextLevel;
    }
  }
}

module.exports = Player;