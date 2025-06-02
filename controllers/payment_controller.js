const prisma = require('../prisma/client');
const {
  createTransaction,
  handlePaymentNotification: handleNotification,
} = require("../services/payment_service");

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentRequest:
 *       type: object
 *       properties:
 *         courseId:
 *           type: integer
 *           description: ID course yang akan dibeli (opsional jika roadmapId ada)
 *         roadmapId:
 *           type: integer
 *           description: ID roadmap yang akan dibeli (opsional jika courseId ada)
 *         voucherCode:
 *           type: string
 *           description: Kode voucher untuk diskon (opsional)
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID unik pembayaran
 *         userId:
 *           type: string
 *           description: ID user yang melakukan pembayaran
 *         courseId:
 *           type: integer
 *           description: ID course yang dibeli (null jika membeli roadmap)
 *         roadmapId:
 *           type: integer
 *           description: ID roadmap yang dibeli (null jika membeli course)
 *         amount:
 *           type: number
 *           description: Jumlah pembayaran
 *         status:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED]
 *           description: Status pembayaran
 *         paymentStatus:
 *           type: string
 *           enum: [PENDING, PAID, EXPIRED, FAILED]
 *           description: Status pembayaran dari payment gateway
 *         orderId:
 *           type: string
 *           description: ID order dari payment gateway
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         course:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             title:
 *               type: string
 *             thumbnail:
 *               type: string
 *         roadmap:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             description:
 *               type: string
 *     PaymentResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         snapToken:
 *           type: string
 *           description: Token untuk redirect ke halaman pembayaran Midtrans
 *         redirectUrl:
 *           type: string
 *           description: URL untuk redirect ke halaman pembayaran
 */

//POST /payment/charge
/**
 * @swagger
 * /api/payments/charge:
 *   post:
 *     summary: Inisiasi pembayaran untuk course atau roadmap
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRequest'
 *     responses:
 *       200:
 *         description: Pembayaran berhasil diinisiasi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Bad request - Input tidak valid atau voucher tidak valid
 *       404:
 *         description: Course atau roadmap tidak ditemukan
 *       500:
 *         description: Server error
 */
exports.chargePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId, roadmapId, voucherCode } = req.body;

    // Validate input
    if (!courseId && !roadmapId) {
      return res.status(400).json({ 
        status: 'error',
        message: "Either courseId or roadmapId must be provided" 
      });
    }

    // Get item details
    let item, originalAmount;
    if (courseId) {
      item = await prisma.course.findUnique({ 
        where: { id: Number(courseId) },
        select: { id: true, title: true, price: true, isPaid: true }
      });
      originalAmount = item?.price || 0;
    } else {
      item = await prisma.roadmap.findUnique({ 
        where: { id: Number(roadmapId) },
        select: { id: true, name: true, price: true }
      });
      originalAmount = item?.price || 0;
    }

    if (!item) {
      return res.status(404).json({ 
        status: 'error',
        message: "Item tidak ditemukan" 
      });
    }

    // Check if course is free
    if (courseId && !item.isPaid) {
      return res.status(400).json({
        status: 'error',
        message: "Course ini gratis, tidak perlu pembayaran"
      });
    }

    let finalAmount = originalAmount;
    let appliedVoucher = null;

    // Apply voucher if exists (tapi jangan mark as used dulu)
    if (voucherCode) {
      const voucher = await prisma.voucher.findFirst({
        where: {
          code: voucherCode,
          userId,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!voucher) {
        return res.status(400).json({
          status: 'error',
          message: "Voucher tidak valid atau sudah digunakan"
        });
      }

      finalAmount = originalAmount - (originalAmount * voucher.discount) / 100;
      appliedVoucher = voucher;
    }

    // Get user details
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, phone: true }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: "User tidak ditemukan"
      });
    }

    // Create transaction via Midtrans
    const transaction = await createTransaction({
      userId,
      courseId: courseId ? Number(courseId) : null,
      roadmapId: roadmapId ? Number(roadmapId) : null,
      amount: finalAmount,
      itemDetails: [
        {
          id: item.id,
          price: finalAmount,
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

    // Mark voucher as used AFTER successful payment creation
    if (appliedVoucher) {
      await prisma.voucher.update({
        where: { id: appliedVoucher.id },
        data: { isUsed: true },
      });
    }

    return res.status(200).json({
      status: 'success',
      message: "Payment berhasil diinisiasi",
      data: {
        paymentId: transaction.paymentId,
        orderId: transaction.orderId,
        snapToken: transaction.snapToken,
        redirectUrl: transaction.redirectUrl,
        amount: finalAmount,
        originalAmount: originalAmount,
        discount: appliedVoucher ? appliedVoucher.discount : 0
      }
    });
  } catch (error) {
    console.error("Error charging payment:", error);
    return res.status(500).json({
      status: 'error',
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};

// POST /payments/notification
/**
 * @swagger
 * /api/payments/notification:
 *   post:
 *     summary: Handle notifikasi pembayaran dari Midtrans
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Notifikasi dari Midtrans
 *     responses:
 *       200:
 *         description: Notifikasi berhasil diproses
 *       500:
 *         description: Server error
 *     x-codeSamples:
 *       - lang: JSON
 *         source: |
 *           {
 *             "transaction_time": "2024-01-01 12:00:00",
 *             "transaction_status": "capture",
 *             "transaction_id": "123456",
 *             "status_message": "Success",
 *             "status_code": "200",
 *             "signature_key": "abc123",
 *             "payment_type": "bank_transfer",
 *             "order_id": "ORDER-123",
 *             "merchant_id": "M123",
 *             "gross_amount": "100000.00",
 *             "fraud_status": "accept",
 *             "currency": "IDR"
 *           }
 */
exports.handlePaymentNotification = async (req, res) => {
  try {
    const notification = req.body;
    console.log('Received payment notification:', notification);
    
    const result = await handleNotification(notification);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error handling notification:', error);
    return res.status(500).json({
      status: 'error',
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};

// GET /payments/me - Mendapatkan riwayat pembayaran user
/**
 * @swagger
 * /api/payments/me:
 *   get:
 *     summary: Ambil riwayat pembayaran user
 *     tags: [Payments]
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
 *         description: Riwayat pembayaran berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       500:
 *         description: Server error
 */
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