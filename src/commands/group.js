const { isAdmin } = require('../handler/permission');
const { botLogger } = require('../utils/logger');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const prefix = process.env.PREFIX;
const langId = require('../i18n/langId');

Oblixn.cmd({
    name: 'group',
    alias: ['grup'],
    desc: 'Mengelola pengaturan grup',
    category: 'admin',
    async exec(m, t) {
        try {
            const groupId = m.key?.remoteJid;
            const senderId = m.key?.participant?.split('@')[0] || m.sender?.split('@')[0];
            const normalizedSenderId = senderId ? `${senderId}@s.whatsapp.net` : '';
            const botId = m.botNumber?.split(':')[0]?.split('@')[0];
            const normalizedBotId = botId ? `${botId}@s.whatsapp.net` : '';

            botLogger.info(`Processing group command from: ${normalizedSenderId}`);

            if (!groupId?.endsWith('@g.us')) {
                return m.reply(langId.errors.group_only);
            }

            // Cek admin status sekali saja dan simpan hasilnya
            const [isGroupAdmin, botAdmin] = await Promise.all([
                isAdmin(groupId, normalizedSenderId),
                isAdmin(groupId, normalizedBotId)
            ]);

            if (!botAdmin) {
                return m.reply(langId.errors.bot_admin_required);
            }

            if (!isGroupAdmin) {
                return m.reply('Anda harus menjadi admin untuk menggunakan perintah ini!');
            }

            // Dapatkan nama pengguna dari metadata grup
            const metadata = await Oblixn.sock.groupMetadata(groupId);
            const participant = metadata.participants.find(p => p.id === normalizedSenderId);
            const username = participant?.notify || participant?.pushname || m.pushName || senderId;

            const args = t.args;
            if (!args.length) {
                await m.reply(langId.commands.group.menu
                    .replace('{username}', username)
                    .replace(/{prefix}/g, prefix)
                );
            }

            const command = args[0].toLowerCase();
            switch (command) {
                case 'open':
                case 'buka':
                    await Oblixn.sock.groupSettingUpdate(groupId, 'not_announcement');
                    await m.reply(langId.commands.group.success_open);
                    break;

                case 'close':
                case 'tutup':
                    await Oblixn.sock.groupSettingUpdate(groupId, 'announcement');
                    await m.reply(langId.commands.group.success_close);
                    break;

                case 'link':
                    const code = await Oblixn.sock.groupInviteCode(groupId);
                    await m.reply(langId.commands.group.link.replace('{link}', `https://chat.whatsapp.com/${code}`));
                    break;

                case 'revoke':
                    await Oblixn.sock.groupRevokeInvite(groupId);
                    await m.reply(langId.commands.group.reset_link);
                    break;

                case 'name':
                    if (args.length < 2) {
                        return m.reply('Masukkan nama baru untuk grup!');
                    }
                    const newName = args.slice(1).join(' ');
                    await Oblixn.sock.groupUpdateSubject(groupId, newName);
                    await m.reply(langId.commands.group.name_updated.replace('{name}', newName));
                    break;

                case 'desc':
                    if (args.length < 2) {
                        return m.reply('Masukkan deskripsi baru untuk grup!');
                    }
                    const newDesc = args.slice(1).join(' ');
                    await Oblixn.sock.groupUpdateDescription(groupId, newDesc);
                    await m.reply(langId.commands.group.desc_updated);
                    break;

                case 'promote':
                    if (!m.mentions?.length) {
                        return m.reply('Tag member yang ingin dijadikan admin!');
                    }
                    await Oblixn.sock.groupParticipantsUpdate(groupId, [m.mentions[0]], 'promote');
                    await m.reply(langId.commands.group.promote_success);
                    break;

                case 'demote':
                    if (!m.mentions?.length) {
                        return m.reply('Tag admin yang ingin diturunkan!');
                    }
                    await Oblixn.sock.groupParticipantsUpdate(groupId, [m.mentions[0]], 'demote');
                    await m.reply(langId.commands.group.demote_success);
                    break;

                case 'leave':
                    await m.reply(langId.commands.group.leave);
                    await Oblixn.sock.groupLeave(groupId);
                    break;

                case 'info':
                    const metadata = await Oblixn.sock.groupMetadata(groupId);
                    const admins = metadata.participants
                        .filter(p => p.admin)
                        .map(p => p.id.split('@')[0]);
                    
                    const info = `*INFO GRUP*\n\n` +
                        `📛 *Nama:* ${metadata.subject}\n` +
                        `👥 *Member:* ${metadata.participants.length}\n` +
                        `👑 *Admin:* ${admins.length}\n` +
                        `🆔 *ID:* ${metadata.id}\n` +
                        `📅 *Dibuat:* ${new Date(metadata.creation * 1000).toLocaleString()}\n` +
                        `💬 *Deskripsi:*\n${metadata.desc || 'Tidak ada deskripsi'}`;
                    
                    await m.reply(langId.commands.group.info
                        .replace('{name}', metadata.subject)
                        .replace('{members}', metadata.participants.length)
                        .replace('{admins}', admins.length)
                        .replace('{id}', metadata.id)
                        .replace('{created}', new Date(metadata.creation * 1000).toLocaleString())
                        .replace('{desc}', metadata.desc || 'Tidak ada deskripsi')
                    );
                    break;
                default:
                    m.reply(`📝 *Penggunaan:*
▢ !group open - Membuka grup
▢ !group close - Menutup grup
▢ !group link - Mendapatkan link invite
▢ !group revoke - Mereset link invite
▢ !group name <text> - Mengubah nama grup
▢ !group desc <text> - Mengubah deskripsi grup
▢ !group promote @user - Menjadikan member sebagai admin
▢ !group demote @user - Menurunkan admin menjadi member
▢ !group leave - Mengeluarkan bot dari grup
▢ !group info - Menampilkan informasi grup
▢ !hidetag <text> - Mention semua member dengan pesan`);
            }

        } catch (error) {
            botLogger.error('Error in group command:', error);
            m.reply('❌ Terjadi kesalahan saat menjalankan perintah.');
        }   
    }
});

