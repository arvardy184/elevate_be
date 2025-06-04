const express = require('express');
const router = express.Router();
const { JobMatchingController, upload } = require('../controllers/jobmatching_controller');
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
  console.log('Job matching multer error:', err);
  
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'UNEXPECTED_FIELD') {
      return res.status(400).json({
        status: 'error',
        message: `Field tidak dikenal: "${err.field}". Gunakan field "cv" untuk file dan "dreamJob" untuk text.`,
        expectedFields: ['cv', 'dreamJob', 'saveCV']
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

// GET /api/jobs - get all job listings
router.get('/jobs', JobMatchingController.getJobs);

// GET /api/jobs/:id - get job detail
router.get('/jobs/:id', JobMatchingController.getJobDetail);

// GET /api/job-matching/categories - get job categories
router.get('/categories', JobMatchingController.getJobCategories);

// GET /api/job-matching/history - get job matching history (need auth)
router.get('/history', verifyToken, JobMatchingController.getJobMatchingHistory);

// Debug middleware untuk job matching
const debugJobMatching = (req, res, next) => {
  console.log('Job matching route debug:', {
    method: req.method,
    url: req.url,
    contentType: req.headers['content-type'],
    body: req.body,
    bodyExists: !!req.body,
    bodyType: typeof req.body
  });
  next();
};

// POST /api/job-matching/match - CV job matching (need auth)
router.post('/match', debugJobMatching, verifyToken, JobMatchingController.matchJobs);

// POST /api/job-matching/upload-and-match - Upload CV dan langsung job matching (need auth)
router.post('/upload-and-match', 
  verifyToken, 
  ensureUploadDir, 
  upload.single('cv'), 
  handleMulterError,
  JobMatchingController.uploadCVAndMatch
);

module.exports = router;

/**
 * @swagger
 * /job-matching/upload:
 *   post:
 *     summary: Upload CV untuk job matching AI
 *     tags: [Job]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Hasil job matching berhasil dikembalikan
 */