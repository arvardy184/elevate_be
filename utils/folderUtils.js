const fs = require('fs');
const path = require('path');

// Ensure folder exists, kalau gak ada bikin
function ensureFolderExists(folderPath) {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`[ensureFolderExists] Created folder: ${folderPath}`);
    }
  } catch (error) {
    console.error(`[ensureFolderExists] Error creating folder ${folderPath}:`, error);
    throw error;
  }
}

// Ensure semua upload folders exist
function ensureUploadFolders() {
  const uploadDirs = [
    'uploads',
    'uploads/temp',
    'uploads/profiles',
    'uploads/cv',
    'uploads/certificates',
    'uploads/videos'
  ];

  uploadDirs.forEach(dir => {
    ensureFolderExists(dir);
  });
}

module.exports = {
  ensureFolderExists,
  ensureUploadFolders
}; 