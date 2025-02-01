const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
};

async function runMigrations() {
  try {
    // Baca file SQL
    const sqlFile = fs.readFileSync(path.join(__dirname, '../bot.sql'), 'utf8');
    
    // Buat koneksi
    const connection = await mysql.createConnection(config);
    
    console.log('🔄 Memulai migrasi database...');
    
    // Eksekusi skema SQL
    await connection.query(sqlFile);
    
    // Cek tabel yang berhasil dibuat
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.tables
      WHERE table_schema = '${process.env.DB_NAME}'
    `);
    
    console.log('✅ Migrasi berhasil!');
    console.log('📊 Tabel yang tersedia:');
    tables.forEach((t, i) => console.log(`${i+1}. ${t.TABLE_NAME}`));
    
    await connection.end();
  } catch (error) {
    console.error('❌ Gagal melakukan migrasi:', error.message);
    process.exit(1);
  }
}

// Jalankan migrasi
runMigrations(); 