const { makeInMemoryStore } = require("@whiskeysockets/baileys");
const { botLogger } = require("../src/utils/logger");
const path = require("path");
const fs = require("fs");
const os = require("os");
const dotenv = require("dotenv");
dotenv.config();
const { readFileSync } = require("fs");
// Load game data dengan error handling yang lebih baik
const loadGameData = (filename) => {
  try {
    const filePath = path.join(__dirname, "../src/json/games/", filename);
    
    // Cek apakah file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: Game file ${filename} tidak ditemukan`);
      return { data: [] }; // Return empty data jika file tidak ada
    }

    return JSON.parse(fs.readFileSync(filePath));
  } catch (error) {
    console.warn(`Warning: Error loading ${filename}:`, error.message);
    return { data: [] }; // Return empty data jika terjadi error
  }
};
// Load bot configuration dari JSON
const botConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/json/bot.json"))
);

// Definisikan paths
const BASE_PATH = path.resolve(__dirname, "..");
const SESSIONS_PATH = path.join(BASE_PATH, "sessions");
const STORE_PATH = path.join(BASE_PATH, "store");

// Buat store untuk menyimpan data sementara
const store = makeInMemoryStore({
  logger: false,
});
const cpus = os.cpus();
const prosessor = cpus[0].model;
// Set path untuk store
store.path = path.join(STORE_PATH, "oblixn_store.json");
// Emoji untuk setiap kategori
const categoryEmojis = {
  general: "📋",
  utility: "🛠️",
  info: "ℹ️",
  owner: "👑",
  group: "👥",
  fun: "🎮",
  download: "📥",
  search: "🔍",
  uncategorized: "❓",
  crypto: "🪙",
  tools: "🛠️",
  memo: "📝",
  AI: "🤖",
  admin: "🛡️",
};
const pinterestCookies = [
  {
    domain: "id.pinterest.com",
    name: "csrftoken",
    value: "162a9801a756dc74ce0157d6c13cfb44",
  },
  {
    domain: "id.pinterest.com",
    name: "cm_sub",
    value: "dismissed",
  },
  {
    domain: ".pinterest.com",
    name: "_pinterest_cm",
    value:
      "TWc9PSZDQ1pWaXFjOEtTU1NEMDIwNjRDODNiTithYlF2cWZrMnRwdEUwVkVCTEJFZnVUa0xvY2VDVzlZL0RLS0R4VXpnUjNIWGU4T29Id3dQRytKN2N3WExya3VVMmpMUGFZQzZpZTlCdU5yWjhjdytTT1hxM1hSSXN1Ymd0TUhyL3JHZkJwZURhQ1BJYXM3NitzdUdnaktTZ3VOUXkydFhvQitCNy9ZT2NZSENCQ1dkeFJsMFY4SU1VOTBnaGsxb3ltcUImWEE3WW1GSlN3WmdrdDhjdEdoMVJzOU9UT1RnPQ==",
  },
  {
    domain: ".pinterest.com",
    name: "_pinterest_sess",
    value:
      "TWc9PSZuN2MvVzltRGFSY0JQQlA2Wm5MSGxaTEZUUlRzbVdXdllSRlNUYlFxd1o1SW5kNUpOTE1Mb01jL0diOU5PcVIzbUQ1L3B1WVAxNUhITVFUVWNoRnhQTEJ6eDVWVEVYdUw4a091Q2V5R2pUNkVWeStuZlg5ODZPTnZpS05lSDVQV1I1ZzhuZkFPOFVPclZNa3FTczhsMUUyc0ZtOWpoelBwNXYvNGtsaUJ2TkN5RlZDZVZubzNFelc4b3h4UmZ3eHlBUGV1MjVsUGxFR2tpS1c5K2F3b3VnYnR5U0wwTXgrVDIxYm5RcFhpQlpmTVprL0xMRm9JM1VLMDE5dEJEMC8yM2xwanA0b2R1ODNkRXIwQjJHdVhWSFpCSXphbFV4eGp1UHhUdVMzcEJJR25zUno4clVwUnZYc2xVU1FXVy81ellxUUNJMGN0NUY1REVTOThqMXF1eFhDaStZenFBVmsvRndOSTJ1ZXN5YWdoaFQ5Y0x2TGVDNnc1VnY1M2RYUHRVSHh0MUhaTlNxWGRhV04xeGZ5OFlBPT0mcVhsZUV2aU16Q3gzYUlaZ1psbGg2c2pCd1Y4PQ==",
  },
  {
    domain: ".pinterest.com",
    name: "__Secure-s_a",
    value:
      "Q3RUeVVXUGxyZitaYkd1OENrQmN0Yll2OEV2OTNETG1XTnFPV1R2YjZwR2lzUUZRVXI4SFd1SGttdm14MGpuMUNGeFRRRlpoUEVGRXNBbWI5dGt0NEFxd3Y1SEZxbk1oSVdYbHdzcU9IZXlvc3dzWUhkMVRzRzVVU2dxVFhFN2kvQW45bHFsZHJFeWRaWEh0bkV2U2FVMWlQTHJBKzBFbUF2RjdZbEFmaVpvV1dBRGFHVnBSYm1pZzJyZUlTc1BRMWpDbWhLSFRNbWxNSVNlYTFEczNiWUtGVHhpMlBTSzVQLzl1SVdqZmJudXdYNTJMYmxIaVZESWRIb1B4QXkvUU0yKzZMUHVUWVFBQ1RqREZJdkJicklVbFNpVmV4cWtpRGlTVy85RW9jdXM9JmRURjZoODJkcWttREJPczZLbG1ld0N5YnMzMD0=",
  },
  {
    domain: ".pinterest.com",
    name: "_auth",
    value: "1",
  },
  {
    domain: ".pinterest.com",
    name: "ar_debug",
    value: "1",
  },
  {
    domain: "id.pinterest.com",
    name: "sessionFunnelEventLogged",
    value: "1",
  },
];
// Buat cache untuk retry counter
const msgRetryCounterCache = new Map();

