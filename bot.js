const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const permissionHandler = require("./src/handler/permission");
const {
  botLogger,
  baileysLogger
} = require("./src/utils/logger");
const {
  config,
  store,
  msgRetryCounterCache,
  commands,
  PREFIX,
  messageQueue,
  RATE_LIMIT,
  MAX_RETRIES,
  RETRY_INTERVAL,
  retryCount,
  callAttempts,
  MAX_CALL_ATTEMPTS,
  BAN_TYPES,
} = require("./config/config");
const {
  pool,
  banUser,
  blockUserBySystem,
  checkUserStatus,
  registerUser,
  getBotCredentials,
  saveBotCredentials,
  handleQrCode,
} = require("./config/dbConf/database");
const { unbanUser } = require("./src/handler/messageHandler");
const { handleGroupMessage } = require("./src/handler/groupHandler");
const crypto = require("crypto");

// ====== LOGGER ======
const log = (type, message) => {
  const now = new Date().toLocaleString();
  console.log(`[${now}] [${type}] ${message}`);
};

// ====== COMMAND HANDLER ======
function registerCommand(config, handler) {
  if (!config.pattern || typeof handler !== "function") {
    throw new Error("Command harus memiliki pattern dan handler.");
  }
  commands.push({ config, handler });
}

function executeCommand(sock, msg, sender, messageText) {
  for (const { config, handler } of commands) {
    const patterns = [config.pattern, ...(config.secondPattern || [])];
    for (const pattern of patterns) {
      const match = messageText.match(new RegExp(pattern));
      if (match) {
        log("INFO", `Command executed: ${pattern}`);
        return handler(msg, {
          match,
          args: match[1] ? match[1].trim().split(/\s+/) : [],
        });
      }
    }
  }
  log("WARNING", `No matching command for: ${messageText}`);
}

// ====== LOAD COMMANDS ======
function loadCommands(commandsPath) {
  const files = fs.readdirSync(commandsPath);

  files.forEach((file) => {
    const fullPath = path.join(commandsPath, file);

    if (fs.lstatSync(fullPath).isFile() && file.endsWith(".js")) {
      const commandModule = require(fullPath);
      if (typeof commandModule === "function") {
        commandModule(global.Oblixn);
      }
    }
    // success load command
  });
  if (typeof Oblixn.cmd === "function") {
    log("SUCCESS", `Command berhasil di load`);
  }
}

// ====== DEFINE OBLIXN CMD ======
global.Oblixn = {
  commands: new Map(), // atau {} jika menggunakan Object
  cmd: function (options) {
    const { name, alias = [], desc = "", category = "utility", exec } = options;

    if (!name || typeof exec !== "function") {
      throw new Error(
        'Command harus memiliki "name" dan "exec" sebagai function.'
      );
    }

    // Buat wrapper untuk exec yang mencakup pengecekan ban
    const wrappedExec = async (msg, params) => {
      try {
        // Skip pengecekan ban untuk perintah owner
        if (category !== "owner" && category !== "ownercommand") {
          // Normalisasi format userId
          const userId = msg.sender.split("@")[0];
          let normalizedUserId = userId;

          // Normalisasi format nomor
          if (normalizedUserId.startsWith("08")) {
            normalizedUserId = "62" + normalizedUserId.slice(1);
          } else if (normalizedUserId.startsWith("+62")) {
            normalizedUserId = normalizedUserId.slice(1);
          }

          // Cek status ban
          const { isBanned, banInfo } = await checkBanStatus(normalizedUserId);

          if (isBanned) {
            const banDate = new Date(banInfo.banned_at).toLocaleDateString(
              "id-ID"
            );
            const banMessage = `❌ *Akses Ditolak*\n\nMaaf, Anda telah dibanned dari menggunakan bot!\n\n*Detail Ban:*\n📝 Alasan: ${banInfo.reason}\n📅 Tanggal: ${banDate}\n\nSilakan hubungi owner untuk unbanned.`;

            await msg.reply(banMessage);
            return; // Hentikan eksekusi command
          }
        }

        // Jika tidak dibanned, lanjutkan eksekusi command
        return await exec(msg, params);
      } catch (error) {
        botLogger.error(`Error executing command ${name}:`, error);
        msg.reply("Terjadi kesalahan saat menjalankan perintah.");
      }
    };

    const patterns = [name, ...alias].map((cmd) => `^${cmd}(?:\\s+(.*))?$`);

    registerCommand(
      {
        pattern: patterns[0],
        secondPattern: patterns.slice(1),
        fromMe: false,
        desc,
        use: category,
      },
      wrappedExec // Gunakan wrapped exec alih-alih exec langsung
    );

    this.commands.set(name, {
      ...options,
      exec: wrappedExec, // Simpan wrapped exec di commands Map
    });
  },
  isOwner: function (sender) {
    // Hapus @s.whatsapp.net dari sender
    const senderNumber = sender.split("@")[0];

    // Ambil nomor owner dari env
    const ownerNumbers = process.env.OWNER_NUMBER_ONE.split(",").concat(
      process.env.OWNER_NUMBER_TWO
        ? process.env.OWNER_NUMBER_TWO.split(",")
        : []
    );

    // Normalisasi format nomor
    const normalizedSender = senderNumber.startsWith("62")
      ? "0" + senderNumber.slice(2)
      : senderNumber;
    botLogger.info(`Checking owner: ${normalizedSender}`);
    return ownerNumbers.includes(normalizedSender);
  },
};
// ====== CONNECTION HANDLER ======
let activeSocket = null;
let qrTimer = null;

