/**
 * @swagger
 * /payment:
 *   post:
 *     summary: Proses pembayaran course atau roadmap
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               targetId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Pembayaran berhasil
 */