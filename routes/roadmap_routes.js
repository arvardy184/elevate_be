const RoadmapController = require('../controllers/roadmap_controller');
const { verifyToken } = require('../middleware/auth_middleware');
const router = require('./auth_routes');

// Applying verifyToken middleware to all routes below
router.use(verifyToken);

// GET /api/roadmaps - daftar semua roadmap
router.get('/', RoadmapController.getRoadmaps);

/**
 * @swagger
 * /roadmap/recommendation:
 *   get:
 *     summary: Dapatkan rekomendasi roadmap berdasarkan hasil assessment user
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar roadmap yang direkomendasikan
 *       404:
 *         description: Assessment tidak ditemukan
 */
// GET /api/roadmaps/recommendation
router.get('/recommendation', RoadmapController.recommendRoadmaps);

/**
 * @swagger
 * /roadmap/me:
 *   get:
 *     summary: Dapatkan daftar roadmap milik user beserta progress
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar roadmap user beserta progress
 */
// GET /api/roadmaps/me - daftar roadmap yang sudah dibuka user beserta progress
router.get('/me', RoadmapController.getUserRoadmaps);

/**
 * @swagger
 * /roadmap/unlock/{id}:
 *   post:
 *     summary: Unlock roadmap secara manual
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Roadmap berhasil di-unlock
 */
// POST /api/roadmaps/unlock/:id - unlock roadmap secara manual
router.post('/unlock/:id', RoadmapController.unlockRoadmap);

/**
 * @swagger
 * /roadmap/{id}:
 *   get:
 *     summary: Ambil detail roadmap beserta courses-nya
 *     tags: [Roadmap]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detail roadmap berhasil diambil
 */
// GET /api/roadmaps/:id - detail satu roadmap dengan urutan course
router.get('/:id', RoadmapController.getRoadmapById);

module.exports = router;