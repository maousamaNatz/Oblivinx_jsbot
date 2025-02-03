const { permissionHandler } = require("../../src/handler/permission");
const { generateImageWithAxios } = require("../lib/Ai");

module.exports = (Oblixn) => {
  Oblixn.cmd({
    name: "dalle",
    alias: ["generate", "aiimg"],
    desc: "Generate gambar dengan DALL-E 3",
    category: "ai",
    usage: "<prompt>",
    async exec(msg, { args, text }) {
      try {
        // Pengecekan status ban
        const { isBanned } = await Oblixn.db.checkBanStatus(msg.sender);
        if (isBanned) return;

        // Pengecekan izin
        const allowed = await permissionHandler.checkAIUsage(msg.sender);
        if (!allowed) {
          return msg.reply("❌ Akses DALL-E dibatasi. Hubungi admin untuk info lebih lanjut");
        }

        // Validasi prompt
        if (!text) return msg.reply("Silakan berikan prompt gambar");
        
        await msg.reply("🎨 Sedang membuat gambar...");
        
        // Generate gambar dengan DALL-E 3
        const { success, imageUrl, revisedPrompt, error } = await generateImageWithAxios(text);
        
        if (!success) {
          const errorMsg = error?.code === 400 
            ? "❌ Prompt tidak sesuai (berisi konten terlarang)"
            : `❌ Gagal generate: ${error?.message || 'Kesalahan server'}`;
          return msg.reply(errorMsg);
        }

        // Kirim gambar hasil generate
        await Oblixn.sendFileFromUrl(msg.chat, imageUrl, "dalle-image.jpg", {
          caption: `🖼️ *DALL-E Result*\n\n📝 Revised Prompt: ${revisedPrompt}`
        });

      } catch (error) {
        console.error("DALL-E Error:", error);
        msg.reply("❌ Timeout atau kesalahan saat memproses gambar");
      }
    }
  });
};