// Tambahkan di bagian global variables
global.otpHandlers = {};

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 5000; // 5 detik

const initBot = async () => {
  try {
    // Hentikan socket sebelumnya jika ada
    if (activeSocket) {
      activeSocket.end(undefined);
      activeSocket.ws.close();
      activeSocket.ev.removeAllListeners();
      clearTimeout(qrTimer);
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const connectionConfig = {
      printQRInTerminal: true,
      auth: state,
      logger: baileysLogger,
      markOnlineOnConnect: true,
      qrTimeout: 300_000, // 5 menit
      connectTimeoutMs: 60_000,
      keepAliveIntervalMs: 30_000,
      browser: ['Oblivinx-Bot', 'Safari', '3.0.0'],
      getMessage: async key => {
        return store.loadMessage(key.remoteJid, key.id) || {}
      },
      maxRetries: 3,
      retryRequestDelayMs: 1000
    };

    // Buat socket baru
    activeSocket = makeWASocket(connectionConfig);
    
    // Handle QR Code
    activeSocket.ev.on('connection.update', (update) => {
      const { connection, qr } = update;
      
      if (qr) {
        console.log('QR Code Generated');
        // Set timer untuk refresh QR setelah 5 menit
        clearTimeout(qrTimer);
        qrTimer = setTimeout(() => {
          console.log('QR Expired - Restarting...');
          initBot();
        }, 300_000);
      }

      if (connection === 'open') {
        console.log('✅ Connected to WhatsApp');
        clearTimeout(qrTimer);
      }

      if (connection === 'close') {
        console.log('Connection closed - Reconnecting...');
        setTimeout(() => initBot(), 10_000);
      }
    });

    // Handle credentials update
    activeSocket.ev.on('creds.update', saveCreds);

    // Setup permission handler
    permissionHandler.setup(activeSocket);

    // Bind store ke sock
    store.bind(activeSocket.ev);

    activeSocket.ev.on("messages.upsert", async (m) => {
      try {
        const msg = m.messages[0];
        if (!msg.message) return;

        const sender = msg.key.remoteJid;
        if (!sender) return;

        // Skip jika pesan dari bot sendiri
        if (msg.key.fromMe) return;

        // Tentukan jenis chat dan ambil ID pengirim yang benar
        const isGroup = sender.endsWith("@g.us");
        const participant = msg.key.participant || msg.participant || sender;
        // Ambil nomor pengirim yang benar
        let senderNumber = (isGroup ? participant : sender).split("@")[0];
        // Normalisasi nomor telepon
        if (senderNumber.startsWith("62")) {
          // Cek apakah ini nomor telepon valid (bukan ID grup atau sistem)
          if (/^62[8-9][0-9]{8,11}$/.test(senderNumber)) {
            try {
              // Register user ke database
              const result = await registerUser(senderNumber, msg.pushName);
              console.log("Registration result:", result);
            } catch (error) {
              console.error("Error registering user:", {
                error: error.message,
                stack: error.stack,
                senderNumber,
              });
            }
          }
        }

        // Cek rate limiting
        const lastMessageTime = messageQueue.get(sender) || 0;
        const now = Date.now();
        if (now - lastMessageTime < RATE_LIMIT) {
          return; // Abaikan pesan jika terlalu cepat
        }
        messageQueue.set(sender, now);

        // Enhance message object
        const enhancedMsg = {
          ...msg,
          chat: sender,
          from: sender,
          sender: participant,
          isGroup: isGroup,
          botNumber: activeSocket.user.id,
          pushName: msg.pushName,
          mentions:
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
          reply: async (content) => {
            let messageContent;
            if (typeof content === "object") {
              messageContent = content;
            } else {
              messageContent = { text: String(content) };
            }
            return await activeSocket.sendMessage(sender, messageContent, {
              quoted: msg,
            });
          },
        };

        // Handle command messages
        const messageText =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          "";

        if (messageText.startsWith(PREFIX)) {
          const cleanText = messageText.slice(PREFIX.length);
          executeCommand(activeSocket, enhancedMsg, sender, cleanText);
        }

        // Cek jika pesan adalah balasan OTP
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted && quoted.conversation.includes('Balas pesan ini dengan kode OTP')) {
          const targetNumber = quoted.conversation.match(/\d+/)[0];
          if (global.otpHandlers[targetNumber]) {
            const otp = msg.message.extendedTextMessage.text;
            await global.otpHandlers[targetNumber](otp);
            delete global.otpHandlers[targetNumber];
          }
        }
      } catch (error) {
        botLogger.error("Error processing message:", error);
      }
    });

    // Auto clear cache
    setInterval(() => {
      if (global.gc) global.gc();
      store.writeToFile("./baileys_store.json");
      store.clear();
      botLogger.info("Cache cleared automatically");
    }, config.clearCacheInterval);

    // Monitor memory
    setInterval(() => {
      const used = process.memoryUsage();
      botLogger.info(
        `Memory usage - RSS: ${formatBytes(used.rss)}, Heap: ${formatBytes(
          used.heapUsed
        )}`
      );
    }, config.monitorMemoryInterval);

    activeSocket.ev.on("history.notification", (notification) => {
      const { syncType, progress, id } = notification;
      botLogger.info(
        `History notification received: syncType=${syncType}, progress=${progress}, id=${id}`
      );
    });

    // Tambahkan penanganan error untuk mencegah crash
    activeSocket.ev.on("error", (err) => {
      botLogger.error("WebSocket Error:", err);
      global.isConnected = false;
    });

    // Tambahkan penanganan close untuk membersihkan state
    activeSocket.ev.on("close", () => {
      botLogger.info("Connection closed");
      global.isConnected = false;
    });

    // Tambahkan fungsi banUser ke objek global
    global.db = {
      ...global.db,
      banUser: async function (
        userId,
        reason,
        bannedBy,
        banType = BAN_TYPES.MANUAL
      ) {
        try {
          const cleanUserId = userId.split("@")[0];
          const query = `
                        INSERT INTO banned_users (user_id, reason, banned_by, ban_type) 
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        reason = VALUES(reason),
                        banned_by = VALUES(banned_by),
                        ban_type = VALUES(ban_type),
                        banned_at = CURRENT_TIMESTAMP
                    `;

          const [result] = await pool.execute(query, [
            cleanUserId,
            reason,
            bannedBy,
            banType,
          ]);
          return result;
        } catch (error) {
          console.error(`Error in banUser: ${error.message}`);
          throw error;
        }
      },

      unbanUser: await unbanUser,

      // Fungsi untuk memblokir user
      blockUser: async function (userId, reason, blockedBy) {
        try {
          const cleanUserId = userId.split("@")[0];

          // Masukkan ke tabel blocked_users
          const blockQuery = `
                        INSERT INTO blocked_users (user_id, reason, blocked_by) 
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        reason = VALUES(reason),
                        blocked_by = VALUES(blocked_by),
                        blocked_at = CURRENT_TIMESTAMP
                    `;

          // Catat ke history
          const historyQuery = `
                        INSERT INTO block_history (user_id, action, reason, performed_by)
                        VALUES (?, 'BLOCK', ?, ?)
                    `;

          await Promise.all([
            pool.execute(blockQuery, [cleanUserId, reason, blockedBy]),
            pool.execute(historyQuery, [cleanUserId, reason, blockedBy]),
          ]);

          console.log(`User ${cleanUserId} blocked successfully`);
          return true;
        } catch (error) {
          console.error(`Error in blockUser: ${error.message}`);
          throw error;
        }
      },

      // Fungsi untuk membuka blokir user
      unblockUser: async function (userId, unblockBy) {
        try {
          const cleanUserId = userId.split("@")[0];

          // Ambil alasan blokir sebelumnya
          const [blockData] = await pool.execute(
            "SELECT reason FROM blocked_users WHERE user_id = ?",
            [cleanUserId]
          );

          // Hapus dari tabel blocked_users
          await pool.execute("DELETE FROM blocked_users WHERE user_id = ?", [
            cleanUserId,
          ]);

          // Catat ke history
          await pool.execute(
            "INSERT INTO block_history (user_id, action, reason, performed_by) VALUES (?, 'UNBLOCK', ?, ?)",
            [
              cleanUserId,
              `Unblocked from: ${blockData[0]?.reason || "Unknown reason"}`,
              unblockBy,
            ]
          );

          console.log(`User ${cleanUserId} unblocked successfully`);
          return true;
        } catch (error) {
          console.error(`Error in unblockUser: ${error.message}`);
          throw error;
        }
      },

      // Fungsi untuk mengecek status blokir
      isBlocked: async function (userId) {
        try {
          const cleanUserId = userId.split("@")[0];
          const [rows] = await pool.execute(
            "SELECT * FROM blocked_users WHERE user_id = ?",
            [cleanUserId]
          );
          return rows.length > 0;
        } catch (error) {
          console.error(`Error checking block status: ${error.message}`);
          throw error;
        }
      },
    };

    // Perbaiki event handler untuk panggilan
    activeSocket.ev.on("call", async ([call]) => {
      try {
        if (!call) return; // Skip jika tidak ada data panggilan

        const callerJid = call.from;
        console.log("Incoming call detected:", call); // Untuk debugging

        // Tambahkan pengecekan status panggilan
        if (call.status !== "offer") return;

        const callCount = (callAttempts.get(callerJid) || 0) + 1;
        callAttempts.set(callerJid, callCount);

        // Auto reject call
        try {
          await activeSocket.rejectCall(call.id, callerJid);
          console.log("Call rejected successfully");
        } catch (rejectError) {
          console.error("Error rejecting call:", rejectError);
        }

        // Kirim peringatan
        let warningMsg;
        if (callCount >= MAX_CALL_ATTEMPTS) {
          try {
            // Block user
            await activeSocket.updateBlockStatus(callerJid, "block");

            // Ban user
            await global.db.banUser(
              callerJid,
              "Melakukan panggilan ke bot sebanyak 3 kali",
              "SYSTEM",
              BAN_TYPES.CALL
            );

            warningMsg =
              "❌ *Anda telah diblokir dan dibanned karena melakukan panggilan berulang kali ke bot*";
            console.log(`User ${callerJid} has been blocked and banned`);
          } catch (blockError) {
            console.error("Error blocking/banning user:", blockError);
            warningMsg =
              "⚠️ *Sistem sedang mengalami gangguan, tetapi panggilan tetap tidak diizinkan*";
          }
        } else {
          warningMsg = `⚠️ *Peringatan!*\n\nJangan melakukan panggilan ke bot!\nPanggilan akan otomatis ditolak.\n\nPeringatan: ${callCount}/${MAX_CALL_ATTEMPTS}\n\nJika Anda melakukan panggilan sebanyak ${MAX_CALL_ATTEMPTS} kali, Anda akan diblokir dan dibanned secara otomatis.`;
        }

        // Kirim pesan peringatan
        try {
          await activeSocket.sendMessage(callerJid, {
            text: warningMsg,
          });
          console.log("Warning message sent successfully");
        } catch (msgError) {
          console.error("Error sending warning message:", msgError);
        }

        console.log(
          `Call handled for ${callerJid} (Attempt: ${callCount}/${MAX_CALL_ATTEMPTS})`
        );
      } catch (error) {
        console.error("Error in call handler:", error);
      }
    });

    // Tambahkan ini di bagian koneksi awal
    activeSocket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "open") {
        console.log("Call detection system activated");
      }
    });

    return activeSocket;
  } catch (error) {
    console.error('Error initializing bot:', error);
    setTimeout(() => initBot(), 30_000);
  }
};

