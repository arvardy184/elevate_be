/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Mendapatkan daftar semua courses
 *     tags: [Course]
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan list courses
 */

/**
 * @swagger
 * /courses/{id}:
 *   get:
 *     summary: Mendapatkan detail course
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID course
 *     responses:
 *       200:
 *         description: Detail course berhasil diambil
 */

/**
 * @swagger
 * /courses/{id}/enroll:
 *   post:
 *     summary: Enroll ke course tertentu
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Enroll berhasil
 */