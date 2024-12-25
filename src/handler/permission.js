const { botLogger } = require('../utils/logger');
let sock = null;

/**
 * Memeriksa apakah pengguna adalah admin dalam grup
 * @param {string} groupId - ID grup
 * @param {string} userId - ID pengguna yang akan diperiksa
 * @param {boolean} verbose - Apakah perlu menampilkan log detail
 * @returns {Promise<boolean>} - true jika pengguna adalah admin
 */
async function isAdmin(groupId, userId, verbose = false) {
    try {
        // Dapatkan metadata grup
        const metadata = await sock.groupMetadata(groupId);
        
        // Debug log hanya jika verbose = true
        if (verbose) {
            botLogger.info('Group Information:');
            botLogger.info(`├─ ID: ${metadata.id}`);
            botLogger.info(`├─ Name: ${metadata.subject}`);
            botLogger.info('└─ Participants:');
            metadata.participants.forEach((p, i) => {
                const isLast = i === metadata.participants.length - 1;
                const prefix = isLast ? '    └─' : '    ├─';
                botLogger.info(`${prefix} ${p.id} (${p.admin || 'member'})`);
            });

            botLogger.info(`Checking admin status for user: ${userId}`);
        }

        // Cek status admin
        const participant = metadata.participants.find(p => p.id.split(':')[0] === userId.split(':')[0]);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch (error) {
        botLogger.error('Error checking admin status:', error);
        return false;
    }
}

// Fungsi untuk mengatur instance sock
function setup(sockInstance) {
    sock = sockInstance;
    botLogger.success('Permission handler setup completed');
}

module.exports = {
    isAdmin,
    setup
};