// Update kick command
Oblixn.cmd({
    name: 'kick',
    desc: 'Mengeluarkan anggota dari grup',
    category: 'admin',
    async exec(m, t) {
        try {
            const groupId = m.key?.remoteJid;
            const senderId = m.key?.participant?.split('@')[0] || m.sender?.split('@')[0];
            const normalizedSenderId = senderId ? `${senderId}@s.whatsapp.net` : '';

            if (!groupId?.endsWith('@g.us')) 
                return m.reply('Perintah ini hanya untuk grup!');
            
            const isGroupAdmin = await isAdmin(groupId, normalizedSenderId);
            const botId = m.botNumber?.split(':')[0]?.split('@')[0];
            const normalizedBotId = botId ? `${botId}@s.whatsapp.net` : '';
            const botAdmin = await isAdmin(groupId, normalizedBotId);
            
            if (!isGroupAdmin) return m.reply('Anda harus menjadi admin!');
            if (!botAdmin) return m.reply('Bot harus menjadi admin!');
            
            if (!m.mentions?.length) return m.reply('Tag anggota yang ingin dikeluarkan!');
            
            await Oblixn.sock.groupParticipantsUpdate(groupId, [m.mentions[0]], 'remove');
            m.reply('✅ Anggota telah dikeluarkan dari grup.');
            
        } catch (error) {
            console.error('Error in kick command:', error);
            m.reply('❌ Gagal mengeluarkan anggota.');
        }
    }
});
// Command untuk hidetag
Oblixn.cmd({
    name: 'hidetag',
    alias: ['h'],
    desc: 'Mention semua member dengan pesan tersembunyi',
    category: 'admin',
    async exec(m, t) {
        try {
            const groupId = m.key?.remoteJid;
            const senderId = m.key?.participant?.split('@')[0] || m.sender?.split('@')[0];
            const normalizedSenderId = senderId ? `${senderId}@s.whatsapp.net` : '';

            if (!groupId?.endsWith('@g.us')) {
                return m.reply('Perintah ini hanya dapat digunakan di dalam grup!');
            }

            // Cek apakah pengirim adalah admin
            const isGroupAdmin = await isAdmin(groupId, normalizedSenderId);
            if (!isGroupAdmin) {
                return m.reply('Anda harus menjadi admin untuk menggunakan perintah ini!');
            }

            if (!t.args.length) {
                return m.reply('Masukkan pesan yang ingin disampaikan!');
            }

            const message = t.args.join(' ');
            const metadata = await Oblixn.sock.groupMetadata(groupId);
            const mentions = metadata.participants.map(p => p.id);
            
            await Oblixn.sock.sendMessage(groupId, { 
                text: `${message}`,
                mentions: mentions 
            });

        } catch (error) {
            console.error('Error in hidetag command:', error);
            m.reply('❌ Terjadi kesalahan saat menjalankan perintah.');
        }
    }
});

