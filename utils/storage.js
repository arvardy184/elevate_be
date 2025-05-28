const B2 = require("backblaze-b2");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

// Load dari environment variable
const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

console.log("B2_APPLICATION_KEY_ID:", process.env.B2_APPLICATION_KEY_ID);
console.log("B2_APPLICATION_KEY:", process.env.B2_APPLICATION_KEY);
console.log("B2_BUCKET_ID:", process.env.B2_BUCKET_ID);
console.log("B2_BUCKET_NAME:", process.env.B2_BUCKET_NAME);
// Initialize B2 SDK
const b2 = new B2({
  applicationKeyId: B2_APPLICATION_KEY_ID,
  applicationKey: B2_APPLICATION_KEY,
});

// Simpan authorization token dan download URL
let b2Auth = null;

// Object untuk menyimpan kategori-kategori file dan path-nya
const FileCategory = {
  PROFILE_PICTURE: "profile-pictures",
  COURSE_VIDEO: "course-videos",
  CERTIFICATE: "certificates",
};

/**
 * Menginisialisasi dan mengautentikasi Backblaze B2
 */
async function initializeB2() {
  try {
    if (!b2Auth) {
      b2Auth = await b2.authorize();
      console.log('b2Auth after authorize:', b2Auth);

      // Ambil dari b2Auth.data
      const apiUrl = b2Auth.data && b2Auth.data.apiUrl;
      const downloadUrl = b2Auth.data && b2Auth.data.downloadUrl;

      if (!apiUrl || !downloadUrl) throw new Error('apiUrl or downloadUrl not found in b2Auth.data');

      // Simpan ke b2Auth supaya bisa dipakai di tempat lain
      b2Auth.apiUrl = apiUrl;
      b2Auth.downloadUrl = downloadUrl;

      console.log("B2 storage initialized successfully");
      console.log("apiUrl:", apiUrl);
      console.log("downloadUrl:", downloadUrl);
    }
    return b2Auth;
  } catch (error) {
    console.error("Error initializing B2:", error);
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
    console.log("uniqueFileName:", uniqueFileName);

    // 1. Get upload URL
    const uploadUrlResponse = await b2.getUploadUrl({ bucketId: B2_BUCKET_ID });
    const uploadUrl = uploadUrlResponse.data.uploadUrl;
    const uploadAuthToken = uploadUrlResponse.data.authorizationToken;

    // 2. Upload file
    const uploadResponse = await b2.uploadFile({
      uploadUrl,
      uploadAuthToken,
      fileName: uniqueFileName,
      data: fileData,
      contentType: getContentType(fileExtension),
    });

    // Hapus file lokal setelah diupload
    await unlinkAsync(filePath);

    // Generate public-friendly URL for public access
    // Format: https://f<bucket_id>.backblazeb2.com/file/<bucket_name>/<file_name>
    const friendlyUrl = `https://f${B2_BUCKET_ID.slice(0, 12)}.backblazeb2.com/file/${B2_BUCKET_NAME}/${uniqueFileName}`;
    
    // Return informasi file
    return {
      fileId: uploadResponse.data.fileId,
      fileName: uploadResponse.data.fileName,
      contentLength: uploadResponse.data.contentLength,
      contentType: uploadResponse.data.contentType,
      fileUrl: friendlyUrl, // Use friendly URL for public access
      authorizedUrl: `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}/${uniqueFileName}`, // Backup authorized URL
    };
  } catch (error) {
    console.error("Error uploading file to B2:", error);
    throw error;
  }
}

/**
 * Mendapatkan URL untuk mengakses file dari Backblaze B2
 * @param {string} fileName - Nama file yang sudah disimpan
 * @param {boolean} publicAccess - True untuk public-friendly URL, false untuk authorized URL
 * @returns {string} - URL file
 */
function getFileUrl(fileName, publicAccess = true) {
  if (!b2Auth) {
    throw new Error("B2 not initialized");
  }
  
  if (publicAccess) {
    // Public-friendly URL format
    return `https://f${B2_BUCKET_ID.slice(0, 12)}.backblazeb2.com/file/${B2_BUCKET_NAME}/${fileName}`;
  } else {
    // Authorized URL format
    return `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}`;
  }
}

/**
 * Generate signed URL for private bucket access
 * @param {string} fileName - File name in B2
 * @param {number} expiresInSeconds - URL expiry in seconds (default: 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
async function generateSignedUrl(fileName, expiresInSeconds = 3600) {
  try {
    await initializeB2();

    const response = await b2.getDownloadAuthorization({
      bucketId: B2_BUCKET_ID,
      fileNamePrefix: fileName,
      validDurationInSeconds: expiresInSeconds
    });

    const authToken = response.data.authorizationToken;
    
    // Return signed URL with auth token
    return `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}?Authorization=${authToken}`;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
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
      fileName,
    });

    return response;
  } catch (error) {
    console.error("Error deleting file from B2:", error);
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
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".webm": "video/webm",
  };

  return extensionMap[extension.toLowerCase()] || "application/octet-stream";
}

module.exports = {
  initializeB2,
  uploadFile,
  getFileUrl,
  generateSignedUrl,
  deleteFile,
  FileCategory,
};