// Helper function untuk format bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Tambahkan fungsi untuk handle timeout secara global
function setupGlobalErrorHandlers() {
  process.on("unhandledRejection", (reason, promise) => {
    if (reason.message.includes("Timed Out")) {
      botLogger.warning("Timeout detected, attempting to reconnect...");
      if (!global.isConnected && retryCount < MAX_RETRIES) {
        setTimeout(async () => {
          try {
            await initBot();
          } catch (error) {
            botLogger.error(`Failed to reconnect: ${error.message}`);
          }
        }, RETRY_INTERVAL);
      }
    } else {
      botLogger.error(
        "Unhandled rejection at " + promise + " reason: " + reason
      );
    }
  });
}

// Fungsi untuk memulai semua bot yang tersimpan
async function initializeAllBots() {
  try {
    const [bots] = await pool.query('SELECT number, credentials FROM bot_instances WHERE status = "active"');
    for (const bot of bots) {
      try {
        await startChildBot(bot.number, JSON.parse(bot.credentials));
        console.log(`Bot ${bot.number} berhasil diinisialisasi`);
      } catch (error) {
        console.error(`Gagal inisialisasi bot ${bot.number}:`, error);
      }
    }
  } catch (error) {
    console.error('Error initializing bots:', error);
  }
}

// Panggil saat bot utama mulai
initBot();
initializeAllBots();