// Command untuk tagall
Oblixn.cmd({
    name: 'tagall',
    alias: ['all', 'everyone'],
    desc: 'Mention semua member dengan pesan dan daftar member',
    category: 'admin',
    async exec(m, t) {
        try {
            const groupId = m.key?.remoteJid;
            const senderId = m.key?.participant?.split('@')[0] || m.sender?.split('@')[0];
            const normalizedSenderId = senderId ? `${senderId}@s.whatsapp.net` : '';

            if (!groupId?.endsWith('@g.us')) {
                return m.reply('Perintah ini hanya dapat digunakan di dalam grup!');
            }

            // Cek apakah pengirim adalah admin
            const isGroupAdmin = await isAdmin(groupId, normalizedSenderId);
            if (!isGroupAdmin) {
                return m.reply('Anda harus menjadi admin untuk menggunakan perintah ini!');
            }

            const metadata = await Oblixn.sock.groupMetadata(groupId);
            const mentions = metadata.participants.map(p => p.id);
            
            let message = t.args.length ? t.args.join(' ') + '\n\n' : '';
            message += '👥 *Daftar Member:*\n';
            
            metadata.participants.forEach((participant, i) => {
                message += `${i + 1}. @${participant.id.split('@')[0]}\n`;
            });

            await Oblixn.sock.sendMessage(groupId, { 
                text: message,
                mentions: mentions 
            });

        } catch (error) {
            console.error('Error in tagall command:', error);
            m.reply('❌ Terjadi kesalahan saat menjalankan perintah.');
        }
    }
});

// Command untuk tag admin
Oblixn.cmd({
    name: 'tagadmin',
    alias: ['admin', 'admins'],
    desc: 'Mention semua admin grup',
    category: 'group',
    async exec(m, t) {
        try {
            const groupId = m.key?.remoteJid;

            if (!groupId?.endsWith('@g.us')) {
                return m.reply('Perintah ini hanya dapat digunakan di dalam grup!');
            }

            const metadata = await Oblixn.sock.groupMetadata(groupId);
            const admins = metadata.participants.filter(p => p.admin);
            const mentions = admins.map(a => a.id);
            
            let message = t.args.length ? t.args.join(' ') + '\n\n' : '';
            message += '👑 *Daftar Admin:*\n';
            
            admins.forEach((admin, i) => {
                message += `${i + 1}. @${admin.id.split('@')[0]}\n`;
            });

            await Oblixn.sock.sendMessage(groupId, { 
                text: message,
                mentions: mentions 
            });

        } catch (error) {
            console.error('Error in tagadmin command:', error);
            m.reply('❌ Terjadi kesalahan saat menjalankan perintah.');
        }
    }
});

// Command untuk mengubah pengaturan mute grup
Oblixn.cmd({
    name: 'mute',
    desc: 'Mengatur notifikasi grup',
    category: 'admin',
    async exec(m, t) {
        try {
            const groupId = m.key?.remoteJid;
            const senderId = m.key?.participant?.split('@')[0] || m.sender?.split('@')[0];
            const normalizedSenderId = senderId ? `${senderId}@s.whatsapp.net` : '';

            if (!groupId?.endsWith('@g.us')) 
                return m.reply('Perintah ini hanya untuk grup!');
            
            const isGroupAdmin = await isAdmin(groupId, normalizedSenderId);
            if (!isGroupAdmin) return m.reply('Anda harus menjadi admin!');

            if (!t.args[0]) {
                return m.reply(`📝 *Penggunaan:*
▢ !mute on - Mengaktifkan mode senyap
▢ !mute off - Menonaktifkan mode senyap`);
            }

            const option = t.args[0].toLowerCase();
            if (option === 'on') {
                await Oblixn.sock.groupSettingUpdate(groupId, 'announcement');
                m.reply('✅ Mode senyap grup telah diaktifkan!');
            } else if (option === 'off') {
                await Oblixn.sock.groupSettingUpdate(groupId, 'not_announcement');
                m.reply('✅ Mode senyap grup telah dinonaktifkan!');
            }
        } catch (error) {
            console.error('Error in mute command:', error);
            m.reply('❌ Terjadi kesalahan saat mengatur mode senyap.');
        }
    }
});

// Command untuk mengatur siapa yang bisa mengirim pesan
Oblixn.cmd({
    name: 'chatmode',
    desc: 'Mengatur siapa yang bisa mengirim pesan',
    category: 'admin',
    async exec(m, t) {
        try {
            const groupId = m.key?.remoteJid;
            const senderId = m.key?.participant?.split('@')[0] || m.sender?.split('@')[0];
            const normalizedSenderId = senderId ? `${senderId}@s.whatsapp.net` : '';

            if (!groupId?.endsWith('@g.us')) 
                return m.reply('Perintah ini hanya untuk grup!');
            
            const isGroupAdmin = await isAdmin(groupId, normalizedSenderId);
            if (!isGroupAdmin) return m.reply('Anda harus menjadi admin!');

            if (!t.args[0]) {
                return m.reply(`📝 *Penggunaan:*
▢ !chatmode admin - Hanya admin yang bisa chat
▢ !chatmode all - Semua member bisa chat`);
            }

            const option = t.args[0].toLowerCase();
            if (option === 'admin') {
                await Oblixn.sock.groupSettingUpdate(groupId, 'announcement');
                m.reply('✅ Sekarang hanya admin yang dapat mengirim pesan!');
            } else if (option === 'all') {
                await Oblixn.sock.groupSettingUpdate(groupId, 'not_announcement');
                m.reply('✅ Sekarang semua member dapat mengirim pesan!');
            }
        } catch (error) {
            console.error('Error in chatmode command:', error);
            m.reply('❌ Terjadi kesalahan saat mengatur mode chat.');
        }
    }
});

