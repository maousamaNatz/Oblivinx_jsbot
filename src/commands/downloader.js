const youtubedl = require("youtube-dl-exec");
const path = require("path");
const { botLogger } = require("../utils/logger");
const fileManager = require("../../config/memoryAsync/readfile");
const InstagramDownloader = require("../lib/instadl");
const axios = require('axios');
const cheerio = require('cheerio');

// Constants
const MAX_VIDEO_DURATION = 600; // 10 menit
const MAX_AUDIO_DURATION = 900; // 15 menit
const DELAY_BETWEEN_MEDIA = 2500; // 2.5 detik

// Helper functions
const generateSafeFileName = (title, extension, timestamp = false) => {
  const safe = title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 32);
  return timestamp ? `${safe}_${Date.now()}.${extension}` : `${safe}.${extension}`;
};

const handleFileCleanup = async (filePath) => {
  try {
    await fileManager.deleteFile(filePath);
    botLogger.info(`Berhasil membersihkan file sementara: ${filePath}`);
  } catch (error) {
    botLogger.error(`Gagal membersihkan file ${filePath}:`, error);
  }
};

// YouTube command handlers
const fetchVideoInfo = async (url) => {
  return await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCallHome: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true,
  });
};

const downloadYouTubeMedia = async (url, outputPath, options) => {
  await youtubedl(url, {
    ...options,
    output: outputPath,
    noCheckCertificate: true,
    noWarnings: true,
    noCallHome: true,
    preferFreeFormats: true,
    youtubeSkipDashManifest: true,
  });
};

// Mediafire handler
const handleMediafireDownload = async (url) => {
  const { data } = await axios.get(
    `https://raganork-network.vercel.app/api/mediafire?url=${url}`
  );
  
  const response = await axios.get(data.link, { responseType: 'arraybuffer' });
  return {
    buffer: Buffer.from(response.data),
    fileName: data.title,
    mimetype: response.headers['content-type'],
    size: data.size
  };
};

// Tiktok handler
async function AlienAlfaTiktok(Url) {
  return new Promise(async (resolve, reject) => {
    try {
      const initialResponse = await axios({
        url: "https://ttdownloader.com/",
        method: "GET",
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36",
          "cookie": "_ga=GA1.2.1240046717.1620835673; PHPSESSID=i14curq5t8omcljj1hlle52762; popCookie=1; _gid=GA1.2.1936694796.1623913934"
        }
      });

      const $ = cheerio.load(initialResponse.data);
      const token = $('#token').attr('value');

      const postResponse = await axios({
        url: "https://ttdownloader.com/req/",
        method: "POST",
        data: new URLSearchParams({ url: Url, format: "", token }),
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36"
        }
      });

      const resultPage = cheerio.load(postResponse.data);
      resolve({
        status: postResponse.status,
        result: {
          nowatermark: resultPage('#results-list > div:nth-child(2) div.download > a').attr('href'),
          watermark: resultPage('#results-list > div:nth-child(3) div.download > a').attr('href'),
          audio: resultPage('#results-list > div:nth-child(4) div.download > a').attr('href')
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Instagram handler
const handleInstagramMedia = async (downloader, url, msg) => {
  const result = await downloader.download(url);
  
  if (!result.success) {
    botLogger.error("Gagal download Instagram:", result.error);
    throw new Error(result.error);
  }

  if (result.type === 'post') {
    await msg.reply(`📥 Ditemukan ${result.metadata.media_count} media (Mengirim 5 pertama)`);
    
    const mediaToSend = result.media.slice(0, 5);
    for (const [index, item] of mediaToSend.entries()) {
      const caption = `📸 *${result.metadata.username}*${result.metadata.caption?.substring(0, 1000) || ''}
      \n👍 ${result.metadata.likes} Suka | 💬 ${result.metadata.comments} Komentar
      ⏰ ${new Date(result.metadata.timestamp * 1000).toLocaleString()}`;

      await Oblixn.sock.sendMessage(msg.chat, {
        [item.type === "video" ? "video" : "image"]: { url: item.url },
        caption: item.type === "video" 
          ? `${caption}\n⏱ Durasi: ${item.duration}s | 📏 Resolusi: ${item.quality}`
          : caption,
        mentions: result.metadata.mentions || []
      }, { quoted: msg });
      
      if (index < mediaToSend.length - 1) await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MEDIA));
    }
  }
  
  return result;
};

// YouTube Video Command
global.Oblixn.cmd({
  name: "ytmp4",
  alias: ["yt", "ytvideo"],
  desc: "📥 Download video YouTube",
  category: "downloader",
  async exec(msg, { args, text }) {
    const url = args[0] || text;
    if (!url) return msg.reply("❗ Harap berikan URL YouTube\nContoh: !ytmp4 https://youtube.com/watch?v=xxxxx");

    try {
      await msg.reply("⏳ Memproses video...");
      
      const videoInfo = await fetchVideoInfo(url);
      botLogger.info("Informasi video:", { title: videoInfo.title });

      if (videoInfo.duration > MAX_VIDEO_DURATION) {
        return msg.reply("❌ Video terlalu panjang (maks 10 menit)");
      }

      const fileName = generateSafeFileName(videoInfo.title, "mp4");
      const outputPath = path.join(fileManager.directories.video, fileName);
      
      const { path: filePath } = await fileManager.saveFile(
        Buffer.from(await downloadYouTubeMedia(url, outputPath, { format: "best[ext=mp4]" })),
        fileName,
        'video'
      );

      await Oblixn.sock.sendMessage(msg.key.remoteJid, {
        video: fs.readFileSync(filePath),
        caption: `🎥 *${videoInfo.title}*\n⏱ Durasi: ${formatDuration(videoInfo.duration)}`
      });
      
      await handleFileCleanup(filePath);
    } catch (error) {
      botLogger.error("Error video YouTube:", error);
      msg.reply("❌ Gagal download. Periksa:\n1. URL valid\n2. Video publik\n3. Ketersediaan video");
    }
  },
});

// YouTube Audio Command
global.Oblixn.cmd({
  name: "ytmp3",
  alias: ["yta", "ytaudio"],
  desc: "🎵 Download audio YouTube",
  category: "downloader",
  async exec(msg, { args, text }) {
    const url = args[0] || text;
    if (!url) return msg.reply("❗ Harap berikan URL YouTube\nContoh: !ytmp3 https://youtube.com/watch?v=xxxxx");

    try {
      await msg.reply("⏳ Memproses audio...");
      
      const videoInfo = await fetchVideoInfo(url);
      if (videoInfo.duration > MAX_AUDIO_DURATION) {
        return msg.reply("❌ Audio terlalu panjang (maks 15 menit)");
      }

      const fileName = generateSafeFileName(videoInfo.title, "mp3", true);
      const outputPath = path.join(fileManager.directories.audio, fileName);

      const { path: filePath } = await fileManager.saveFile(
        Buffer.from(await downloadYouTubeMedia(url, outputPath, {
          extractAudio: true,
          audioFormat: "mp3",
          format: "bestaudio",
          addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)"]
        })),
        fileName,
        'audio'
      );

      await Oblixn.sock.sendMessage(msg.key.remoteJid, {
        document: fs.readFileSync(filePath),
        mimetype: "audio/mpeg",
        fileName: path.basename(filePath),
        caption: `🎵 ${videoInfo.title}\n⏱ Durasi: ${formatDuration(videoInfo.duration)}`
      });
      
      await handleFileCleanup(filePath);
    } catch (error) {
      botLogger.error("Error audio YouTube:", error);
      msg.reply("❌ Gagal memproses audio. Silakan coba lagi.");
    }
  },
});

// Mediafire Command
global.Oblixn.cmd({
  name: "mediafire",
  alias: ["mf"],
  desc: "📥 Download file Mediafire",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      const url = args[0];
      if (!url || !/https?:\/\/(www\.)?mediafire\.com/.test(url)) {
        return msg.reply("❌ URL Mediafire tidak valid");
      }

      const { buffer, fileName, mimetype } = await handleMediafireDownload(url);
      const { path: filePath } = await fileManager.saveFile(buffer, fileName, 'documents');
      
      await Oblixn.sock.sendMessage(msg.chat, {
        document: fs.readFileSync(filePath),
        fileName,
        mimetype
      }, { quoted: msg });

      botLogger.info(`Berhasil download Mediafire: ${fileName}`);
      await handleFileCleanup(filePath);
    } catch (error) {
      botLogger.error("Error Mediafire:", error);
      msg.reply("❌ Gagal download file. Silakan coba lagi nanti.");
    }
  },
});

