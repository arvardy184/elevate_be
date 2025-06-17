// Load environment variables
require('dotenv').config();

const b2StorageService = require('./services/b2_storage_service');

async function testAuthorizedUrl() {
  console.log('🧪 Testing authorized URL generation...');
  
  try {
    const fileName = 'courses/thumbnails/course-1750070674711/1750070675693-GswT2vmaMAAaq1y.jpeg';
    
    console.log('📁 Testing file:', fileName);
    
    // Generate authorized URL
    const result = await b2StorageService.generateThumbnailUrl(fileName);
    
    if (result.success) {
      console.log('\n✅ Authorized URL generated successfully!');
      console.log('🔗 URL:', result.url);
      console.log('⏰ Expires at:', result.expiresAt);
      
      // Test the URL
      const axios = require('axios');
      console.log('\n🧪 Testing the authorized URL...');
      
      try {
        const response = await axios.head(result.url, { timeout: 10000 });
        console.log(`✅ URL test successful - Status: ${response.status}`);
        if (response.headers['content-type']) {
          console.log(`📄 Content-Type: ${response.headers['content-type']}`);
        }
        if (response.headers['content-length']) {
          console.log(`📏 Content-Length: ${response.headers['content-length']} bytes`);
        }
      } catch (urlError) {
        if (urlError.response) {
          console.log(`❌ URL test failed - Status: ${urlError.response.status} ${urlError.response.statusText}`);
        } else {
          console.log(`❌ URL test failed - Error: ${urlError.message}`);
        }
      }
      
    } else {
      console.log('❌ Failed to generate authorized URL:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test update database with authorized URL
async function testDatabaseUpdate() {
  console.log('\n🔄 Testing database update with authorized URLs...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Find courses with B2 files
    const courses = await prisma.course.findMany({
      where: {
        b2FileName: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        b2FileName: true,
        thumbnail: true
      }
    });
    
    console.log(`📋 Found ${courses.length} courses with B2 files`);
    
    for (const course of courses) {
      console.log(`\n🔄 Processing: ${course.title} (ID: ${course.id})`);
      console.log(`📁 B2 file: ${course.b2FileName}`);
      console.log(`🖼️ Current thumbnail: ${course.thumbnail}`);
      
      // Generate new authorized URL
      const result = await b2StorageService.generateThumbnailUrl(course.b2FileName);
      
      if (result.success) {
        console.log(`✅ New authorized URL: ${result.url}`);
        console.log(`⏰ Expires: ${result.expiresAt}`);
        
        // Update database
        await prisma.course.update({
          where: { id: course.id },
          data: {
            thumbnail: result.url,
            b2ThumbnailUrl: result.url
          }
        });
        
        console.log('✅ Database updated successfully');
      } else {
        console.log(`❌ Failed to generate URL: ${result.error}`);
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Database update failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  testAuthorizedUrl()
    .then(() => testDatabaseUpdate())
    .then(() => {
      console.log('\n🏁 All tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuthorizedUrl, testDatabaseUpdate }; 