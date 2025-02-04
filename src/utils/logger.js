const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

// Custom levels dengan emoji dan warna menarik
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    debug: 4,
    trace: 5
  },
  colors: {
    error: 'red bold',
    warn: 'yellow bold',
    info: 'green bold',
    success: 'cyan bold',
    debug: 'blue bold',
    trace: 'white bold'
  }
};

// Format log dengan emoji dan styling menarik
const consoleFormat = printf(({ level, message }) => {
  const emojiMap = {
    error: '❌🔥',
    warn: '⚠️🚧',
    info: 'ℹ️✨',
    success: '✅🌟',
    debug: '🐛🔍',
    trace: '📋👀'
  };
  
  return `${emojiMap[level] || ''} \x1b[1m[${level.toUpperCase()}]\x1b[0m \x1b[36m›\x1b[0m ${message}`;
});

const fileFormat = printf(({ level, message, timestamp }) => {
  const emojiMap = {
    error: '❌🔥',
    warn: '⚠️🚧',
    info: 'ℹ️✨',
    success: '✅🌟',
    debug: '🐛🔍',
    trace: '📋👀'
  };
  
  return `${timestamp} ${emojiMap[level] || ''} \x1b[1m[${level.toUpperCase()}]\x1b[0m \x1b[36m›\x1b[0m ${message}`;
});

// Logger utama dengan tampilan cantik
const botLogger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize({ colors: customLevels.colors }),
    fileFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        consoleFormat
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/bot-debug.log',
      format: combine(timestamp(), fileFormat)
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: 'info',
      format: combine(timestamp(), fileFormat)
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), fileFormat)
    })
  ]
});

// Logger Baileys dengan styling khusus
const baileysLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'fatal',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize({ colors: customLevels.colors }),
    fileFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        consoleFormat
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/baileys-debug.log',
      format: combine(timestamp(), fileFormat)
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      format: combine(timestamp(), fileFormat)
    })
  ]
});

// Method tambahan dengan styling khusus
botLogger.success = function(message) {
  this.log('success', `\x1b[36m${message}\x1b[0m`);
};

botLogger.child = function(options) {
  return winston.createLogger({
    ...this.config,
    defaultMeta: { ...this.defaultMeta, ...options },
    transports: this.transports,
    format: combine(
      colorize({ colors: customLevels.colors }),
      consoleFormat
    )
  });
};

winston.addColors(customLevels.colors);

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    red: "\x1b[31m"
};

const color = (text, colorName) => {
    return colors[colorName] + text + colors.reset;
};

const log = (message, type = 'info') => {
    switch(type) {
        case 'error':
            console.error(`❌ ${color('ERROR', 'red')}: ${message}`);
            break;
        case 'warn':
            console.warn(`⚠️ ${color('WARNING', 'yellow')}: ${message}`);
            break;
        default:
            console.log(`ℹ️ ${color('INFO', 'cyan')}: ${message}`);
    }
};

// Perbaiki semua method yang salah
botLogger.warning = botLogger.warn;

module.exports = { 
  botLogger,
  baileysLogger,
  color,
  log
};