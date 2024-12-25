const os = require('os');

class MessageMemory {
  constructor() {
    this.memory = new Map();
    this.maxHistoryLength = 10; // Maksimum riwayat yang disimpan per user
  }

  /**
   * Mendapatkan riwayat chat untuk user tertentu
   * @param {string} userId - ID pengguna
   * @returns {Array} Array riwayat chat
   */
  async getHistory(userId) {
    return this.memory.get(userId) || [];
  }

  /**
   * Menambahkan pesan ke riwayat chat
   * @param {string} userId - ID pengguna
   * @param {Object} message - Objek pesan yang akan disimpan
   */
  async addToHistory(userId, message) {
    let userHistory = this.memory.get(userId) || [];
    
    // Tambahkan pesan baru
    userHistory.push(message);
    
    // Jika melebihi batas, hapus yang paling lama
    if (userHistory.length > this.maxHistoryLength) {
      userHistory = userHistory.slice(-this.maxHistoryLength);
    }
    
    this.memory.set(userId, userHistory);
  }

  /**
   * Menghapus riwayat chat untuk user tertentu
   * @param {string} userId - ID pengguna
   */
  async clearHistory(userId) {
    this.memory.delete(userId);
  }

  /**
   * Mendapatkan jumlah pesan dalam riwayat
   * @param {string} userId - ID pengguna
   * @returns {number} Jumlah pesan
   */
  async getHistoryCount(userId) {
    const history = this.memory.get(userId);
    return history ? history.length : 0;
  }
}

module.exports = new MessageMemory();
