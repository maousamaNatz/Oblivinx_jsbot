const youtubedl = require("youtube-dl-exec");
const fs = require("fs");
const path = require("path");
const { botLogger } = require("../utils/logger");
const fileManager = require("../../config/memoryAsync/readfile");
const InstagramDownloader = require("../lib/instadl");

// Command untuk download video YouTube
global.Oblixn.cmd({
  name: "ytmp4",
  alias: ["yt", "ytvideo"],
  desc: "📥 Download video dari YouTube",
  category: "downloader",
  async exec(msg, { args, text }) {
    try {
      const url = args[0] || text;

      if (!url) {
        botLogger.warn("URL tidak ditemukan dalam input");
        return msg.reply(
          "❗ Silakan masukkan URL YouTube\nContoh: !ytmp4 https://youtube.com/watch?v=xxxxx"
        );
      }

      botLogger.info(`Mencoba memproses URL: ${url}`);
      await msg.reply("⏳ Sedang memproses video...");

      try {
        // Buat direktori temp jika belum ada
        const tempDir = path.join(fileManager.baseDir, "temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Dapatkan info video
        const videoInfo = await youtubedl(url, {
          dumpSingleJson: true,
          noWarnings: true,
          noCallHome: true,
          preferFreeFormats: true,
          youtubeSkipDashManifest: true,
        });

        botLogger.info("Info video berhasil didapat:", {
          title: videoInfo.title,
          duration: videoInfo.duration,
        });

        // Batasi durasi video (10 menit)
        if (videoInfo.duration > 600) {
          botLogger.warn(`Video terlalu panjang: ${videoInfo.duration} detik`);
          return msg.reply(
            "❌ Maaf, video terlalu panjang. Maksimal 10 menit!"
          );
        }

        // Buat nama file yang aman
        const safeFileName = videoInfo.title
          .replace(/[^a-zA-Z0-9]/g, "_")
          .substring(0, 32);
        const outputPath = path.join(tempDir, `${safeFileName}.mp4`);

        botLogger.info(`Mulai mengunduh video ke: ${outputPath}`);
        await msg.reply("📥 Mengunduh video...");

        // Download video
        await youtubedl(url, {
          output: outputPath,
          format: "best[ext=mp4]",
          noCheckCertificate: true,
          noWarnings: true,
          noCallHome: true,
          preferFreeFormats: true,
          youtubeSkipDashManifest: true,
        });

        botLogger.info("Video berhasil diunduh, mengirim...");
        await msg.reply("✅ Video berhasil didownload, mengirim...");

        // Kirim video
        await Oblixn.sock.sendMessage(msg.key.remoteJid, {
          video: fs.readFileSync(outputPath),
          caption: `🎥 *${videoInfo.title}*\n\n⏱️ Durasi: ${formatDuration(
            videoInfo.duration
          )}`,
        });

        // Hapus file temporary
        fs.unlinkSync(outputPath);
        botLogger.info("File temporary dihapus");
      } catch (downloadError) {
        botLogger.error("Error saat download:", downloadError);
        return msg.reply(
          "❌ Gagal mengunduh video. Pastikan:\n1. URL valid\n2. Video tidak private\n3. Video dapat diakses"
        );
      }
    } catch (error) {
      botLogger.error("Error pada ytmp4:", error);
      msg.reply("❌ Terjadi kesalahan. Silakan coba lagi nanti.");
    }
  },
});

// Command untuk download audio YouTube
global.Oblixn.cmd({
  name: "ytmp3",
  alias: ["yta", "ytaudio"],
  desc: "🎵 Download audio dari YouTube",
  category: "downloader",
  async exec(msg, { args, text }) {
    try {
      const url = args[0] || text;

      if (!url) {
        botLogger.warn("URL tidak ditemukan dalam input ytmp3");
        return msg.reply(
          "❗ Silakan masukkan URL YouTube\nContoh: !ytmp3 https://youtube.com/watch?v=xxxxx"
        );
      }

      botLogger.info(`Mencoba memproses URL audio: ${url}`);
      await msg.reply("⏳ Sedang memproses audio...");

      try {
        // Buat direktori temp dengan path absolut
        const tempDir = path.join(__dirname, "..", "..", "temp");
        botLogger.info(`Menggunakan direktori temp: ${tempDir}`);

        if (!fs.existsSync(tempDir)) {
          botLogger.info(`Membuat direktori temp: ${tempDir}`);
          fs.mkdirSync(tempDir, { recursive: true });
        }

        // Dapatkan info video
        const videoInfo = await youtubedl(url, {
          dumpSingleJson: true,
          noWarnings: true,
          noCallHome: true,
          preferFreeFormats: true,
        });

        if (videoInfo.duration > 900) {
          return msg.reply(
            "❌ Maaf, audio terlalu panjang. Maksimal 15 menit!"
          );
        }

        // Buat nama file yang aman dengan timestamp
        const timestamp = Date.now();
        const safeFileName = `${videoInfo.title
          .replace(/[^a-zA-Z0-9]/g, "_")
          .substring(0, 32)}_${timestamp}`;
        const outputPath = path.join(tempDir, `${safeFileName}.mp3`);
        await msg.reply("📥 Mengunduh audio...");

        // Download audio dengan opsi yang lebih spesifik
        await youtubedl(url, {
          output: outputPath,
          extractAudio: true,
          audioFormat: "mp3",
          format: "bestaudio",
          noCheckCertificate: true,
          addHeader: [
            "referer:youtube.com",
            "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          ],
        });

        // Tunggu dan periksa file
        await new Promise((resolve) => setTimeout(resolve, 2000)); // tunggu 2 detik
        if (!fs.existsSync(outputPath)) {
          // Coba cari file dengan ekstensi lain
          const webmPath = outputPath.replace(".mp3", ".webm");
          const m4aPath = outputPath.replace(".mp3", ".m4a");

          if (fs.existsSync(webmPath)) {
            await Oblixn.sock.sendMessage(msg.key.remoteJid, {
              document: fs.readFileSync(webmPath),
              mimetype: "audio/webm",
              fileName: `${safeFileName}.webm`,
              caption: `🎵 ${videoInfo.title}\n⏱️ Durasi: ${formatDuration(
                videoInfo.duration
              )}`,
            });
            fs.unlinkSync(webmPath);
          } else if (fs.existsSync(m4aPath)) {
            await Oblixn.sock.sendMessage(msg.key.remoteJid, {
              document: fs.readFileSync(m4aPath),
              mimetype: "audio/mp4",
              fileName: `${safeFileName}.m4a`,
              caption: `🎵 ${videoInfo.title}\n⏱️ Durasi: ${formatDuration(
                videoInfo.duration
              )}`,
            });
            fs.unlinkSync(m4aPath);
          } else {
            throw new Error("File audio tidak ditemukan dalam format apapun");
          }
        } else {
          // File MP3 ditemukan, kirim sebagai dokumen
          await Oblixn.sock.sendMessage(msg.key.remoteJid, {
            document: fs.readFileSync(outputPath),
            mimetype: "audio/mpeg",
            fileName: `${safeFileName}.mp3`,
            caption: `🎵 ${videoInfo.title}\n⏱️ Durasi: ${formatDuration(
              videoInfo.duration
            )}`,
          });
          fs.unlinkSync(outputPath);
        }
      } catch (error) {
        botLogger.error("Error dalam proses download/kirim:", {
          message: error.message,
          stack: error.stack,
        });
        return msg.reply(
          `❌ Terjadi kesalahan saat memproses audio. Silakan coba lagi.`
        );
      }
    } catch (error) {
      botLogger.error("Error utama:", error);
      return msg.reply("❌ Terjadi kesalahan sistem. Silakan coba lagi nanti.");
    }
  },
});

// Helper function untuk format durasi
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Command untuk download file dari Mediafire
global.Oblixn.cmd({
  name: "mediafire",
  alias: ["mf"],
  desc: "📥 Download file dari Mediafire",
  category: "downloader",
  async exec(msg, { args }) {
    try {
      const url = args[0];

      if (!url) {
        return msg.reply(
          "❗ Silakan masukkan URL Mediafire\nContoh: !mediafire https://www.mediafire.com/file/xxx"
        );
      }

      if (!/https?:\/\/(www\.)?mediafire\.com/.test(url)) {
        return msg.reply("❌ URL tidak valid! Pastikan URL dari Mediafire");
      }

      await msg.reply("⏳ Sedang memproses, mohon tunggu...");

      const res = await fetch(
        `https://api-xcoders.site/api/download/mediafire?url=${url}&apikey=${global.xcode}`
      );
      const data = await res.json();

      if (!data.success) {
        return msg.reply("❌ Gagal mengunduh file. Silakan coba lagi.");
      }

      const fileData = data.result;

      await Oblixn.sock.sendMessage(msg.chat, {
        document: { url: fileData.url },
        mimetype: fileData.mime,
        fileName: fileData.title,
      });

      botLogger.info(`Berhasil mendownload file Mediafire: ${fileData.title}`);
    } catch (error) {
      botLogger.error("Error dalam mediafire downloader:", error);
      return msg.reply(
        "❌ Terjadi kesalahan saat mengunduh file. Silakan coba lagi nanti."
      );
    }
  },
});

global.Oblixn.cmd({
  name: "igdl",
  alias: ["ig", "igdownload", "instagram"],
  desc: "Mengunduh konten dari Instagram (post/reel/story)",
  category: "downloader",
  async exec(msg, { args, text }) {
    try {
      if (!args[0] && !text) {
        return msg.reply("❌ Mohon masukkan URL Instagram yang valid!");
      }

      const url = args[0] || text;
      await msg.reply("⏳ Sedang mengunduh... mohon tunggu");
      
      const igDownloader = new InstagramDownloader();
      const result = await igDownloader.download(url);

      if (!result.success) {
        return msg.reply(`❌ Gagal mengunduh: ${result.error}`);
      }

      // Handle hasil unduhan berdasarkan tipe
      if (result.type === "post") {
        for (const media of result.data) {
          const { type, url } = media;
          
          if (type.includes("image")) {
            await Oblixn.sock.sendMessage(msg.key.remoteJid, { 
              image: { url },
              caption: "✅ Media berhasil diunduh dari Instagram"
            });
          } else if (type.includes("video")) {
            await Oblixn.sock.sendMessage(msg.key.remoteJid, {
              video: { url },
              caption: "✅ Media berhasil diunduh dari Instagram"
            });
          }
        }
      } 
      else if (result.type === "story") {
        const { type, url } = result.data;
        
        if (type.includes("image")) {
          await Oblixn.sock.sendMessage(msg.key.remoteJid, {
            image: { url },
            caption: "✅ Story berhasil diunduh dari Instagram"
          });
        } else if (type.includes("video")) {
          await Oblixn.sock.sendMessage(msg.key.remoteJid, {
            video: { url },
            caption: "✅ Story berhasil diunduh dari Instagram" 
          });
        }
      }

    } catch (error) {
      botLogger.error("Error dalam command igdl:", error);
      console.log("Detail error:", error);
      await msg.reply("❌ Terjadi kesalahan saat mengunduh konten Instagram");
    }
  }
});

 