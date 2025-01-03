const { botLogger } = require("../utils/logger");
const { config } = require("../../config/config");
const { banUser, pool, unbanUser, checkBanStatus, getListBannedUsers } = require("../../config/dbConf/database");
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
      botLogger.error("Error in ownerinfo command:", {
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
  desc: "Ban user dari menggunakan bot",
  category: "ownerCommand",
  async exec(msg, { args }) {
    try {
      if (!Oblixn.isOwner(msg.sender)) {
        return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
      }

      // Dapatkan nomor yang akan diban
      const number = args[0]?.replace(/[^0-9]/g, "");
      if (!number) {
        return msg.reply("❌ Format salah! Gunakan: !ban nomor alasan");
      }

      // Dapatkan alasan ban
      const reason = args.slice(1).join(" ") || "Tidak ada alasan";
      const userId = number.endsWith("@s.whatsapp.net") ? number : `${number}@s.whatsapp.net`;

      const result = await banUser(userId, reason, msg.sender);
      if (result.success) {
        await msg.reply(`✅ Berhasil ban user ${number}\nAlasan: ${reason}`);
      } else {
        await msg.reply(`❌ Gagal ban user: ${result.message}`);
      }
    } catch (error) {
      console.error("Error in ban command:", error);
      await msg.reply("❌ Terjadi kesalahan saat memproses perintah");
    }
  },
});

// Command unban user
Oblixn.cmd({
  name: "unban",
  desc: "Unban user yang dibanned",
  category: "ownerCommand",
  async exec(msg, { args }) {
    try {
      if (!Oblixn.isOwner(msg.sender)) {
        return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
      }

      // Validasi input
      if (!args[0]) {
        return msg.reply("❌ Format salah! Gunakan: !unban nomor");
      }

      // Normalisasi format nomor
      let number = args[0].replace(/[^0-9]/g, "");
      
      // Pastikan format nomor benar
      if (!number.startsWith("62")) {
        if (number.startsWith("0")) {
          number = "62" + number.slice(1);
        } else if (number.startsWith("8")) {
          number = "62" + number;
        }
      }

      console.log('Attempting to unban number:', {
        originalNumber: args[0],
        normalizedNumber: number
      });

      // Proses unban
      const result = await unbanUser(number);

      if (result.success && result.wasUnbanned) {
        // Format nomor untuk ditampilkan
        const displayNumber = number.startsWith("62") ? number : "62" + number;
        await msg.reply(`✅ Berhasil unban user ${displayNumber}`);
      } else {
        let errorMessage = result.message;
        if (result.message.includes("tidak ditemukan")) {
          errorMessage = `User dengan nomor ${number} tidak ditemukan dalam daftar banned`;
        }
        await msg.reply(`❌ Gagal unban user: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error in unban command:", {
        error: error,
        args: args
      });
      await msg.reply("❌ Terjadi kesalahan saat memproses perintah");
    }
  },
});

// Command listban
Oblixn.cmd({
  name: "listban",
  desc: "Menampilkan daftar user yang dibanned",
  category: "ownerCommand",
  async exec(msg) {
    try {
      if (!Oblixn.isOwner(msg.sender)) {
        return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
      }

      const result = await getListBannedUsers();
      
      if (!result.success) {
        return msg.reply(`❌ Gagal mengambil daftar banned: ${result.message}`);
      }

      if (result.data.length === 0) {
        return msg.reply("📝 Tidak ada user yang dibanned saat ini");
      }

      let message = "*DAFTAR USER BANNED*\n\n";
      result.data.forEach((user, index) => {
        message += `${index + 1}. Nomor: ${user.userId}\n`;
        message += `   Username: ${user.username}\n`;
        message += `   Alasan: ${user.reason}\n`;
        message += `   Dibanned oleh: ${user.bannedBy}\n`;
        message += `   Tanggal: ${user.banDate}\n\n`;
      });

      await msg.reply(message);
    } catch (error) {
      console.error("Error in listban command:", error);
      await msg.reply("❌ Terjadi kesalahan saat memproses perintah");
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
