const prisma = require("../prisma/client");
const {
  createTransaction,
  handlePaymentNotification,
} = require("../services/payment_service");

//POST /payment/charge
exports.chargePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, roadmapId, voucherCode } = req.body;

    //validate input
    if (!courseId && !roadmapId) {
      return res
        .status(400)
        .json({ error: "Either courseId or roadmapId must be provided" });
    }

    //get item details;
    let item, amount;
    if (courseId) {
      item = await prisma.course.findUnique({
        where: {
          id: courseId,
        },
      });
      amount = item.price;
    } else {
      item = await prisma.roadmap.findUnique({
        where: {
          id: roadmapId,
        },
      });
      amount = item.price || 0;
    }

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    //apply voucher if exists
    if (voucherCode) {
      const voucher = await prisma.voucher.findUnique({
        where: {
          code: voucherCode,
          userId,
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (voucher) {
        amount = amount - (amount * voucher.discount) / 100;

        //update voucher usage
        await prisma.voucher.update({
          where: {
            id: voucher.id,
          },
          data: {
            isUsed: true,
          },
        });
      }

      if (!voucher) {
        return res
          .status(400)
          .json({ error: "Invalid or expired voucher code" });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          userId,
          courseId: courseId ? Number(courseId) : null,
          roadmapId: roadmapId ? Number(roadmapId) : null,
          amount,
          status: "PENDING",
          paymentStatus: "PENDING",
        },
      });

      const transaction = await createTransaction({
        userId,
        amount,
        itemDetails: [
          {
            id: item.id,
            price: amount,
            quantity: 1,
            name: item.title || item.name,
          },
        ],
        customerDetails: {
          first_name: user.firstName,
          last_name: user.lastName,
          email: user.email,
          phone: user.phone,
        },
      });

      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          orderId: transaction.orderId,
        },
      });

      return res.status(200).json({
        message: "Payment initiated",
        snapToken: transaction.token,
        redirectUrl: transaction.redirectUrl,
      });
    }
  } catch (error) {
    console.error("Error charging payment:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan server",
    });
  }
};

// GET /payments/notification
exports.handlePaymentNotification = async (req, res) => {
  try {
    const notification = req.body;
    
    const result = await handleNotification(notification);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error handling notification:', error);
    return res.status(500).json({
      message: "Terjadi kesalahan server"
    });
  }
};

// GET /payments/me - Mendapatkan riwayat pembayaran user
exports.getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true
            }
          },
          roadmap: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      }),
      prisma.payment.count({ where: { userId } })
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        payments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting payments:', error);
    return res.status(500).json({
      status: 'error',
      message: "Terjadi kesalahan server"
    });
  }
};