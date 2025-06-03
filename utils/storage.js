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
let tokenExpiryTime = null; // Tambah tracking expiry time

// Object untuk menyimpan kategori-kategori file dan path-nya
const FileCategory = {
  PROFILE_PICTURE: "profile-pictures",
  COURSE_VIDEO: "course-videos",
  CERTIFICATE: "certificates",
};

/**
 * Check apakah token masih valid (belum expired)
 */
function isTokenValid() {
  if (!b2Auth || !tokenExpiryTime) {
    return false;
  }
  
  // Check apakah token akan expired dalam 5 menit ke depan
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
  return tokenExpiryTime > fiveMinutesFromNow;
}

/**
 * Menginisialisasi dan mengautentikasi Backblaze B2
 */
async function initializeB2() {
  try {
    // Cek apakah token masih valid, kalau tidak maka re-authorize
    if (!isTokenValid()) {
      console.log('B2 token expired atau tidak ada, melakukan re-authorization...');
      b2Auth = await b2.authorize();
      console.log('b2Auth after authorize:', b2Auth);

      // Ambil dari b2Auth.data
      const apiUrl = b2Auth.data && b2Auth.data.apiUrl;
      const downloadUrl = b2Auth.data && b2Auth.data.downloadUrl;

      if (!apiUrl || !downloadUrl) throw new Error('apiUrl or downloadUrl not found in b2Auth.data');

      // Simpan ke b2Auth supaya bisa dipakai di tempat lain
      b2Auth.apiUrl = apiUrl;
      b2Auth.downloadUrl = downloadUrl;
      
      // Set token expiry time (B2 tokens biasanya valid 24 jam, kita set 23 jam buat safety)
      tokenExpiryTime = Date.now() + (23 * 60 * 60 * 1000); // 23 hours

      console.log("B2 storage initialized successfully");
      console.log("apiUrl:", apiUrl);
      console.log("downloadUrl:", downloadUrl);
      console.log("Token akan expired pada:", new Date(tokenExpiryTime));
    } else {
      console.log('B2 token masih valid, menggunakan token yang ada');
    }
    return b2Auth;
  } catch (error) {
    console.error("Error initializing B2:", error);
    // Reset token jika ada error biar next request bisa coba lagi
    b2Auth = null;
    tokenExpiryTime = null;
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
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      await initializeB2();

      // Baca file
      const fileData = await readFileAsync(filePath);
      
      // Clean filename - hapus extension dari fileName karena akan kita ambil dari filePath
      const fileExtension = path.extname(filePath);
      const cleanFileName = path.basename(fileName, path.extname(fileName));

      // Buat unique key untuk file
      const timestamp = Date.now();
      const uniqueFileName = `${category}/${timestamp}-${cleanFileName}${fileExtension}`;
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

      // Use direct download URL (better compatibility)
      const directUrl = `${b2Auth.downloadUrl}/file/${B2_BUCKET_NAME}/${uniqueFileName}`;
      
      console.log("Generated URL:", directUrl);
      
      // Return informasi file
      return {
        fileId: uploadResponse.data.fileId,
        fileName: uploadResponse.data.fileName,
        contentLength: uploadResponse.data.contentLength,
        contentType: uploadResponse.data.contentType,
        fileUrl: directUrl, // Use direct download URL
        category: category,
        originalName: fileName
      };
    } catch (error) {
      console.error(`Error uploading file to B2 (attempt ${retryCount + 1}):`, error);
      
      // Check apakah error adalah 401 (expired token)
      if (error.response && error.response.status === 401) {
        console.log('Token expired, invalidating cache dan akan retry...');
        // Invalidate token cache biar initializeB2 akan refresh token
        b2Auth = null;
        tokenExpiryTime = null;
        
        retryCount++;
        if (retryCount <= maxRetries) {
          console.log(`Retrying upload (attempt ${retryCount + 1})...`);
          continue; // Retry dengan token baru
        }
      }
      
      // Jika bukan 401 atau sudah max retry, throw error
      throw error;
    }
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
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
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
      console.error(`Error generating signed URL (attempt ${retryCount + 1}):`, error);
      
      // Check apakah error adalah 401 (expired token)
      if (error.response && error.response.status === 401) {
        console.log('Token expired saat generate signed URL, invalidating cache dan akan retry...');
        // Invalidate token cache biar initializeB2 akan refresh token
        b2Auth = null;
        tokenExpiryTime = null;
        
        retryCount++;
        if (retryCount <= maxRetries) {
          console.log(`Retrying generate signed URL (attempt ${retryCount + 1})...`);
          continue; // Retry dengan token baru
        }
      }
      
      // Jika bukan 401 atau sudah max retry, throw error
      throw error;
    }
  }
}

/**
 * Menghapus file dari Backblaze B2
 * @param {string} fileId - ID file yang akan dihapus
 * @param {string} fileName - Nama file yang akan dihapus
 * @returns {Object} - Informasi file yang dihapus
 */
async function deleteFile(fileId, fileName) {
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      await initializeB2();

      // Hapus file
      const response = await b2.deleteFileVersion({
        fileId,
        fileName,
      });

      return response;
    } catch (error) {
      console.error(`Error deleting file from B2 (attempt ${retryCount + 1}):`, error);
      
      // Check apakah error adalah 401 (expired token)
      if (error.response && error.response.status === 401) {
        console.log('Token expired saat delete file, invalidating cache dan akan retry...');
        // Invalidate token cache biar initializeB2 akan refresh token
        b2Auth = null;
        tokenExpiryTime = null;
        
        retryCount++;
        if (retryCount <= maxRetries) {
          console.log(`Retrying delete file (attempt ${retryCount + 1})...`);
          continue; // Retry dengan token baru
        }
      }
      
      // Jika bukan 401 atau sudah max retry, throw error
      throw error;
    }
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
