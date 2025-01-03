const axios = require('axios');

class IpGeolocationService {
    constructor() {
        this.baseUrl = 'https://ipgeolocation.io/api/ipgeolocation';
    }

    async getLocationData(ip) {
        try {
            // Validasi IP Private
            if (this.isPrivateIP(ip)) {
                return {
                    success: false,
                    error: 'IP tersebut adalah IP Private Range. Gunakan IP publik untuk melakukan tracking.'
                };
            }

            const response = await axios.get(`${this.baseUrl}?ip=${ip}`);
            
            // Cek jika ada pesan error dari API
            if (response.data.message) {
                return {
                    success: false,
                    error: response.data.message
                };
            }

            return {
                success: true,
                data: response.data.ip
            };

        } catch (error) {
            console.error('Error fetching IP location:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Gagal mendapatkan informasi lokasi IP'
            };
        }
    }

    formatLocationInfo(data) {
        return `*📍 IP GEOLOCATION*\n\n` +
               `📌 *IP:* ${data.ip}\n` +
               `🌐 *Hostname:* ${data.hostname || 'Tidak tersedia'}\n` +
               `🌍 *Benua:* ${data.continent_name} (${data.continent_code})\n` +
               `🏳️ *Negara:* ${data.country_name_official} ${data.country_emoji}\n` +
               `🏛️ *Ibukota:* ${data.country_capital}\n` +
               `🏢 *Kota:* ${data.city}\n` +
               `🏠 *Wilayah:* ${data.state_prov} (${data.state_code})\n` +
               `📮 *Kode Pos:* ${data.zipcode || 'Tidak tersedia'}\n` +
               `📍 *Koordinat:* ${data.latitude}, ${data.longitude}\n` +
               `📞 *Kode Telepon:* ${data.calling_code}\n` +
               `🌐 *ISP:* ${data.isp}\n` +
               `🏢 *Organisasi:* ${data.organization || 'Tidak tersedia'}\n` +
               `📡 *ASN:* ${data.asn}\n` +
               `🔌 *Tipe Koneksi:* ${data.connection_type || 'Tidak tersedia'}\n\n` +
               `💰 *Mata Uang:*\n` +
               `- Kode: ${data.currency.code}\n` +
               `- Nama: ${data.currency.name}\n` +
               `- Simbol: ${data.currency.symbol}\n\n` +
               `⏰ *Zona Waktu:*\n` +
               `- Nama: ${data.time_zone.name}\n` +
               `- Offset: ${data.time_zone.offset}\n` +
               `- Waktu: ${data.time_zone.current_time}\n\n` +
               `🛡️ *Keamanan:*\n` +
               `- Threat Score: ${data.security.threat_score}\n` +
               `- Proxy: ${data.security.is_proxy ? 'Ya' : 'Tidak'}\n` +
               `- VPN/TOR: ${data.security.is_tor ? 'Ya' : 'Tidak'}\n` +
               `- Bot: ${data.security.is_bot ? 'Ya' : 'Tidak'}\n\n` +
               `>POWERED BY OBLIVINX.MD <`;
    }

    isPrivateIP(ip) {
        const parts = ip.split('.');
        const firstOctet = parseInt(parts[0]);
        const secondOctet = parseInt(parts[1]);

        return (
            firstOctet === 10 || // 10.0.0.0 - 10.255.255.255
            (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) || // 172.16.0.0 - 172.31.255.255
            (firstOctet === 192 && secondOctet === 168) // 192.168.0.0 - 192.168.255.255
        );
    }
}

module.exports = new IpGeolocationService();