const os = require('os');
const si = require('systeminformation');
const { botLogger } = require('../utils/logger');
const cpus = os.cpus();

const prosessor = cpus[0].model;

Oblixn.cmd({
    name: 'ping',
    alias: ['speed', 'status'],
    desc: 'Menampilkan status bot dan kecepatan respon',
    category: 'info',
    async exec(m, t) {
        try {
            const start = performance.now();
            
            // Kirim pesan awal untuk mengukur latency
            const msg = await m.reply('📊 Mengecek status...');
            const end = performance.now();
            
            // Hitung response time
            const responseTime = (end - start).toFixed(2);
            const processingTime = Date.now() - m.messageTimestamp * 1000;
            
            // Dapatkan info sistem
            const usedMemory = process.memoryUsage();

            // Dapatkan semua info GPU
            const gpuInfo = await si.graphics();
            const gpuModels = gpuInfo.controllers.map((gpu, index) => 
                ` GPU ${index + 1}: ${gpu.model || 'Tidak terdeteksi'} (${gpu.vendor || 'Unknown Vendor'})`
            ).join('\n');
            
            const systemStats = {   
                cpu: os.loadavg()[0],       
                laptop: os.hostname(),
                totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2), // GB
                freeMemory: (os.freemem() / 1024 / 1024 / 1024).toFixed(2), // GB
                uptime: formatUptime(os.uptime()),
                nodeVersion: process.version,
                platform: os.platform(),
                prosessor: prosessor,
                GPU: gpuModels,  // Semua GPU ditampilkan
            };

            // Format pesan status
            const statusMessage = `*🤖 BOT STATUS*\n
📡 *Response Time:* ${responseTime} ms
⚡ *Processing Time:* ${processingTime} ms
🔄 *Uptime:* ${systemStats.uptime}
🔄 *Laptop:* ${systemStats.laptop}

💻 *System Info:*
├ Platform: ${systemStats.platform}
├ Node: ${systemStats.nodeVersion}
├ CPU Load: ${systemStats.cpu}%
├ Total RAM: ${systemStats.totalMemory} GB
├ CPU: ${systemStats.prosessor}
├ GPU Info:${systemStats.GPU}
└ Free RAM: ${systemStats.freeMemory} GB

🧠 *Memory Usage:*
├ RSS: ${formatBytes(usedMemory.rss)}
├ Heap Total: ${formatBytes(usedMemory.heapTotal)}
└ Heap Used: ${formatBytes(usedMemory.heapUsed)}`;

            // Edit pesan awal dengan info lengkap
            await Oblixn.sock.sendMessage(m.chat, { 
                text: statusMessage,
                edit: msg.key
            });

            botLogger.info(`Ping command executed - Response time: ${responseTime}ms`);

        } catch (error) {
            botLogger.error('Error in ping command:', error);
            m.reply('❌ Terjadi kesalahan saat mengecek status.');
        }
    }
});

// Helper function untuk format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Helper function untuk format uptime
function formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

// Command untuk melihat status jaringan
// Oblixn.cmd({
//     name: 'netstat',
//     alias: ['network', 'connection'],
//     desc: 'Menampilkan status jaringan bot',
//     category: 'info',
//     async exec(m, t) {
//         try {
//             const networkInterfaces = os.networkInterfaces();
//             let networkInfo = '*🌐 NETWORK STATUS*\n\n';

//             // Loop melalui setiap interface jaringan
//             Object.keys(networkInterfaces).forEach(interfaceName => {
//                 const interfaces = networkInterfaces[interfaceName];
//                 networkInfo += `*${interfaceName}:*\n`;
                
//                 interfaces.forEach(interface => {
//                     if (interface.family === 'IPv4') {
//                         networkInfo += `├ IP: ${interface.address}\n`;
//                         networkInfo += `├ Netmask: ${interface.netmask}\n`;
//                         networkInfo += `└ MAC: ${interface.mac}\n\n`;
//                     }
//                 });
//             });

//             m.reply(networkInfo);
//             botLogger.info('Network status checked');

//         } catch (error) {
//             botLogger.error('Error in netstat command:', error);
//             m.reply('❌ Terjadi kesalahan saat mengecek status jaringan.');
//         }
//     }
// });

// Command untuk membersihkan memori
Oblixn.cmd({
    name: 'clearcache',
    alias: ['gc', 'clearmem'],
    desc: 'Membersihkan cache dan memori bot',
    category: 'owner',
    async exec(m, t) {
        try {
            const beforeMemory = process.memoryUsage();
            
            // Kirim pesan awal
            const msg = await m.reply('🧹 Membersihkan cache...');

            // Force garbage collection (jika node dijalankan dengan --expose-gc)
            if (global.gc) {
                global.gc();
            }

            // Clear Baileys store jika ada
            if (Oblixn.store) {
                Oblixn.store.writeToFile('./baileys_store.json');
                Oblixn.store.clear();
            }

            const afterMemory = process.memoryUsage();
            const freedMemory = (beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024;

            const statusMessage = `*🧹 CACHE CLEARED*\n
💾 *Memory Freed:* ${freedMemory.toFixed(2)} MB
🧠 *Current Memory:*
├ RSS: ${formatBytes(afterMemory.rss)}
├ Heap Total: ${formatBytes(afterMemory.heapTotal)}
└ Heap Used: ${formatBytes(afterMemory.heapUsed)}`;

            await Oblixn.sock.sendMessage(m.chat, { 
                text: statusMessage,
                edit: msg.key
            });

            botLogger.info(`Cache cleared - Freed ${freedMemory.toFixed(2)}MB of memory`);

        } catch (error) {
            botLogger.error('Error in clearcache command:', error);
            m.reply('❌ Terjadi kesalahan saat membersihkan cache.');
        }
    }
});
