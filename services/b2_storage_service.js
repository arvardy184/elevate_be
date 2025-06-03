const B2 = require('backblaze-b2');
const fs = require('fs').promises;
const path = require('path');

class B2StorageService {
  constructor() {
    this.b2 = new B2({
      applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
      applicationKey: process.env.B2_APPLICATION_KEY,
    });
    this.bucketId = process.env.B2_BUCKET_ID;
    this.bucketName = process.env.B2_BUCKET_NAME;
    this.downloadUrl = null;
    this.authToken = null;
    this.tokenExpiryTime = null; // Tambah tracking expiry time
  }

  /**
   * Check apakah token masih valid (belum expired)
   */
  isTokenValid() {
    if (!this.authToken || !this.tokenExpiryTime) {
      return false;
    }
    
    // Check apakah token akan expired dalam 5 menit ke depan
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return this.tokenExpiryTime > fiveMinutesFromNow;
  }

  /**
   * Initialize B2 connection
   */
  async initialize() {
    try {
      // Cek apakah token masih valid, kalau tidak maka re-authorize
      if (!this.isTokenValid()) {
        console.log('🔑 B2 Initializing with credentials:', {
          keyId: process.env.B2_APPLICATION_KEY_ID ? 'SET' : 'MISSING',
          key: process.env.B2_APPLICATION_KEY ? 'SET' : 'MISSING', 
          bucketId: process.env.B2_BUCKET_ID ? 'SET' : 'MISSING',
          bucketName: process.env.B2_BUCKET_NAME ? 'SET' : 'MISSING'
        });
        
        const authResponse = await this.b2.authorize();
        this.downloadUrl = authResponse.data.apiUrl.replace('/b2api', '');
        this.authToken = authResponse.data.authorizationToken;
        
        // Set token expiry time (B2 tokens biasanya valid 24 jam, kita set 23 jam buat safety)
        this.tokenExpiryTime = Date.now() + (23 * 60 * 60 * 1000); // 23 hours
        
        console.log('✅ B2 initialized successfully');
        console.log("Token akan expired pada:", new Date(this.tokenExpiryTime));
      } else {
        console.log('🔑 B2 token masih valid, menggunakan token yang ada');
      }
      return true;
    } catch (error) {
      console.error('❌ Error initializing B2:', {
        message: error.message,
        status: error.status,
        code: error.code,
        response: error.response?.data
      });
      
      // Reset token jika ada error biar next request bisa coba lagi
      this.authToken = null;
      this.tokenExpiryTime = null;
      this.downloadUrl = null;
      
      return false;
    }
  }

  /**
   * Upload CV file to B2
   * @param {string} localFilePath - Local file path
   * @param {string} fileName - Original filename
   * @param {string} userId - User ID for folder structure
   * @returns {Object} Upload result with B2 URL and fileId
   */
  async uploadCV(localFilePath, fileName, userId) {
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        // Initialize jika belum
        await this.initialize();

        // Generate unique filename with user folder
        const fileExtension = path.extname(fileName);
        const timestamp = Date.now();
        const uniqueFileName = `cv/${userId}/${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Read file
        const fileBuffer = await fs.readFile(localFilePath);
        
        // Get upload URL
        const uploadUrlResponse = await this.b2.getUploadUrl({
          bucketId: this.bucketId,
        });

        const uploadUrl = uploadUrlResponse.data.uploadUrl;
        const uploadAuthToken = uploadUrlResponse.data.authorizationToken;

        // Upload file
        const uploadResponse = await this.b2.uploadFile({
          uploadUrl: uploadUrl,
          uploadAuthToken: uploadAuthToken,
          filename: uniqueFileName,
          data: fileBuffer,
          mime: this.getMimeType(fileExtension),
          hash: null, // Let B2 calculate hash
          info: {
            userId: userId.toString(),
            originalName: fileName,
            uploadedAt: new Date().toISOString()
          }
        });

        // Construct public-friendly download URL
        // Format: https://f<bucket_id>.backblazeb2.com/file/<bucket_name>/<file_name>
        const b2FileUrl = `https://f${this.bucketId.slice(0, 12)}.backblazeb2.com/file/${this.bucketName}/${uniqueFileName}`;

        return {
          success: true,
          fileId: uploadResponse.data.fileId,
          fileName: uniqueFileName,
          originalName: fileName,
          url: b2FileUrl,
          size: fileBuffer.length,
          uploadedAt: new Date()
        };

      } catch (error) {
        console.error(`❌ Error uploading CV to B2 (attempt ${retryCount + 1}):`, {
          message: error.message,
          status: error.status,
          code: error.code,
          response: error.response?.data,
          stack: error.stack
        });
        
        // Check apakah error adalah 401 (expired token)
        if (error.response && error.response.status === 401) {
          console.log('🔄 Token expired saat upload CV, invalidating cache dan akan retry...');
          // Invalidate token cache biar initialize akan refresh token
          this.authToken = null;
          this.tokenExpiryTime = null;
          this.downloadUrl = null;
          
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔄 Retrying upload CV (attempt ${retryCount + 1})...`);
            continue; // Retry dengan token baru
          }
        }
        
        // Jika bukan 401 atau sudah max retry, return error
        return {
          success: false,
          error: error.message,
          details: {
            status: error.status,
            code: error.code
          }
        };
      }
    }
  }

  /**
   * Delete CV file from B2
   * @param {string} fileId - B2 file ID
   * @param {string} fileName - File name in B2
   */
  async deleteCV(fileId, fileName) {
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        await this.initialize();

        await this.b2.deleteFileVersion({
          fileId: fileId,
          fileName: fileName
        });

        return { success: true };
      } catch (error) {
        console.error(`❌ Error deleting CV from B2 (attempt ${retryCount + 1}):`, error);
        
        // Check apakah error adalah 401 (expired token)
        if (error.response && error.response.status === 401) {
          console.log('🔄 Token expired saat delete CV, invalidating cache dan akan retry...');
          // Invalidate token cache biar initialize akan refresh token
          this.authToken = null;
          this.tokenExpiryTime = null;
          this.downloadUrl = null;
          
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔄 Retrying delete CV (attempt ${retryCount + 1})...`);
            continue; // Retry dengan token baru
          }
        }
        
        // Jika bukan 401 atau sudah max retry, return error
        return { 
          success: false, 
          error: error.message 
        };
      }
    }
  }

  /**
   * Get file info from B2
   * @param {string} fileId - B2 file ID
   */
  async getFileInfo(fileId) {
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        await this.initialize();

        const response = await this.b2.getFileInfo({
          fileId: fileId
        });

        return {
          success: true,
          data: response.data
        };
      } catch (error) {
        console.error(`❌ Error getting file info from B2 (attempt ${retryCount + 1}):`, error);
        
        // Check apakah error adalah 401 (expired token)
        if (error.response && error.response.status === 401) {
          console.log('🔄 Token expired saat get file info, invalidating cache dan akan retry...');
          // Invalidate token cache biar initialize akan refresh token
          this.authToken = null;
          this.tokenExpiryTime = null;
          this.downloadUrl = null;
          
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔄 Retrying get file info (attempt ${retryCount + 1})...`);
            continue; // Retry dengan token baru
          }
        }
        
        // Jika bukan 401 atau sudah max retry, return error
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  /**
   * Get MIME type based on file extension
   * @param {string} extension - File extension
   */
  getMimeType(extension) {
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Generate download URL for file
   * @param {string} fileName - File name in B2
   */
  getDownloadUrl(fileName) {
    return `${this.downloadUrl}/file/${this.bucketName}/${fileName}`;
  }
}

module.exports = new B2StorageService(); 