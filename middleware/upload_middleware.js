const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Buat folder uploads jika belum ada
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Buat folder untuk tiap kategori
const profileUploadsDir = path.join(uploadDir, 'profiles');
const videoUploadsDir = path.join(uploadDir, 'videos');
const certUploadsDir = path.join(uploadDir, 'certificates');

[profileUploadsDir, videoUploadsDir, certUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Konfigurasi storage multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = uploadDir;
    
    // Tentukan folder berdasarkan jenis file
    if (req.baseUrl.includes('users') || req.path.includes('profile')) {
      uploadPath = profileUploadsDir;
    } else if (req.baseUrl.includes('courses') && (file.mimetype.startsWith('video/') || req.path.includes('video'))) {
      uploadPath = videoUploadsDir;
    } else if (req.baseUrl.includes('certificates')) {
      uploadPath = certUploadsDir;
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'temp-' + uniqueSuffix + fileExt);
  }
});

// Filter file
const fileFilter = (req, file, cb) => {
  // Cek apakah video
  if (req.baseUrl.includes('courses') && (file.mimetype.startsWith('video/'))) {
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/webm') {
      return cb(null, true);
    }
    return cb(new Error('Hanya file video dengan format MP4 atau WEBM yang diizinkan'), false);
  }
  
  // Cek apakah gambar
  if (file.mimetype.startsWith('image/')) {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
      return cb(null, true);
    }
    return cb(new Error('Hanya file gambar dengan format JPEG, JPG, atau PNG yang diizinkan'), false);
  }
  
  // Cek apakah PDF (untuk sertifikat)
  if (req.baseUrl.includes('certificates') && file.mimetype === 'application/pdf') {
    return cb(null, true);
  }
  
  // Jika tipe file tidak sesuai
  cb(new Error('Tipe file tidak didukung'), false);
};

// Buat middleware upload dengan ukuran max tertentu
const uploadLimits = {
  profilePicture: { fileSize: 2 * 1024 * 1024 }, // 2MB
  courseVideo: { fileSize: 500 * 1024 * 1024 }, // 500MB
  certificate: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

// Middleware upload untuk profile picture
const uploadProfilePicture = multer({
  storage,
  limits: uploadLimits.profilePicture,
  fileFilter
}).single('profilePicture');

// Middleware upload untuk course video
const uploadCourseVideo = multer({
  storage,
  limits: uploadLimits.courseVideo,
  fileFilter
}).single('video');

// Middleware upload untuk certificate
const uploadCertificate = multer({
  storage,
  limits: uploadLimits.certificate,
  fileFilter
}).single('certificate');

// Middleware untuk handle error upload
const handleUploadError = (uploadFunction) => {
  return (req, res, next) => {
    uploadFunction(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            message: 'Ukuran file terlalu besar'
          });
        }
        return res.status(400).json({ message: `Error upload: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      
      // Lanjut ke middleware berikutnya jika tidak ada error
      next();
    });
  };
};

module.exports = {
  handleUploadError,
  uploadProfilePicture,
  uploadCourseVideo,
  uploadCertificate
}; 