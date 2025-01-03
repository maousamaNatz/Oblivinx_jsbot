const { pool } = require('./database');
const { botLogger } = require('../../src/utils/logger');

async function createGroupSettings(groupId, ownerId) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO groups (
        id, dibuat, dibuat_oleh, owner
      ) VALUES (?, NOW(), ?, ?)`,
      [groupId, ownerId, ownerId]
    );
    return { success: true, message: 'Pengaturan grup berhasil dibuat' };
  } catch (error) {
    botLogger.error('Error creating group settings:', error);
    return { success: false, message: 'Gagal membuat pengaturan grup' };
  }
}

async function updateGroupSetting(groupId, setting, value) {
  try {
    const [result] = await pool.execute(
      `UPDATE groups SET ${setting} = ? WHERE id = ?`,
      [value, groupId]
    );
    return { success: true, message: `Pengaturan ${setting} berhasil diperbarui` };
  } catch (error) {
    botLogger.error('Error updating group setting:', error);
    return { success: false, message: 'Gagal memperbarui pengaturan grup' };
  }
}

async function getGroupSettings(groupId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM groups WHERE id = ?',
      [groupId]
    );
    return rows[0];
  } catch (error) {
    botLogger.error('Error getting group settings:', error);
    return null;
  }
}

module.exports = {
  createGroupSettings,
  updateGroupSetting,
  getGroupSettings
}; 