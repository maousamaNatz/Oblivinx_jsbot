const axios = require("axios"),
  { pinterestCookies } = require("../../config/config"),
  wiki = require("wikipedia");
const PinterestScrapper = require("../lib/scrapper");
const GempaScraper = require("../lib/gempa");
const { HttpsProxyAgent } = require("https-proxy-agent");
const fs = require("fs");
const acrcloud = require("acrcloud");
const FileManager = require("../../config/memoryAsync/readfile");
const { promisify } = require('util');
const sleep = promisify(setTimeout);

Oblixn.cmd({
  name: "weather",
  alias: ["cuaca"],
  desc: "🌤 Mendapatkan informasi cuaca untuk lokasi tertentu",
  category: "general",
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
// Command untuk mencari informasi
Oblixn.cmd({
  name: "wiki",
  alias: ["wikipedia"],
  desc: "🔍 Mencari informasi dari Wikipedia",
  category: "search",
  async exec(msg, { args }) {
    try {
      if (!args || args.length === 0) {
        return msg.reply(
          "❗ Silakan berikan kata kunci pencarian\nContoh: .wiki Indonesia"
        );
      }

      const query = args.join(" ").trim();
      if (!query) {
        return msg.reply("❗ Silakan berikan kata kunci pencarian yang valid");
      }

      wiki.setLang("id");

      try {
        const page = await wiki.page(query);
        const summary = await page.summary();

        // Format pesan tanpa URL
        const replyText = `📚 *${summary.title}*\n\n${summary.extract}\n\n> *ᴘᴏᴡᴇʀᴅ ʙʏ OBLIVINX-ᴍᴅ ➤*`;

        // Kirim pesan dengan gambar jika tersedia
        if (summary.originalimage && summary.originalimage.source) {
          await msg
            .reply({
              image: { url: summary.originalimage.source },
              caption: replyText,
            })
            .catch(() => {
              // Jika gagal kirim dengan gambar, kirim teks saja
              return msg.reply(replyText);
            });
        } else {
          await msg.reply(replyText);
        }
      } catch (wikiError) {
        const searchResults = await wiki.search(query);
        if (!searchResults.results || searchResults.results.length === 0) {
          return msg.reply("🚫 Maaf, artikel tidak ditemukan di Wikipedia.");
        }

        const firstResult = await wiki.page(searchResults.results[0].title);
        const summary = await firstResult.summary();

        // Format pesan tanpa URL
        const replyText = `📚 *${summary.title}*\n\n${summary.extract}\n\n> *ᴘᴏᴡᴇʀᴅ ʙʏ OBLIVINX-ᴍᴅ ➤*`;

        if (summary.originalimage && summary.originalimage.source) {
          await msg
            .reply({
              image: { url: summary.originalimage.source },
              caption: replyText,
            })
            .catch(() => {
              // Jika gagal kirim dengan gambar, kirim teks saja
              return msg.reply(replyText);
            });
        } else {
          await msg.reply(replyText);
        }
      }
    } catch (error) {
      console.error("Wikipedia Error:", error);
      return msg.reply(
        "⚠️ Terjadi kesalahan saat mencari di Wikipedia. Silakan coba lagi nanti."
      );
    }
  },
});

// Command Pinterest
Oblixn.cmd({
  name: "pinterest",
  alias: ["pin"],
  desc: "🖼️ Mencari gambar di Pinterest",
  category: "search",
  async exec(msg, { args }) {
    if (!args.length) return msg.reply("❌ Masukkan kata kunci pencarian!");
    const query = args.join(" ");

    try {
      const waitMsg = await msg.reply(
        `🔍 Sedang mencari gambar untuk: "${query}"...`
      );

      const scrapper = new PinterestScrapper(pinterestCookies);
      scrapper.on("error", console.error);
      scrapper.on("warning", console.warn);

      const results = await scrapper.searchPins(query, {
        limit: 5,
        type: "image",
        retry: true,
      });

      if (!results || results.length === 0) {
        return msg.reply(
          "🚫 Tidak ditemukan hasil untuk pencarian tersebut. Coba dengan kata kunci yang lebih umum."
        );
      }

      // Batasi jumlah gambar
      const maxImages = Math.min(3, results.length);

      for (let i = 0; i < maxImages; i++) {
        try {
          const imageBuffer = await downloadImage(results[i].imageUrl);
          await msg.reply({
            image: imageBuffer,
            caption: `🔍 Hasil pencarian untuk: ${query}\n📌 ${
              i + 1
            }/${maxImages}`,
          });

          // Delay antar pengiriman
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (err) {
          console.error(`Failed to process image ${i + 1}:`, err);
          continue;
        }
      }
    } catch (error) {
      console.error("Pinterest Error:", error);
      return msg.reply(
        "⚠️ Terjadi kesalahan saat mencari di Pinterest. Silakan coba lagi nanti."
      );
    }
  },
});

// Command untuk gempa
Oblixn.cmd({
  name: "gempa",
  alias: ["infogempa", "gempabumi"],
  desc: "🌋 Menampilkan informasi gempa terkini dari BMKG",
  category: "search",
  async exec(msg) {
    try {
      const waitMessage = await msg.reply(
        "⏳ Sedang mengambil data gempa terkini..."
      );  

      const scraper = new GempaScraper();
      const gempaData = await scraper.getGempaTerkini();

      if (gempaData.status && gempaData.data.length > 0) {
        const data = gempaData.data[0];
        // Format pesan gempa
        const infoGempa = formatGempaPesan(data);

        try {
          // Coba kirim dengan gambar
          if (data.shakemap) {
            await msg
              .reply({
                image: { url: data.shakemap },
                caption: infoGempa,
              })
              .catch(async () => {
                // Jika gagal kirim gambar, kirim teks saja
                await msg.reply(infoGempa);
              });
          } else {
            await msg.reply(infoGempa);
          }

          // Broadcast jika gempa signifikan (magnitudo >= 5.0)
          if (parseFloat(data.magnitudo) >= 5.0) {
            await broadcastGempaPesan(msg, data);
          }
        } catch (sendError) {
          // Jika terjadi error saat mengirim, kirim teks saja
          await msg.reply(infoGempa);
        }
      } else {
        throw new Error("Gagal mendapatkan data gempa");
      }
    } catch (error) {
      console.error("Error in gempa command:", error);
      await msg.reply(
        "❌ Terjadi kesalahan saat mengambil data gempa. Silakan coba lagi nanti."
      );
    }
  },
});

// Fungsi untuk memformat pesan gempa
function formatGempaPesan(data) {
  return (
    `🌋 *INFORMASI GEMPA TERKINI*\n\n` +
    `📅 Waktu: ${data.tanggal} ${data.jam}\n` +
    `📍 Lokasi: ${data.lintang}, ${data.bujur}\n` +
    `💢 Kekuatan: ${data.magnitudo} SR\n` +
    `🌊 Kedalaman: ${data.kedalaman}\n` +
    `📌 Wilayah: ${data.wilayah}\n` +
    `🚨 Potensi: ${data.potensi}\n` +
    (data.dirasakan ? `👥 Dirasakan: ${data.dirasakan}\n\n` : "\n") +
    getPesanPenguatan(data)
  );
}

// Fungsi untuk mendapatkan pesan penguatan berdasarkan magnitudo
function getPesanPenguatan(data) {
  const magnitude = parseFloat(data.magnitudo);
  let pesan = "";

  if (magnitude >= 7.0) {
    pesan =
      `🙏 *Pesan Penguatan*\n\n` +
      `Untuk saudara-saudara yang terdampak gempa besar ini, tetap tenang dan waspada.\n` +
      `• Segera menuju tempat yang lebih tinggi jika berada di pesisir\n` +
      `• Ikuti petunjuk dari pihak berwenang\n` +
      `• Siapkan tas siaga bencana\n` +
      `• Pastikan keluarga dalam kondisi aman\n` +
      `• Bantu sesama yang membutuhkan\n\n` +
      `Semoga Allah SWT melindungi kita semua. 🤲`;
  } else if (magnitude >= 5.0) {
    pesan =
      `🙏 *Pesan Penguatan*\n\n` +
      `Kepada masyarakat di wilayah terdampak:\n` +
      `• Tetap tenang dan waspada\n` +
      `• Jauhi bangunan yang berpotensi runtuh\n` +
      `• Perhatikan informasi resmi dari BMKG\n` +
      `• Siapkan rencana evakuasi jika diperlukan\n\n` +
      `Mari saling menguatkan dan mendoakan. 🤲`;
  }

  return pesan;
}

// Fungsi untuk broadcast pesan gempa
async function broadcastGempaPesan(msg, data) {
  try {
    // Dapatkan semua chat
    const store = await Oblixn.store.chats.all();
    const chatIds = store.map((chat) => chat.id);

    // Format pesan broadcast
    const broadcastMessage = formatGempaPesan(data);

    let successCount = 0;
    let failCount = 0;

    // Download gambar shakemap terlebih dahulu jika ada
    let imageBuffer = null;
    if (data.shakemap) {
      try {
        const response = await axios.get(data.shakemap, {
          responseType: "arraybuffer",
          timeout: 10000, // 10 detik timeout
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        imageBuffer = Buffer.from(response.data);
      } catch (error) {
        console.error("Error downloading shakemap:", error);
      }
    }

    // Broadcast ke semua chat
    for (const chatId of chatIds) {
      try {
        if (imageBuffer) {
          // Kirim dengan gambar yang sudah didownload
          await Oblixn.sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `*[BROADCAST GEMPA TERKINI]*\n\n${broadcastMessage}`,
          });
        } else {
          // Kirim teks saja jika tidak ada gambar
          await Oblixn.sock.sendMessage(chatId, {
            text: `*[BROADCAST GEMPA TERKINI]*\n\n${broadcastMessage}`,
          });
        }
        successCount++;
        // Delay untuk menghindari spam
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        failCount++;
        console.error(`Broadcast error for ${chatId}:`, error);
      }
    }

    // Log hasil broadcast
    console.log(
      `Broadcast gempa selesai - Berhasil: ${successCount}, Gagal: ${failCount}`
    );
  } catch (error) {
    console.error("Error broadcasting gempa:", error);
  }
}

async function downloadImage(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 15000, // 15 detik timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        // Gunakan proxy jika diperlukan
        /* proxy: {
          host: 'proxy.example.com',
          port: 8080
        } */
      });

      return response.data;
    } catch (error) {
      console.error(`Download attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === retries - 1) {
        throw new Error(`Download error: ${error.message}`);
      }
      
      // Tunggu sebentar sebelum retry
      await sleep(2000 * (attempt + 1)); // Exponential backoff
    }
  }
}

// Tambahkan fungsi validasi URL
function isValidImageUrl(url) {
  try {
    const parsed = new URL(url);
    const ext = parsed.pathname.toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(validExt => 
      ext.endsWith(validExt)
    );
  } catch {
    return false;
  }
}

Oblixn.cmd({
  name: "shazam",
  alias: ["detectmusic", "findmusic"],
  desc: "🎵 Mendeteksi judul lagu dari file audio/video",
  category: "converter",
  async exec(msg, { args }) {
    try {
      const mime = msg.mimetype || "";

      if (!/audio|video/.test(mime)) {
        return await msg.reply(
          "❌ Silakan balas pesan audio/video yang ingin dideteksi lagunya!"
        );
      }

      // Setup ACRCloud
      const acr = new acrcloud({
        host: "identify-eu-west-1.acrcloud.com",
        access_key: "c33c767d683f78bd17d4bd4991955d81",
        access_secret: "bvgaIAEtADBTbLwiPGYlxupWqkNGIjT7J9Ag2vIu",
      });

      // Download media
      const media = await msg.download();

      // Simpan file menggunakan FileManager
      const fileType = mime.split("/")[0];
      const saveResult = await FileManager.saveFile(
        media,
        "shazam." + mime.split("/")[1],
        fileType
      );

      if (!saveResult.success) {
        throw new Error("Gagal menyimpan file audio");
      }

      // Identifikasi lagu
      const res = await acr.identify(media);

      if (res.status.code !== 0) {
        throw new Error(res.status.msg);
      }

      // Ambil metadata
      const { title, artists, album, genres, release_date } =
        res.metadata.music[0];

      // Format hasil
      const result = `
╭─────────── *HASIL SHAZAM* ───────────╮
│ *Judul:* ${title}
│ *Artis:* ${
        artists ? artists.map((v) => v.name).join(", ") : "Tidak diketahui"
      }
│ *Album:* ${album?.name || "Tidak diketahui"}
│ *Genre:* ${genres ? genres.map((v) => v.name).join(", ") : "Tidak diketahui"}
│ *Tanggal Rilis:* ${release_date || "Tidak diketahui"}
╰────────────────────────────────────╯`;
      msg.reply(result);
      // Hapus file temporary
      await FileManager.deleteFile(saveResult.path);
    } catch (error) {
      console.error("Error in shazam:", error);
    }
  },
});
