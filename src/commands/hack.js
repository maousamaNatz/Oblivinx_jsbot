const ipGeoService = require('../service/Ipgeo.js');
const PhoneTracker = require('../service/hpgeo.js');
Oblixn.cmd({
    name: "ipgeo",
    alias: ["iplookup", "geoip"],
    desc: "Mendapatkan informasi lokasi dari alamat IP",
    category: "hack",
    async exec(msg, { args, prefix }) {
        try {
            // Cek apakah ada argumen
            if (!args || args.length === 0) {
                return msg.reply(`❌ Mohon masukkan alamat IP\n\nContoh: ${prefix}ipgeo 8.8.8.8`);
            }

            // Validasi format IP
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(args[0])) {
                return msg.reply(`❌ Format IP tidak valid\n\nContoh: ${prefix}ipgeo 8.8.8.8`);
            }

            const ip = args[0];
            await msg.reply("⏳ Sedang mencari informasi lokasi IP...");

            // Gunakan service untuk mendapatkan data
            const result = await ipGeoService.getLocationData(ip);

            if (!result.success) {
                return msg.reply(`❌ ${result.error}`);
            }

            // Format dan kirim hasil
            const formattedResponse = ipGeoService.formatLocationInfo(result.data);
            await msg.reply(formattedResponse);

        } catch (error) {
            console.error("Error in ipgeo command:", error);
            await msg.reply("❌ Terjadi kesalahan saat memproses permintaan");
        }
    }
});

Oblixn.cmd({
    name: "hpgeo",
    alias: ["phone", "trackhp"],
    desc: "Mendapatkan informasi lokasi dari nomor HP",
    category: "hack",
    async exec(msg, { match, args }) {
        try {
            // Cek apakah nomor HP diberikan
            if (!args || !args[0]) {
                return msg.reply("❌ Mohon masukkan nomor HP\n\nContoh: .hpgeo 628123456789");
            }

            // Validasi format nomor HP sederhana
            const phoneRegex = /^\+?([0-9]{10,15})$/;
            const phone = args[0].replace(/[^0-9+]/g, '');
            
            if (!phoneRegex.test(phone)) {
                return msg.reply("❌ Format nomor HP tidak valid\n\nContoh: .hpgeo 628123456789");
            }

            await msg.reply("⏳ Sedang mencari informasi nomor HP...");

            // Gunakan PhoneTracker untuk mendapatkan lokasi
            const phoneTracker = new PhoneTracker();
            const result = await phoneTracker.getPhoneInfo(phone);
            
            if (!result || !result.valid) {
                return msg.reply("❌ Nomor telepon tidak valid atau tidak ditemukan.");
            }

            // Format dan kirim hasil
            const formattedResponse = `Nomor: ${result.number}\nLokasi: ${result.location}\nOperator: ${result.carrier}`;
            await msg.reply(formattedResponse);

        } catch (error) {
            console.error("Error in hpgeo command:", error);
            await msg.reply("❌ Terjadi kesalahan saat memproses permintaan");
        }
    }
});