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