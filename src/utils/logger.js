const winston = require('winston');
const { combine, timestamp, printf } = winston.format;

// Custom levels dan colors untuk logger
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
    error: 'red',
    warn: 'yellow',
    info: 'green',
    success: 'cyan',
    debug: 'blue',
    trace: 'white'
  }
};

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Logger untuk bot
const botLogger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    new winston.transports.File({ filename: 'logs/bot-debug.log' }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      level: 'info'
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    })
  ]
});

// Logger khusus untuk Baileys
const baileysLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'fatal',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/baileys-debug.log',
      level: 'fatal'
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    })
  ]
});

// Method tambahan untuk bot logger
botLogger.success = function(message) {
  this.log('success', message);
};

botLogger.child = function(options) {
  return winston.createLogger({
    ...this.config,
    defaultMeta: { ...this.defaultMeta, ...options },
    transports: this.transports
  });
};

botLogger.defaultMeta = {};

winston.addColors(customLevels.colors);

module.exports = { 
  botLogger,
  baileysLogger 
};