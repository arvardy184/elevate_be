// Quick test untuk cek schema database udah update atau belum
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Cek schema tabel users kolom profilePicture
    const [rows] = await connection.execute(`
      DESCRIBE users;
    `);
    
    console.log('=== USERS TABLE SCHEMA ===');
    rows.forEach(row => {
      if (row.Field === 'profilePicture') {
        console.log(`✅ profilePicture column:`, row);
      }
    });
    
    // Test insert panjang string
    const longUrl = 'https://f005.backblazeb2.com/file/elevate-be/profile-pictures/1748877057198-20250601_194947.jpg?Authorization=3_20250602151059_3312320c889cf440abdc406f_590ea6119ff795d1ec589802abe55a132bd09b11_005_20250603151059_0050_dnld';
    console.log(`\nTesting URL length: ${longUrl.length} chars`);
    
    await connection.end();
    console.log('\n✅ Database connection test successful');
    
  } catch (error) {
    console.error('❌ Database test error:', error.message);
  }
}

testSchema(); 