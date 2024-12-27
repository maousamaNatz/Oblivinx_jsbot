const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Contoh fungsi untuk mengelola user
async function registerUser(userId, phoneNumber, username) {
    try {
        const [result] = await pool.execute(
            'INSERT INTO users (user_id, phone_number, username) VALUES (?, ?, ?)',
            [userId, phoneNumber, username]
        );
        return result;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
}

// Fungsi untuk ban user
async function banUser(userId, reason, bannedBy) {
    try {
        const [result] = await pool.execute(
            'INSERT INTO banned_users (user_id, reason, banned_by) VALUES (?, ?, ?)',
            [userId, reason, bannedBy]
        );
        return { success: true, message: 'User berhasil diban' };
    } catch (error) {
        console.error('Error banning user:', error);
        return { success: false, message: 'Gagal melakukan ban user' };
    }
}

// Fungsi untuk unban user
async function unbanUser(userId) {
    try {
        // const [checkBan] = await pool.execute('SELECT * FROM banned_users WHERE user_id = ?',[userId]);
        const [banResult] = await pool.execute('DELETE FROM banned_users WHERE user_id = ?',[userId]);
        // 3. Tambahkan log ke block_history
        if (banResult.affectedRows > 0) {
            const [historyResult] = await pool.execute(
                'INSERT INTO block_history (user_id, action, reason, performed_by) VALUES (?, ?, ?, ?)',
                [userId, 'UNBLOCK', 'Unban by command', 'SYSTEM']
            );
        }

        // // 4. Hapus dari blocked_users
        // const [blockResult] = await pool.execute(
        //     'DELETE FROM blocked_users WHERE user_id = ?',
        //     [userId]
        // );

        const success = banResult.affectedRows > 0;
        const result = {
            success: success,
            message: success ? 'User berhasil diunban' : 'User tidak ditemukan atau sudah tidak dibanned',
            wasUnbanned: success
        };
        return result;

    } catch (error) {
        console.error('=== DATABASE UNBAN ERROR ===');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        return { 
            success: false, 
            message: 'Gagal melakukan unban user: ' + error.message,
            wasUnbanned: false
        };
    }
}

// Fungsi untuk mencatat riwayat panggilan
async function logCallAttempt(userId, timestamp) {
    try {
        const [result] = await pool.execute(
            'INSERT INTO call_logs (user_id, timestamp) VALUES (?, ?)',
            [userId, timestamp]
        );
        return result;
    } catch (error) {
        console.error('Error logging call attempt:', error);
        throw error;
    }
}

// Fungsi untuk mendapatkan jumlah panggilan dalam 24 jam terakhir
async function getCallAttempts(userId) {
    try {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM call_logs WHERE user_id = ? AND timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
            [userId]
        );
        return rows[0].count;
    } catch (error) {
        console.error('Error getting call attempts:', error);
        throw error;
    }
}

// Export fungsi-fungsi database
module.exports = {
    pool,
    registerUser,
    banUser,
    unbanUser,
    logCallAttempt,
    getCallAttempts
}; 