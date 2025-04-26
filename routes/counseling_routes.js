/**
 * @swagger
 * /counselors:
 *   get:
 *     summary: Mendapatkan list konselor
 *     tags: [Counseling]
 *     responses:
 *       200:
 *         description: List konselor berhasil diambil
 */

/**
 * @swagger
 * /counseling/session:
 *   post:
 *     summary: Buat sesi konsultasi baru
 *     tags: [Counseling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               counselorId:
 *                 type: integer
 *               topic:
 *                 type: string
 *               question:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesi berhasil dibuat
 */