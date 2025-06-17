// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  let connection;
  
  try {
    // Create MySQL connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'elevate'
    });
    
    console.log('✅ Connected to database');
    
    // Check thumbnail column definition
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM Course WHERE Field IN ('thumbnail', 'b2ThumbnailUrl')"
    );
    
    console.log('\n📋 Column definitions:');
    for (const col of columns) {
      console.log(`${col.Field}: ${col.Type} (Null: ${col.Null}, Default: ${col.Default})`);
    }
    
    // Test URL length
    const testUrl = 'https://api005.backblazeb2.com/file/elevate-be/courses/thumbnails/course-1750070674711/1750070675693-GswT2vmaMAAaq1y.jpeg?Authorization=3_20250616134739_f3bfc184abc8b1afe1a95915_b82ad1287b5145468f85639066bda4238246be33_005_20250623134739_0000_dnld';
    
    console.log(`\n📏 URL length test:`);
    console.log(`Sample URL length: ${testUrl.length} characters`);
    console.log(`Sample URL: ${testUrl}`);
    
    // Check if we need to alter table
    const varchar255Limit = 255;
    const varchar500Limit = 500;
    const textLimit = 65535;
    
    if (testUrl.length > varchar255Limit) {
      console.log(`\n⚠️  URL length (${testUrl.length}) exceeds VARCHAR(255) limit`);
      console.log('💡 Solutions:');
      console.log('1. Change column to VARCHAR(500) or TEXT');
      console.log('2. Store only B2 file info and generate URLs on-demand');
      console.log('3. Use shorter authorization tokens');
      
      // Show ALTER TABLE statement
      console.log('\n🔧 SQL to fix:');
      console.log('ALTER TABLE Course MODIFY COLUMN thumbnail TEXT;');
      console.log('ALTER TABLE Course MODIFY COLUMN b2ThumbnailUrl TEXT;');
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the check
if (require.main === module) {
  checkSchema()
    .then(() => {
      console.log('\n🏁 Schema check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkSchema }; 