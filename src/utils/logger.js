const pino = require('pino');
const moment = require('moment-timezone');

// Konfigurasi timezone
const timezone = 'Asia/Jakarta';

// Format timestamp
const timeFormat = 'DD/MM/YYYY, HH:mm:ss';

// Konfigurasi logger untuk bot
const botLogger = {
    info: (msg) => {
        console.log(`[${moment().tz(timezone).format(timeFormat)}] [INFO] ${msg}`);
    },
    success: (msg) => {
        console.log(`[${moment().tz(timezone).format(timeFormat)}] [SUCCESS] ${msg}`);
    },
    warning: (msg) => {
        console.log(`[${moment().tz(timezone).format(timeFormat)}] [WARNING] ${msg}`);
    },
    error: (msg) => {
        console.error(`[${moment().tz(timezone).format(timeFormat)}] [ERROR] ${msg}`);
    }
};

// Buat instance Pino logger untuk Baileys dengan pino-pretty
const baileysLogger = pino({
    level: 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
            ignore: 'pid,hostname',
            colorize: true,
            levelFirst: true,
            singleLine: true
        }
    }
});

// Konfigurasi logger untuk development
const devLogger = pino({
    level: 'debug',
    transport: {
        target: 'pino-pretty',
        options: {
            translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
            ignore: 'pid,hostname',
            colorize: true,
            levelFirst: true
        }
    }
});

// Fungsi helper untuk format waktu
const getTimestamp = () => moment().tz(timezone).format(timeFormat);

// Buat dummy logger untuk Baileys jika pino tidak berfungsi
const dummyLogger = {
    child: () => dummyLogger,
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    trace: () => {}
};

module.exports = {
    botLogger,
    baileysLogger,
    devLogger,
    log: botLogger.info,
    success: botLogger.success,
    warning: botLogger.warning,
    error: botLogger.error,
    getTimestamp
}; 