/*
GAME RPG BERBASIS TEKS DENGAN OOP (VERSI LANJUTAN)
---------------------------------------------------
Struktur yang ditingkatkan:
1. Sistem Kelas Karakter yang lebih kompleks dengan skill tree
2. Sistem Pertarungan taktis dengan status efek dan elemental system
3. Inventory dengan sistem berat dan item crafting
4. Quest chain dan dynamic event system
5. Dunia dengan multiple region dan dungeon system
6. NPC dan shop system yang dinamis
*/

// ==================== KELAS KARAKTER LANJUTAN ====================
class Character {
  constructor(name, className) {
    this.name = name;
    this.className = className;
    this.level = 1;
    this.exp = 0;
    this.gold = 500;
    this.attributes = {
      strength: 10,
      agility: 10,
      intelligence: 10,
      luck: 5
    };
    this.inventory = new Inventory(50); // Kapasitas berat
    this.quests = new QuestJournal();
    this.equipment = {
      weapon: null,
      armor: null,
      accessory: null
    };
    this.statusEffects = [];
    this.skillTree = new SkillTree();
    this.party = []; // Untuk sistem party
    
    // Inisialisasi kelas
    this.initClass(className);
    this.calculateStats();
  }

  initClass(className) {
    const classConfigs = {
      Warrior: { 
        hp: 200, mp: 50, stamina: 100,
        primaryAttr: 'strength',
        skills: ['Power Strike', 'Shield Bash', 'War Cry'],
        growth: { hp: 20, mp: 5, stamina: 15 }
      },
      Mage: {
        hp: 120, mp: 200, stamina: 60,
        primaryAttr: 'intelligence',
        skills: ['Fireball', 'Ice Shield', 'Chain Lightning'],
        growth: { hp: 10, mp: 25, stamina: 5 }
      },
      Assassin: {
        hp: 150, mp: 80, stamina: 120,
        primaryAttr: 'agility',
        skills: ['Backstab', 'Poison Blade', 'Shadow Step'],
        growth: { hp: 15, mp: 10, stamina: 20 }
      },
      Archer: {
        hp: 130, mp: 100, stamina: 100,
        primaryAttr: 'agility',
        skills: ['Precise Shot', 'Multi Arrow', 'Eagle Eye'],
        growth: { hp: 12, mp: 15, stamina: 18 }
      }
    };

    const config = classConfigs[className];
    Object.assign(this, {
      maxHp: config.hp,
      hp: config.hp,
      maxMp: config.mp,
      mp: config.mp,
      maxStamina: config.stamina,
      stamina: config.stamina,
      skills: config.skills,
      classGrowth: config.growth
    });
    
    this.attributes[config.primaryAttr] += 5;
  }

  calculateStats() {
    // Update stats berdasarkan equipment dan attributes
    this.attack = Math.floor(
      this.attributes.strength * 2 +
      (this.equipment.weapon ? this.equipment.weapon.attack : 0)
    );
    
    this.defense = Math.floor(
      this.attributes.agility +
      (this.equipment.armor ? this.equipment.armor.defense : 0)
    );
    
    this.magicAttack = Math.floor(
      this.attributes.intelligence * 2 +
      (this.equipment.weapon ? this.equipment.weapon.magicAttack : 0)
    );
  }

  levelUp() {
    this.level++;
    this.maxHp += this.classGrowth.hp;
    this.maxMp += this.classGrowth.mp;
    this.maxStamina += this.classGrowth.stamina;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.stamina = this.maxStamina;
    
    // Naikkan atribut utama
    const primaryAttr = classConfigs[this.className].primaryAttr;
    this.attributes[primaryAttr] += 3;
    this.attributes.luck += 1;
    
    this.calculateStats();
    return `Level up! Now level ${this.level}`;
  }

  useSkill(skillName, target) {
    const skill = SkillDB[skillName];
    if (!skill || !this.skills.includes(skillName)) return "Skill tidak tersedia!";
    
    if (this.mp < skill.mpCost || this.stamina < skill.staminaCost) 
      return "Resource tidak cukup!";
    
    this.mp -= skill.mpCost;
    this.stamina -= skill.staminaCost;
    
    // Implementasi efek skill
    let result = skill.execute(this, target);
    return result;
  }
}

