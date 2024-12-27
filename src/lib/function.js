const axios = require('axios');
const cheerio = require('cheerio');

async function downloadImage(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data, 'binary');
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}
module.exports = {
    downloadImage,
}; 