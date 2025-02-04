const axios = require('axios');
const { default: makeWASocket } = require('@whiskeysockets/baileys');

class WhatsAppAPI {
  constructor(sock) {
    this.sock = sock;
  }

  async sendTextMessage(jid, text, quoted = null) {
    try {
      const message = {
        text: text
      };
      
      if (quoted) {
        await this.sock.sendMessage(jid, message, { quoted });
      } else {
        await this.sock.sendMessage(jid, message);
      }
      
      return true;
    } catch (error) {
      console.error('Error mengirim pesan:', error);
      return false;
    }
  }

  async sendImage(jid, imageBuffer, caption = '', quoted = null) {
    try {
      const message = {
        image: imageBuffer,
        caption: caption
      };

      if (quoted) {
        await this.sock.sendMessage(jid, message, { quoted });
      } else {
        await this.sock.sendMessage(jid, message);
      }

      return true;
    } catch (error) {
      console.error('Error mengirim gambar:', error);
      return false;
    }
  }

  async sendDocument(jid, buffer, fileName, quoted = null) {
    try {
      const message = {
        document: buffer,
        fileName: fileName
      };

      if (quoted) {
        await this.sock.sendMessage(jid, message, { quoted });
      } else {
        await this.sock.sendMessage(jid, message);
      }

      return true;
    } catch (error) {
      console.error('Error mengirim dokumen:', error);
      return false;
    }
  }

  async sendButton(jid, text, buttons, quoted = null) {
    try {
      const message = {
        text: text,
        buttons: buttons
      };

      if (quoted) {
        await this.sock.sendMessage(jid, message, { quoted });
      } else {
        await this.sock.sendMessage(jid, message);
      }

      return true;
    } catch (error) {
      console.error('Error mengirim button:', error);
      return false;
    }
  }

  async sendTemplate(jid, template, quoted = null) {
    try {
      const message = {
        templateMessage: template
      };

      if (quoted) {
        await this.sock.sendMessage(jid, message, { quoted });
      } else {
        await this.sock.sendMessage(jid, message);
      }

      return true;
    } catch (error) {
      console.error('Error mengirim template:', error);
      return false;
    }
  }

  async readMessage(jid, messageID) {
    try {
      await this.sock.readMessages([{ remoteJid: jid, id: messageID }]);
      return true;
    } catch (error) {
      console.error('Error membaca pesan:', error);
      return false;
    }
  }

  async typing(jid, duration = 1000) {
    try {
      await this.sock.sendPresenceUpdate('composing', jid);
      setTimeout(async () => {
        await this.sock.sendPresenceUpdate('paused', jid);
      }, duration);
      return true;
    } catch (error) {
      console.error('Error menampilkan typing:', error);
      return false;
    }
  }

  async sendMessage(jid, content, options = {}) {
    try {
      if (!this.sock || this.sock.connection !== 'open') {
        throw new Error('Koneksi tidak aktif');
      }
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const result = await Promise.race([
            this.sock.sendMessage(jid, content, options),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 15000)
            )
          ]);
          return result;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        }
      }
    } catch (error) {
      console.error(`Gagal mengirim pesan ke ${jid}:`, error);
      throw error;
    }
  }
}

module.exports = WhatsAppAPI;