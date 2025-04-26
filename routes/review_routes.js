/**
 * @swagger
 * /cv-review/upload:
 *   post:
 *     summary: Upload CV untuk review AI
 *     tags: [CV]
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
 *         description: CV berhasil dikirim untuk review
 */