// ====== MAIN FUNCTION ======
(async () => {
  botLogger.info("Starting bot...");
  setupGlobalErrorHandlers();

  // Load commands from src/commands directory
  loadCommands(path.join(__dirname, "src/commands"));

  try {
    await initBot();
  } catch (error) {
    botLogger.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
  }
})();

// Contoh penggunaan di tempat lain
process.on("uncaughtException", (err) => {
  if(botLogger) {
    botLogger.error("Uncaught Exception: " + err);
  } else {
    console.error("Fallback error logging:", err); // Fallback jika logger gagal
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log ke file atau layanan monitoring
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Restart process setelah cleanup
    cleanupAndExit(1);
});

async function cleanupAndExit(code = 0) {
    console.log('🛑 Cleaning up before exit...');
    try {
        await store.close();
        for (const [number, sock] of global.childBots) {
            await sock.end();
        }
    } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
    }
    process.exit(code);
}

// Fungsi untuk cek status ban
async function checkBanStatus(userId) {
  try {
    const status = await checkUserStatus(userId);
    botLogger.info(`Memeriksa status ban untuk user: ${userId}`);
    return {
      isBanned: status.isBanned,
      banInfo: status.isBanned ? { reason: "Diblokir oleh admin" } : null,
    };
  } catch (error) {
    botLogger.error("Error memeriksa status ban:", error);
    return {
      isBanned: false,
      banInfo: null,
    };
  }
}

