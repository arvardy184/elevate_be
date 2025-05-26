const express = require('express');
const router = express.Router();
const AssessmentController = require('../controllers/assessment_controller');
const {verifyToken, checkRole} = require('../middleware/auth_middleware');

// POST /api/assessment - submit assessment baru
router.post('/', verifyToken, AssessmentController.createAssessment);

// GET /api/assessment - cek status assessment user
router.get('/', verifyToken, AssessmentController.checkAssessment);

// GET /api/assessment/history - get assessment history
router.get('/history', verifyToken, AssessmentController.getAssessmentHistory);

// GET /api/assessment/result/:id - get detail assessment result
router.get('/result/:id', verifyToken, AssessmentController.getAssessmentResult);

module.exports = router;
/**
 * @swagger
 * /assessment:
 *   post:
 *     summary: Submit assessment awal user
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentStatus:
 *                 type: string
 *               majorStudy:
 *                 type: string
 *               currentSemester:
 *                 type: string
 *               passionArea:
 *                 type: string
 *               achievementGoal:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assessment tersimpan
 */