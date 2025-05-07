
const express = require('express');
const router = express.Router();
const AssessmentController = require('../controllers/assesment_controller');
const {verifyToken, checkRole} = require('../middleware/auth_middleware');
router.post('/', verifyToken, AssessmentController.createAssessment);

router.get('/', verifyToken, AssessmentController.checkAssesment);

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