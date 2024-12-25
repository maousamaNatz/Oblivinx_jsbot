const { isAdmin } = require('../handler/permission');
const { botLogger } = require('../utils/logger');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fileManager = require('../../config/memoryAsync/readfile');

const prefix = process.env.PREFIX;
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
                return m.reply('Perintah ini hanya dapat digunakan di dalam grup!');
            }

            // Cek admin status sekali saja dan simpan hasilnya
            const [isGroupAdmin, botAdmin] = await Promise.all([
                isAdmin(groupId, normalizedSenderId),
                isAdmin(groupId, normalizedBotId)
            ]);

            if (!botAdmin) {
                return m.reply('Bot harus menjadi admin untuk menggunakan fitur ini!');
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
                return m.reply(`📝 *Hallo ${username} berikut adalah perintah yang tersedia untuk command grup*
▢ ${prefix}group open - Membuka grup
▢ ${prefix}group close - Menutup grup
▢ ${prefix}group link - Mendapatkan link invite
▢ ${prefix}group revoke - Mereset link invite
▢ ${prefix}group name <text> - Mengubah nama grup
▢ ${prefix}group desc <text> - Mengubah deskripsi grup
▢ ${prefix}group promote @user - Menjadikan member sebagai admin
▢ ${prefix}group demote @user - Menurunkan admin menjadi member
▢ ${prefix}group leave - Mengeluarkan bot dari grup
▢ ${prefix}group info - Menampilkan informasi grup
▢ ${prefix}hidetag <text> - Mention semua member dengan pesan
▢ ${prefix}tagall <text> - Mention semua member dengan pesan
▢ ${prefix}tagadmin - Mention semua admin dengan pesan
▢ ${prefix}kick @user - Mengeluarkan anggota dari grup
▢ ${prefix}add <number> - Menambahkan anggota ke grup
▢ ${prefix}mute on - Mengaktifkan mode senyap
▢ ${prefix}mute off - Menonaktifkan mode senyap
▢ ${prefix}chatmode admin - Hanya admin yang bisa chat
▢ ${prefix}chatmode all - Semua member bisa chat
▢ ${prefix}setppgc - Mengubah foto profil grup`);
            }

            const command = args[0].toLowerCase();
            switch (command) {
                case 'open':
                case 'buka':
                    await Oblixn.sock.groupSettingUpdate(groupId, 'not_announcement');
                    m.reply('✅ Grup telah dibuka!');
                    break;

                case 'close':
                case 'tutup':
                    await Oblixn.sock.groupSettingUpdate(groupId, 'announcement');
                    m.reply('✅ Grup telah ditutup!');
                    break;

                case 'link':
                    const code = await Oblixn.sock.groupInviteCode(groupId);
                    m.reply(`🔗 Link grup: https://chat.whatsapp.com/${code}`);
                    break;

                case 'revoke':
                    await Oblixn.sock.groupRevokeInvite(groupId);
                    m.reply('✅ Link grup telah direset!');
                    break;

                case 'name':
                    if (args.length < 2) {
                        return m.reply('Masukkan nama baru untuk grup!');
                    }
                    const newName = args.slice(1).join(' ');
                    await Oblixn.sock.groupUpdateSubject(groupId, newName);
                    m.reply(`✅ Nama grup telah diubah menjadi: ${newName}`);
                    break;

                case 'desc':
                    if (args.length < 2) {
                        return m.reply('Masukkan deskripsi baru untuk grup!');
                    }
                    const newDesc = args.slice(1).join(' ');
                    await Oblixn.sock.groupUpdateDescription(groupId, newDesc);
                    m.reply('✅ Deskripsi grup telah diperbarui!');
                    break;

                case 'promote':
                    if (!m.mentions?.length) {
                        return m.reply('Tag member yang ingin dijadikan admin!');
                    }
                    await Oblixn.sock.groupParticipantsUpdate(groupId, [m.mentions[0]], 'promote');
                    m.reply('✅ Berhasil menjadikan member sebagai admin!');
                    break;

                case 'demote':
                    if (!m.mentions?.length) {
                        return m.reply('Tag admin yang ingin diturunkan!');
                    }
                    await Oblixn.sock.groupParticipantsUpdate(groupId, [m.mentions[0]], 'demote');
                    m.reply('✅ Berhasil menurunkan admin menjadi member!');
                    break;

                case 'leave':
                    await m.reply('��� Selamat tinggal! Bot akan keluar dari grup.');
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
                    
                    m.reply(info);
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

// Update add command dengan format yang sama
Oblixn.cmd({
    name: 'add',
    desc: 'Menambahkan anggota ke grup',
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
            
            if (!t.args[0]) return m.reply('Masukkan nomor yang ingin ditambahkan!');
            
            let number = t.args[0].replace(/[^0-9]/g, '');
            if (!number.startsWith('62')) number = '62' + number;
            number = number + '@s.whatsapp.net';
            
            await Oblixn.sock.groupParticipantsUpdate(groupId, [number], 'add');
            m.reply('✅ Berhasil menambahkan anggota ke grup.');
            
        } catch (error) {
            console.error('Error in add command:', error);
            m.reply('❌ Gagal menambahkan anggota. Pastikan nomor valid dan tidak privat.');
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