const multer = require('multer');
const path = require('path');
const { uploadFile, FileCategory } = require('./storage');
const { v4: uuidv4 } = require('uuid');

// Konfigurasi untuk validasi file
const FILE_LIMITS = {
  'profile-pictures': {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
  },
  'course-videos': {
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/webm']
  },
  'certificates': {
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
  console.log('[fileFilter] Category received:', category);
  
  const limits = FILE_LIMITS[category];
  console.log('[fileFilter] Limits found:', limits);

  if (!limits) {
    console.error('[fileFilter] Invalid category:', category);
    return cb(new Error(`Invalid file category: ${category}`));
  }

  if (!limits.allowedTypes.includes(file.mimetype)) {
    return cb(new Error(`File type not allowed. Allowed types: ${limits.allowedTypes.join(', ')}`));
  }

  cb(null, true);
};

/**
 * Middleware untuk handle file upload dengan validasi
 * @param {string} category - Kategori file (profile-pictures, course-videos, certificates)
 * @param {string} fieldName - Nama field untuk file (default: berdasarkan kategori)
 * @returns {Function} - Multer middleware
 */
const uploadMiddleware = (category, fieldName = null) => {
  return (req, res, next) => {
    console.log('[uploadMiddleware] Mulai upload file...');
    
    // Handle req.body yang mungkin undefined saat ini
    const bodyFields = req.body ? Object.keys(req.body) : [];
    console.log('Body fields:', bodyFields);
    console.log('Files:', req.files || 'No files yet');
    console.log('File:', req.file || 'No file yet');
    
    // Set category untuk validasi
    req.fileCategory = category;
    
    // Tentukan field name berdasarkan kategori jika tidak disediakan
    let finalFieldName = fieldName;
    if (!finalFieldName) {
      switch(category) {
        case FileCategory.PROFILE_PICTURE:
          finalFieldName = 'profilePicture';
          break;
        case FileCategory.COURSE_VIDEO:
          finalFieldName = 'video';
          break;
        case FileCategory.CERTIFICATE:
          finalFieldName = 'certificate';
          break;
        default:
          finalFieldName = 'file';
      }
    }
    
    console.log(`[uploadMiddleware] Expecting field: ${finalFieldName}`);
    console.log(`[uploadMiddleware] Category: ${category}`);
    
    // Get limits untuk kategori ini
    const categoryLimits = FILE_LIMITS[category];
    if (!categoryLimits) {
      return res.status(400).json({ 
        message: `Invalid file category: ${category}` 
      });
    }
    
    // Buat multer instance baru dengan limits yang sesuai untuk kategori ini
    const categoryUpload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: categoryLimits.maxSize
      }
    });
    
    console.log(`[uploadMiddleware] Max file size: ${categoryLimits.maxSize / (1024 * 1024)}MB`);
    
    // Use multer instance yang baru dibuat dengan limits yang tepat
    categoryUpload.single(finalFieldName)(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        console.error('[uploadMiddleware] Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: `File terlalu besar. Maksimal ${categoryLimits.maxSize / (1024 * 1024)}MB`
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            message: `Field file tidak valid. Gunakan field '${finalFieldName}' untuk upload.`
          });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        console.error('[uploadMiddleware] General error:', err);
        return res.status(400).json({ message: err.message });
      }
      
      console.log('[uploadMiddleware] Upload success, file:', req.file || 'No file uploaded');
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
    console.time('uploadB2');
    // Upload ke B2 storage
    const result = await uploadFile(file.path, category, file.originalname);
    console.timeEnd('uploadB2');
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