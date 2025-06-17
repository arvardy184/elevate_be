// Load environment variables
require('dotenv').config();

const b2StorageService = require('./services/b2_storage_service');

async function fixBucketPrivacy() {
  console.log('🔧 Fixing B2 bucket privacy settings...');
  
  try {
    // Initialize B2
    await b2StorageService.initialize();
    console.log('✅ B2 initialized successfully');
    
    // Get current bucket info
    const buckets = await b2StorageService.b2.listBuckets();
    const ourBucket = buckets.data.buckets.find(b => b.bucketId === b2StorageService.bucketId);
    
    if (!ourBucket) {
      console.error('❌ Bucket not found!');
      return;
    }
    
    console.log('\n📋 Current bucket info:', {
      bucketName: ourBucket.bucketName,
      bucketType: ourBucket.bucketType,
      bucketId: ourBucket.bucketId
    });
    
    if (ourBucket.bucketType === 'allPublic') {
      console.log('✅ Bucket is already public!');
      return;
    }
    
    // Update bucket to public
    console.log('\n🔄 Updating bucket to allPublic...');
    
    const updateResult = await b2StorageService.b2.updateBucket({
      bucketId: b2StorageService.bucketId,
      bucketType: 'allPublic',
      bucketInfo: ourBucket.bucketInfo || {},
      corsRules: ourBucket.corsRules || [],
      defaultServerSideEncryption: ourBucket.defaultServerSideEncryption || null,
      lifecycleRules: ourBucket.lifecycleRules || [],
      replicationConfiguration: ourBucket.replicationConfiguration || null
    });
    
    console.log('✅ Bucket updated successfully!');
    console.log('New bucket info:', {
      bucketName: updateResult.data.bucketName,
      bucketType: updateResult.data.bucketType,
      bucketId: updateResult.data.bucketId
    });
    
    // Test URL access setelah update
    console.log('\n🧪 Testing URL access after update...');
    
    const testFileName = 'courses/thumbnails/course-1750070674711/1750070675693-GswT2vmaMAAaq1y.jpeg';
    const axios = require('axios');
    
    // Test berbagai format URL
    const testUrls = [
      `https://f${b2StorageService.bucketId.slice(2, 12)}.backblazeb2.com/file/${b2StorageService.bucketName}/${testFileName}`,
      `https://${b2StorageService.bucketName}.s3.us-west-000.backblazeb2.com/${testFileName}`,
      `https://s3.us-west-000.backblazeb2.com/${b2StorageService.bucketName}/${testFileName}`
    ];
    
    for (const [index, url] of testUrls.entries()) {
      console.log(`\n🔗 Testing URL ${index + 1}: ${url}`);
      
      try {
        const response = await axios.head(url, { 
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500;
          }
        });
        
        console.log(`✅ Status: ${response.status}`);
        if (response.status === 200) {
          console.log('🎉 SUCCESS! URL is now accessible');
        }
        
      } catch (error) {
        if (error.response) {
          console.log(`❌ Status: ${error.response.status} ${error.response.statusText}`);
        } else {
          console.log(`❌ Error: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing bucket privacy:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Alternative: Generate authorized download URLs
async function generateAuthorizedUrls() {
  console.log('\n🔐 Generating authorized download URLs...');
  
  try {
    await b2StorageService.initialize();
    
    const fileId = '4_zbf970e745233a0ff9d610510_f107cc051dbc19259_d20250616_m104437_c005_v0501034_t0007_u01750070677947';
    const fileName = 'courses/thumbnails/course-1750070674711/1750070675693-GswT2vmaMAAaq1y.jpeg';
    
    // Get download authorization
    const downloadAuth = await b2StorageService.b2.getDownloadAuthorization({
      bucketId: b2StorageService.bucketId,
      fileNamePrefix: 'courses/',
      validDurationInSeconds: 86400 // 24 hours
    });
    
    console.log('✅ Download authorization obtained');
    
    // Generate authorized URL
    const authorizedUrl = `${b2StorageService.downloadUrl}/file/${b2StorageService.bucketName}/${fileName}?Authorization=${downloadAuth.data.authorizationToken}`;
    
    console.log('\n🔗 Authorized download URL:');
    console.log(authorizedUrl);
    
    // Test authorized URL
    const axios = require('axios');
    const response = await axios.head(authorizedUrl, { timeout: 10000 });
    
    console.log(`✅ Authorized URL test - Status: ${response.status}`);
    
    return {
      authorizedUrl,
      authToken: downloadAuth.data.authorizationToken,
      expiresAt: new Date(Date.now() + 86400000) // 24 hours from now
    };
    
  } catch (error) {
    console.error('❌ Error generating authorized URLs:', error.message);
    return null;
  }
}

// Run the fix
if (require.main === module) {
  fixBucketPrivacy()
    .then(() => {
      console.log('\n🏁 Bucket privacy fix completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixBucketPrivacy, generateAuthorizedUrls }; 