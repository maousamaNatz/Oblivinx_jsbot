const { imageToWebp, videoToWebp, writeExif } = require('../../src/lib/exec');
Oblixn.cmd({
    name: "sticker",
    alias: ["s", "stiker", "stick"],
    desc: "Membuat sticker dari gambar",
    category: "tools",
    async exec(msg, { args, text }) {
        try {
            let mediaMessage;
            
            // Cek media
            if (msg.message?.imageMessage || msg.message?.documentMessage?.mimetype?.startsWith('image/')) {
                mediaMessage = msg;
            } else if (msg.quoted?.message?.imageMessage || msg.quoted?.message?.documentMessage?.mimetype?.startsWith('image/')) {
                mediaMessage = msg.quoted;
            } else {
                return msg.reply("❌ Silakan kirim/reply gambar (bukan sticker) dengan caption .sticker");
            }

            // Gunakan sock dari parameter msg
            const media = await msg.sock.downloadMediaMessage(
                mediaMessage,
                { type: 'buffer' }
            );

            // Proses pembuatan sticker
            await msg.reply("⏳ Sedang membuat sticker...");
            
            // Proses konversi sesuai tipe media
            const webpBuffer = media.mimetype.startsWith('image') 
                ? await imageToWebp(media.data)
                : await videoToWebp(media.data);
            
            // Tambahkan metadata EXIF
            const stickerBuffer = await writeExif(webpBuffer, {
                packname: "Oblivinx Bot",
                author: "ORBIT STUDIO",
                categories: ["✨", "😂", "🎉"]
            });

            await msg.reply({
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            });

        } catch (error) {
            console.error("Sticker Error:", error);
            msg.reply("❌ Gagal membuat sticker. Pastikan format gambar valid (PNG/JPG, max 1MB)");
        }
    }
});