const winston = require('winston');
const { combine, timestamp, printf } = winston.format;

// Tambahkan custom level untuk success
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

const customFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
});

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    new winston.transports.File({ filename: './logs/combined.log' }),
    new winston.transports.File({ filename: './logs/error.log', level: 'error' })
  ]
});

// Perbaiki method child
logger.child = function(options) {
  return this.defaultMeta 
    ? winston.createLogger({
        ...this.config,
        defaultMeta: { ...this.defaultMeta, ...options },
        transports: this.transports
      })
    : this;
};

// Tambahkan properti defaultMeta jika belum ada
logger.defaultMeta = logger.defaultMeta || {};

// Tambahkan method success
logger.success = function(message) {
  this.log('success', message);
};

// Tambahkan transport khusus untuk baileys
logger.add(new winston.transports.Console({
  level: 'debug',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

winston.addColors(customLevels.colors);

module.exports = logger;