// Konfigurasi bot
const config = {
  gameData: {
    tebakGambar: loadGameData("tebakGambar.json"),
    tebakKata: loadGameData("tebakKata.json"),
    trivia: loadGameData("trivia.json"),
    puzzleLogika: loadGameData("puzzleLogika.json"),
    tebakLagu: loadGameData("tebakLagu.json"),

    siapaAku: loadGameData("siapaAku.json"),
    tebakEmoji: loadGameData("tebakEmoji.json"),
    duaPuluhPertanyaan: loadGameData("duaPuluhPertanyaan.json"),
    tod: loadGameData("tod.json"),
    hangman: loadGameData("hangman.json"),

    dungeon: loadGameData("dungeon.json"),
    tebakFakta: loadGameData("tebakFakta.json"),
    quizKepribadian: loadGameData("quizKepribadian.json"),
    lelangVirtual: loadGameData("lelangVirtual.json"),
    hartaKarun: loadGameData("hartaKarun.json"),

    tebakHarga: loadGameData("tebakHarga.json"),
    kartuVirtual: loadGameData("kartuVirtual.json"),
    quizHarian: loadGameData("quizHarian.json"),
    tebakFilm: loadGameData("tebakFilm.json"),
    rpg: loadGameData("rpg.json"),

    tebakAngka: loadGameData("tebakAngka.json"),
    gameMemory: loadGameData("gamememory.json"),
    kuisBahasa: loadGameData("kuizbahasa.json"),
    mafia: loadGameData("mafia.json"),
    matematika: loadGameData("matematika.json"),

    petualangan: loadGameData("Petualangan.json"),
    simonSays: loadGameData("simonsays.json"),
    storyBuilder: loadGameData("storyBuilder.json"),
    tebakKarakter: loadGameData("tebakKarakter.json"),
    tebakLokasi: loadGameData("tebakLokasi.json"),

    tebakMeme: loadGameData("tebakMeme.json"),
    tebakWarna: loadGameData("tebakWarna.json"),
    pilihanGanda: loadGameData("pilihanGanda.json"),
    tebaklagu: loadGameData("tebaklagu.json"),
    rpg: loadGameData("rpg.json"),
    dungeon: loadGameData("dungeon.json"),
  },
  coinmarketcap: {
    apiKey: process.env.COINMARKETCAP_API_KEY,
    baseUrl: "https://pro-api.coinmarketcap.com/v1",
  },
  botName: botConfig.bot.botName || "Oblixn Bot",
  owner: [process.env.OWNER_NUMBER_ONE, process.env.OWNER_NUMBER_TWO],
  prefix: botConfig.bot.prefix || "!",
  prosessor: prosessor,
  languages: botConfig.lang,
  basePath: BASE_PATH,
  sessionsPath: SESSIONS_PATH,
  storePath: STORE_PATH,
  sessionName: path.join(SESSIONS_PATH, botConfig.bot.sessionName),
  maxRetries: 3,
  defaultQueryTimeoutMs: 60_000,
  keepAliveIntervalMs: 10_000,
  maxCacheSize: 100,
  clearCacheInterval: 3600000,
  monitorMemoryInterval: 300000,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  options: {
    printQRInTerminal: true,
    msgRetryCounterCache,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 10_000,
    emitOwnEvents: false,
    logger: false,
    getMessage: async (key) => {
      return { conversation: "hello" };
    },
  },
  author: {
    author1: {
      name: process.env.OWNER1_NAME,
      email: process.env.OWNER1_EMAIL,
      github: process.env.OWNER1_GITHUB,
      roles: process.env.OWNER1_ROLES,
    },
    author2: {
      name: process.env.OWNER2_NAME,
      email: process.env.OWNER2_EMAIL,
      github: process.env.OWNER2_GITHUB,
      roles: process.env.OWNER2_ROLES,
    },
  },
  sessionCleanupInterval: 1800000, // 30 menit
  sessionMaxAge: 86400000, // 24 jam
  download: {
    maxSize: 100 * 1024 * 1024, // Maksimal 100MB
    maxDuration: 600, // Maksimal 10 menit (dalam detik)
    timeout: 300000, // Timeout download 5 menit
    ytdlOpts: {
      quality: "highest",
      filter: "audioandvideo",
    },
  },
};

