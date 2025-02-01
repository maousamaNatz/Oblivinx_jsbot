const axios = require('axios');
const cheerio = require('cheerio');
const { botLogger } = require("../utils/logger");

global.Oblixn.cmd({
  name: "igstalk",
  alias: ["stalk", "igstalk"],
  desc: "Menampilkan informasi profil Instagram",
  category: "stalker",
  async exec(msg, { args, text }) {
    try {
      const username = args[0] || text?.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i)?.[1];
      
      if (!username) {
        return msg.reply("❌ Masukkan username Instagram yang valid!\nContoh: !igstalk username");
      }

      await msg.reply("⏳ Mengambil info profil...");

      const stats = await igstalk(username);
      
      if (!stats?.username) {
        return msg.reply("❌ Profil tidak ditemukan atau akun private");
      }

      // Format angka dengan titik untuk ribuan
      const formatNumber = (num) => num?.replace?.(/(\d)(?=(\d{3})+$)/g, '$1.') || '-';
      
      const caption = `
📸 *INSTAGRAM STALKER*

*Nama Lengkap:* ${stats.fullName || '-'}
*Username:* @${stats.username}

📊 *STATISTIK*
• *Followers:* ${formatNumber(stats.followers)}
• *Following:* ${formatNumber(stats.following)}
• *Postingan:* ${formatNumber(stats.postsCount)}

📝 *BIO:* 
${stats.bio?.trim() || 'Tidak ada bio'}

🔗 *Profil:* instagram.com/${stats.username}
`.trim();

      if (stats.profilePicHD?.startsWith('http')) {
        await Oblixn.sock.sendMessage(msg.chat, { 
          image: { url: stats.profilePicHD },
          caption: caption 
        }, { quoted: msg });
      } else {
        await msg.reply(caption);
      }

    } catch (error) {
      botLogger.error("Error igstalk:", error);
      await msg.reply(`❌ Gagal memproses: ${error.message || 'Coba gunakan username yang valid'}`);
    }
  }
});

async function igstalk(username) {
  try {
    const { data } = await axios.get(`https://dumpor.com/v/${username}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "cookie": "csrftoken=abcd1234; ig_did=ABCD-1234; mid=XYZ123"
      }
    });
    
    const $ = cheerio.load(data);
    
    // Improved selector based on current dumpor.com layout
    return {
      username: $('#user-page .user__title h4').text().replace('@', '').trim(),
      fullName: $('#user-page .user__title h1').text().trim(),
      profilePicHD: $('#user-page .user__img').css('background-image').match(/url\(["']?(.*?)["']?\)/)?.[1],
      bio: $('#user-page .user__info-desc').text().trim(),
      followers: $('#user-page li:contains("Followers")').text().replace('Followers', '').trim(),
      following: $('#user-page li:contains("Following")').text().replace('Following', '').trim(),
      postsCount: $('#user-page li:contains("Posts")').text().replace('Posts', '').trim()
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Profil tidak ditemukan');
    }
    botLogger.error("IG Stalk Error:", error);
    throw new Error('Gagal mengambil data, coba beberapa saat lagi');
  }
}