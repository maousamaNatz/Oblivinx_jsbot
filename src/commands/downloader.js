const youtubedl = require("youtube-dl-exec");
const fs = require("fs");
const path = require("path");
const { botLogger } = require("../utils/logger");
const fileManager = require("../../config/memoryAsync/readfile");
const InstagramDownloader = require("../lib/instadl");
const axios = require('axios');

// Constants
const TEMP_DIR = path.join(fileManager.baseDir, "temp");
const MAX_VIDEO_DURATION = 600; // 10 minutes
const MAX_AUDIO_DURATION = 900; // 15 minutes
const DELAY_BETWEEN_MEDIA = 2500; // 2.5 seconds

// Helper functions
const createTempDir = () => {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
};

const generateSafeFileName = (title, extension, timestamp = false) => {
  const safe = title.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 32);
  return timestamp ? `${safe}_${Date.now()}.${extension}` : `${safe}.${extension}`;
};

const handleFileCleanup = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      botLogger.info(`Cleaned up temporary file: ${filePath}`);
    }
  } catch (error) {
    botLogger.error(`Error cleaning up file ${filePath}:`, error);
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

// Instagram handler
const handleInstagramMedia = async (downloader, url, msg) => {
  const result = await downloader.download(url);
  
  if (!result.success) {
    botLogger.error("Instagram download failed:", result.error);
    throw new Error(result.error);
  }

  if (result.type === 'post') {
    await msg.reply(`📥 Found ${result.metadata.media_count} media (Sending first 5)`);
    
    const mediaToSend = result.media.slice(0, 5);
    for (const [index, item] of mediaToSend.entries()) {
      const caption = `📸 *${result.metadata.username}*${result.metadata.caption?.substring(0, 1000) || ''}
      \n👍 ${result.metadata.likes} Likes | 💬 ${result.metadata.comments} Comments
      ⏰ ${new Date(result.metadata.timestamp * 1000).toLocaleString()}`;

      await Oblixn.sock.sendMessage(msg.chat, {
        [item.type === "video" ? "video" : "image"]: { url: item.url },
        caption: item.type === "video" 
          ? `${caption}\n⏱ Duration: ${item.duration}s | 📏 Resolution: ${item.quality}`
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
  desc: "📥 Download YouTube video",
  category: "downloader",
  async exec(msg, { args, text }) {
    const url = args[0] || text;
    if (!url) return msg.reply("❗ Please provide YouTube URL\nExample: !ytmp4 https://youtube.com/watch?v=xxxxx");

    try {
      await msg.reply("⏳ Processing video...");
      createTempDir();
      
      const videoInfo = await fetchVideoInfo(url);
      botLogger.info("Video info retrieved:", { title: videoInfo.title });

      if (videoInfo.duration > MAX_VIDEO_DURATION) {
        return msg.reply("❌ Video too long (max 10 minutes)");
      }

      const outputPath = path.join(TEMP_DIR, generateSafeFileName(videoInfo.title, "mp4"));
      await downloadYouTubeMedia(url, outputPath, { format: "best[ext=mp4]" });
      
      await Oblixn.sock.sendMessage(msg.key.remoteJid, {
        video: fs.readFileSync(outputPath),
        caption: `🎥 *${videoInfo.title}*\n⏱ Duration: ${formatDuration(videoInfo.duration)}`
      });
      
      handleFileCleanup(outputPath);
    } catch (error) {
      botLogger.error("YouTube video error:", error);
      msg.reply("❌ Failed to download video. Check:\n1. Valid URL\n2. Public video\n3. Video availability");
    }
  },
});

// YouTube Audio Command
global.Oblixn.cmd({
  name: "ytmp3",
  alias: ["yta", "ytaudio"],
  desc: "🎵 Download YouTube audio",
  category: "downloader",
  async exec(msg, { args, text }) {
    const url = args[0] || text;
    if (!url) return msg.reply("❗ Please provide YouTube URL\nExample: !ytmp3 https://youtube.com/watch?v=xxxxx");

    try {
      await msg.reply("⏳ Processing audio...");
      createTempDir();
      
      const videoInfo = await fetchVideoInfo(url);
      if (videoInfo.duration > MAX_AUDIO_DURATION) {
        return msg.reply("❌ Audio too long (max 15 minutes)");
      }

      const outputPath = path.join(TEMP_DIR, generateSafeFileName(videoInfo.title, "mp3", true));
      await downloadYouTubeMedia(url, outputPath, {
        extractAudio: true,
        audioFormat: "mp3",
        format: "bestaudio",
        addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)"]
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      await Oblixn.sock.sendMessage(msg.key.remoteJid, {
        document: fs.readFileSync(outputPath),
        mimetype: "audio/mpeg",
        fileName: path.basename(outputPath),
        caption: `🎵 ${videoInfo.title}\n⏱ Duration: ${formatDuration(videoInfo.duration)}`
      });
      
      handleFileCleanup(outputPath);
    } catch (error) {
      botLogger.error("YouTube audio error:", error);
      msg.reply("❌ Failed to process audio. Please try again.");
    }
  },
});

// Mediafire Command
global.Oblixn.cmd({
  name: "mediafire",
  alias: ["mf"],
  desc: "📥 Download Mediafire files",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      const url = args[0];
      if (!url || !/https?:\/\/(www\.)?mediafire\.com/.test(url)) {
        return msg.reply("❌ Invalid Mediafire URL");
      }

      const { buffer, fileName, mimetype } = await handleMediafireDownload(url);
      await Oblixn.sock.sendMessage(msg.chat, {
        document: buffer,
        fileName,
        mimetype
      }, { quoted: msg });

      botLogger.info(`Mediafire download success: ${fileName}`);
    } catch (error) {
      botLogger.error("Mediafire error:", error);
      msg.reply("❌ Failed to download file. Please try again later.");
    }
  },
});

// Instagram Command
global.Oblixn.cmd({
  name: "igdl",
  alias: ["ig", "igdownload", "instagram"],
  desc: "Download Instagram content",
  category: "downloader",
  async exec(msg, { args, text }) {
    try {
      const url = args[0] || text;
      if (!url) return msg.reply("❌ Invalid Instagram URL");
      
      const igDownloader = new InstagramDownloader();
      if (igDownloader.headers.cookie.includes("sessionid=668Q96838382%3AVyZSFuT0tzrMwv%3A16%3AAYd5KFWjTKjomxrySjP6kJJmgE1pR_eFJNSK9nmwzg;")) {
        return msg.reply("🔑 Update Instagram session ID in environment variables");
      }

      const result = await handleInstagramMedia(igDownloader, url, msg);
      botLogger.info(`Instagram success: ${result.url || url}`);
    } catch (error) {
      botLogger.error("Instagram error:", error);
      msg.reply("❌ Failed to download. Check:\n- Public link\n- Valid session\n- Content availability");
    }
  }
});

// Duration formatter
function formatDuration(seconds) {
  const format = (num) => num.toString().padStart(2, "0");
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 
    ? `${hours}:${format(minutes)}:${format(seconds % 60)}`
    : `${minutes}:${format(seconds % 60)}`;
}