// ==================== SISTEM PERTARUNGAN TAKTIS ====================
class BattleSystem {
  constructor(party, enemies) {
    this.party = party;
    this.enemies = enemies;
    this.turnOrder = [];
    this.currentTurn = 0;
    this.battleLog = [];
    this.elementalMatrix = {
      fire: { strongAgainst: 'ice', weakAgainst: 'water' },
      water: { strongAgainst: 'fire', weakAgainst: 'earth' },
      earth: { strongAgainst: 'water', weakAgainst: 'wind' },
      wind: { strongAgainst: 'earth', weakAgainst: 'fire' }
    };
    
    this.initBattle();
  }

  initBattle() {
    // Generate turn order berdasarkan agility
    const allCombatants = [...this.party, ...this.enemies];
    this.turnOrder = allCombatants.sort((a,b) => 
      b.attributes.agility - a.attributes.agility
    );
  }

  executeTurn(action) {
    const currentCombatant = this.turnOrder[this.currentTurn];
    let result = '';
    
    if (currentCombatant.hp <= 0) {
      this.nextTurn();
      return `${currentCombatant.name} tidak bisa bertindak!`;
    }

    if (this.party.includes(currentCombatant)) {
      result = this.handlePlayerAction(currentCombatant, action);
    } else {
      result = this.handleEnemyAI(currentCombatant);
    }
    
    this.checkBattleEnd();
    this.nextTurn();
    return result;
  }

  handlePlayerAction(combatant, action) {
    // Implementasi aksi pemain yang kompleks
    // [Diimplementasikan di subclass untuk integrasi dengan chatbot]
  }

  handleEnemyAI(enemy) {
    const skills = enemy.skills.filter(s => 
      enemy.mp >= SkillDB[s].mpCost && 
      enemy.stamina >= SkillDB[s].staminaCost
    );
    
    const action = skills.length > 0 && Math.random() > 0.5
      ? skills[Math.floor(Math.random() * skills.length)]
      : 'attack';

    const target = this.party.filter(p => p.hp > 0)[0];
    return enemy.useSkill(action, target);
  }

  calculateDamage(attacker, defender, skill) {
    let baseDamage = attacker.attack;
    if (skill.element) {
      const elementRelation = this.elementalMatrix[skill.element];
      if (elementRelation.strongAgainst === defender.element) {
        baseDamage *= 1.5;
      } else if (elementRelation.weakAgainst === defender.element) {
        baseDamage *= 0.5;
      }
    }
    
    const critChance = attacker.attributes.luck / 100;
    const isCrit = Math.random() < critChance;
    if (isCrit) baseDamage *= 2;
    
    const finalDamage = Math.max(baseDamage - defender.defense, 1);
    return { damage: finalDamage, isCrit };
  }

  checkBattleEnd() {
    const partyAlive = this.party.some(p => p.hp > 0);
    const enemiesAlive = this.enemies.some(e => e.hp > 0);
    
    if (!partyAlive) return 'defeat';
    if (!enemiesAlive) {
      this.distributeRewards();
      return 'victory';
    }
    return null;
  }

  distributeRewards() {
    const totalExp = this.enemies.reduce((sum, e) => sum + e.expReward, 0);
    const totalGold = this.enemies.reduce((sum, e) => sum + e.goldReward, 0);
    const loot = this.enemies.flatMap(e => e.loot);
    
    this.party.forEach(member => {
      member.exp += totalExp;
      if (member.exp >= member.level * 150) member.levelUp();
    });
    
    this.party[0].gold += totalGold;
    loot.forEach(item => this.party[0].inventory.addItem(item));
  }
}

// ==================== SISTEM INVENTORY KOMPLEKS ====================
class Inventory {
  constructor(maxWeight) {
    this.items = [];
    this.maxWeight = maxWeight;
    this.equipped = {
      weapon: null,
      armor: null,
      accessory: null
    };
  }

  get currentWeight() {
    return this.items.reduce((sum, item) => sum + item.weight, 0);
  }

  addItem(item) {
    if (this.currentWeight + item.weight > this.maxWeight) return false;
    this.items.push(item);
    return true;
  }

