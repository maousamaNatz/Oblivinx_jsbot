const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const permissionHandler = require('./src/handler/permission');
const { botLogger, baileysLogger } = require('./src/utils/logger');
const { config, store, msgRetryCounterCache } = require('./config/config');

// ====== GLOBAL VARIABLES ======
const commands = []; // Array untuk menyimpan semua command
const PREFIX = process.env.PREFIX || '!'; // Prefix command default

// ====== LOGGER ======
const log = (type, message) => {
    const now = new Date().toLocaleString();
    console.log(`[${now}] [${type}] ${message}`);
};

// ====== COMMAND HANDLER ======
function registerCommand(config, handler) {
    if (!config.pattern || typeof handler !== 'function') {
        throw new Error('Command harus memiliki pattern dan handler.');
    }
    commands.push({ config, handler });
}

function executeCommand(sock, msg, sender, messageText) {
    for (const { config, handler } of commands) {
        const patterns = [config.pattern, ...(config.secondPattern || [])];
        for (const pattern of patterns) {
            const match = messageText.match(new RegExp(pattern));
            if (match) {
                log('INFO', `Command executed: ${pattern}`);
                return handler(
                    msg,
                    { 
                        match, 
                        args: match[1] ? match[1].trim().split(/\s+/) : []
                    }
                );
            }
        }
    }
    log('WARNING', `No matching command for: ${messageText}`);
}

// ====== LOAD COMMANDS ======
function loadCommands(commandsPath) {
    const files = fs.readdirSync(commandsPath);

    files.forEach((file) => {
        const fullPath = path.join(commandsPath, file);

        if (fs.lstatSync(fullPath).isFile() && file.endsWith('.js')) {
            const commandModule = require(fullPath);
            if (typeof commandModule === 'function') {
                commandModule(global.Oblixn);
            }
        }
        // success load command
        if (typeof commandModule === 'function') {
            log('SUCCESS', `Command loaded: ${file}`);
        }
        // error load command
        else {
            log('ERROR', `Command failed to load: ${file}`);
        }
    });
}

// ====== DEFINE OBLIXN CMD ======
global.Oblixn = {
    cmd: function (options) {
        const { name, alias = [], desc = '', category = 'utility', exec } = options;

        if (!name || typeof exec !== 'function') {
            throw new Error('Command harus memiliki "name" dan "exec" sebagai function.');
        }

        const patterns = [name, ...alias].map((cmd) => `^${cmd}(?:\\s+(.*))?$`);

        registerCommand(
            {
                pattern: patterns[0],
                secondPattern: patterns.slice(1),
                fromMe: false,
                desc,
                use: category
            },
            exec
        );
    }
};

// ====== CONNECTION HANDLER ======
async function startConnection() {
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
    
    const sock = makeWASocket({
        ...config.options,
        auth: state,
        logger: baileysLogger
    });

    // Tambahkan sock ke Oblixn
    global.Oblixn.sock = sock;

    // Setup permission handler
    permissionHandler.setup(sock);

    // Bind store ke sock
    store.bind(sock.ev);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            botLogger.warning('Connection closed. Reconnecting...');
            if (shouldReconnect) {
                setTimeout(async () => {
                    await startConnection();
                }, config.reconnectInterval);
            }
        } else if (connection === 'open') {
            botLogger.success('Connected to WhatsApp.');
            // Setup permission handler setelah koneksi berhasil
            permissionHandler.setup(sock);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Handle Incoming Messages
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;

            const sender = msg.key.remoteJid;
            const isGroup = sender.endsWith('@g.us');
            const participant = msg.key.participant || msg.participant || sender;

            // Jika pesan dari diri sendiri, abaikan
            if (msg.key.fromMe) return;

            const messageText = msg.message?.conversation || 
                              msg.message?.extendedTextMessage?.text || 
                              msg.message?.imageMessage?.caption || '';

            if (messageText.startsWith(PREFIX)) {
                const cleanText = messageText.slice(PREFIX.length);
                
                // Tambahkan informasi grup dan pengirim ke objek pesan
                const enhancedMsg = {
                    ...msg,
                    chat: sender,
                    from: sender,
                    sender: participant,
                    isGroup: isGroup,
                    botNumber: sock.user.id,
                    mentions: msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
                    reply: (text) => sock.sendMessage(sender, { text }, { quoted: msg })
                };

                executeCommand(sock, enhancedMsg, sender, cleanText);
            }
        } catch (error) {
            botLogger.error('Error processing message:', error);
        }
    });
    
    // Auto clear cache
    setInterval(() => {
        if (global.gc) global.gc();
        store.writeToFile('./baileys_store.json');
        store.clear();
        botLogger.info('Cache cleared automatically');
    }, config.clearCacheInterval);

    // Monitor memory
    setInterval(() => {
        const used = process.memoryUsage();
        botLogger.info(`Memory usage - RSS: ${formatBytes(used.rss)}, Heap: ${formatBytes(used.heapUsed)}`);
    }, config.monitorMemoryInterval);

    sock.ev.on('history.notification', (notification) => {
        const { syncType, progress, id } = notification;
        botLogger.info(`History notification received: syncType=${syncType}, progress=${progress}, id=${id}`);
    });

    return sock;
}

// Helper function untuk format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ====== MAIN FUNCTION ======
(async () => {
    botLogger.info('Starting bot...');
    
    // Load commands from src/commands directory
    loadCommands(path.join(__dirname, 'src/commands'));

    // Start WhatsApp connection
    await startConnection();
})();

// Contoh penggunaan di tempat lain
process.on('uncaughtException', (err) => {
    botLogger.error('Uncaught Exception: ' + err);
});

process.on('unhandledRejection', (reason, promise) => {
    botLogger.error('Unhandled rejection at ' + promise + ' reason: ' + reason);
});


