const axios = require("axios"),
  { pinterestCookies } = require("../../config/config"),
  wiki = require("wikipedia");
const cheerio = require('cheerio');
const PinterestScrapper = require('../lib/scrapper');
const { downloadImage } = require('../lib/function');

/*
 *
 * wheater command
 *  
 */
global.Oblixn.cmd({
  name: "weather",
  alias: ["cuaca"],
  desc: "🌤 Mendapatkan informasi cuaca untuk lokasi tertentu",
  category: "search",
  async exec(msg, { args }) {
    try {
      const city = args.join(" ");
      if (!city)
        return msg.reply(
          "❗ Silakan berikan nama kota...\nContoh: .weather Jakarta"
        );

      const apiKey =
        process.env.OPENWEATHER_API_KEY || "2d61a72574c11c4f36173b627f8cb177";
      const url = `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${apiKey}&units=metric&lang=id`;

      const response = await axios.get(url);
      const data = response.data;

      const weather = `
🌍 *Informasi Cuaca untuk ${data.name}, ${data.sys.country}* 🌍

🌡️ *Suhu*: ${data.main.temp}°C
🌡️ *Terasa seperti*: ${data.main.feels_like}°C
🌡️ *Suhu Min*: ${data.main.temp_min}°C
🌡️ *Suhu Max*: ${data.main.temp_max}°C
💧 *Kelembaban*: ${data.main.humidity}%
☁️ *Cuaca*: ${data.weather[0].main}
🌫️ *Deskripsi*: ${data.weather[0].description}
💨 *Kecepatan Angin*: ${data.wind.speed} m/s
📌 *Tekanan*: ${data.main.pressure} hPa
`;

      return msg.reply(weather);
    } catch (e) {
      console.error(e);
      if (e.response && e.response.status === 404) {
        return msg.reply(
          "🚫 Kota tidak ditemukan. Mohon periksa ejaan dan coba lagi."
        );
      }
      return msg.reply(
        "⚠️ Terjadi kesalahan saat mengambil data cuaca. Silakan coba lagi nanti."
      );
    }
  },
});

/*
 *
 * end wheater command
 *
 */
// Command untuk mencari informasi
global.Oblixn.cmd({
  name: "wiki",
  alias: ["wikipedia"],
  desc: "🔍 Mencari informasi dari Wikipedia",
  category: "search",
  async exec(msg, { args }) {
    try {
      if (!args || args.length === 0) {
        return msg.reply('❗ Silakan berikan kata kunci pencarian\nContoh: .wiki Indonesia');
      }

      const query = args.join(" ").trim();
      if (!query) {
        return msg.reply('❗ Silakan berikan kata kunci pencarian yang valid');
      }

      wiki.setLang('id');
      
      try {
        const page = await wiki.page(query);
        const summary = await page.summary();
        
        // Format pesan tanpa URL
        const replyText = `📚 *${summary.title}*\n\n${summary.extract}\n\n> *ᴘᴏᴡᴇʀᴅ ʙʏ OBLIVINX-ᴍᴅ ➤*`;

        // Kirim pesan dengan gambar jika tersedia
        if (summary.originalimage && summary.originalimage.source) {
          await msg.reply({
            image: { url: summary.originalimage.source },
            caption: replyText
          }).catch(() => {
            // Jika gagal kirim dengan gambar, kirim teks saja
            return msg.reply(replyText);
          });
        } else {
          await msg.reply(replyText);
        }

      } catch (wikiError) {
        const searchResults = await wiki.search(query);
        if (!searchResults.results || searchResults.results.length === 0) {
          return msg.reply('🚫 Maaf, artikel tidak ditemukan di Wikipedia.');
        }

        const firstResult = await wiki.page(searchResults.results[0].title);
        const summary = await firstResult.summary();
        
        // Format pesan tanpa URL
        const replyText = `📚 *${summary.title}*\n\n${summary.extract}\n\n> *ᴘᴏᴡᴇʀᴅ ʙʏ OBLIVINX-ᴍᴅ ➤*`;

        if (summary.originalimage && summary.originalimage.source) {
          await msg.reply({
            image: { url: summary.originalimage.source },
            caption: replyText
          }).catch(() => {
            // Jika gagal kirim dengan gambar, kirim teks saja
            return msg.reply(replyText);
          });
        } else {
          await msg.reply(replyText);
        }
      }

    } catch (error) {
      console.error('Wikipedia Error:', error);
      return msg.reply('⚠️ Terjadi kesalahan saat mencari di Wikipedia. Silakan coba lagi nanti.');
    }
  }
});

// Command Pinterest
global.Oblixn.cmd({
    name: "pinterest",
    alias: ["pin"],
    desc: "🖼️ Mencari gambar di Pinterest",
    category: "search",
    async exec(msg, { args }) {
        try {
            if (!args || args.length === 0) {
                return msg.reply("❗ Silakan berikan kata kunci pencarian\nContoh: .pinterest kucing");
            }

            const query = args.join(" ");
            const waitMsg = await msg.reply(`🔍 Sedang mencari gambar untuk: "${query}"...`);

            const scrapper = new PinterestScrapper(pinterestCookies);
            scrapper.on('error', console.error);
            scrapper.on('warning', console.warn);

            const results = await scrapper.searchPins(query, {
                limit: 5,
                type: 'image',
                retry: true
            });

            if (!results || results.length === 0) {
                return msg.reply("🚫 Tidak ditemukan hasil untuk pencarian tersebut. Coba dengan kata kunci yang lebih umum.");
            }

            // Fungsi untuk download gambar
            async function downloadImage(url) {
                try {
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        timeout: 10000
                    });
                    return Buffer.from(response.data);
                } catch (error) {
                    console.error('Download error:', error);
                    throw error;
                }
            }

            // Kirim gambar satu per satu
            let successCount = 0;
            for (const pin of results) {
                try {
                    const buffer = await downloadImage(pin.imageUrl);
                    const caption = `🎯 Hasil pencarian Pinterest\n` +
                                  `📝 Judul: ${pin.title}\n` +
                                  `🔍 Query: ${query}\n` +
                                  `🆔 Pin ID: ${pin.id}\n` +
                                  `📍 Tipe: ${pin.type}\n\n` +
                                  `> *ᴘᴏᴡᴇʀᴅ ʙʏ OBLIVINX-ᴍᴅ ➤*`;

                    // Gunakan msg.reply untuk mengirim gambar
                    await msg.reply({
                        image: buffer,
                        caption: caption
                    });

                    successCount++;
                    // Delay antara pengiriman
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (err) {
                    console.error(`Failed to process pin:`, err);
                    continue;
                }
            }

            // Kirim ringkasan hasil
            if (successCount === 0) {
                await msg.reply("❌ Gagal mengirim semua gambar. Silakan coba lagi nanti.");
            } else if (successCount < results.length) {
                await msg.reply(`⚠️ Berhasil mengirim ${successCount} dari ${results.length} gambar.`);
            }

        } catch (error) {
            console.error('Pinterest Error:', error);
            return msg.reply("⚠️ Terjadi kesalahan saat mencari di Pinterest. Silakan coba lagi nanti.");
        }
    }
});
