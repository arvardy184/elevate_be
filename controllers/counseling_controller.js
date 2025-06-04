const { createTransaction } = require('../services/payment_service');
const prisma = require('../prisma/client');

/**
 * @swagger
 * components:
 *   schemas:
 *     Counselor:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         specialization:
 *           type: string
 *         bio:
 *           type: string
 *         verified:
 *           type: boolean
 *         users:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             profileImage:
 *               type: string
 *     CounselingSession:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         counselorId:
 *           type: integer
 *         topic:
 *           type: string
 *         question:
 *           type: string
 *         response:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING, ACTIVE, COMPLETED, CANCELLED]
 *         isPaymentRequired:
 *           type: boolean
 *         price:
 *           type: integer
 *         rating:
 *           type: integer
 *         feedback:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * GET /counselors
 * Mendapatkan list semua counselor yang verified
 */
exports.getAllCounselors = async (req, res) => {
  try {
    const { page = 1, limit = 10, specialization } = req.query;
    const skip = (page - 1) * limit;

    // Build where condition for MySQL compatibility
    const where = {
      verified: true,
      ...(specialization && { 
        specialization: { 
          contains: specialization
          // Note: MySQL is case-insensitive by default for LIKE operations
        } 
      })
    };

    const [counselors, total] = await Promise.all([
      prisma.counselor.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          users: {
            select: { firstName: true, lastName: true, email: true }
          },
          _count: {
            select: {
              counselingsession: {
                where: { status: 'COMPLETED' }
              }
            }
          }
        },
        orderBy: { id: 'desc' }
      }),
      prisma.counselor.count({ where })
    ]);

    // Hitung rating rata-rata untuk setiap counselor
    const counselorsWithRating = await Promise.all(
      counselors.map(async (counselor) => {
        const sessions = await prisma.counselingSession.findMany({
          where: {
            counselorId: counselor.id,
            status: 'COMPLETED',
            rating: { not: null }
          },
          select: { rating: true }
        });

        const averageRating = sessions.length > 0 
          ? sessions.reduce((sum, session) => sum + session.rating, 0) / sessions.length 
          : 0;

        return {
          ...counselor,
          averageRating: Math.round(averageRating * 10) / 10,
          totalSessions: counselor._count.counselingsession
        };
      })
    );

    res.status(200).json({
      success: true,
      data: counselorsWithRating,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting counselors:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data counselor',
      error: error.message
    });
  }
};

/**
 * GET /counselors/:id
 * Mendapatkan detail counselor berdasarkan ID
 */
exports.getCounselorById = async (req, res) => {
  try {
    const { id } = req.params;

    const counselor = await prisma.counselor.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: { firstName: true, lastName: true, email: true }
        },
        _count: {
          select: {
            counselingsession: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      }
    });

    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: 'Counselor tidak ditemukan'
      });
    }

    // Hitung rating rata-rata
    const sessions = await prisma.counselingSession.findMany({
      where: {
        counselorId: counselor.id,
        status: 'COMPLETED',
        rating: { not: null }
      },
      select: { rating: true }
    });

    const averageRating = sessions.length > 0 
      ? sessions.reduce((sum, session) => sum + session.rating, 0) / sessions.length 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        ...counselor,
        averageRating: Math.round(averageRating * 10) / 10,
        totalSessions: counselor._count.counselingsession
      }
    });
  } catch (error) {
    console.error('Error getting counselor:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data counselor',
      error: error.message
    });
  }
};

/**
 * POST /counseling-sessions
 * Membuat session counseling baru (dan payment jika diperlukan)
 */
