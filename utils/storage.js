const B2 = require('backblaze-b2');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

// Load dari environment variable
const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

// Initialize B2 SDK
const b2 = new B2({
  applicationKeyId: B2_APPLICATION_KEY_ID,
  applicationKey: B2_APPLICATION_KEY
});

// Simpan authorization token dan download URL
let b2Auth = null;

// Object untuk menyimpan kategori-kategori file dan path-nya
const FileCategory = {
  PROFILE_PICTURE: 'profile-pictures',
  COURSE_VIDEO: 'course-videos',
  CERTIFICATE: 'certificates'
};

/**
 * Menginisialisasi dan mengautentikasi Backblaze B2
 */
async function initializeB2() {
  try {
    if (!b2Auth) {
      b2Auth = await b2.authorize();
      console.log('B2 storage initialized successfully');
    }
    return b2Auth;
  } catch (error) {
    console.error('Error initializing B2:', error);
    throw error;
  }
}

/**
 * Mengupload file ke Backblaze B2
 * @param {string} filePath - Path lokal file yang akan diupload
 * @param {string} category - Kategori file (profile-pictures, course-videos, certificates)
 * @param {string} fileName - Nama file yang akan disimpan
 * @returns {Object} - Informasi file yang diupload
 */
async function uploadFile(filePath, category, fileName) {
  try {
    await initializeB2();
    
    // Baca file
    const fileData = await readFileAsync(filePath);
    const fileExtension = path.extname(filePath);
    
    // Buat unique key untuk file
    const timestamp = Date.now();
    const uniqueFileName = `${category}/${timestamp}-${fileName}${fileExtension}`;
    
    // Upload file
    const uploadResponse = await b2.uploadFile({
      bucketId: B2_BUCKET_ID,
      fileName: uniqueFileName,
      data: fileData,
      contentType: getContentType(fileExtension)
    });
    
    // Hapus file lokal setelah diupload
    await unlinkAsync(filePath);
    
    // Return informasi file
    return {
      fileId: uploadResponse.fileId,
      fileName: uploadResponse.fileName,
      contentLength: uploadResponse.contentLength,
      contentType: uploadResponse.contentType,
      fileUrl: `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}/${uniqueFileName}`
    };
  } catch (error) {
    console.error('Error uploading file to B2:', error);
    throw error;
  }
}

/**
 * Mendapatkan URL untuk mengakses file dari Backblaze B2
 * @param {string} fileName - Nama file yang sudah disimpan
 * @returns {string} - URL file
 */
function getFileUrl(fileName) {
  if (!b2Auth) {
    throw new Error('B2 not initialized');
  }
  return `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}`;
}

/**
 * Menghapus file dari Backblaze B2
 * @param {string} fileId - ID file yang akan dihapus
 * @param {string} fileName - Nama file yang akan dihapus
 * @returns {Object} - Informasi file yang dihapus
 */
async function deleteFile(fileId, fileName) {
  try {
    await initializeB2();
    
    // Hapus file
    const response = await b2.deleteFileVersion({
      fileId,
      fileName
    });
    
    return response;
  } catch (error) {
    console.error('Error deleting file from B2:', error);
    throw error;
  }
}

/**
 * Mendapatkan content type berdasarkan ekstensi file
 * @param {string} extension - Ekstensi file
 * @returns {string} - Content type
 */
function getContentType(extension) {
  const extensionMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.pdf': 'application/pdf',
    '.webm': 'video/webm'
  };
  
  return extensionMap[extension.toLowerCase()] || 'application/octet-stream';
}

module.exports = {
  initializeB2,
  uploadFile,
  getFileUrl,
  deleteFile,
  FileCategory
}; 