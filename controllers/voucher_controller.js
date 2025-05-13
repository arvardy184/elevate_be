const prisma = require('../prisma/client');

// POST /vouchers/apply
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