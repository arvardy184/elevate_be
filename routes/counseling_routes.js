const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth_middleware');
const {
  getAllCounselors,
  getCounselorById,
  createCounselingSession,
  getMySessions,
  getSessionById,
  rateSession
} = require('../controllers/counseling_controller');

/**
 * @swagger
 * /counselors:
 *   get:
 *     summary: Mendapatkan list konselor
 *     tags: [Counseling]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Halaman
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Jumlah data per halaman
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *         description: Filter berdasarkan spesialisasi
 *     responses:
 *       200:
 *         description: List konselor berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Counselor'
 *                 pagination:
 *                   type: object
 */

/**
 * @swagger
 * /counselors/{id}:
 *   get:
 *     summary: Mendapatkan detail konselor
 *     tags: [Counseling]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID konselor
 *     responses:
 *       200:
 *         description: Detail konselor berhasil diambil
 *       404:
 *         description: Konselor tidak ditemukan
 */

/**
 * @swagger
 * /counseling-sessions:
 *   post:
 *     summary: Buat sesi konsultasi baru
 *     tags: [Counseling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - counselorId
 *               - topic
 *               - question
 *             properties:
 *               counselorId:
 *                 type: integer
 *                 description: ID konselor
 *               topic:
 *                 type: string
 *                 description: Topik konsultasi
 *               question:
 *                 type: string
 *                 description: Pertanyaan atau masalah yang ingin dikonsultasikan
 *     responses:
 *       201:
 *         description: Sesi berhasil dibuat
 *       400:
 *         description: Data tidak valid atau session aktif sudah ada
 *       404:
 *         description: Konselor tidak ditemukan
 */

/**
 * @swagger
 * /counseling-sessions/me:
 *   get:
 *     summary: Mendapatkan session konsultasi milik user
 *     tags: [Counseling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, COMPLETED, CANCELLED]
 *         description: Filter berdasarkan status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List session berhasil diambil
 */

/**
 * @swagger
 * /counseling-sessions/{id}:
 *   get:
 *     summary: Mendapatkan detail session konsultasi
 *     tags: [Counseling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID session
 *     responses:
 *       200:
 *         description: Detail session berhasil diambil
 *       403:
 *         description: Tidak memiliki akses ke session
 *       404:
 *         description: Session tidak ditemukan
 */

/**
 * @swagger
 * /counseling-sessions/{id}/rating:
 *   put:
 *     summary: Berikan rating dan feedback untuk session
 *     tags: [Counseling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating 1-5
 *               feedback:
 *                 type: string
 *                 description: Feedback atau komentar (opsional)
 *     responses:
 *       200:
 *         description: Rating berhasil diberikan
 *       400:
 *         description: Rating tidak valid atau session sudah dinilai
 *       404:
 *         description: Session tidak ditemukan atau belum selesai
 */

// PUBLIC routes (tidak perlu auth)
router.get('/counselors', getAllCounselors);
router.get('/counselors/:id', getCounselorById);

// PROTECTED routes (perlu auth)
router.post('/counseling-sessions', verifyToken, createCounselingSession);
router.get('/counseling-sessions/me', verifyToken, getMySessions);
router.get('/counseling-sessions/:id', verifyToken, getSessionById);
router.put('/counseling-sessions/:id/rating', verifyToken, rateSession);

module.exports = router;