  craftItem(recipe) {
    if (!recipe.materials.every(m => 
      this.items.filter(i => i.name === m.name).length >= m.quantity
    )) return "Material tidak cukup";
    
    recipe.materials.forEach(m => {
      for (let i = 0; i < m.quantity; i++) {
        this.removeItem(m.name);
      }
    });
    
    const newItem = ItemDB[recipe.result];
    this.addItem(newItem);
    return `Berhasil membuat ${newItem.name}!`;
  }
}

// ==================== SISTEM QUEST DAN EVENT DINAMIS ====================
class QuestJournal {
  constructor() {
    this.activeQuests = [];
    this.completedQuests = [];
    this.eventFlags = {};
  }

  updateQuestProgress(condition, amount = 1) {
    this.activeQuests.forEach(quest => {
      quest.objectives.forEach(obj => {
        if (obj.condition === condition) {
          obj.current = Math.min(obj.current + amount, obj.required);
          if (obj.current >= obj.required) quest.checkCompletion();
        }
      });
    });
  }

  triggerEvent(eventId) {
    const event = EventDB[eventId];
    if (!event || this.eventFlags[eventId]) return null;
    
    // Cek prerequisit
    if (event.requiredFlags?.some(f => !this.eventFlags[f])) return null;
    
    this.eventFlags[eventId] = true;
    return event;
  }
}

// ==================== DUNIA DAN LOKASI KOMPLEKS ====================
class World {
  constructor() {
    this.regions = {
      ashenvale: {
        name: 'Hutan Ashenvale',
        type: 'forest',
        levels: [1, 15],
        dungeons: ['Darkroot Cavern'],
        towns: ['Elven Village'],
        factions: ['Elven Alliance']
      },
      stormlands: {
        name: 'Dataran Badai',
        type: 'mountain',
        levels: [15, 30],
        dungeons: ['Thunder Peak'],
        towns: ['Dwarven Fortress'],
        factions: ['Dwarven Clan']
      }
    };
    
    this.currentWeather = 'clear';
    this.timeOfDay = 'day';
  }

  generateLocation(regionId, locationType) {
    const region = this.regions[regionId];
    const location = LocationDB[locationType];
    
    return {
      ...location,
      enemies: location.enemies.filter(e => 
        e.level >= region.levels[0] && e.level <= region.levels[1]
      ),
      lootTable: location.lootTable.map(item => ({
        ...item,
        item: ItemDB[item.itemId]
      }))
    };
  }

  changeTime() {
    const hours = new Date().getHours();
    this.timeOfDay = hours > 18 || hours < 6 ? 'night' : 'day';
    this.currentWeather = this.#calculateWeather();
  }

  #calculateWeather() {
    const weatherChances = {
      clear: 60,
      rain: 25,
      storm: 10,
      fog: 5
    };
    return weightedRandom(weatherChances);
  }
}

// ==================== KELAS BANTUAN DAN DATABASE ====================
class Enemy {
  constructor(template) {
    Object.assign(this, template);
    this.hp = template.maxHp;
    this.mp = template.maxMp;
    this.stamina = template.maxStamina;
  }
}

const SkillDB = {
  'Fireball': {
    mpCost: 20,
    staminaCost: 10,
    element: 'fire',
    execute: (user, target) => {
      const damage = user.magicAttack * 1.5;
      target.hp -= damage;
      return `${user.name} meluncurkan Fireball! ${target.name} terkena ${damage} damage!`;
    }
  },
  // ... skill lainnya
};

const ItemDB = {
  'health_potion': {
    name: 'Health Potion',
    type: 'consumable',
    weight: 0.5,
    effect: { hp: 50 }
  },
  // ... item lainnya
};

const LocationDB = {
  forest: {
    enemies: ['Goblin Scout', 'Forest Wolf', 'Treant'],
    lootTable: [
      { itemId: 'herb', chance: 40 },
      { itemId: 'wooden_sword', chance: 10 }
    ],
    specialEvents: ['forest_guardian']
  },
  // ... lokasi lainnya
};

// ==================== IMPLEMENTASI CHATBOT ====================
/*
  [Implementasi chatbot yang lebih kompleks dengan sistem state management
   untuk menangani alur permainan yang dinamis]
*/