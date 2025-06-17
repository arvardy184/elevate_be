// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

async function fixDbColumns() {
  console.log('🔧 Fixing database columns for longer URLs...');
  
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
    
    // Check current column definitions
    console.log('\n📋 Current column definitions:');
    const [currentColumns] = await connection.execute(
      "SHOW COLUMNS FROM Course WHERE Field IN ('thumbnail', 'b2ThumbnailUrl')"
    );
    
    for (const col of currentColumns) {
      console.log(`${col.Field}: ${col.Type}`);
    }
    
    // Alter columns to TEXT type
    console.log('\n🔄 Altering columns to TEXT type...');
    
    // Alter thumbnail column
    console.log('🔧 Altering thumbnail column...');
    await connection.execute('ALTER TABLE Course MODIFY COLUMN thumbnail TEXT');
    console.log('✅ thumbnail column updated to TEXT');
    
    // Alter b2ThumbnailUrl column
    console.log('🔧 Altering b2ThumbnailUrl column...');
    await connection.execute('ALTER TABLE Course MODIFY COLUMN b2ThumbnailUrl TEXT');
    console.log('✅ b2ThumbnailUrl column updated to TEXT');
    
    // Verify changes
    console.log('\n🔍 Verifying changes...');
    const [newColumns] = await connection.execute(
      "SHOW COLUMNS FROM Course WHERE Field IN ('thumbnail', 'b2ThumbnailUrl')"
    );
    
    console.log('📋 New column definitions:');
    for (const col of newColumns) {
      console.log(`${col.Field}: ${col.Type}`);
    }
    
    console.log('\n✅ Database columns successfully updated!');
    console.log('🎉 Now URLs up to 65,535 characters are supported');
    
  } catch (error) {
    console.error('❌ Database update failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the fix
if (require.main === module) {
  fixDbColumns()
    .then(() => {
      console.log('\n🏁 Database fix completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixDbColumns }; 