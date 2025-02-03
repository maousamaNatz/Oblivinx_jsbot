const {
  makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const {
  getBotCredentials,
  saveBotCredentials,
  pool,
} = require("../../config/dbConf/database");
const { promises: fs } = require("fs");
const path = require("path");
const { baileysLogger ,color, botLogger } = require('../../src/utils/logger');

async function createSubBotSession(phoneNumber) {
  const authFolder = path.join(
    __dirname,
    `../../auth_info_baileys/${phoneNumber}`
  );

  try {
    // Cek apakah nomor sudah terdaftar
    const [existing] = await pool.execute(
      "SELECT number FROM bot_instances WHERE number = ?",
      [phoneNumber]
    );

    if (existing.length > 0) {
      return { success: false, message: "Nomor sudah terdaftar" };
    }

    // Cek folder session dengan access
    try {
      await fs.access(authFolder);
    } catch {
      await fs.mkdir(authFolder, { recursive: true });
    }

    // Generate credentials
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // Gunakan config yang sesuai dengan versi terbaru Baileys
    const sock = makeWASocket({
      printQRInTerminal: true,
      auth: {
        creds: state.creds,
        keys: state.keys,
        mobile: true,
      },
      browser: ["ORBIT-BOT", "Chrome", "3.0"],
      markOnlineOnConnect: true,
      version: [2, 2413, 1],
    });

    // Simpan credentials ke database sesuai struktur tabel
    const credentials = JSON.stringify({
      ...state.creds,
      keys: state.keys,
    });

    await pool.execute(
      "INSERT INTO bot_instances (number, credentials, status, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
      [phoneNumber, credentials, "active"]
    );

    return { success: true, message: "Session created" };
  } catch (error) {
    botLogger.error(`Jadibot Error [${phoneNumber}]:`, error);
    try {
      await fs.rm(authFolder, { recursive: true, force: true });
    } catch (cleanupError) {
      botLogger.error("Cleanup error:", cleanupError);
    }
    return {
      success: false,
      message: error.message.includes("Duplicate")
        ? "Nomor sudah terdaftar"
        : "Gagal membuat session",
    };
  }
}

  Oblixn.cmd({
    name: 'jadibot',
    alias: ['otplogin', 'botregister'],
    desc: 'Aktifkan bot kedua via OTP',
    category: 'owner',
    async exec(msg, { args }) {
      try {
        // Cek izin owner
        if (!permissionHandler.isOwner(msg.sender)) {
          return msg.reply('❌ Hanya owner yang bisa menggunakan fitur ini');
        }

        const targetNumber = args[0] || '6282133839877';
        
        const sock = makeWASocket({
          auth: {
            phoneNumber: targetNumber,
          },
          logger: baileysLogger,
          printQRInTerminal: false
        });

        // Minta OTP via SMS
        const { code, timeout } = await sock.requestRegistrationCode({ 
          phoneNumber: targetNumber,
          method: 'sms'
        });

        await msg.reply(`📲 OTP dikirim ke *${targetNumber}*. Balas pesan ini dengan kode OTP yang diterima dalam 2 menit`);

        // Handler untuk verifikasi OTP
        Oblixn.otpHandlers[targetNumber] = async (otp) => {
          try {
            await sock.registerCode(otp, code);
            
            // Simpan credentials ke database
            const authFolder = path.join(__dirname, `../../auth_info_baileys/${targetNumber}`);
            const credentials = JSON.parse(fs.readFileSync(path.join(authFolder, 'creds.json')));
            await saveBotCredentials(targetNumber, credentials);
            
            // Tambahkan ke child bots
            await initializeBot(targetNumber); // Pindahkan inisialisasi ke fungsi yang benar
            
            await msg.reply(`✅ Bot *${targetNumber}* berhasil diaktifkan!`);
          } catch (error) {
            console.error('OTP Error:', error);
            await msg.reply(`❌ Gagal verifikasi OTP: ${error.message}`);
          }
        };

        // Timeout handler
        setTimeout(() => {
          delete Oblixn.otpHandlers[targetNumber];
          msg.reply('⌛ Waktu verifikasi OTP habis');
        }, 120000);

      } catch (error) {
        console.error('Jadibot Error:', error);
        msg.reply(`❌ Gagal memproses: ${error.message}`);
      }
    }
  });

async function startChildBot(number, credentials, Oblixn) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      `sessions/${number}`,
      credentials
    );

    const bot = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: Oblixn.logger,
      mobile: true,
    });

    bot.ev.on("connection.update", (update) => {
      if (update.connection === "open") {
        console.log(color(`Bot ${number} connected!`, "cyan"));
      }
    });

    bot.ev.on("messages.upsert", ({ messages }) => {
      const m = messages[0];
      if (!m.message || m.key.fromMe) return;

      if (m.message.conversation) {
        bot.sendMessage(m.key.remoteJid, {
          text: `Bot anak menerima pesan: ${m.message.conversation}`,
        });
      }
    });

    bot.ev.on("creds.update", saveCreds);

    global.childBots = global.childBots || new Map();
    global.childBots.set(number, bot);
    bot.Oblixn = Oblixn;
  } catch (error) {
    console.error("Gagal memulai bot anak:", error);
    throw error;
  }
}

async function initializeMainBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      `auth_info_baileys/main_bot`
    );

    const mainBot = makeWASocket({
      printQRInTerminal: true,
      auth: state,
      logger: baileysLogger(),
      mobile: true,
    });

    global.mainBot = mainBot;
    mainBot.ev.on("creds.update", saveCreds);

    return mainBot;
  } catch (error) {
    console.error("Gagal inisialisasi bot utama:", error);
    process.exit(1);
  }
}
