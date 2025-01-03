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
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Normalisasi dan validasi format nomor telepon
        let normalizedUserId = userId.replace(/[^0-9]/g, "");
        
        // Validasi panjang nomor telepon Indonesia (10-13 digit setelah kode negara)
        if (normalizedUserId.length > 15 || normalizedUserId.length < 10) {
            return {
                success: false,
                message: 'Format nomor telepon tidak valid'
            };
        }

        // Normalisasi format 62
        if (normalizedUserId.startsWith("0")) {
            normalizedUserId = "62" + normalizedUserId.slice(1);
        } else if (!normalizedUserId.startsWith("62")) {
            normalizedUserId = "62" + normalizedUserId;
        }

        // Validasi tambahan untuk memastikan ini nomor telepon
        if (!/^62[8-9][0-9]{8,11}$/.test(normalizedUserId)) {
            return {
                success: false,
                message: 'Bukan nomor telepon yang valid'
            };
        }

        console.log('Processing user registration:', {
            originalUserId: userId,
            normalizedUserId: normalizedUserId,
            username: username
        });

        // Cek apakah user sudah terdaftar
        const [existingUser] = await connection.execute(
            'SELECT * FROM users WHERE user_id = ?',
            [normalizedUserId]
        );

        if (existingUser.length === 0) {
            // User belum terdaftar, tambahkan user baru
            await connection.execute(
                `INSERT INTO users (
                    user_id, 
                    username,
                    is_premium,
                    is_banned,
                    is_blocked,
                    coins,
                    experience,
                    level,
                    total_messages,
                    messages_per_day
                ) VALUES (?, ?, 0, 0, 0, 0, 0, 1, 1, 1)`,
                [normalizedUserId, username]
            );
        } else {
            // Update data user yang sudah ada
            await connection.execute(
                `UPDATE users SET 
                    username = COALESCE(?, username),
                    total_messages = total_messages + 1,
                    messages_per_day = messages_per_day + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?`,
                [username, normalizedUserId]
            );
        }

        await connection.commit();
        return {
            success: true,
            message: existingUser.length === 0 ? 'User baru berhasil didaftarkan' : 'Data user berhasil diperbarui',
            isNewUser: existingUser.length === 0,
            userId: normalizedUserId
        };

    } catch (error) {
        await connection.rollback();
        console.error('Error in registerUser:', error);
        return {
            success: false,
            message: 'Gagal mendaftarkan/memperbarui user: ' + error.message
        };
    } finally {
        connection.release();
    }
}

module.exports = {
    pool,
    banUser,
    unbanUser,
    checkUserStatus,
    blockUserBySystem,
    getListBannedUsers,
    registerUser
}; 