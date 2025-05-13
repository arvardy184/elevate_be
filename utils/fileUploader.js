const multer = require('multer');
const path = require('path');
const { uploadFile, FileCategory } = require('./storage');
const { v4: uuidv4 } = require('uuid');

// Konfigurasi untuk validasi file
const FILE_LIMITS = {
  PROFILE_PICTURE: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
  },
  COURSE_VIDEO: {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/webm']
  },
  CERTIFICATE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf']
  }
};

// Konfigurasi multer untuk temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    // Generate unique filename dengan UUID
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

// Validasi file sebelum upload
const fileFilter = (req, file, cb) => {
  const category = req.fileCategory || FileCategory.PROFILE_PICTURE;
  const limits = FILE_LIMITS[category.toUpperCase()];

  if (!limits) {
    return cb(new Error('Invalid file category'));
  }

  if (!limits.allowedTypes.includes(file.mimetype)) {
    return cb(new Error(`File type not allowed. Allowed types: ${limits.allowedTypes.join(', ')}`));
  }

  cb(null, true);
};

// Setup multer dengan konfigurasi
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_LIMITS.PROFILE_PICTURE.maxSize // Default limit
  }
});

/**
 * Middleware untuk handle file upload dengan validasi
 * @param {string} category - Kategori file (profile-pictures, course-videos, certificates)
 * @returns {Function} - Multer middleware
 */
const uploadMiddleware = (category) => {
  return (req, res, next) => {
    // Set category untuk validasi
    req.fileCategory = category;
    
    // Update file size limit berdasarkan kategori
    upload.single('file')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: `File terlalu besar. Maksimal ${FILE_LIMITS[category.toUpperCase()].maxSize / (1024 * 1024)}MB`
          });
        }
        return res.status(400).json({ message: err.message });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

/**
 * Upload file ke storage dan hapus file temporary
 * @param {Object} file - File object dari multer
 * @param {string} category - Kategori file
 * @returns {Promise<Object>} - Informasi file yang diupload
 */
const uploadToStorage = async (file, category) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Upload ke B2 storage
    const result = await uploadFile(file.path, category, file.originalname);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Export fungsi-fungsi yang dibutuhkan
module.exports = {
  uploadMiddleware,
  uploadToStorage,
  FileCategory
};