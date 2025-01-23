const axios = require('axios');
const cheerio = require('cheerio');
const { botLogger } = require("../utils/logger");

global.Oblixn.cmd({
  name: "igstalk",
  alias: ["stalk", "igstalk"],
  desc: "Menampilkan informasi profil Instagram",
  category: "stalker",
  async exec(msg, args) {
    try {
      console.log("Received args:", args);
      
      const username = args.args?.[0] || args.match?.[1];
      
      if (!username) {
        return msg.reply("❌ Username Instagram diperlukan!\n\nContoh: !igstalk username");
      }

      console.log("Username to stalk:", username);
      
      await msg.reply("⏳ Sedang mengambil informasi profil...");

      const stats = await igstalk(username);
      
      if (!stats || !stats.username) {
        return msg.reply("❌ User tidak ditemukan atau terjadi kesalahan!");
      }

      const caption = `
📸 *INSTAGRAM STALK*

*Nama:* ${stats.fullName}
*Username:* @${stats.username}

📊 *STATISTIK*
• *Followers:* ${stats.followers || stats.followersM}
• *Following:* ${stats.following || stats.followingM}
• *Posts:* ${stats.postsCount || stats.postsCountM}

📝 *BIO:* 
${stats.bio || '-'}
`.trim();

      if (stats.profilePicHD) {
        await msg.sendImage(stats.profilePicHD, caption);
      } else {
        await msg.reply(caption);
      }

    } catch (error) {
      botLogger.error("Error dalam command igstalk:", error);
      console.error("Detailed error:", error);
      await msg.reply("❌ Terjadi kesalahan saat melakukan stalking: " + error.message);
    }
  }
});

async function igstalk(username) {
  try {
    const { data } = await axios.get(`https://dumpor.com/v/${username}`, {
      headers: {
        "user-agent": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,/;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "cookie": "_inst_key=SFMyNTY.g3QAAAABbQAAAAtfY3NyZl90b2tlbm0AAAAYT3dzSXI2YWR6SG1fNFdmTllfZnFIZ1Ra.5Og9VRy7gUy9IsCwUeYW8O8qvHbndaus-cqBRaZ7jcg"
      }
    });
    const $ = cheerio.load(data);
    const results = {
      username: ($('#user-page > div.user > div.row > div > div.user__title > h4').text() || '').replace(/@/gi, '').trim(),
      fullName: $('#user-page > div.user > div.row > div > div.user__title > a > h1').text(),
      profilePicHD: ($('#user-page > div.user > div.row > div > div.user__img').attr('style') || '').replace(/(background-image: url\(\'|\'\);)/gi, '').trim(),
      bio: $('#user-page > div.user > div.row > div > div.user__info-desc').text(),
      followers: ($('#user-page > div.user > div.row > div > ul > li').eq(1).text() || '').replace(/Followers/gi, '').trim(),
      followersM: ($('#user-page > div.container > div > div > div:nth-child(1) > div > a').eq(2).text() || '').replace(/Followers/gi, '').trim(),
      following: ($('#user-page > div.user > div > div.col-md-4.col-8.my-3 > ul > li').eq(2).text() || '').replace(/Following/gi, '').trim(),
      followingM: ($('#user-page > div.container > div > div > div:nth-child(1) > div > a').eq(3).text() || '').replace(/Following/gi, '').trim(),
      postsCount: ($('#user-page > div.user > div > div.col-md-4.col-8.my-3 > ul > li').eq(0).text() || '').replace(/Posts/gi, '').trim(),
      postsCountM: ($('#user-page > div.container > div > div > div:nth-child(1) > div > a').eq(0).text() || '').replace(/Posts/gi, '').trim()
    };
    return results;
  } catch (error) {
    botLogger.error("Error fetching Instagram data:", error);
    throw new Error("Gagal mengambil data Instagram");
  }
} 