// Buat direktori jika belum ada
[SESSIONS_PATH, STORE_PATH].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Log konfigurasi yang dimuat dengan pengecekan
botLogger.info(`Loaded bot configuration:`);
botLogger.info(`├─ Bot Name: ${config.botName}`);
botLogger.info(
  `├─ Owner: ${
    Array.isArray(config.owner) ? config.owner.join(", ") : "Not configured"
  }`
);
botLogger.info(`├─ Prefix: ${config.prefix}`);
botLogger.info(`├─ Prosessor: ${config.prosessor}`);
botLogger.info(`└─ Session: ${config.sessionName}`);

// Tambahkan fungsi cleanup di bot.js
function cleanupSessions() {
  try {
    const sessionsDir = config.sessionsPath;
    const files = fs.readdirSync(sessionsDir);
    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(sessionsDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > config.sessionMaxAge) {
        fs.unlinkSync(filePath);
        botLogger.info(`Cleaned up old session file: ${file}`);
      }
    });
  } catch (error) {
    botLogger.error("Error cleaning up sessions:", error);
  }
}

// ====== GLOBAL VARIABLES ======
const commands = []; // Array untuk menyimpan semua command
const PREFIX = process.env.PREFIX || "!"; // Prefix command default
const messageQueue = new Map();
const RATE_LIMIT = 2000; // 2 detik antara pesan

// Tambahkan konstanta untuk retry
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 detik
let retryCount = 0;

// Tambahkan variabel untuk tracking panggilan
const callAttempts = new Map();
const MAX_CALL_ATTEMPTS = 3;

// Tambahkan konstanta untuk status
const BAN_TYPES = {
  CALL: "CALL_BAN", // Ban karena telepon (dengan blokir)
  MANUAL: "MANUAL_BAN", // Ban manual oleh owner (tanpa blokir)
};

// ====== LOGGER ======
const log = (type, message) => {
  const now = new Date().toLocaleString();
  console.log(`[${now}] [${type}] ${message}`);
};

// Jalankan cleanup secara berkala
setInterval(cleanupSessions, config.sessionCleanupInterval);

module.exports = {
  config,
  store,
  msgRetryCounterCache,
  categoryEmojis,
  pinterestCookies,
  commands,
  PREFIX,
  messageQueue,
  RATE_LIMIT,
  MAX_RETRIES,
  RETRY_INTERVAL,
  callAttempts,
  MAX_CALL_ATTEMPTS,
  BAN_TYPES,
  log,
  retryCount,
};
