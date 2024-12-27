const axios = require('axios');
const { config } = require('../../config/config');
const API_KEY = config.coinmarketcap.apiKey;
const BASE_URL = config.coinmarketcap.baseUrl;

// Command untuk melihat daftar crypto
Oblixn.cmd({
    name: 'cryptolist',
    alias: ['cl', 'coinlist'],
    desc: 'Menampilkan daftar cryptocurrency',
    category: 'crypto',
    async exec(msg, { args }) {
        try {
            const page = args[0] || 1;
            const limit = args[1] || 10;

            const response = await axios.get(
                `${BASE_URL}/cryptocurrency/listings/latest?start=${page}&limit=${limit}`,
                {
                    headers: {
                        'X-CMC_PRO_API_KEY': API_KEY
                    },
                    params: {
                        convert: 'USD'
                    }
                }
            );

            let message = '*🪙 Daftar Cryptocurrency*\n\n';
            response.data.data.forEach((coin, index) => {
                message += `${index + 1}. *${coin.name} (${coin.symbol})*\n`;
                message += `💵 Harga: $${coin.quote.USD.price.toFixed(2)}\n`;
                message += `📈 24h Change: ${coin.quote.USD.percent_change_24h.toFixed(2)}%\n`;
                message += `💹 Market Cap: $${formatNumber(coin.quote.USD.market_cap)}\n\n`;
            });

            await msg.reply(message);
        } catch (error) {
            console.error('Error:', error);
            await msg.reply('❌ Terjadi kesalahan saat mengambil data cryptocurrency');
        }
    }
});

// Command untuk melihat detail crypto spesifik
Oblixn.cmd({
    name: 'crypto',
    alias: ['coin', 'price'],
    desc: 'Menampilkan detail cryptocurrency spesifik',
    category: 'crypto',
    async exec(msg, { args }) {
        try {
            if (!args[0]) {
                return msg.reply('❌ Mohon masukkan simbol cryptocurrency (contoh: BTC, ETH, etc)');
            }

            const coin = args[0].toUpperCase();
            const response = await axios.get(
                `${BASE_URL}/cryptocurrency/quotes/latest`,
                {
                    headers: {
                        'X-CMC_PRO_API_KEY': API_KEY
                    },
                    params: {
                        symbol: coin,
                        convert: 'USD'
                    }
                }
            );

            const coinData = response.data.data[coin];
            if (!coinData) {
                return msg.reply('❌ Cryptocurrency tidak ditemukan');
            }

            const message = `*🪙 ${coinData.name} (${coinData.symbol})*\n\n` +
                `💵 Harga: $${coinData.quote.USD.price.toFixed(2)}\n` +
                `📈 24h Change: ${coinData.quote.USD.percent_change_24h.toFixed(2)}%\n` +
                `📊 7d Change: ${coinData.quote.USD.percent_change_7d.toFixed(2)}%\n` +
                `💹 Market Cap: $${formatNumber(coinData.quote.USD.market_cap)}\n` +
                `📈 Volume 24h: $${formatNumber(coinData.quote.USD.volume_24h)}\n` +
                `🔄 Circulating Supply: ${formatNumber(coinData.circulating_supply)} ${coinData.symbol}\n` +
                `📊 Max Supply: ${coinData.max_supply ? formatNumber(coinData.max_supply) : 'Unlimited'} ${coinData.symbol}`;

            await msg.reply(message);
        } catch (error) {
            console.error('Error:', error);
            await msg.reply('❌ Terjadi kesalahan saat mengambil data cryptocurrency');
        }
    }
});

// Helper function untuk memformat angka
function formatNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
} 