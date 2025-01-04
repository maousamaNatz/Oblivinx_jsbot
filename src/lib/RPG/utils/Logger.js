class Logger {
  static info(msg) {
    console.log(`[INFO] ${msg}`);
  }

  static warn(msg) {
    console.warn(`[WARN] ${msg}`);
  }

  static error(msg) {
    console.error(`[ERROR] ${msg}`);
  }

  static debug(msg) {
    if (process.env.DEBUG) {
      console.debug(`[DEBUG] ${msg}`);
    }
  }
}

module.exports = Logger;