exports.createCounselingSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { counselorId, topic, question } = req.body;

    // Validasi input
    if (!counselorId || !topic || !question) {
      return res.status(400).json({
        success: false,
        message: 'counselorId, topic, dan question wajib diisi'
      });
    }

    // Cek apakah counselor ada dan verified
    const counselor = await prisma.counselor.findUnique({
      where: { 
        id: parseInt(counselorId),
        verified: true 
      },
      include: {
        users: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: 'Counselor tidak ditemukan atau belum terverifikasi'
      });
    }

    // Cek apakah user sudah punya session yang sedang aktif dengan counselor ini
    const activeSession = await prisma.counselingSession.findFirst({
      where: {
        userId,
        counselorId: parseInt(counselorId),
        status: { in: ['PENDING', 'ACTIVE'] }
      }
    });

    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: 'Anda masih memiliki session aktif dengan counselor ini'
      });
    }

    // Tentukan apakah perlu bayar (misal: berdasarkan specialization premium)
    const premiumSpecializations = ['clinical-psychology', 'psychiatry', 'career-counseling'];
    const isPaymentRequired = premiumSpecializations.includes(counselor.specialization);
    const price = isPaymentRequired ? 150000 : 0; // Rp 150k untuk premium

    // Buat counseling session
    const session = await prisma.counselingSession.create({
      data: {
        userId,
        counselorId: parseInt(counselorId),
        topic,
        question,
        status: isPaymentRequired ? 'PENDING' : 'ACTIVE',
        isPaymentRequired,
        price: isPaymentRequired ? price : null
      },
      include: {
        counselor: {
          include: {
            users: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    let paymentData = null;

    // Jika perlu bayar, buat payment
    if (isPaymentRequired) {
      try {
        const transactionData = await createTransaction({
          userId,
          counselingSessionId: session.id,
          amount: price,
          itemDetails: [{
            id: session.id,
            price: price,
            quantity: 1,
            name: `Konsultasi dengan ${counselor.users.firstName} ${counselor.users.lastName} - ${topic}`
          }]
        });

        paymentData = {
          snapToken: transactionData.snapToken,
          redirectUrl: transactionData.redirectUrl,
          orderId: transactionData.orderId
        };
      } catch (paymentError) {
        // Jika payment gagal, hapus session yang baru dibuat
        await prisma.counselingSession.delete({
          where: { id: session.id }
        });
        
        throw new Error(`Gagal membuat payment: ${paymentError.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Session counseling berhasil dibuat',
      data: {
        session,
        payment: paymentData
      }
    });
  } catch (error) {
    console.error('Error creating counseling session:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat session counseling',
      error: error.message
    });
  }
};

/**
 * GET /counseling-sessions/me
 * Mendapatkan semua session counseling milik user yang login
 */
exports.getMySessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(status && { status })
    };

    const [sessions, total] = await Promise.all([
      prisma.counselingSession.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          counselor: {
            include: {
              users: {
                select: { firstName: true, lastName: true, email: true }
              }
            }
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              paymentStatus: true,
              snapToken: true,
              orderId: true
            }
          },
          _count: {
            select: {
              chatmessage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.counselingSession.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting my sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil session counseling',
      error: error.message
    });
  }
};

/**
 * GET /counseling-sessions/:id
 * Mendapatkan detail session counseling berdasarkan ID
 */
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await prisma.counselingSession.findUnique({
      where: { id: parseInt(id) },
      include: {
        counselor: {
          include: {
            users: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePicture: true
          }
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentStatus: true,
            snapToken: true,
            orderId: true,
            paidAt: true
          }
        },
        chatmessage: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePicture: true
              }
            }
          },
          orderBy: { sentAt: 'asc' },
          take: 50 // Ambil 50 pesan terakhir
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session tidak ditemukan'
      });
    }

    // Cek apakah user memiliki akses ke session ini
    if (session.userId !== userId && session.counselor.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke session ini'
      });
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error getting session by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail session',
      error: error.message
    });
  }
};

/**
 * PUT /counseling-sessions/:id/rating
 * Memberikan rating dan feedback untuk session yang sudah selesai
 */
exports.rateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rating, feedback } = req.body;

    // Validasi rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating harus antara 1-5'
      });
    }

    // Cek session
    const session = await prisma.counselingSession.findUnique({
      where: { 
        id: parseInt(id),
        userId,
        status: 'COMPLETED'
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session tidak ditemukan atau belum selesai'
      });
    }

    if (session.rating) {
      return res.status(400).json({
        success: false,
        message: 'Session ini sudah pernah diberi rating'
      });
    }

    // Update rating dan feedback
    const updatedSession = await prisma.counselingSession.update({
      where: { id: parseInt(id) },
      data: {
        rating: parseInt(rating),
        feedback: feedback || null
      }
    });

    res.status(200).json({
      success: true,
      message: 'Rating berhasil diberikan',
      data: updatedSession
    });
  } catch (error) {
    console.error('Error rating session:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memberikan rating',
      error: error.message
    });
  }
}; 