// Contoh penggunaan fungsi banUser
async function handleBanCommand(userId, reason, bannedBy) {
  try {
    const result = await banUser(userId, reason, bannedBy);
    if (result.success) {
      console.log(result.message);
    } else {
      console.error(result.message);
    }
  } catch (error) {
    console.error("Error handling ban command:", error);
  }
}

// Tambahkan cleanup handler untuk SIGINT
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Cleaning up...');
  store.close();
  process.exit(0);
});

// Tambahkan handler untuk uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  initBot(); // Restart bot
});

// Fungsi untuk memulai child bot
async function startChildBot(phoneNumber, credentials) {
    try {
        // Validasi credentials dan regenerasi jika perlu
        const validateCredentials = (creds) => {
            return creds?.me?.id && 
                   creds?.noiseKey?.length === 32 &&
                   creds?.signedIdentityKey?.length === 32;
        };

        // Jika credentials tidak valid, generate ulang
        if (!validateCredentials(credentials.creds)) {
            console.warn(`⚠️ Regenerasi credentials untuk ${phoneNumber}`);
            
            // Generate credentials baru
            const { state } = await useMultiFileAuthState(
                path.join(__dirname, `auth_info_baileys/${phoneNumber}`)
            );
            
            // Update database dengan credentials baru
            try {
                await pool.execute(
                    'UPDATE bot_instances SET credentials = ? WHERE number = ?',
                    [JSON.stringify(state), phoneNumber]
                );
                console.log(`✅ Berhasil update credentials ${phoneNumber}`);
                credentials = state; // Gunakan credentials baru
            } catch (dbError) {
                console.error('Gagal update database:', dbError);
                throw new Error('Gagal update credentials di database');
            }
        }

        // Paksa koneksi dengan credentials terbaru
        const childSock = makeWASocket({
            auth: {
                ...credentials,
                mobile: true
            },
            browser: ["FORCE-CONNECT", "Chrome", "3.0"],
            version: [3, 3234, 9],
            logger: baileysLogger,
            connectTimeoutMs: 60000,
            // Tambahkan handler untuk memaksa QR jika diperlukan
            shouldIgnoreJid: () => false,
            generateHighQualityLinkPreview: true,
            getMessage: async () => null,
            // Tambahkan reconnect interval 2 jam (7200 detik)
            keepAliveIntervalMs: 7200000 
        });

        // Paksa update connection state
        childSock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('⚠️ BUTUH QR untuk', phoneNumber);
                // Panggil fungsi yang sudah didefinisikan
                handleQrCode(qr, phoneNumber).catch(console.error);
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
                    // Hapus session jika error auth
                    fs.rmSync(authFolder, { recursive: true, force: true });
                    console.log('⚠️ Session dihapus karena error auth');
                }
            }
        });

        return childSock;
    } catch (error) {
        console.error(`🚨 Gagal mutlak untuk ${phoneNumber}:`, error);
        // Jika tetap gagal, nonaktifkan di database
        await pool.execute(
            "UPDATE bot_instances SET status = 'inactive' WHERE number = ?",
            [phoneNumber]
        );
        throw new Error(`Di nonaktifkan otomatis: ${error.message}`);
    }
}

