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
  }

  /**
   * Initialize B2 connection
   */
  async initialize() {
    try {
      console.log('🔑 B2 Initializing with credentials:', {
        keyId: process.env.B2_APPLICATION_KEY_ID ? 'SET' : 'MISSING',
        key: process.env.B2_APPLICATION_KEY ? 'SET' : 'MISSING', 
        bucketId: process.env.B2_BUCKET_ID ? 'SET' : 'MISSING',
        bucketName: process.env.B2_BUCKET_NAME ? 'SET' : 'MISSING'
      });
      
      const authResponse = await this.b2.authorize();
      this.downloadUrl = authResponse.data.apiUrl.replace('/b2api', '');
      console.log('✅ B2 initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing B2:', {
        message: error.message,
        status: error.status,
        code: error.code,
        response: error.response?.data
      });
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
    try {
      // Initialize jika belum
      if (!this.downloadUrl) {
        await this.initialize();
      }

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
      console.error('❌ Error uploading CV to B2:', {
        message: error.message,
        status: error.status,
        code: error.code,
        response: error.response?.data,
        stack: error.stack
      });
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

  /**
   * Delete CV file from B2
   * @param {string} fileId - B2 file ID
   * @param {string} fileName - File name in B2
   */
  async deleteCV(fileId, fileName) {
    try {
      if (!this.downloadUrl) {
        await this.initialize();
      }

      await this.b2.deleteFileVersion({
        fileId: fileId,
        fileName: fileName
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting CV from B2:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get file info from B2
   * @param {string} fileId - B2 file ID
   */
  async getFileInfo(fileId) {
    try {
      if (!this.downloadUrl) {
        await this.initialize();
      }

      const response = await this.b2.getFileInfo({
        fileId: fileId
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting file info from B2:', error);
      return {
        success: false,
        error: error.message
      };
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