const express = require('express');
const router = express.Router();
const { CVReviewController, upload } = require('../controllers/cv_review_controller');
const { verifyToken } = require('../middleware/auth_middleware');

// Middleware untuk ensure upload folder exists
const ensureUploadDir = (req, res, next) => {
  const fs = require('fs');
  const path = require('path');
  
  const uploadDir = path.join(__dirname, '../uploads/cv');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  next();
};

// Error handling untuk multer
const handleMulterError = (err, req, res, next) => {
  console.log('Multer error:', err);
  
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'UNEXPECTED_FIELD') {
      return res.status(400).json({
        status: 'error',
        message: `Field tidak dikenal: "${err.field}". Gunakan field "cv" untuk file dan "careerField" untuk text.`,
        expectedFields: ['cv', 'careerField']
      });
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File terlalu besar. Maksimal 5MB.'
      });
    }
    
    return res.status(400).json({
      status: 'error',
      message: `Upload error: ${err.message}`
    });
  }
  
  // Custom file filter error
  if (err.message.includes('Format file tidak didukung')) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  
  next(err);
};

// Test B2 connection
router.get('/test-b2', async (req, res) => {
  try {
    const b2StorageService = require('../services/b2_storage_service');
    const result = await b2StorageService.initialize();
    
    res.json({
      status: 'success',
      message: result ? 'B2 connection successful' : 'B2 connection failed',
      b2Ready: result,
      config: {
        hasKeyId: !!process.env.B2_APPLICATION_KEY_ID,
        hasKey: !!process.env.B2_APPLICATION_KEY,
        hasBucketId: !!process.env.B2_BUCKET_ID,
        hasBucketName: !!process.env.B2_BUCKET_NAME
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'B2 test failed',
      error: error.message
    });
  }
});

// CV Review Routes
router.post('/upload', 
  verifyToken, 
  ensureUploadDir, 
  upload.single('cv'), 
  handleMulterError,
  CVReviewController.uploadAndAnalyzeCV
);

router.get('/my-reviews', verifyToken, CVReviewController.getMyCVReviews);
router.get('/:id', verifyToken, CVReviewController.getCVReviewById);
router.delete('/:id', verifyToken, CVReviewController.deleteCVReview);

module.exports = router; 