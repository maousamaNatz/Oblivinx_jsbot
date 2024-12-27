const axios = require('axios');
const cheerio = require('cheerio');

class GempaScraper {
    constructor() {
        this.baseUrl = 'https://data.bmkg.go.id';
    }

    async getGempaTerkini() {
        try {
            const response = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
            const data = response.data.Infogempa.gempa;

            const gempa = {
                tanggal: data.Tanggal,
                jam: data.Jam,
                lintang: data.Lintang,
                bujur: data.Bujur,
                magnitudo: data.Magnitude,
                kedalaman: data.Kedalaman,
                wilayah: data.Wilayah,
                potensi: data.Potensi,
                dirasakan: data.Dirasakan,
                shakemap: `https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}`
            };

            return {
                status: true,
                data: [gempa]
            };
        } catch (error) {
            console.error('Error scraping gempa terkini:', error);
            return {
                status: false,
                message: 'Gagal mengambil data gempa terkini'
            };
        }
    }

    async getGempaDirasakan() {
        try {
            const response = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json');
            const gempaList = response.data.Infogempa.gempa.map(data => ({
                tanggal: data.Tanggal,
                jam: data.Jam,
                lintang: data.Lintang,
                bujur: data.Bujur,
                magnitudo: data.Magnitude,
                kedalaman: data.Kedalaman,
                wilayah: data.Wilayah,
                dirasakan: data.Dirasakan
            }));

            return {
                status: true,
                count: gempaList.length,
                data: gempaList
            };
        } catch (error) {
            console.error('Error scraping gempa dirasakan:', error);
            return {
                status: false,
                message: 'Gagal mengambil data gempa dirasakan'
            };
        }
    }
}

module.exports = GempaScraper;
