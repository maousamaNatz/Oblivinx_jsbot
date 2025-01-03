const { getGroupSettings } = require('../../config/dbConf/groupSettings');
const { botLogger } = require('../utils/logger');

async function handleGroupMessage(msg) {
  try {
    const groupId = msg.key.remoteJid;
    if (!groupId?.endsWith('@g.us')) return;

    const settings = await getGroupSettings(groupId);
    if (!settings) return;

    // Handle anti bot
    if (settings.anti_bot === 'ya' && msg.key.fromMe) {
      return;
    }

    // Handle anti hapus pesan
    if (settings.anti_hapus_pesan === 'ya' && msg.messageStubType === 'MESSAGE_DELETED') {
      // Implementasi logika untuk anti hapus pesan
    }

    

  } catch (error) {
    botLogger.error('Error handling group message:', error);
  }
}

module.exports = {
  handleGroupMessage
}; 