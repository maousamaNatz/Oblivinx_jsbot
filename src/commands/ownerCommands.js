const { botLogger } = require("../utils/logger");
const { config } = require("../../config/config");
const { banUser, unbanUser, pool } = require("../../config/dbConf/database");
const fs = require("fs");
const path = require("path");
Oblixn.cmd({
  name: "ownerinfo",
  alias: ["owner"],
  desc: "Menampilkan informasi owner bot",
  category: "info",
  async exec(msg) {

    try {
      // Dapatkan nomor pengirim dengan format yang benar
      const senderNumber = msg.sender?.split("@")[0];
      const owner1 = process.env.OWNER_NUMBER_ONE;
      const owner2 = process.env.OWNER_NUMBER_TWO;

      // Basic message untuk semua pengguna
      const basicMessage = `*OWNER BOT CONTACT*

Silahkan hubungi owner jika ada keperluan penting!

*Owner 1* 
• Nama: ${process.env.OWNER1_NAME}
• WA: wa.me/${owner1}

*Owner 2*
• Nama: ${process.env.OWNER2_NAME}
• WA: wa.me/${owner2}

_Note: Mohon chat owner jika ada keperluan penting saja_`;

      // Kirim pesan menggunakan sendMessage
      await Oblixn.sock.sendMessage(msg.from, {
        text: basicMessage,
      });
    } catch (error) {
      console.error("Error in ownerinfo command:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Kirim pesan error yang aman
      if (msg && msg.from) {
        await Oblixn.sock.sendMessage(msg.from, {
          text: "❌ Terjadi kesalahan pada sistem",
        });
      }
    }
  },
});
// Command restart bot
Oblixn.cmd({
  name: "restart",
  desc: "Restart bot",
  category: "ownerCommand",
  async exec(msg) {
    if (!Oblixn.isOwner(msg.sender)) {
      return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
    }

    await msg.reply("🔄 Memulai ulang bot...");
    process.exit(1); // PM2 akan otomatis restart process
  },
});

// Command shutdown bot
Oblixn.cmd({
  name: "shutdown",
  desc: "Matikan bot",
  category: "ownerCommand",
  async exec(msg) {
    if (!Oblixn.isOwner(msg.sender)) {
      return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
    }

    await msg.reply("⚠️ Mematikan bot...");
    process.exit(0);
  },
});

// Command broadcast
Oblixn.cmd({
  name: "broadcast",
  alias: ["bc"],
  desc: "Broadcast pesan ke semua chat",
  category: "ownerCommand",
  async exec(msg, { args }) {
    try {
      const sender = msg.key.participant || msg.from; // Nomor pengirim
      const senderNumber = sender.split("@")[0]; // Mendapatkan nomor pengirim tanpa domain
      const mentionJid = `${senderNumber}@s.whatsapp.net`; // Membuat JID pengirim
      // Cek apakah pengirim adalah owner
      if (!Oblixn.isOwner(msg.sender)) {
        return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
      }

      // Cek pesan yang akan di broadcast
      const message = args.join(" ");
      if (!message && !msg.message.imageMessage) {
        return msg.reply(`❌ Format salah!

*Cara Penggunaan Broadcast:*
1️⃣ Broadcast Teks:
!bc [teks]

2️⃣ Broadcast dengan Reply Gambar:
• Reply gambar + ketik:
!bc [caption]

3️⃣ Broadcast dengan Kirim Gambar:
• Kirim gambar + ketik di caption:
!bc [caption]

4️⃣ Broadcast Gambar dari URL:
!bc image [URL] [caption]`);
      }

      // Dapatkan semua chat
      const chats = await Oblixn.sock.groupFetchAllParticipating();
      const chatIds = Object.keys(chats);

      // Kirim notifikasi awal
      await msg.reply(`🔄 Memulai broadcast ke ${chatIds.length} chat...`);

      let successCount = 0;
      let failCount = 0;

      // Cek jenis broadcast
      const isImageUrl = message?.startsWith("image ");
      const isImageMessage = msg.message.imageMessage;
      const quotedMsg =
        msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const isReplyImage = quotedMsg?.imageMessage;

      // Fungsi untuk broadcast
      async function broadcastMessage(chatId, content) {
        try {
          await Oblixn.sock.sendMessage(chatId, content);
          successCount++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          failCount++;
          console.error(`Broadcast error for ${chatId}:`, error);
        }
      }

      // Proses broadcast berdasarkan jenis
      if (isImageMessage) {
        // Broadcast gambar yang dikirim langsung
        const media = await Oblixn.sock.downloadMediaMessage(
          msg.message.imageMessage
        );
        const caption = message || "";

        for (const chatId of chatIds) {
          await broadcastMessage(chatId, {
            image: media,
            caption: `*[BROADCAST MESSAGE DARI @${senderNumber}]*\n\n${caption}`,
            mentions: [mentionJid],
          });
        }
      } else if (isImageUrl) {
        // Broadcast gambar dari URL
        const [cmd, url, ...caption] = message.split(" ");
        const captionText = caption.join(" ");

        for (const chatId of chatIds) {
          await broadcastMessage(chatId, {
            image: { url: url },
            caption: `*[BROADCAST MESSAGE DARI @${senderNumber}]*\n\n${captionText}`,
            mentions: [mentionJid],
          });
        }
      } else if (isReplyImage) {
        // Broadcast gambar yang di-reply
        const media = await Oblixn.sock.downloadMediaMessage(
          quotedMsg.imageMessage
        );

        for (const chatId of chatIds) {
          await broadcastMessage(chatId, {
            image: media,
            caption: `*[BROADCAST MESSAGE DARI @${senderNumber}]*\n\n${message}`,
            mentions: [mentionJid],
          });
        }
      } else {
        // Broadcast teks biasa
        for (const chatId of chatIds) {
          await broadcastMessage(chatId, {
            text: `*[BROADCAST MESSAGE DARI @${senderNumber}]*\n\n${message}`,
            mentions: [mentionJid],
          });
        }
      }

      // Kirim laporan hasil broadcast
      const broadcastType = isImageMessage
        ? "Gambar (Kirim) + Caption"
        : isImageUrl
        ? "Gambar (URL) + Caption"
        : isReplyImage
        ? "Gambar (Reply) + Caption"
        : "Teks";

      await msg.reply(
        `✅ Broadcast selesai!

*Detail Broadcast:*
📝 Tipe: ${broadcastType}
✅ Berhasil: ${successCount} chat
❌ Gagal: ${failCount} chat

_Broadcast selesai dalam ${successCount + failCount} detik_`
      );
    } catch (error) {
      console.error("Error in broadcast command:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      await msg.reply("❌ Terjadi kesalahan saat melakukan broadcast");
    }
  },
});

// Command ban user
Oblixn.cmd({
  name: "ban",
  alias: ["block"],
  desc: "Ban user dari menggunakan bot",
  category: "admin",
  async exec(msg, { args }) {
    try {
      console.log('=== BAN COMMAND START ===');
      
      // Cek apakah pengirim adalah owner
      if (!Oblixn.isOwner(msg.sender)) {
        return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
      }

      // Dapatkan user yang akan diban
      let targetUser;
      if (msg.quoted) {
        targetUser = msg.quoted.participant || msg.quoted.sender;
        console.log('Target from quote:', targetUser);
      } else if (msg.mentions && msg.mentions.length > 0) {
        targetUser = msg.mentions[0];
        console.log('Target from mention:', targetUser);
      } else if (args[0]) {
        // Format nomor
        let number = args[0].replace(/[^0-9]/g, "");
        console.log('Original number:', number);
        
        if (number.startsWith("0")) {
          number = "62" + number.slice(1);
        } else if (!number.startsWith("62")) {
          number = "62" + number;
        }
        targetUser = number;
        console.log('Formatted number:', targetUser);
      }

      if (!targetUser) {
        return msg.reply(`❌ Format salah!
        
*Cara Penggunaan:*
1. Tag user: !ban @user alasan
2. Reply chat: !ban alasan
3. Nomor: !ban 628xxx alasan`);
      }

      // Normalisasi format nomor
      targetUser = targetUser.replace('@s.whatsapp.net', '');
      targetUser = targetUser.replace('+', '');
      if (targetUser.startsWith('08')) {
        targetUser = '62' + targetUser.slice(1);
      }
      console.log('Normalized target user:', targetUser);

      // Dapatkan alasan ban
      const reason = msg.quoted
        ? args.join(" ")
        : args.slice(1).join(" ") || "Tidak ada alasan";

      // Normalisasi format sender untuk database
      let normalizedSender = msg.sender.replace('@s.whatsapp.net', '');
      normalizedSender = normalizedSender.replace('+', '');
      if (normalizedSender.startsWith('08')) {
        normalizedSender = '62' + normalizedSender.slice(1);
      }

      // Proses ban user tanpa memblokir di WhatsApp
      const result = await banUser(targetUser, reason, normalizedSender);
      
      if (result.success) {
        return msg.reply(
          `✅ Berhasil ban user @${targetUser}\n\n` +
          `*Detail Ban:*\n` +
          `📝 Alasan: ${reason}\n` +
          `👤 Dibanned oleh: @${normalizedSender}\n` +
          `ℹ️ Status: Banned (masih bisa menghubungi bot)`,
          {
            mentions: [`${targetUser}@s.whatsapp.net`, `${normalizedSender}@s.whatsapp.net`]
          }
        );
      } else {
        return msg.reply(`❌ ${result.message}`);
      }

    } catch (error) {
      console.error('=== BAN COMMAND ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return msg.reply(`❌ Terjadi kesalahan saat memproses command ban: ${error.message}`);
    }
  },
});

// Command untuk unban
Oblixn.cmd({
  name: "unban",
  alias: ["unblock"],
  desc: "Unban user yang telah diban",
  category: "admin",
  async exec(msg, { args }) {
    try {
      console.log('=== UNBAN COMMAND START ===');
      
      // Cek apakah pengirim adalah owner
      if (!Oblixn.isOwner(msg.sender)) {
        return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
      }

      // Dapatkan user yang akan diunban
      let targetUser;
      if (msg.quoted) {
        targetUser = msg.quoted.participant || msg.quoted.sender;
        console.log('Target from quote:', targetUser);
      } else if (msg.mentions && msg.mentions.length > 0) {
        targetUser = msg.mentions[0];
        console.log('Target from mention:', targetUser);
      } else if (args[0]) {
        // Format nomor
        let number = args[0].replace(/[^0-9]/g, "");
        console.log('Original number:', number);
        
        if (number.startsWith("0")) {
          number = "62" + number.slice(1);
        } else if (!number.startsWith("62")) {
          number = "62" + number;
        }
        targetUser = number;
        console.log('Formatted number:', targetUser);
      }

      if (!targetUser) {
        return msg.reply(`❌ Format salah!
        
*Cara Penggunaan:*
1. Tag user: !unban @user
2. Reply chat: !unban
3. Nomor: !unban 628xxx`);
      }

      // Normalisasi format nomor
      targetUser = targetUser.replace('@s.whatsapp.net', '');
      targetUser = targetUser.replace('+', '');
      if (targetUser.startsWith('08')) {
        targetUser = '62' + targetUser.slice(1);
      }
      console.log('Normalized target user:', targetUser);

      // Proses unban user
      const result = await unbanUser(targetUser);
      console.log('Unban result:', result);

      if (result.success) {
        // Unblock di WhatsApp
        try {
          await Oblixn.sock.updateBlockStatus(`${targetUser}@s.whatsapp.net`, "unblock");
          console.log('WhatsApp unblock successful');
        } catch (blockError) {
          console.log('WhatsApp unblock error:', blockError);
        }

        return msg.reply(
          `✅ Berhasil unban user @${targetUser}
          
*Detail:*
📝 Status: ${result.wasUnbanned ? 'Diunban dari database' : 'Sudah tidak dibanned'}`,
          {
            mentions: [`${targetUser}@s.whatsapp.net`]
          }
        );
      } else {
        return msg.reply(`❌ ${result.message}`);
      }

    } catch (error) {
      console.error('=== UNBAN COMMAND ERROR ===');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      return msg.reply(`❌ Terjadi kesalahan saat memproses command unban: ${error.message}`);
    }
  },
});

// Command list banned users
Oblixn.cmd({
  name: "listban",
  desc: "Menampilkan list user yang di ban",
  category: "ownerCommand",
  async exec(msg) {
    if (!Oblixn.isOwner(msg.sender)) {
      return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
    }

    try {
      // Ambil data banned users dari database
      const [bannedUsers] = await pool.execute(
        "SELECT user_id, reason, banned_by, banned_at FROM banned_users"
      );

      if (!bannedUsers || bannedUsers.length === 0) {
        return msg.reply("✨ Tidak ada user yang di ban");
      }

      let text = "*DAFTAR USER BANNED*\n\n";
      const mentions = [];

      bannedUsers.forEach((user, index) => {
        const userNumber = user.user_id.split("@")[0];
        const banDate = new Date(user.banned_at).toLocaleString("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const bannedByNumber = user.banned_by.split("@")[0];

        text += `${index + 1}. @${userNumber}\n`;
        text += `├ Alasan: ${user.reason}\n`;
        text += `├ Dibanned oleh: @${bannedByNumber}\n`;
        text += `└ Tanggal: ${banDate}\n\n`;

        mentions.push(user.user_id);
        mentions.push(user.banned_by);
      });

      await msg.reply(text, {
        mentions: mentions,
      });
    } catch (error) {
      botLogger.error(`Listban error: ${error.message}`);
      await msg.reply("❌ Gagal menampilkan list banned users!");
    }
  },
});
// Command untuk menampilkan bantuan owner
Oblixn.cmd({
  name: "ownerhelp",
  alias: ["adminhelp"],
  desc: "Menampilkan daftar perintah khusus owner",
  category: "owner",
  async exec(msg) {
    try {
      if (!Oblixn.isOwner(msg.sender)) {
        return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
      }

      // Pastikan config ada
      if (!config || !config.owner) {
        console.error("Konfigurasi owner tidak ditemukan");
        return msg.reply("❌ Terjadi kesalahan konfigurasi");
      }

      // Daftar command owner
      const ownerCommands = [
        {
          category: "🛠️ Bot Management",
          commands: [
            "!restart - Restart bot",
            "!shutdown - Matikan bot",
            "!broadcast - Broadcast pesan",
            "!clearcache - Bersihkan cache",
            "!boton - Aktifkan bot",
            "!botoff - Nonaktifkan bot",
          ],
        },
        {
          category: "👥 User Management",
          commands: [
            "!ban - Ban user",
            "!unban - Unban user",
            "!listban - List banned users",
          ],
        },
      ];

      // Buat pesan help
      let helpMessage = `*👑 OWNER COMMANDS 👑*\n\n`;

      // Tambahkan setiap kategori dan commandnya
      ownerCommands.forEach((category) => {
        helpMessage += `*${category.category}:*\n`;
        category.commands.forEach((cmd) => {
          helpMessage += `• ${cmd}\n`;
        });
        helpMessage += "\n";
      });

      // Tambahkan footer
      helpMessage += `\n_Gunakan command dengan bijak!_`;

      await msg.reply(helpMessage);
    } catch (error) {
      console.error("Error dalam ownerhelp:", error);
      await msg.reply("❌ Terjadi kesalahan saat menampilkan menu owner");
    }
  },
});

// Command turn on bot
Oblixn.cmd({
  name: "boton",
  alias: ["turnon", "hidupkan"],
  desc: "Menghidupkan bot",
  category: "ownerCommand",
  isOwner: true,
  async exec(msg) {
    // Cek apakah pengirim adalah owner
    if (!Oblixn.isOwner(msg.sender)) {
      return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
    }
    try {
      // Update status di memory
      Oblixn.isOffline = false;

      // Update status di bot.json
      const configPath = path.join(__dirname, "../json/bot.json");
      const botConfig = JSON.parse(fs.readFileSync(configPath));

      botConfig.bot.status = true;

      fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2));

      await msg.reply(
        "✅ Bot telah diaktifkan\n\n_Bot sekarang dapat digunakan oleh semua user_"
      );
    } catch (error) {
      console.error("Boton Error:", error);
      await msg.reply("❌ Gagal mengaktifkan bot");
    }
  },
});

// Command turn off bot
Oblixn.cmd({
  name: "botoff",
  alias: ["turnoff", "matikan"],
  desc: "Menonaktifkan bot",
  category: "ownerCommand",
  isOwner: true,
  async exec(msg) {
    // Cek apakah pengirim adalah owner
    if (!Oblixn.isOwner(msg.sender)) {
      return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
    }
    try {
      // Update status di memory
      Oblixn.isOffline = true;

      // Update status di bot.json
      const configPath = path.join(__dirname, "../json/bot.json");
      const botConfig = JSON.parse(fs.readFileSync(configPath));

      botConfig.bot.status = false;

      fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2));

      await msg.reply(
        "✅ Bot telah dinonaktifkan\n\n_Bot hanya akan merespon perintah owner_"
      );
    } catch (error) {
      console.error("Botoff Error:", error);
      await msg.reply("❌ Gagal menonaktifkan bot");
    }
  },
});
