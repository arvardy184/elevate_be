// Load environment variables
require('dotenv').config();

const b2StorageService = require('./services/b2_storage_service');
const mysql = require('mysql2/promise');

async function updateCourseUrls() {
  console.log('🔄 Updating course URLs with authorized B2 URLs...');
  
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
    
    // Find courses with B2 files
    const [courses] = await connection.execute(
      'SELECT id, title, b2FileName, thumbnail FROM Course WHERE b2FileName IS NOT NULL'
    );
    
    console.log(`📋 Found ${courses.length} courses with B2 files`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const course of courses) {
      try {
        console.log(`\n🔄 Processing: ${course.title} (ID: ${course.id})`);
        console.log(`📁 B2 file: ${course.b2FileName}`);
        console.log(`🖼️ Current thumbnail: ${course.thumbnail}`);
        
        // Generate new authorized URL
        const result = await b2StorageService.generateThumbnailUrl(course.b2FileName);
        
        if (result.success) {
          console.log(`✅ New authorized URL generated`);
          console.log(`🔗 URL: ${result.url}`);
          console.log(`⏰ Expires: ${result.expiresAt}`);
          
          // Update database
          await connection.execute(
            'UPDATE Course SET thumbnail = ?, b2ThumbnailUrl = ? WHERE id = ?',
            [result.url, result.url, course.id]
          );
          
          console.log('✅ Database updated successfully');
          successCount++;
        } else {
          console.log(`❌ Failed to generate URL: ${result.error}`);
          errorCount++;
        }
        
      } catch (courseError) {
        console.error(`❌ Error processing course ${course.id}:`, courseError.message);
        errorCount++;
      }
    }
    
    console.log(`\n🏁 Update completed:`);
    console.log(`✅ Success: ${successCount} courses`);
    console.log(`❌ Errors: ${errorCount} courses`);
    
    if (successCount > 0) {
      console.log('\n🎉 Course thumbnails are now accessible!');
      console.log('💡 URLs are valid for 7 days and will need to be refreshed periodically');
    }
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the update
if (require.main === module) {
  updateCourseUrls()
    .then(() => {
      console.log('\n🏁 Script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateCourseUrls }; 