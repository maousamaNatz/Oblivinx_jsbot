const { botLogger } = require("../utils/logger");
const { config, categoryEmojis } = require("../../config/config");
const os = require("os");
const packageJson = require("../../package.json");
const fs = require("fs");
const path = require("path");

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
  name: "info",
  alias: ["botinfo", "infobot"],
  desc: "Menampilkan informasi bot",
  category: "info",
  async exec(msg) {
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
  },
});

// Command help
Oblixn.cmd({
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

      if (Oblixn.commands instanceof Map) {
        for (const [_, cmd] of Oblixn.commands) {
          // Skip command owner dan ownercommand jika bukan owner
          if (
            cmd &&
            cmd.name &&
            (isOwner ||
              (cmd.category !== "owner" && cmd.category !== "ownercommand"))
          ) {
            commands.push({
              name: cmd.name,
              category: cmd.category || "uncategorized",
            });
          }
        }
      } else {
        for (const cmd of Object.values(Oblixn.commands)) {
          // Skip command owner dan ownercommand jika bukan owner
          if (
            cmd &&
            cmd.name &&
            (isOwner ||
              (cmd.category !== "owner" && cmd.category !== "ownercommand"))
          ) {
            commands.push({
              name: cmd.name,
              category: cmd.category || "uncategorized",
            });
          }
        }
      }

      if (commands.length === 0) {
        return msg.reply("Belum ada command yang terdaftar.");
      }

      let helpMessage = "";
      const username = msg.pushName || msg.sender.split("@")[0];
      const usermsg = `Halo kak ${username}, berikut adalah daftar perintah yang tersedia:`;
      helpMessage = `${usermsg}\n\n*DAFTAR PERINTAH*\n\n`;

      // Kelompokkan berdasarkan kategori
      const categories = {};
      commands.forEach((cmd) => {
        const category = cmd.category;
        // Skip kategori owner dan ownercommand
        if (category !== "owner" && category !== "ownercommand") {
          if (!categories[category]) {
            categories[category] = [];
          }
          categories[category].push(cmd);
        }
      });

      // Susun pesan berdasarkan kategori
      Object.entries(categories).forEach(([category, cmds]) => {
        // Skip kategori yang kosong dan kategori owner/ownercommand
        if (
          cmds.length > 0 &&
          category !== "owner" &&
          category !== "ownercommand"
        ) {
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
      console.error("Error dalam command help:", error);
      botLogger.error(`Error dalam command help: ${error.message}`);
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
