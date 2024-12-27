const YTMateDownloader = require('../lib/ytmate');

global.Oblixn.cmd({
    name: "ytmp3",
    alias: ["yta", "ytaudio"],
    desc: "🎵 Download audio dari YouTube",
    category: "downloader",
    async exec(msg, { args }) {
        if (!args[0]) return msg.reply("❗ Silakan masukkan URL YouTube");
        
        const waitMessage = await msg.reply("⏳ Sedang memproses audio...");
        
        try {
            const downloader = new YTMateDownloader();
            const result = await downloader.downloadAudio(args[0]);
            
            await msg.reply({
                audio: { url: result.dl_link },
                mimetype: 'audio/mp4',
                fileName: `${result.title}.mp3`,
                caption: `
🎵 *${result.title}*
⏱️ Durasi: ${result.duration}
📊 Ukuran: ${result.filesizeF}
`
            });
        } catch (error) {
            console.error("Error in ytmp3:", error);
            await msg.reply(`❌ ${error.message || 'Terjadi kesalahan saat mengunduh audio'}`);
        }
    }
});

global.Oblixn.cmd({
    name: "ytmp4",
    alias: ["ytv", "ytvideo"],
    desc: "🎥 Download video dari YouTube",
    category: "downloader",
    async exec(msg, { args }) {
        if (!args[0]) return msg.reply("❗ Silakan masukkan URL YouTube");
        
        const waitMessage = await msg.reply("⏳ Sedang memproses video...");
        
        try {
            const downloader = new YTMateDownloader();
            const result = await downloader.downloadVideo(args[0]);
            
            await msg.reply({
                video: { url: result.dl_link },
                caption: `
🎥 *${result.title}*
⏱️ Durasi: ${result.duration}
📊 Ukuran: ${result.filesizeF}
🎯 Kualitas: ${result.quality}
`
            });
        } catch (error) {
            console.error("Error in ytmp4:", error);
            await msg.reply(`❌ ${error.message || 'Terjadi kesalahan saat mengunduh video'}`);
        }
    }
}); 