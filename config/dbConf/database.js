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

// Fungsi untuk ban user
async function banUser(userId, reason, bannedBy) {
    try {
        // Cek apakah user sudah terdaftar
        const [userExists] = await pool.execute(
            'SELECT user_id FROM users WHERE user_id = ?',
            [userId]
        );

        // Jika user belum terdaftar, daftarkan dulu
        if (userExists.length === 0) {
            await pool.execute(
                'INSERT INTO users (user_id) VALUES (?)',
                [userId]
            );
        }

        // Update status ban di tabel users
        const [userResult] = await pool.execute(
            'UPDATE users SET is_banned = 1 WHERE user_id = ?',
            [userId]
        );

        // Hapus record ban yang mungkin sudah ada
        await pool.execute(
            'DELETE FROM banned_users WHERE user_id = ?',
            [userId]
        );

        // Tambahkan record baru ke tabel banned_users
        const [banResult] = await pool.execute(
            'INSERT INTO banned_users (user_id, reason, banned_by) VALUES (?, ?, ?)',
            [userId, reason || 'Tidak ada alasan', bannedBy]
        );

        return {
            success: true,
            message: 'User berhasil diban'
        };
    } catch (error) {
        console.error('Error banning user:', error);
        return {
            success: false,
            message: 'Gagal melakukan ban user: ' + error.message
        };
    }
}

// Fungsi untuk unban user
async function unbanUser(userId) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Format nomor telepon
        const normalizedUserId = formatPhoneNumber(userId);
        
        console.log('Attempting to unban user:', {
            original: userId,
            normalized: normalizedUserId
        });

        // Cek di tabel banned_users dengan query yang lebih fleksibel
        const [bannedUser] = await connection.execute(
            'SELECT * FROM banned_users WHERE user_id LIKE ?',
            [`%${normalizedUserId}%`]
        );
        
        console.log('Found banned user:', bannedUser);

        if (bannedUser.length === 0) {
            await connection.rollback();
            return {
                success: false,
                message: 'User tidak ditemukan dalam daftar banned',
                wasUnbanned: false
            };
        }

        // Dapatkan user_id yang tepat dari database
        const actualUserId = bannedUser[0].user_id;

        // Proses unban
        await connection.execute(
            'DELETE FROM banned_users WHERE user_id = ?',
            [actualUserId]
        );

        await connection.execute(
            'UPDATE users SET is_banned = 0 WHERE user_id = ?',
            [actualUserId]
        );

        await connection.commit();

        return {
            success: true,
            message: `User ${normalizedUserId} berhasil diunban`,
            wasUnbanned: true
        };

    } catch (error) {
        await connection.rollback();
        console.error('Error unbanning user:', error);
        return {
            success: false,
            message: 'Gagal melakukan unban: ' + error.message,
            wasUnbanned: false
        };
    } finally {
        connection.release();
    }
}

// Fungsi untuk cek status user
async function checkUserStatus(userId) {
    try {
        const [rows] = await pool.execute(
            'SELECT u.is_banned, u.is_blocked, u.warnings, b.reason, b.banned_by, b.is_system_block ' +
            'FROM users u ' +
            'LEFT JOIN banned_users b ON u.user_id = b.user_id ' +
            'WHERE u.user_id = ?',
            [userId]
        );

        if (rows.length > 0) {
            return {
                isBanned: rows[0].is_banned === 1,
                isBlocked: rows[0].is_blocked === 1,
                warnings: rows[0].warnings,
                banReason: rows[0].reason,
                bannedBy: rows[0].banned_by,
                isSystemBlock: rows[0].is_system_block === 1
            };
        }

        return {
            isBanned: false,
            isBlocked: false,
            warnings: 0,
            banReason: null,
            bannedBy: null,
            isSystemBlock: false
        };
    } catch (error) {
        console.error('Error checking user status:', error);
        throw error;
    }
}

// Fungsi untuk blokir user oleh sistem
async function blockUserBySystem(userId) {
    try {
        // Update status block di tabel users
        const [userResult] = await pool.execute(
            'UPDATE users SET is_blocked = 1 WHERE user_id = ?',
            [userId]
        );

        // Tambahkan record ke banned_users dengan is_system_block = 1
        const [banResult] = await pool.execute(
            'INSERT INTO banned_users (user_id, reason, banned_by, is_system_block) VALUES (?, ?, ?, 1)',
            [userId, 'Blocked by system', 'SYSTEM']
        );

        return {
            success: true,
            message: 'User berhasil diblokir oleh sistem'
        };
    } catch (error) {
        console.error('Error blocking user:', error);
        return {
            success: false,
            message: 'Gagal memblokir user: ' + error.message
        };
    }
}