// Tambahkan cleanup handler
process.on('SIGINT', async () => {
    console.log('\n🛑 Cleaning up child bots...');
    for (const [number, sock] of global.childBots) {
        await sock.end();
    }
    store.close();
    process.exit(0);
});

// Auto-start child bots
async function startChildBots() {
    try {
        const [rows] = await pool.execute(
            'SELECT number FROM bot_instances WHERE status = "active"'
        );
        
        for (const row of rows) {
            if(row.number !== config.mainNumber) {
                await initializeBot(row.number);
            }
        }
    } catch (error) {
        console.error('Error starting child bots:', error);
    }
}

// Panggil fungsi setelah bot utama ready
startChildBots();

if (!global.childBots) {
    global.childBots = new Map();
}

async function initializeBot(phoneNumber) {
    let sock = null; // Deklarasi eksplisit dengan nilai null
    
    try {
        const authFolder = path.join(__dirname, `auth_info_baileys/${phoneNumber}`);
        
        // 1. Cleanup session korup
        if (fs.existsSync(authFolder)) {
            const sessionFiles = fs.readdirSync(authFolder);
            if (sessionFiles.length === 0) {
                fs.rmSync(authFolder, { recursive: true, force: true });
                console.log(`🗑 Session kosong dihapus untuk ${phoneNumber}`);
            }
        }

        // 2. Inisialisasi socket
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: state.keys
            },
            logger: baileysLogger,
            msgRetryCounterCache,
            getMessage: async key => {
                return store.loadMessage(key.remoteJid, key.id) || {};
            },
            connectTimeoutMs: 30000,
            keepAliveIntervalMs: 15000
        });

        // 3. Pasang event handlers
        const setupEventHandlers = () => {
            sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'close') {
                    console.log(`🔌 Koneksi ${phoneNumber} terputus:`, lastDisconnect.error);
                } else if (connection === 'open') {
                    console.log(`✅ Koneksi ${phoneNumber} stabil`);
                }
            });

            sock.ev.on('creds.update', saveCreds);
        };

        setupEventHandlers();

        // 4. Simpan ke global map
        global.childBots.set(phoneNumber, sock);
        console.log(`🤖 Bot ${phoneNumber} berhasil diinisialisasi`);
        return sock;

    } catch (error) {
        console.error(`❌ Gagal inisialisasi bot ${phoneNumber}:`, error);
        
        // 5. Cleanup jika sock sempat terinisialisasi
        if (sock !== null) {
            sock.ev.removeAllListeners();
            sock.ws.close();
        }
        
        // 6. Hapus session yang gagal
        fs.rmSync(authFolder, { recursive: true, force: true });
        throw error;
    }
}

process.on('exit', () => {
    console.log('Membersihkan koneksi...');
    global.childBots.forEach((sock, number) => {
        sock.ev.removeAllListeners();
        sock.ws.close();
    });
    global.childBots.clear();
});

const commandHandler = (text) => {
  const pattern = /^[!\/\.](\w+)(?:\s+(.*))?$/i;  // Format: !command args
  const match = text.match(pattern);
  return match ? { command: match[1], args: match[2] } : null;
};
