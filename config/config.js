const { makeInMemoryStore } = require('@whiskeysockets/baileys');
const { baileysLogger, botLogger } = require('../src/utils/logger');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

// Load bot configuration dari JSON
const botConfig = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../src/json/bot.json')
    )
);

// Definisikan paths
const BASE_PATH = path.resolve(__dirname, '..');
const SESSIONS_PATH = path.join(BASE_PATH, 'sessions');
const STORE_PATH = path.join(BASE_PATH, 'store');

// Buat store untuk menyimpan data sementara
const store = makeInMemoryStore({
    logger: false
});

// Set path untuk store
store.path = path.join(STORE_PATH, 'oblixn_store.json');

// Buat cache untuk retry counter
const msgRetryCounterCache = new Map();

// Konfigurasi bot
const config = {
    // Bot info dari bot.json
    botName: botConfig.bot.botName,
    owner: botConfig.bot.owner,
    prefix: botConfig.bot.prefix,
    
    // Language support
    languages: botConfig.lang,
    
    // Paths
    basePath: BASE_PATH,
    sessionsPath: SESSIONS_PATH,
    storePath: STORE_PATH,
    
    // Session
    sessionName: path.join(SESSIONS_PATH, botConfig.bot.sessionName),
    
    // Performance
    maxRetries: 3,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 10_000,
    
    // Memory management
    maxCacheSize: 100,
    clearCacheInterval: 3600000,
    monitorMemoryInterval: 300000,
    
    // Connection
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    
    // Baileys options
    options: {
        printQRInTerminal: true,
        msgRetryCounterCache,
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 10_000,
        emitOwnEvents: false,
        logger: false,
        getMessage: async (key) => {
            return { conversation: 'hello' };
        }
    }
};

// Buat direktori jika belum ada
[SESSIONS_PATH, STORE_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Log konfigurasi yang dimuat
botLogger.info(`Loaded bot configuration:`);
botLogger.info(`├─ Bot Name: ${config.botName}`);
botLogger.info(`├─ Owner: ${config.owner.join(', ')}`);
botLogger.info(`├─ Prefix: ${config.prefix}`);
botLogger.info(`└─ Session: ${config.sessionName}`);

module.exports = {
    config,
    store,
    msgRetryCounterCache
};