// Fungsi untuk mendapatkan daftar user yang dibanned
async function getListBannedUsers() {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                u.user_id,
                u.username,
                b.reason,
                b.banned_by,
                b.created_at
            FROM users u
            INNER JOIN banned_users b ON u.user_id = b.user_id
            WHERE u.is_banned = 1 
            AND b.is_system_block = 0
            ORDER BY b.created_at DESC
        `);

        if (rows.length === 0) {
            return {
                success: true,
                message: 'Tidak ada user yang dibanned',
                data: []
            };
        }

        const formattedUsers = rows.map(user => {
            const banDate = new Date(user.created_at).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            return {
                userId: user.user_id,
                username: user.username || 'Tidak diketahui',
                reason: user.reason || 'Tidak ada alasan',
                bannedBy: user.banned_by,
                banDate: banDate
            };
        });

        return {
            success: true,
            message: 'Daftar user yang dibanned berhasil diambil',
            data: formattedUsers
        };
    } catch (error) {
        console.error('Error getting banned users list:', error);
        return {
            success: false,
            message: 'Gagal mengambil daftar user yang dibanned: ' + error.message,
            data: []
        };
    }
}

// Fungsi untuk memformat nomor telepon
function formatPhoneNumber(number) {
    // Hapus semua karakter non-digit
    let cleaned = number.replace(/\D/g, '');
    
    // Jika nomor terlalu panjang (seperti 62120363293011898990)
    // potong menjadi maksimal 13 digit (termasuk kode negara 62)
    if (cleaned.length > 13) {
        cleaned = cleaned.substring(0, 13);
    }
    
    // Jika dimulai dengan 62, gunakan langsung
    if (cleaned.startsWith('62')) {
        return cleaned;
    }
    
    // Jika dimulai dengan 0, ganti dengan 62
    if (cleaned.startsWith('0')) {
        return '62' + cleaned.slice(1);
    }
    
    // Jika dimulai dengan 8, tambahkan 62
    if (cleaned.startsWith('8')) {
        return '62' + cleaned;
    }
    
    // Jika tidak memenuhi format di atas, tambahkan 62
    return '62' + cleaned;
}

// Fungsi untuk menambah atau update user
async function registerUser(userId, username = null) {
    try {
        const [result] = await pool.query(
            `INSERT INTO users (
                user_id, 
                username,
                is_banned,
                is_blocked,
                warnings,
                created_at,
                updated_at
            ) VALUES (?, ?, 0, 0, 0, NOW(), NOW()) 
            ON DUPLICATE KEY UPDATE 
                username = COALESCE(VALUES(username), username),
                updated_at = NOW()`,
            [userId, username]
        );
        return result;
    } catch (error) {
        console.error('Error detail:', error);
        throw new Error('Gagal meregistrasi user: ' + error.message);
    }
}

// Tambahkan ping database secara berkala
setInterval(async () => {
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('Database ping success:', rows);
  } catch (error) {
    console.error('Database ping failed:', error);
  }
}, 300000); // Setiap 5 menit

async function saveBotCredentials(number, credentials) {
  try {
    const [result] = await pool.execute(
      'INSERT INTO bot_instances (number, credentials) VALUES (?, ?) ' +
      'ON DUPLICATE KEY UPDATE credentials = VALUES(credentials), status = "active"',
      [number, JSON.stringify(credentials)]
    );
    return { success: true, message: 'Credentials saved' };
  } catch (error) {
    console.error('Error saving credentials:', error);
    return { success: false, message: 'Failed to save credentials' };
  }
}

async function getBotCredentials(number) {
  try {
    const [rows] = await pool.execute(
      'SELECT credentials FROM bot_instances WHERE number = ?',
      [number]
    );
    return rows[0] ? JSON.parse(rows[0].credentials) : null;
  } catch (error) {
    console.error('Error getting credentials:', error);
    return null;
  }
}

async function handleOTPVerification(number, otp) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM bot_otp WHERE number = ? AND expires_at > NOW()',
            [number]
        );
        
        if(rows.length === 0) return false;
        
        if(rows[0].otp === otp) {
            await pool.execute(
                'UPDATE bot_instances SET status = "active" WHERE number = ?',
                [number]
            );
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('OTP Error:', error);
        return false;
    }
}

module.exports = {
    pool,
    banUser,
    unbanUser,
    checkUserStatus,
    blockUserBySystem,
    getListBannedUsers,
    registerUser,
    saveBotCredentials,
    getBotCredentials,
    handleOTPVerification
}; 