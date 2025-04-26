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