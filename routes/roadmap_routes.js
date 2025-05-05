const RoadmapController = require('../controllers/roadmap_controller');
const { verifyToken } = require('../middleware/auth_middleware');
/**
 * @swagger
 * /roadmap/{id}:
 *   get:
 *     summary: Ambil detail roadmap beserta courses-nya
 *     tags: [Roadmap]
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

const { verify } = require("jsonwebtoken");
const router = require('./auth_routes');

/**
 * @swagger
 * /roadmap/unlock:
 *   post:
 *     summary: Unlock roadmap setelah pembayaran
 *     tags: [Roadmap]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roadmapId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Roadmap berhasil di-unlock
 */
router.use(verifyToken);

//daftar semua roadmap
router.get('/', RoadmapController.getRoadmaps);

//daftar roadmap yang sudah dibuka user
router.get('me',RoadmapController.getUserRoadmaps);

//detail satu roadmap dengna urutan course
router.get('/:id', RoadmapController.getRoadmapById);

//unlock roadmap
router.post('/unlock/:id', RoadmapController.unlockRoadmap);

module.exports = router;