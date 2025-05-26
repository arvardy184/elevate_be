const express = require('express');
const router = express.Router();
const JobMatchingController = require('../controllers/jobmatching_controller');
const { verifyToken } = require('../middleware/auth_middleware');

// GET /api/jobs - get all job listings
router.get('/jobs', JobMatchingController.getJobs);

// GET /api/jobs/:id - get job detail
router.get('/jobs/:id', JobMatchingController.getJobDetail);

// GET /api/job-matching/categories - get job categories
router.get('/categories', JobMatchingController.getJobCategories);

// GET /api/job-matching/history - get job matching history (need auth)
router.get('/history', verifyToken, JobMatchingController.getJobMatchingHistory);

// POST /api/job-matching/match - CV job matching (need auth) - placeholder
router.post('/match', verifyToken, JobMatchingController.matchJobs);

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