// Command untuk menampilkan menu utama RPG
const showMainMenu = async (msg) => {
  return await msg.reply(`🎮 *RPG Game Commands*
  
  !rpg start <class> - Buat karakter baru
  !rpg profile - Lihat status karakter
  !rpg inventory - Lihat inventory
  !rpg help - Tampilkan bantuan
  
  Available Classes:
  ⚔️ Warrior - High HP & Defense
  🔮 Mage - High MP & Magic Attack  
  🏹 Archer - High Speed & Critical`);
};

// Command untuk membuat karakter baru
const createCharacter = async (msg, args) => {
  const { sender, pushName } = msg;
  const className = args[1]?.toLowerCase();
  
  if (!className || !["warrior", "mage", "archer"].includes(className)) {
    return await msg.reply(
      "❌ Pilih class: warrior/mage/archer\nContoh: !rpg start warrior"
    );
  }

  const player = {
    userId: sender,
    name: pushName,
    className: className,
    level: 1,
    exp: 0,
    gold: 0,
    stats: getBaseStats(className),
  };

  return await msg.reply(`✅ Karakter berhasil dibuat!
Class: ${className}
Level: ${player.level}
HP: ${player.stats.hp}
MP: ${player.stats.mp}`);
};

// Command untuk melihat profil karakter
const showProfile = async (msg) => {
  const { pushName } = msg;
  const profile = {
    name: pushName,
    className: "warrior", 
    level: 1,
    exp: 0,
    gold: 0,
    stats: {
      hp: 100,
      mp: 50,
      attack: 15,
      defense: 10,
      speed: 8,
    },
  };

  return await msg.reply(`📊 *Status Karakter*
Nama: ${profile.name}
Class: ${profile.className}
Level: ${profile.level}
EXP: ${profile.exp}
Gold: ${profile.gold}

Stats:
❤️ HP: ${profile.stats.hp}
💫 MP: ${profile.stats.mp}
⚔️ Attack: ${profile.stats.attack}
🛡️ Defense: ${profile.stats.defense}
🏃 Speed: ${profile.stats.speed}`);
};

// Command untuk menampilkan bantuan
const showHelp = async (msg) => {
  return await msg.reply(`🎮 *RPG Game Commands*
  
  !rpg start <class> - Buat karakter baru
  !rpg profile - Lihat status karakter
  !rpg inventory - Lihat inventory
  !rpg help - Tampilkan bantuan
  
  Available Classes:
  ⚔️ Warrior - High HP & Defense
  🔮 Mage - High MP & Magic Attack  
  🏹 Archer - High Speed & Critical`);
};

// Helper function untuk mendapatkan base stats berdasarkan class
function getBaseStats(className) {
  const stats = {
    warrior: { hp: 100, mp: 50, attack: 15, defense: 10, speed: 8 },
    mage: { hp: 70, mp: 100, attack: 8, defense: 5, speed: 7 },
    archer: { hp: 80, mp: 60, attack: 12, defense: 7, speed: 12 },
  };
  return stats[className];
}

// Main RPG Command Handler
Oblixn.cmd({
  name: "rpg",
  alias: ["rpg", "game"],
  desc: "RPG Game Commands",
  category: "games", 
  isLimit: true,
  async exec(msg, sock, args) {
    try {
      if (!args.length) {
        return await showMainMenu(msg);
      }

      const command = args[0].toLowerCase();

      switch (command) {
        case "start":
          return await createCharacter(msg, args);
        case "profile":
        case "status":
          return await showProfile(msg);
        case "help":
          return await showHelp(msg);
        default:
          return await msg.reply(
            "❌ Command tidak valid. Ketik !rpg help untuk melihat command yang tersedia"
          );
      }
    } catch (error) {
      console.error("RPG Command Error:", error);
      await msg.reply("❌ Terjadi kesalahan sistem. Silakan coba lagi nanti.");
    }
  },
});
