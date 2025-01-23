const fs = require('fs');
const path = require('path');

// Import data RPG
const rpgData = require('../json/games/rpg.json');
const rpgUsersPath = path.join(__dirname, '../json/users/rpg_player.json');
let rpgUsers = require('../json/users/rpg_player.json');

// Helper function untuk menyimpan data user
const saveUserData = () => {
    fs.writeFileSync(rpgUsersPath, JSON.stringify(rpgUsers, null, 2));
};

// Command RPG Start
global.Oblixn.cmd({
    name: "rpgstart",
    alias: ["rpgstart"],
    desc: "Memulai permainan RPG",
    category: "games",
    async exec(msg, args) {
        try {
            // Pastikan args selalu ada dengan nilai default array kosong
            args = args || [];
            
            // Cek apakah user sudah terdaftar
            const userId = msg.sender;
            
            // Tambahkan validasi data
            if (!userId) {
                return msg.reply("❌ Gagal mendapatkan ID pengguna");
            }

            // Perbaikan untuk mendapatkan sender ID
            const sender = msg.sender || msg.senderNumber;
            const pushName = msg.pushName || "Player";

            // Inisialisasi users jika belum ada
            if (!rpgUsers.users) {
                rpgUsers.users = {};
            }

            // Cek apakah user sudah memiliki karakter
            if (rpgUsers.users[sender]) {
                return await msg.reply('❌ Kamu sudah memiliki karakter!');
            }

            const className = args[0]?.toUpperCase();
            if (!className || !rpgData.data.characters.classes[className]) {
                return await msg.reply('❌ Pilih class: WARRIOR/ARCHER/MAGE/ROGUE\nContoh: !rpgstart WARRIOR');
            }

            const classData = rpgData.data.characters.classes[className];
            rpgUsers.users[sender] = {
                name: pushName,
                class: className,
                level: 1,
                exp: 0,
                gold: 100,
                stats: { ...classData.baseStats },
                inventory: {
                    items: [],
                    equipment: {
                        weapon: null,
                        armor: null,
                        accessory: null
                    }
                },
                skills: [],
                lastActivity: new Date().toISOString()
            };

            saveUserData();

            await msg.reply(`✅ Karakter berhasil dibuat!
Class: ${classData.name}
Level: 1
HP: ${classData.baseStats.health}
MP: ${classData.baseStats.mana}
Attack: ${classData.baseStats.attack}
Defense: ${classData.baseStats.defense}`);
        } catch (error) {
            console.error("RPG Start Error:", error);
            return msg.reply("❌ Terjadi kesalahan saat memulai RPG. Silakan coba lagi.");
        }
    }
});

// Command RPG Profile
Oblixn.cmd({
    name: "rpgprofile",
    alias: ["profile", "status"],
    desc: "Melihat status karakter RPG",
    category: "games",
    isLimit: true,
    async exec(msg, sock, args) {
        const sender = msg.sender || msg.senderNumber;
        
        try {
            if (!rpgUsers.users) {
                rpgUsers.users = {};
            }

            const userData = rpgUsers.users[sender];
            if (!userData) {
                return await msg.reply('❌ Kamu belum memiliki karakter! Ketik !rpgstart untuk membuat karakter');
            }

            await msg.reply(`📊 *Status Karakter*
Nama: ${userData.name}
Class: ${rpgData.data.characters.classes[userData.class].name}
Level: ${userData.level}
EXP: ${userData.exp}
Gold: ${userData.gold}

Stats:
❤️ HP: ${userData.stats.health}
💫 MP: ${userData.stats.mana}
⚔️ Attack: ${userData.stats.attack}
🛡️ Defense: ${userData.stats.defense}`);
        } catch (error) {
            console.error('RPG Profile Error:', error);
            await msg.reply('❌ Terjadi kesalahan sistem. Silakan coba lagi nanti.');
        }
    }
});

// Command RPG Inventory
Oblixn.cmd({
    name: "rpginventory",
    alias: ["inventory", "inv"],
    desc: "Melihat inventory karakter RPG",
    category: "games",
    isLimit: true,
    async exec(msg, sock, args) {
        const sender = msg.sender || msg.senderNumber;
        
        try {
            if (!rpgUsers.users) {
                rpgUsers.users = {};
            }

            const userInv = rpgUsers.users[sender];
            if (!userInv) {
                return await msg.reply('❌ Kamu belum memiliki karakter!');
            }

            const equipment = userInv.inventory.equipment;
            const items = userInv.inventory.items;

            await msg.reply(`🎒 *Inventory*
Equipment:
⚔️ Weapon: ${equipment.weapon || 'None'}
🛡️ Armor: ${equipment.armor || 'None'}
💍 Accessory: ${equipment.accessory || 'None'}

Items:
${items.length > 0 ? items.map(item => `- ${item}`).join('\n') : 'Empty'}`);
        } catch (error) {
            console.error('RPG Inventory Error:', error);
            await msg.reply('❌ Terjadi kesalahan sistem. Silakan coba lagi nanti.');
        }
    }
});

// Command RPG Help
Oblixn.cmd({
    name: "rpghelp",
    alias: ["rpgmenu"],
    desc: "Menampilkan bantuan RPG game",
    category: "games",
    isLimit: true,
    async exec(msg, sock, args) {
        try {
            await msg.reply(`🎮 *RPG Game Commands*

!rpgstart <class> - Buat karakter baru
!rpgprofile - Lihat status karakter
!rpginventory - Lihat inventory
!rpghelp - Tampilkan bantuan

Available Classes:
⚔️ Warrior - Tank & Defense
🏹 Archer - Range & Critical
🔮 Mage - Magic & Burst Damage
🗡️ Rogue - Speed & Agility`);
        } catch (error) {
            console.error('RPG Help Error:', error);
            await msg.reply('❌ Terjadi kesalahan sistem. Silakan coba lagi nanti.');
        }
    }
});
