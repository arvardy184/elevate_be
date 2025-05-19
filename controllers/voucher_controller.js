const prisma = require('../prisma/client');

/**
 * @swagger
 * components:
 *   schemas:
 *     VoucherApplyRequest:
 *       type: object
 *       required:
 *         - code
 *       properties:
 *         code:
 *           type: string
 *           description: Kode voucher yang akan digunakan
 *         courseId:
 *           type: integer
 *           description: ID course yang akan dibeli (opsional jika roadmapId ada)
 *         roadmapId:
 *           type: integer
 *           description: ID roadmap yang akan dibeli (opsional jika courseId ada)
 *     VoucherApplyResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Voucher berhasil diterapkan
 *         originalPrice:
 *           type: number
 *           description: Harga sebelum diskon
 *         discountedPrice:
 *           type: number
 *           description: Harga setelah diskon
 *         discount:
 *           type: number
 *           description: Persentase diskon
 *         voucherId:
 *           type: string
 *           description: ID voucher yang digunakan
 *     Voucher:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID unik voucher
 *         code:
 *           type: string
 *           description: Kode voucher
 *         userId:
 *           type: string
 *           description: ID user pemilik voucher
 *         discount:
 *           type: number
 *           description: Persentase diskon
 *         isUsed:
 *           type: boolean
 *           description: Status penggunaan voucher
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Tanggal kadaluarsa voucher
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// POST /vouchers/apply
/**
 * @swagger
 * /api/vouchers/apply:
 *   post:
 *     summary: Terapkan voucher untuk pembelian course atau roadmap
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VoucherApplyRequest'
 *     responses:
 *       200:
 *         description: Voucher berhasil diterapkan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoucherApplyResponse'
 *       400:
 *         description: Bad request - Kode voucher tidak valid atau sudah digunakan
 *       404:
 *         description: Course atau roadmap tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.applyVoucher = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code, courseId, roadmapId } = req.body;

    // Validate input
    if (!code) {
      return res.status(400).json({
        message: "Kode voucher harus diisi"
      });
    }

    // Check if item exists
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: Number(courseId) }
      });
      if (!course) {
        return res.status(404).json({
          message: "Course tidak ditemukan"
        });
      }
    } else if (roadmapId) {
      const roadmap = await prisma.roadmap.findUnique({
        where: { id: Number(roadmapId) }
      });
      if (!roadmap) {
        return res.status(404).json({
          message: "Roadmap tidak ditemukan"
        });
      }
    }

    // Find valid voucher
    const voucher = await prisma.voucher.findFirst({
      where: {
        code,
        userId,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!voucher) {
      return res.status(400).json({
        message: "Voucher tidak valid atau sudah digunakan"
      });
    }

    // Calculate discounted price
    let originalPrice;
    if (courseId) {
      originalPrice = course.price;
    } else {
      originalPrice = roadmap.price;
    }

    const discountedPrice = originalPrice - (originalPrice * (voucher.discount / 100));

    return res.status(200).json({
      message: "Voucher berhasil diterapkan",
      originalPrice,
      discountedPrice,
      discount: voucher.discount,
      voucherId: voucher.id
    });

  } catch (error) {
    console.error('Error applying voucher:', error);
    return res.status(500).json({
      message: "Terjadi kesalahan server"
    });
  }
};

// GET /vouchers/me
/**
 * @swagger
 * /api/vouchers/me:
 *   get:
 *     summary: Ambil daftar voucher yang dimiliki user
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Halaman yang ingin diakses
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Jumlah item per halaman
 *     responses:
 *       200:
 *         description: Daftar voucher berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vouchers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Voucher'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Server error
 */
exports.getMyVouchers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where: {
          userId,
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        skip,
        take: Number(limit),
        orderBy: { expiresAt: 'asc' }
      }),
      prisma.voucher.count({
        where: {
          userId,
          isUsed: false,
          expiresAt: { gt: new Date() }
        }
      })
    ]);

    return res.status(200).json({
      vouchers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error getting vouchers:', error);
    return res.status(500).json({
      message: "Terjadi kesalahan server"
    });
  }
};