// Command untuk mengubah foto profil grup
Oblixn.cmd({
    name: 'setppgc',
    desc: 'Mengubah foto profil grup',
    category: 'admin',
    async exec(m, t) {
        try {
            const groupId = m.key?.remoteJid;
            
            // Validasi bahwa pesan diterima dalam grup
            if (!groupId?.endsWith('@g.us')) {
                return m.reply('Perintah ini hanya dapat digunakan dalam grup!');
            }

            // Cek permission admin
            const senderId = m.key?.participant?.split('@')[0] || m.sender?.split('@')[0];
            const normalizedSenderId = senderId ? `${senderId}@s.whatsapp.net` : '';
            const botId = m.botNumber?.split(':')[0]?.split('@')[0];
            const normalizedBotId = botId ? `${botId}@s.whatsapp.net` : '';
            
            const [isGroupAdmin, botAdmin] = await Promise.all([
                isAdmin(groupId, normalizedSenderId),
                isAdmin(groupId, normalizedBotId)
            ]);
            
            if (!isGroupAdmin) return m.reply('Anda harus menjadi admin!');
            if (!botAdmin) return m.reply('Bot harus menjadi admin!');

            let msg;
            
            // Validasi bahwa pesan berisi media gambar
            if (m.message?.imageMessage) {
                msg = m;
            } else if (m.quoted?.message?.imageMessage) {
                msg = m.quoted;
            } else {
                return m.reply('Kirim atau reply gambar yang ingin dijadikan foto profil grup dengan caption !setppgc');
            }

            m.reply('⏳ Sedang memproses gambar...');

            // Download media menggunakan fungsi downloadMediaMessage
            const mediaBuffer = await downloadMediaMessage(msg, 'buffer', {});

            if (!mediaBuffer) {
                throw new Error('Gagal mengunduh media.');
            }

            // Update foto profil grup
            await Oblixn.sock.updateProfilePicture(groupId, mediaBuffer);
            
            m.reply('✅ Foto profil grup berhasil diubah!');
            
        } catch (error) {
            console.error('Error in setppgc command:', error);
            m.reply('❌ Terjadi kesalahan saat mengubah foto profil grup: ' + error.message);
            botLogger.error(error);
        }
    }
});

global.Oblixn.cmd({
    name: "add",
    alias: ["invite"],
    desc: "Menambahkan anggota ke grup",
    category: "admin",
    async exec(msg, { args }) {
        try {
            // Validasi input nomor
            if (!args[0]) return msg.reply("❌ Masukkan nomor yang akan ditambahkan!");

            let number = args[0].replace(/[^0-9]/g, '');
            
            // Tambahkan awalan 62 jika belum ada
            if (!number.startsWith('62')) {
                number = '62' + (number.startsWith('0') ? number.slice(1) : number);
            }

            // Validasi nomor WhatsApp
            const [result] = await Oblixn.sock.onWhatsApp(`${number}@s.whatsapp.net`);
            if (!result) {
                return msg.reply(`❌ Nomor ${number} tidak terdaftar di WhatsApp!`);
            }

            // Tambahkan ke grup
            const response = await Oblixn.sock.groupParticipantsUpdate(
                msg.key.remoteJid,
                [`${number}@s.whatsapp.net`],
                "add"
            );

            // Handle response
            if (response[0].status === "200") {
                msg.reply(
                    `✅ Berhasil menambahkan @${number} ke dalam grup!`,
                    { mentions: [number] }
                );
            } else if (response[0].status === "403") {
                msg.reply(`❌ Gagal menambahkan @${number}! Nomor tersebut mungkin telah mengatur privasi grup.`);
            } else {
                msg.reply(`❌ Gagal menambahkan @${number}! Status: ${response[0].status}`);
            }

        } catch (error) {
            console.error("Error in add command:", error);
            return msg.reply(`❌ Terjadi kesalahan: ${error.message}`);
        }
    }
});