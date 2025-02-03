const axios = require('axios');
const { config } = require('../../config/config');
const { permissionHandler } = require('../../src/handler/permission');
const { botLogger } = require('../utils/logger');

module.exports = (Oblixn) => {
    // Command stalk Instagram
    Oblixn.cmd({
        name: "igstalk",
        alias: ["instastalk", "igprofile"],
        desc: "Cari profil Instagram",
        category: "stalk",
        usage: "<username>",
        async exec(msg, { args, text }) {
            try {
                const { isBanned } = await Oblixn.db.checkBanStatus(msg.sender);
                if (isBanned) return;

                const allowed = await permissionHandler.checkStalkUsage(msg.sender);
                if (!allowed) return msg.reply("❌ Limit stalk harian habis");

                const username = args[0] || text;
                if (!username) return msg.reply("❌ Masukkan username Instagram");

                const response = await axios.get(`${config.stalkApi.igUrl}?username=${username}`, {
                    headers: { Authorization: config.stalkApi.key }
                });

                const data = response.data;
                if (!data.success) return msg.reply("❌ Profil tidak ditemukan");

                const profile = data.data;
                const caption = `📷 *Profil Instagram*\n
👤 Nama: ${profile.full_name || '-'}
📌 Username: ${profile.username}
✅ Verified: ${profile.is_verified ? 'Ya' : 'Tidak'}
🔒 Private: ${profile.is_private ? 'Ya' : 'Tidak'}
📊 Postingan: ${profile.media_count}
👥 Pengikut: ${profile.follower_count}
🫂 Mengikuti: ${profile.following_count}
📝 Bio: ${profile.biography || '-'}\n
${profile.external_url || ''}`;

                await Oblixn.sendFileFromUrl(msg.chat, profile.profile_pic_url, 'profile.jpg', { caption });
                
            } catch (error) {
                botLogger.error('IG Stalk Error:', error);
                msg.reply("❌ Gagal mengambil profil, coba username lain");
            }
        }
    });

    // Command stalk TikTok
    Oblixn.cmd({
        name: "tiktokstalk",
        alias: ["ttstalk", "ttprofile"],
        desc: "Cari profil TikTok",
        category: "stalk",
        usage: "<username>",
        async exec(msg, { args, text }) {
            try {
                const username = args[0] || text;
                if (!username) return msg.reply("❌ Masukkan username TikTok");

                const response = await axios.get(`${config.stalkApi.tiktokUrl}?username=${username}`, {
                    headers: { Authorization: config.stalkApi.key }
                });

                const data = response.data;
                if (!data.success) return msg.reply("❌ Profil tidak ditemukan");

                const profile = data.data;
                const caption = `🎵 *Profil TikTok*\n
👤 Nama: ${profile.nickname}
📌 Username: @${profile.unique_id}
✅ Verified: ${profile.verified ? 'Ya' : 'Tidak'}
🔒 Private: ${profile.private_account ? 'Ya' : 'Tidak'}
❤️ Total Like: ${profile.heart_count}
📈 Followers: ${profile.follower_count}
🫂 Following: ${profile.following_count}
🎥 Video: ${profile.video_count}
📝 Bio: ${profile.signature || '-'}`;

                await Oblixn.sendFileFromUrl(msg.chat, profile.avatar_larger, 'avatar.jpg', { caption });
                
            } catch (error) {
                botLogger.error('TikTok Stalk Error:', error);
                msg.reply("❌ Gagal mengambil profil, username mungkin salah");
            }
        }
    });

    // Command stalk GitHub
    Oblixn.cmd({
        name: "ghstalk",
        alias: ["gitstalk", "githubprofile"],
        desc: "Cari profil GitHub",
        category: "stalk",
        usage: "<username>",
        async exec(msg, { args, text }) {
            try {
                const username = args[0] || text;
                if (!username) return msg.reply("❌ Masukkan username GitHub");

                const response = await axios.get(`${config.stalkApi.githubUrl}?username=${username}`, {
                    headers: { Authorization: config.stalkApi.key }
                });

                const data = response.data;
                if (!data.success) return msg.reply("❌ User GitHub tidak ditemukan");

                const profile = data.data;
                const caption = `🐱 *Profil GitHub*\n
👤 Nama: ${profile.name || '-'}
📌 Username: ${profile.login}
📊 Repo Publik: ${profile.public_repos}
📂 Gists: ${profile.public_gists}
👥 Followers: ${profile.followers}
🫂 Following: ${profile.following}
🏢 Perusahaan: ${profile.company || '-'}
🌐 Website: ${profile.blog || '-'}
📍 Lokasi: ${profile.location || '-'}
📝 Bio: ${profile.bio || '-'}`;

                await Oblixn.sendFileFromUrl(msg.chat, profile.avatar_url, 'avatar.jpg', { caption });
                
            } catch (error) {
                botLogger.error('GitHub Stalk Error:', error);
                msg.reply("❌ Gagal mengambil profil GitHub");
            }
        }
    });
};