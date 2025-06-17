// Load environment variables
require('dotenv').config();

const b2StorageService = require('./services/b2_storage_service');
const axios = require('axios');

async function testB2Access() {
  console.log('🧪 Testing B2 file access...');
  
  // Check environment variables first
  console.log('\n🔧 Environment variables check:');
  console.log({
    B2_APPLICATION_KEY_ID: process.env.B2_APPLICATION_KEY_ID ? 'SET' : 'MISSING',
    B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY ? 'SET' : 'MISSING',
    B2_BUCKET_ID: process.env.B2_BUCKET_ID ? 'SET' : 'MISSING',
    B2_BUCKET_NAME: process.env.B2_BUCKET_NAME || 'MISSING'
  });
  
  if (!process.env.B2_APPLICATION_KEY_ID || !process.env.B2_APPLICATION_KEY) {
    console.error('❌ B2 credentials not found in environment variables!');
    console.log('💡 Make sure you have .env file with B2 credentials');
    return;
  }
  
  try {
    // Test data dari user (course yang tidak bisa diakses)
    const fileId = '4_zbf970e745233a0ff9d610510_f107cc051dbc19259_d20250616_m104437_c005_v0501034_t0007_u01750070677947';
    const fileName = 'courses/thumbnails/course-1750070674711/1750070675693-GswT2vmaMAAaq1y.jpeg';
    
    console.log('\n📋 Testing file:', { fileId, fileName });
    
    // Test menggunakan service kita
    const testResult = await b2StorageService.testFileAccess(fileId, fileName);
    console.log('\n🔍 Test result:', JSON.stringify(testResult, null, 2));
    
    if (testResult.success && testResult.urls) {
      console.log('\n🌐 Testing different URL formats...');
      
      // Test each URL format
      for (const [urlType, url] of Object.entries(testResult.urls)) {
        console.log(`\n🔗 Testing ${urlType}: ${url}`);
        
        try {
          const response = await axios.head(url, { 
            timeout: 10000,
            validateStatus: function (status) {
              return status < 500; // Resolve only if the status code is less than 500
            }
          });
          
          console.log(`✅ ${urlType} - Status: ${response.status}`);
          if (response.headers['content-type']) {
            console.log(`   Content-Type: ${response.headers['content-type']}`);
          }
          if (response.headers['content-length']) {
            console.log(`   Content-Length: ${response.headers['content-length']}`);
          }
        } catch (error) {
          if (error.response) {
            console.log(`❌ ${urlType} - Status: ${error.response.status} ${error.response.statusText}`);
            if (error.response.status === 401) {
              console.log('   → File requires authentication (bucket not public)');
            } else if (error.response.status === 404) {
              console.log('   → File not found');
            } else if (error.response.status === 403) {
              console.log('   → Access forbidden');
            }
          } else {
            console.log(`❌ ${urlType} - Network error: ${error.message}`);
          }
        }
      }
    }
    
    // Test bucket configuration
    console.log('\n🪣 Checking bucket configuration...');
    try {
      await b2StorageService.initialize();
      console.log('✅ B2 initialization successful');
      
      // Try to list buckets to verify permissions
      const buckets = await b2StorageService.b2.listBuckets();
      console.log('📋 Available buckets:', buckets.data.buckets.map(b => ({
        bucketName: b.bucketName,
        bucketType: b.bucketType,
        bucketId: b.bucketId
      })));
      
      // Find our bucket
      const ourBucket = buckets.data.buckets.find(b => b.bucketId === b2StorageService.bucketId);
      if (ourBucket) {
        console.log('\n🎯 Our bucket info:', {
          bucketName: ourBucket.bucketName,
          bucketType: ourBucket.bucketType,
          bucketId: ourBucket.bucketId
        });
        
        if (ourBucket.bucketType === 'allPrivate') {
          console.log('⚠️  WARNING: Bucket is set to allPrivate. Files tidak bisa diakses secara public!');
          console.log('💡 Solution: Set bucket type to allPublic di B2 dashboard');
        } else if (ourBucket.bucketType === 'allPublic') {
          console.log('✅ Bucket is public, URLs should work');
        }
      }
      
    } catch (bucketError) {
      console.error('❌ Error checking bucket:', bucketError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Generate alternative URLs format
function generateAlternativeUrls(bucketId, bucketName, fileName) {
  if (!bucketId || !bucketName) {
    console.error('❌ Missing bucketId or bucketName');
    return {};
  }
  
  const bucketIdShort = bucketId.slice(2, 12);
  
  return {
    // Format 1: Standard B2 friendly URL
    friendlyUrl: `https://f${bucketIdShort}.backblazeb2.com/file/${bucketName}/${fileName}`,
    
    // Format 2: S3-compatible URL
    s3Url: `https://${bucketName}.s3.us-west-000.backblazeb2.com/${fileName}`,
    
    // Format 3: Alternative S3 format
    s3AltUrl: `https://s3.us-west-000.backblazeb2.com/${bucketName}/${fileName}`,
    
    // Format 4: Direct download (requires auth token)
    // This would need authorization token
  };
}

// Test alternative URL formats
async function testAlternativeFormats() {
  console.log('\n🧪 Testing alternative URL formats...');
  
  const bucketId = process.env.B2_BUCKET_ID;
  const bucketName = process.env.B2_BUCKET_NAME;
  const fileName = 'courses/thumbnails/course-1750070674711/1750070675693-GswT2vmaMAAaq1y.jpeg';
  
  if (!bucketId || !bucketName) {
    console.error('❌ Missing bucket configuration in environment variables');
    return;
  }
  
  const urls = generateAlternativeUrls(bucketId, bucketName, fileName);
  
  console.log('\n🌐 Generated URLs:');
  Object.entries(urls).forEach(([type, url]) => {
    console.log(`${type}: ${url}`);
  });
  
  // Test each format
  for (const [urlType, url] of Object.entries(urls)) {
    console.log(`\n🔗 Testing ${urlType}...`);
    
    try {
      const response = await axios.head(url, { 
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      console.log(`✅ ${urlType} - Status: ${response.status}`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${urlType} - Status: ${error.response.status} ${error.response.statusText}`);
      } else {
        console.log(`❌ ${urlType} - Error: ${error.message}`);
      }
    }
  }
}

// Run tests
if (require.main === module) {
  testB2Access()
    .then(() => testAlternativeFormats())
    .then(() => {
      console.log('\n🏁 Tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testB2Access, testAlternativeFormats, generateAlternativeUrls }; 