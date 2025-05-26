const prisma = require('../prisma/client');
/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID unik kategori
 *         name:
 *           type: string
 *           description: Nama kategori
 *         description:
 *           type: string
 *           description: Deskripsi kategori
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// GET /api/categories
/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Ambil semua kategori yang tersedia
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Daftar kategori berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       500:
 *         description: Server error
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    return res.status(200).json({ categories });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};