// Tiktok Command
global.Oblixn.cmd({
  name: "tiktok",
  alias: ["tt", "ttdl"],
  desc: "⬇️ Download video TikTok",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      const url = args[0];
      if (!url || !/tiktok\.com/i.test(url)) {
        return msg.reply("❌ Masukkan URL TikTok yang valid");
      }

      const { result } = await AlienAlfaTiktok(url);
      if (!result.nowatermark) {
        return msg.reply("❌ Gagal mengambil video. Coba beberapa saat lagi");
      }

      await Oblixn.sock.sendMessage(msg.chat, {
        video: { url: result.nowatermark },
        caption: "🎵 TikTok Download - Tanpa Watermark"
      }, { quoted: msg });

    } catch (error) {
      botLogger.error("Error download TikTok:", error);
      msg.reply("❌ Gagal mendownload. Pastikan link valid dan tidak private");
    }
  }
});

// Instagram Command
global.Oblixn.cmd({
  name: "igdl",
  alias: ["ig", "igdownload", "instagram"],
  desc: "Download konten Instagram",
  category: "downloader",
  async exec(msg, { args, text }) {
    try {
      const url = args[0] || text;
      if (!url) return msg.reply("❌ URL Instagram tidak valid");
      
      const igDownloader = new InstagramDownloader();
      if (igDownloader.headers.cookie.includes("sessionid=668Q96838382%3AVyZSFuT0tzrMwv%3A16%3AAYd5KFWjTKjomxrySjP6kJJmgE1pR_eFJNSK9nmwzg;")) {
        return msg.reply("🔑 Update session ID Instagram di environment variables");
      }

      const result = await handleInstagramMedia(igDownloader, url, msg);
      botLogger.info(`Berhasil Instagram: ${result.url || url}`);
    } catch (error) {
      botLogger.error("Error Instagram:", error);
      msg.reply("❌ Gagal download. Periksa:\n- Link publik\n- Session valid\n- Konten tersedia");
    }
  }
});

// Format durasi
function formatDuration(seconds) {
  const format = (num) => num.toString().padStart(2, "0");
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 
    ? `${hours}:${format(minutes)}:${format(seconds % 60)}`
    : `${minutes}:${format(seconds % 60)}`;
}