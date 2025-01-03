const { botLogger } = require('../utils/logger');
const { createGroupSettings, updateGroupSetting, getGroupSettings } = require('../../config/dbConf/groupSettings');

global.Oblixn.cmd({
  name: 'groupsetting',
  alias: ['seting', 'setgrup'],
  desc: 'Mengatur pengaturan grup',
  category: 'admin',
  async exec(msg, { args }) {
    try {
      const groupId = msg.key.remoteJid;
      
      // Cek apakah pesan dari grup
      if (!groupId.endsWith('@g.us')) {
        return msg.reply('⚠️ Perintah ini hanya dapat digunakan di dalam grup!');
      }

      // Cek apakah pengirim adalah admin
      const isAdmin = await Oblixn.isAdmin(groupId, msg.sender);
      if (!isAdmin) {
        return msg.reply('⚠️ Perintah ini hanya untuk admin grup!');
      }

      // Jika tidak ada argumen, tampilkan menu pengaturan
      if (!args.length) {
        const settings = await getGroupSettings(groupId);
        const menuText = `*PENGATURAN GRUP*

1. Anti Bot: ${settings?.anti_bot === 'ya' ? '✅' : '❌'}
2. Anti Hapus Pesan: ${settings?.anti_hapus_pesan === 'ya' ? '✅' : '❌'}
3. Anti Sembunyikan Tag: ${settings?.anti_sembunyikan_tag === 'ya' ? '✅' : '❌'}
4. Anti Tautan Grup: ${settings?.anti_tautan_grup_atau_saluran === 'ya' ? '✅' : '❌'}
5. Anti Sekali Lihat: ${settings?.anti_sekali_dilihat === 'ya' ? '✅' : '❌'}
6. Stiker Otomatis: ${settings?.stiker_otomatis === 'ya' ? '✅' : '❌'}
7. Deteksi Log: ${settings?.deteksi_log === 'ya' ? '✅' : '❌'}
8. Naik Level Otomatis: ${settings?.naik_level_otomatis === 'ya' ? '✅' : '❌'}
9. Bisukan Bot: ${settings?.bisukan_bot === 'ya' ? '✅' : '❌'}
10. Anti Negara: ${settings?.anti_negara === 'ya' ? '✅' : '❌'}
11. Wibu: ${settings?.wibu === 'ya' ? '✅' : '❌'}
12. Selamat Datang: ${settings?.selamat_datang === 'ya' ? '✅' : '❌'}
13. Selamat Tinggal: ${settings?.selamat_tinggal === 'ya' ? '✅' : '❌'}
14. Peringatan: ${settings?.peringatan === 'ya' ? '✅' : '❌'}

Cara penggunaan:
!groupsetting <nomor> <ya/tidak>
Contoh: !groupsetting 1 ya`;

        return msg.reply(menuText);
      }

      // Parse argumen
      const [settingNumber, value] = args;
      if (!settingNumber || !value) {
        return msg.reply('❌ Format salah! Gunakan: !groupsetting <nomor> <ya/tidak>');
      }

      // Mapping nomor ke nama setting
      const settingMap = {
        '1': 'anti_bot',
        '2': 'anti_hapus_pesan',
        '3': 'anti_sembunyikan_tag',
        '4': 'anti_tautan_grup_atau_saluran',
        '5': 'anti_sekali_dilihat',
        '6': 'stiker_otomatis',
        '7': 'deteksi_log',
        '8': 'naik_level_otomatis',
        '9': 'bisukan_bot',
        '10': 'anti_negara',
        '11': 'wibu',
        '12': 'selamat_datang',
        '13': 'selamat_tinggal',
        '14': 'peringatan'
      };

      const setting = settingMap[settingNumber];
      if (!setting) {
        return msg.reply('❌ Nomor pengaturan tidak valid!');
      }

      if (value !== 'ya' && value !== 'tidak') {
        return msg.reply('❌ Nilai harus "ya" atau "tidak"!');
      }

      // Update pengaturan
      const result = await updateGroupSetting(groupId, setting, value);
      if (result.success) {
        return msg.reply(`✅ Berhasil mengubah pengaturan ${setting} menjadi ${value}`);
      } else {
        return msg.reply('❌ Gagal mengubah pengaturan grup');
      }

    } catch (error) {
      botLogger.error('Error in groupsetting command:', error);
      return msg.reply('❌ Terjadi kesalahan saat mengatur grup');
    }
  }
}); 