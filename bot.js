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
const { bool } = require('sharp');
const { pool } = require('./config/dbConf/database');

// ====== GLOBAL VARIABLES ======
const commands = []; // Array untuk menyimpan semua command
const PREFIX = process.env.PREFIX || '!'; // Prefix command default
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
    CALL: 'CALL_BAN',      // Ban karena telepon (dengan blokir)
    MANUAL: 'MANUAL_BAN'   // Ban manual oleh owner (tanpa blokir)
};

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
    commands: new Map(), // atau {} jika menggunakan Object
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
                // chatOwner: bool,
                fromMe: false,
                desc,
                use: category
            },
            exec
        );

        this.commands.set(name, options); // untuk Map
        // atau
        // this.commands[name] = options; // untuk Object
    },
    isOwner: function(sender) {
        // Hapus @s.whatsapp.net dari sender
        const senderNumber = sender.split('@')[0];
        
        // Ambil nomor owner dari env
        const ownerNumbers = process.env.OWNER_NUMBER_ONE.split(',').concat(
            process.env.OWNER_NUMBER_TWO ? process.env.OWNER_NUMBER_TWO.split(',') : []
        );
        
        // Normalisasi format nomor
        const normalizedSender = senderNumber.startsWith('62') ? 
            '0' + senderNumber.slice(2) : senderNumber;
        
        console.log('Checking owner:', {
            originalSender: sender,
            normalizedSender,
            ownerNumbers,
            isOwner: ownerNumbers.includes(normalizedSender)
        });
        
        return ownerNumbers.includes(normalizedSender);
    }
};
// ====== CONNECTION HANDLER ======
async function startConnection() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
        
        const sock = makeWASocket({
            ...config.options,
            auth: state,
            logger: baileysLogger,
            // Tambahkan konfigurasi timeout
            connectTimeoutMs: 60000, // 60 detik
            maxRetries: 3,
            retryRequestDelayMs: 1000
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
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.output?.payload?.error;
                
                // Deteksi jenis disconnect
                if (statusCode === DisconnectReason.loggedOut || 
                    statusCode === DisconnectReason.connectionReplaced) {
                    // Kasus dikeluarkan atau logout
                    botLogger.error('Bot telah dikeluarkan atau logout dari WhatsApp!');
                    botLogger.info('Menghapus sesi dan credentials...');
                    
                    // Hapus file sesi
                    try {
                        const sessionPath = config.sessionName;
                        if (fs.existsSync(sessionPath)) {
                            fs.unlinkSync(sessionPath);
                            botLogger.success('File sesi berhasil dihapus');
                        }
                        
                        // Reset status koneksi
                        global.isConnected = false;
                        
                        // Exit process untuk memaksa restart
                        process.exit(1);
                    } catch (error) {
                        botLogger.error('Gagal menghapus file sesi:', error);
                    }
                } else if (reason === 'conflict') {
                    // Kasus konflik sesi
                    botLogger.error('Konflik sesi terdeteksi. Bot akan berhenti.');
                    process.exit(1);
                } else {
                    // Kasus disconnect karena masalah jaringan/lag
                    botLogger.warning(`Koneksi terputus: ${reason}`);
                    botLogger.info('Mencoba menghubungkan kembali...');
                    
                    // Coba reconnect dengan delay
                    setTimeout(async () => {
                        if (!global.isConnected) {
                            try {
                                await startConnection();
                            } catch (error) {
                                botLogger.error('Gagal melakukan reconnect:', error);
                            }
                        }
                    }, config.reconnectInterval);
                }
            } else if (connection === 'open') {
                global.isConnected = true;
                botLogger.success('Terhubung ke WhatsApp!');
            }
        });

        // Tambahkan timeout handler
        sock.ws.on('timeout', () => {
            botLogger.error('Connection timeout detected');
            sock.ws.close();
        });

        // Handle unexpected errors
        sock.ws.on('error', (err) => {
            botLogger.error(`WebSocket Error: ${err.message}`);
            if (err.message.includes('timeout')) {
                sock.ws.close();
            }
        });

        sock.ev.on('creds.update', async () => {
            // Simpan credentials
            await saveCreds();
        });

        // Handle Incoming Messages
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg.message) return;

                const sender = msg.key.remoteJid;
                
                // Cek rate limiting
                const lastMessageTime = messageQueue.get(sender) || 0;
                const now = Date.now();
                if (now - lastMessageTime < RATE_LIMIT) {
                    return; // Abaikan pesan jika terlalu cepat
                }
                messageQueue.set(sender, now);

                const isGroup = sender.endsWith('@g.us');
                const participant = msg.key.participant || msg.participant || sender;

                if (msg.key.fromMe) return;

                const messageText = msg.message?.conversation || 
                                  msg.message?.extendedTextMessage?.text || 
                                  msg.message?.imageMessage?.caption || '';

                if (messageText.startsWith(PREFIX)) {
                    const cleanText = messageText.slice(PREFIX.length);
                    
                    const enhancedMsg = {
                        ...msg,
                        chat: sender,
                        from: sender,
                        sender: participant,
                        isGroup: isGroup,
                        botNumber: sock.user.id,
                        mentions: msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [],
                        reply: async (content) => {
                            let messageContent;
                            
                            // Jika content adalah object
                            if (typeof content === 'object') {
                                messageContent = content;
                            } 
                            // Jika content adalah string atau tipe data lainnya
                            else {  
                                messageContent = { text: String(content) };
                            }
                            
                            return await sock.sendMessage(sender, messageContent, { quoted: msg });
                        }
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

        // Tambahkan penanganan error untuk mencegah crash
        sock.ev.on('error', (err) => {
            botLogger.error('WebSocket Error:', err);
            global.isConnected = false;
        });

        // Tambahkan penanganan close untuk membersihkan state
        sock.ev.on('close', () => {
            botLogger.info('Connection closed');
            global.isConnected = false;
        });

        // Tambahkan fungsi banUser ke objek global
        global.db = {
            ...global.db,
            banUser: async function(userId, reason, bannedBy, banType = BAN_TYPES.MANUAL) {
                try {
                    const cleanUserId = userId.split('@')[0];
                    const query = `
                        INSERT INTO banned_users (user_id, reason, banned_by, ban_type) 
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                        reason = VALUES(reason),
                        banned_by = VALUES(banned_by),
                        ban_type = VALUES(ban_type),
                        banned_at = CURRENT_TIMESTAMP
                    `;
                    
                    const [result] = await pool.execute(query, [cleanUserId, reason, bannedBy, banType]);
                    console.log(`User ${cleanUserId} banned successfully`);
                    return result;
                } catch (error) {
                    console.error(`Error in banUser: ${error.message}`);
                    throw error;
                }
            },

            unbanUser: async function(userId) {
                try {
                    const cleanUserId = userId.split('@')[0];
                    
                    // Cek apakah user ada di database banned
                    const [checkBan] = await pool.execute(
                        'SELECT * FROM banned_users WHERE user_id = ?',
                        [cleanUserId]
                    );

                    if (checkBan.length === 0) {
                        throw new Error('User tidak dalam keadaan banned');
                    }

                    // Hapus dari tabel banned_users
                    const [result] = await pool.execute(
                        'DELETE FROM banned_users WHERE user_id = ?',
                        [cleanUserId]
                    );

                    // Jika user diblokir karena CALL_BAN, buka blokirnya
                    if (checkBan[0].ban_type === BAN_TYPES.CALL) {
                        const jid = cleanUserId + '@s.whatsapp.net';
                        await sock.updateBlockStatus(jid, "unblock");
                        console.log(`User ${cleanUserId} unblocked successfully`);
                    }

                    // Log untuk debugging
                    console.log(`Unban process for ${cleanUserId}:`, {
                        banRecord: checkBan[0],
                        deleteResult: result
                    });

                    return {
                        success: true,
                        message: `Berhasil unban user ${cleanUserId}`,
                        previousBanType: checkBan[0].ban_type
                    };
                } catch (error) {
                    console.error(`Error in unbanUser: ${error.message}`);
                    throw error;
                }
            },

            // Fungsi untuk memblokir user
            blockUser: async function(userId, reason, blockedBy) {
                try {
                    const cleanUserId = userId.split('@')[0];
                    
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
                        pool.execute(historyQuery, [cleanUserId, reason, blockedBy])
                    ]);
                    
                    console.log(`User ${cleanUserId} blocked successfully`);
                    return true;
                } catch (error) {
                    console.error(`Error in blockUser: ${error.message}`);
                    throw error;
                }
            },

            // Fungsi untuk membuka blokir user
            unblockUser: async function(userId, unblockBy) {
                try {
                    const cleanUserId = userId.split('@')[0];
                    
                    // Ambil alasan blokir sebelumnya
                    const [blockData] = await pool.execute(
                        'SELECT reason FROM blocked_users WHERE user_id = ?',
                        [cleanUserId]
                    );
                    
                    // Hapus dari tabel blocked_users
                    await pool.execute(
                        'DELETE FROM blocked_users WHERE user_id = ?',
                        [cleanUserId]
                    );
                    
                    // Catat ke history
                    await pool.execute(
                        'INSERT INTO block_history (user_id, action, reason, performed_by) VALUES (?, \'UNBLOCK\', ?, ?)',
                        [cleanUserId, `Unblocked from: ${blockData[0]?.reason || 'Unknown reason'}`, unblockBy]
                    );
                    
                    console.log(`User ${cleanUserId} unblocked successfully`);
                    return true;
                } catch (error) {
                    console.error(`Error in unblockUser: ${error.message}`);
                    throw error;
                }
            },

            // Fungsi untuk mengecek status blokir
            isBlocked: async function(userId) {
                try {
                    const cleanUserId = userId.split('@')[0];
                    const [rows] = await pool.execute(
                        'SELECT * FROM blocked_users WHERE user_id = ?',
                        [cleanUserId]
                    );
                    return rows.length > 0;
                } catch (error) {
                    console.error(`Error checking block status: ${error.message}`);
                    throw error;
                }
            }
        };

        // Perbaiki event handler untuk panggilan
        sock.ev.on('call', async ([call]) => {
            try {
                if (!call) return;  // Skip jika tidak ada data panggilan
                
                const callerJid = call.from;
                console.log('Incoming call detected:', call); // Untuk debugging
                
                // Tambahkan pengecekan status panggilan
                if (call.status !== 'offer') return;

                const callCount = (callAttempts.get(callerJid) || 0) + 1;
                callAttempts.set(callerJid, callCount);

                // Auto reject call
                try {
                    await sock.rejectCall(call.id, callerJid);
                    console.log('Call rejected successfully');
                } catch (rejectError) {
                    console.error('Error rejecting call:', rejectError);
                }

                // Kirim peringatan
                let warningMsg;
                if (callCount >= MAX_CALL_ATTEMPTS) {
                    try {
                        // Block user
                        await sock.updateBlockStatus(callerJid, "block");
                        
                        // Ban user
                        await global.db.banUser(
                            callerJid, 
                            'Melakukan panggilan ke bot sebanyak 3 kali', 
                            'SYSTEM',
                            BAN_TYPES.CALL
                        );
                        
                        warningMsg = '❌ *Anda telah diblokir dan dibanned karena melakukan panggilan berulang kali ke bot*';
                        console.log(`User ${callerJid} has been blocked and banned`);
                    } catch (blockError) {
                        console.error('Error blocking/banning user:', blockError);
                        warningMsg = '⚠️ *Sistem sedang mengalami gangguan, tetapi panggilan tetap tidak diizinkan*';
                    }
                } else {
                    warningMsg = `⚠️ *Peringatan!*\n\nJangan melakukan panggilan ke bot!\nPanggilan akan otomatis ditolak.\n\nPeringatan: ${callCount}/${MAX_CALL_ATTEMPTS}\n\nJika Anda melakukan panggilan sebanyak ${MAX_CALL_ATTEMPTS} kali, Anda akan diblokir dan dibanned secara otomatis.`;
                }

                // Kirim pesan peringatan
                try {
                    await sock.sendMessage(callerJid, { 
                        text: warningMsg 
                    });
                    console.log('Warning message sent successfully');
                } catch (msgError) {
                    console.error('Error sending warning message:', msgError);
                }

                console.log(`Call handled for ${callerJid} (Attempt: ${callCount}/${MAX_CALL_ATTEMPTS})`);
            } catch (error) {
                console.error('Error in call handler:', error);
            }
        });

        // Tambahkan ini di bagian koneksi awal
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log('Call detection system activated');
            }
        });

        return sock;
    } catch (error) {
        botLogger.error(`Error in startConnection: ${error.message}`);
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            botLogger.info(`Retrying connection... (${retryCount}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
            return startConnection();
        } else {
            throw new Error(`Failed to connect after ${MAX_RETRIES} attempts`);
        }
    }
}

// Helper function untuk format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Tambahkan fungsi untuk handle timeout secara global
function setupGlobalErrorHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
        if (reason.message.includes('Timed Out')) {
            botLogger.warning('Timeout detected, attempting to reconnect...');
            if (!global.isConnected && retryCount < MAX_RETRIES) {
                setTimeout(async () => {
                    try {
                        await startConnection();
                    } catch (error) {
                        botLogger.error(`Failed to reconnect: ${error.message}`);
                    }
                }, RETRY_INTERVAL);
            }
        } else {
            botLogger.error('Unhandled rejection at ' + promise + ' reason: ' + reason);
        }
    });
}

// ====== MAIN FUNCTION ======
(async () => {
    botLogger.info('Starting bot...');
    setupGlobalErrorHandlers();
    
    // Load commands from src/commands directory
    loadCommands(path.join(__dirname, 'src/commands'));

    try {
        await startConnection();
    } catch (error) {
        botLogger.error(`Failed to start bot: ${error.message}`);
        process.exit(1);
    }
})();

// Contoh penggunaan di tempat lain
process.on('uncaughtException', (err) => {
    botLogger.error('Uncaught Exception: ' + err);
});

process.on('unhandledRejection', (reason, promise) => {
    botLogger.error('Unhandled rejection at ' + promise + ' reason: ' + reason);
});

// Fungsi untuk menangani logout/remove secara manual
async function handleLogout() {
    try {
        // Logout dari WhatsApp
        await sock.logout();
        
        // Hapus file sesi
        const sessionPath = config.sessionName;
        if (fs.existsSync(sessionPath)) {
            fs.unlinkSync(sessionPath);
        }
        
        botLogger.success('Berhasil logout dan menghapus sesi');
        process.exit(0);
    } catch (error) {
        botLogger.error('Gagal melakukan logout:', error);
    }
}

// Export fungsi handleLogout jika diperlukan
module.exports = {
    // ... exports lainnya ...
    handleLogout
};

// Di bagian command handler
async function handleUnban(sock, msg, userId) {
    try {
        // Log input awal
        console.log('=== UNBAN PROCESS START ===');
        console.log('Original userId:', userId);
        
        // Normalisasi format nomor telepon
        let normalizedUserId = userId;
        
        // Hapus @s.whatsapp.net jika ada
        normalizedUserId = normalizedUserId.replace('@s.whatsapp.net', '');
        normalizedUserId = normalizedUserId.replace('+', '');
        
        if (normalizedUserId.startsWith('08')) {
            normalizedUserId = '62' + normalizedUserId.slice(1);
        }
        
        console.log('Normalized userId:', normalizedUserId);

        // 1. Unban dari database
        console.log('Attempting database unban...');
        const unbanResult = await unbanUser(normalizedUserId);
        console.log('Database unban result:', unbanResult);
        
        if (!unbanResult.success) {
            console.log('Unban failed:', unbanResult.message);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ ${unbanResult.message}`
            });
            return;
        }

        // 2. Unblock di WhatsApp
        console.log('Attempting WhatsApp unblock...');
        try {
            const whatsappId = `${normalizedUserId}@s.whatsapp.net`;
            console.log('WhatsApp ID for unblock:', whatsappId);
            await sock.updateBlockStatus(whatsappId, "unblock");
            console.log('WhatsApp unblock successful');
        } catch (blockError) {
            console.error('WhatsApp unblock error:', blockError);
            console.log('Full error object:', JSON.stringify(blockError, null, 2));
        }

        // 3. Kirim pesan sukses
        const successMessage = `✅ Berhasil mengunban user ${normalizedUserId}\n` +
                             `Status: ${unbanResult.wasUnbanned ? 'Diunban dari database' : 'Sudah tidak dibanned'}`;
        console.log('Sending success message:', successMessage);
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: successMessage
        });

        console.log('=== UNBAN PROCESS COMPLETE ===');

    } catch (error) {
        console.error('=== UNBAN ERROR ===');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ Terjadi kesalahan saat melakukan unban:\n" +
                 `Type: ${error.name}\n` +
                 `Message: ${error.message}`
        });
    }
}