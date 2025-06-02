const { generateSignedUrl } = require('./storage');

// Script untuk debug panjang URL yang di-generate
async function debugUrlLength() {
  try {
    // Test dengan sample filename
    const sampleFileName = 'profiles/user_123_20241201_abcd1234-efgh5678-ijkl9012.jpg';
    
    // Generate signed URL
    const signedUrl = await generateSignedUrl(sampleFileName, 24 * 3600);
    
    console.log('=== URL LENGTH DEBUG ===');
    console.log(`Sample filename: ${sampleFileName}`);
    console.log(`Filename length: ${sampleFileName.length}`);
    console.log(`\nSigned URL: ${signedUrl}`);
    console.log(`Signed URL length: ${signedUrl.length}`);
    console.log(`\nMax allowed (VARCHAR 512): 512`);
    console.log(`Status: ${signedUrl.length <= 512 ? '✅ OK' : '❌ TOO LONG'}`);
    
    if (signedUrl.length > 512) {
      console.log(`\nOverflow: ${signedUrl.length - 512} characters`);
      console.log('Suggested fallback: Use relative path instead');
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Jalankan debug kalau script dipanggil langsung
if (require.main === module) {
  debugUrlLength();
}

module.exports = { debugUrlLength }; 