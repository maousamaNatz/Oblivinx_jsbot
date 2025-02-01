const { Character, BattleSystem, Inventory, QuestJournal } = require('../lib/rpg');
const { botLogger } = require('../utils/logger');
const langId = require('../i18n/langId.json');
const { World } = require("../lib/rpg/world");

// Simpan data game dalam memory
if (!global.rpgData) {
  global.rpgData = {
    players: new Map(),
    activeBattles: new Map(),
    world: new World()
  };
}

// Command untuk membuat karakter baru
Oblixn.cmd({
  name: "createchar",
  alias: ["newchar", "createcharacter"],
  desc: langId.commands.rpg.createchar,
  category: "rpg",
  async exec(msg, { args }) {
    try {
      const userId = msg.sender;
      
      // Cek apakah sudah punya karakter
      if (global.rpgData.players.has(userId)) {
        return msg.reply(langId.errors.rpg.no_character);
      }

      // Validasi input
      if (!args[0] || !args[1]) {
        return msg.reply(langId.commands.rpg.createchar);
      }

      const [name, className] = [args[0], args[1].toLowerCase()];
      const validClasses = ['warrior', 'mage', 'assassin', 'archer'];

      if (!validClasses.includes(className)) {
        return msg.reply(langId.errors.rpg.invalid_class);
      }

      // Buat karakter baru
      const character = new Character(name, className.charAt(0).toUpperCase() + className.slice(1));
      global.rpgData.players.set(userId, character);

      return msg.reply(langId.guides.rpg.character_created
        .replace('${name}', character.name)
        .replace('${className}', character.className)
        .replace('${hp}', character.maxHp)
        .replace('${mp}', character.maxMp)
        .replace('${stamina}', character.maxStamina)
      );

    } catch (error) {
      botLogger.error("Error in createchar command:", error);
      return msg.reply(langId.errors.generic);
    }
  }
});

// Command untuk melihat profil karakter
Oblixn.cmd({
  name: "profile", 
  alias: ["mychar", "status"],
  desc: langId.commands.rpg.profile,
  category: "rpg",
  async exec(msg) {
    try {
      const userId = msg.sender;
      const char = global.rpgData.players.get(userId);

      if (!char) {
        return msg.reply(langId.errors.rpg.no_character);
      }

      return msg.reply(langId.info.rpg.profile
        .replace('${name}', char.name)
        .replace('${className}', char.className)
        .replace('${level}', char.level)
        .replace('${gold}', char.gold)
        .replace('${hp}', char.hp)
        .replace('${maxHp}', char.maxHp)
        .replace('${mp}', char.mp)
        .replace('${maxMp}', char.maxMp)
        .replace('${stamina}', char.stamina)
        .replace('${maxStamina}', char.maxStamina)
      );

    } catch (error) {
      botLogger.error("Error in profile command:", error);
      return msg.reply(langId.errors.generic);
    }
  }
});

// Command untuk battle
Oblixn.cmd({
  name: "battle",
  alias: ["fight", "duel"],
  desc: langId.commands.rpg.battle,
  category: "rpg",
  async exec(msg, { args }) {
    try {
      const userId = msg.sender;
      const char = global.rpgData.players.get(userId);

      if (!char) {
        return msg.reply(langId.errors.rpg.no_character);
      }

      // Cek apakah sedang dalam battle
      if (global.rpgData.activeBattles.has(userId)) {
        return msg.reply(langId.errors.rpg.in_battle);
      }

      // Generate musuh random sesuai level
      const enemy = new Character("Monster", "Warrior");
      enemy.level = Math.max(1, char.level - 1 + Math.floor(Math.random() * 3));
      
      // Mulai battle
      const battle = new BattleSystem([char], [enemy]);
      global.rpgData.activeBattles.set(userId, battle);

      return msg.reply(langId.guides.rpg.battle_start
        .replace('${enemyName}', enemy.name)
        .replace('${level}', enemy.level)
        .replace('${hp}', enemy.hp)
        .replace('${maxHp}', enemy.maxHp)
        .replace('${attack}', enemy.attack)
        .replace('${defense}', enemy.defense)
      );

    } catch (error) {
      botLogger.error("Error in battle command:", error);
      return msg.reply(langId.errors.generic);
    }
  }
});

// Command untuk menyerang dalam battle
Oblixn.cmd({
  name: "attack",
  desc: langId.commands.rpg.battle,
  category: "rpg",
  async exec(msg) {
    try {
      const userId = msg.sender;
      const battle = global.rpgData.activeBattles.get(userId);

      if (!battle) {
        return msg.reply(langId.errors.rpg.in_battle);
      }

      const result = battle.executeTurn({type: 'attack'});
      
      // Cek apakah battle selesai
      if (battle.checkBattleEnd()) {
        global.rpgData.activeBattles.delete(userId);
        const char = global.rpgData.players.get(userId);
        
        // Berikan reward jika menang
        if (char.hp > 0) {
          const expGain = Math.floor(Math.random() * 50) + 50;
          const goldGain = Math.floor(Math.random() * 100) + 100;
          char.exp += expGain;
          char.gold += goldGain;
          
          return msg.reply(langId.guides.rpg.victory
            .replace('${exp}', expGain)
            .replace('${gold}', goldGain)
          );
        } else {
          return msg.reply(langId.guides.rpg.defeat);
        }
      }

      return msg.reply(result);

    } catch (error) {
      botLogger.error("Error in attack command:", error);
      return msg.reply(langId.errors.generic);
    }
  }
});

// Command untuk menggunakan skill
Oblixn.cmd({
  name: "skill",
  desc: langId.commands.rpg.skill,
  category: "rpg",
  async exec(msg, { args }) {
    try {
      const userId = msg.sender;
      const battle = global.rpgData.activeBattles.get(userId);
      const char = global.rpgData.players.get(userId);

      if (!battle) {
        return msg.reply(langId.errors.rpg.in_battle);
      }

      if (!args[0]) {
        return msg.reply(`*${langId.commands.rpg.skill}:*\n${char.skills.join('\n')}`);
      }

      const skillName = args.join(" ");
      const result = char.useSkill(skillName, battle.enemies[0]);

      return msg.reply(result);

    } catch (error) {
      botLogger.error("Error in skill command:", error);
      return msg.reply(langId.errors.rpg.skill_fail);
    }
  }
});

// Command untuk inventory
Oblixn.cmd({
  name: "inventory",
  alias: ["inv"],
  desc: langId.commands.rpg.inventory,
  category: "rpg",
  async exec(msg) {
    try {
      const userId = msg.sender;
      const char = global.rpgData.players.get(userId);

      if (!char) {
        return msg.reply(langId.errors.rpg.no_character);
      }

      const inv = char.inventory;
      let itemList = '';
      
      inv.items.forEach(item => {
        itemList += `• ${item.name} (${item.type})\n`;
      });

      return msg.reply(langId.info.rpg.inventory
        .replace('${weight}', inv.currentWeight)
        .replace('${maxWeight}', inv.maxWeight)
        .replace('${items}', itemList || 'Kosong')
        .replace('${weapon}', char.equipment.weapon?.name || 'None')
        .replace('${armor}', char.equipment.armor?.name || 'None')
        .replace('${accessory}', char.equipment.accessory?.name || 'None')
      );

    } catch (error) {
      botLogger.error("Error in inventory command:", error);
      return msg.reply(langId.errors.generic);
    }
  }
});

// Ekspor class World
module.exports = { World }; 