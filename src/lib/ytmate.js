const axios = require('axios');

class YTMateDownloader {
    constructor() {
        this.ytIdRegex = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/;
        this.baseURL = 'https://y2mate.is/';
    }

    async getVideoInfo(url) {
        try {
            const ytId = this.ytIdRegex.exec(url);
            if (!ytId) throw new Error('URL YouTube tidak valid');

            const response = await axios.get(`${this.baseURL}api/convert?url=${encodeURIComponent(url)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!response.data.status === 'success') {
                throw new Error('Gagal mendapatkan informasi video');
            }

            return response.data;
        } catch (error) {
            console.error('Error getting video info:', error);
            throw new Error('Gagal mendapatkan informasi video');
        }
    }

    async download(url, type = 'mp4', quality = '360') {
        try {
            const info = await this.getVideoInfo(url);
            const formats = info.formats || [];
            let selectedFormat;

            if (type === 'mp3') {
                selectedFormat = formats.find(f => f.mimeType.includes('audio/mp4'));
            } else {
                selectedFormat = formats.find(f => f.height === parseInt(quality)) || formats[0];
            }

            if (!selectedFormat) {
                throw new Error('Kualitas yang diminta tidak tersedia');
            }

            return {
                dl_link: selectedFormat.url,
                title: info.title,
                thumb: info.thumbnail,
                quality: type === 'mp3' ? '128kbps' : `${selectedFormat.height}p`,
                duration: info.duration,
                filesizeF: this.formatSize(selectedFormat.contentLength)
            };
        } catch (error) {
            console.error('Error in download:', error);
            throw error;
        }
    }

    formatSize(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async downloadVideo(url, quality = '360') {
        return this.download(url, 'mp4', quality);
    }

    async downloadAudio(url) {
        return this.download(url, 'mp3', '128');
    }
}

module.exports = YTMateDownloader; 