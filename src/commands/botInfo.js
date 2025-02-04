const { botLogger } = require("../utils/logger");
const { config, categoryEmojis } = require("../../config/config");
const os = require("os");
const packageJson = require("../../package.json");
const fs = require("fs");
const path = require("path");
const { permissionHandler } = require("../../src/handler/permission");

async function loadCommands() {
  const commands = new Map();
  const commandsDir = path.join(__dirname);

  try {
    const files = fs.readdirSync(commandsDir);

    for (const file of files) {
      if (file.endsWith(".js")) {
        const commandPath = path.join(commandsDir, file);

        // Skip file ini sendiri
        if (file === "botInfo.js") continue;

        try {
          delete require.cache[require.resolve(commandPath)];
          const commandModule = require(commandPath);

          // Ambil konfigurasi command dari Oblixn.cmd
          if (commandModule && typeof commandModule === "object") {
            const cmdConfig = commandModule.cmdConfig || {};
            commands.set(cmdConfig.name, {
              name: cmdConfig.name,
              category: cmdConfig.category || "uncategorized",
            });
          }
        } catch (err) {
          console.error(`Error loading command ${file}:`, err);
        }
      }
    }
  } catch (error) {
    console.error("Error reading commands directory:", error);
  }
  return commands;
}

const commands = loadCommands();
console.log(commands);
// Fungsi untuk menampilkan info bot
Oblixn.cmd({
  name: "botinfo",
  alias: ["info", "status"],
  desc: "Menampilkan informasi bot",
  category: "info",
  async exec(msg) {
    try {
      // Tambahkan pengecekan izin
      const isAdmin = await permissionHandler.isAdmin(msg.sender);
      if (!isAdmin) {
        return msg.reply("❌ Akses ditolak! Hanya admin yang bisa menggunakan command ini");
      }

      const { botName, owner, processor } = config;
      const uptime = process.uptime();
      const uptimeStr = formatUptime(uptime);

      const infoText =
        `🤖 *${botName} BOT INFO* 🤖\n\n` +
        `👾 *Version:* v${packageJson.version}\n` +
        `🧠 *Processor:* ${processor}\n` +
        `⏰ *Uptime:* ${uptimeStr}\n` +
        `💾 *Memory:* ${formatBytes(process.memoryUsage().heapUsed)}\n` +
        `👑 *Owner:* ${owner.join(", ")}\n\n` +
        `Gunakan *!help* untuk melihat daftar perintah.`;

      await msg.reply(infoText);
    } catch (error) {
      botLogger.error("Error dalam command botinfo:", error);
      await msg.reply("❌ Terjadi kesalahan saat mengambil informasi bot");
    }
  },
});

global.Oblixn.cmd({
  name: "help",
  alias: ["menu", "?"],
  desc: "Menampilkan daftar perintah yang tersedia",
  category: "general",
  async exec(msg, { args }) {
    try {
      const commands = [];
      const isOwner = config.owner.includes(msg.sender.split("@")[0]);

      if (!Oblixn || !Oblixn.commands) {
        throw new Error("Commands belum diinisialisasi");
      }

      // Kumpulkan semua command yang valid
      if (Oblixn.commands instanceof Map) {
        for (const [_, cmd] of Oblixn.commands) {
          if (cmd && cmd.name && cmd.category) {
            // Hanya tambahkan command jika bukan owner/ownercommand atau user adalah owner
            if (
              isOwner ||
              (cmd.category !== "owner" && cmd.category !== "ownercommand")
            ) {
              commands.push({
                name: cmd.name,
                category: cmd.category,
              });
            }
          }
        }
      } else {
        for (const cmd of Object.values(Oblixn.commands)) {
          if (cmd && cmd.name && cmd.category) {
            // Hanya tambahkan command jika bukan owner/ownercommand atau user adalah owner
            if (
              isOwner ||
              (cmd.category !== "owner" && cmd.category !== "ownercommand")
            ) {
              commands.push({
                name: cmd.name,
                category: cmd.category,
              });
            }
          }
        }
      }

      if (commands.length === 0) {
        return msg.reply("Belum ada command yang terdaftar.");
      }

      // Buat pesan help
      const username = msg.pushName || msg.sender.split("@")[0];
      let helpMessage = `Halo kak ${username}, berikut adalah daftar perintah yang tersedia:\n\n*DAFTAR PERINTAH*\n\n`;

      // Kelompokkan command berdasarkan kategori
      const categories = commands.reduce((acc, cmd) => {
        if (!acc[cmd.category]) {
          acc[cmd.category] = [];
        }
        acc[cmd.category].push(cmd);
        return acc;
      }, {});

      // Susun pesan berdasarkan kategori
      Object.entries(categories).forEach(([category, cmds]) => {
        if (cmds.length > 0) {
          const emoji = categoryEmojis[category.toLowerCase()] || "❓";
          helpMessage += `${emoji} *${category.toUpperCase()}*\n`;
          cmds.forEach((cmd) => {
            helpMessage += `• ${process.env.PREFIX || "!"}${cmd.name}\n`;
          });
          helpMessage += "\n";
        }
      });

      helpMessage += "\nGunakan !help <command> untuk info lebih detail";

      await msg.reply(helpMessage);
    } catch (error) {
      botLogger.error("Error dalam command help:", {
        message: error.message,
        stack: error.stack,
      });
      await msg.reply("Terjadi kesalahan saat menampilkan menu bantuan.");
    }
  },
});
// Fungsi helper untuk format bytes
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Fungsi helper untuk format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

global.Oblixn.cmd({
  name: "changelog",
  alias: ["changelog", "update"],
  desc: "Menampilkan changelog bot",
  category: "info",
  async exec(msg) {
    console.log(msg);
    try {
      console.log("Changelog command executed");

      const changelog = path.join(__dirname, "../../changelog.txt");
      const read = fs.readFileSync(changelog, "utf8");
            
      // Format pesan changelog
      let formattedChangelog = "📝 *CHANGELOG BOT*\n\n";
      formattedChangelog += read;

      await msg.reply(formattedChangelog);
    } catch (error) {
      botLogger.error("Error dalam command changelog:", error);
      await msg.reply("❌ Terjadi kesalahan saat menampilkan changelog.");
    }
  },
});

async function checkUpdate() {
  try {
    // ... kode yang ada ...
  } catch (error) {
    botLogger.warn(`Gagal memeriksa update: ${error.message}`);
  }
}
