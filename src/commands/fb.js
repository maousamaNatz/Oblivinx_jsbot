const { downloadFbVideo, getFbVideoInfo } = require("../lib/fbDownloader");
const { formatBytes, formatDuration } = require("../utils/helper");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: 'fb',
  description: 'Facebook downloader command',
  async exec({ msg, args }) {
    try {
      const { isBanned } = await Oblixn.db.checkBanStatus(msg.sender);
      if (isBanned) return;
      
      const url = args[0] || (msg.quoted?.text?.match(/(https?:\/\/[^\s]+)/gi)?.[0]);
      if (!url) return msg.reply("Silakan berikan URL Facebook");
      
      await Oblixn.sock.sendPresenceUpdate('composing', msg.chat);

      const quality = args.includes("--hd") || args.includes("-h") ? "hd" : "sd";
      const audioOnly = args.includes("--mp3") || args.includes("-a");
      const format = audioOnly ? "mp3" : "mp4";
      const filename = `fb_${Date.now()}_${quality}`;

      const info = await getFbVideoInfo(url);
      const caption = `📌 *Judul:* ${info.title || '-'}
👤 *Uploader:* ${info.uploader}
⏳ *Durasi:* ${formatDuration(info.duration_ms)}
👀 *Views:* ${info.statistics.views.toLocaleString()}
❤️ *Likes:* ${info.statistics.likes.toLocaleString()}
🔄 *Shares:* ${info.statistics.shares.toLocaleString()}
📅 *Upload Date:* ${new Date(info.uploadDate).toLocaleDateString('id-ID')}
🔗 *Kualitas:* ${quality.toUpperCase()}
🎚 *Format:* ${format.toUpperCase()}`;

      await msg.reply(caption);
      if(info.thumbnail) await msg.reply({ image: { url: info.thumbnail } });

      const progressMsg = await msg.reply("⏳ _Mengunduh video..._");
      const { path: filePath } = await downloadFbVideo(url, { 
        quality,
        format,
        filename,
        metadata: true,
        thumbnail: true,
        audioOnly
      });
      
      await progressMsg.edit("📤 _Mengunggah video..._");
      
      const fileSize = fs.statSync(filePath).size;
      const fileExt = path.extname(filePath);
      const sendAsDocument = fileExt !== '.mp4' || audioOnly;

      await msg.reply({
        [sendAsDocument ? 'document' : 'video']: { 
          url: `file://${filePath}`,
          mimetype: sendAsDocument ? undefined : 'video/mp4'
        },
        fileName: `${info.title.substring(0, 50)}${fileExt}`,
        caption: `📁 *File Info*\nUkuran: ${formatBytes(fileSize)}\nFormat: ${format.toUpperCase()}`
      });

      fs.unlinkSync(filePath);
      await progressMsg.delete();

    } catch (error) {
      console.error(error);
      msg.reply(`❌ Gagal mengunduh: ${error.message.includes('melebihi batas') ? 
        'Ukuran video terlalu besar' : 
        error.message}`);
    }
  }
};