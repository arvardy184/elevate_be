const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID notifikasi
 *         title:
 *           type: string
 *           description: Judul notifikasi
 *         body:
 *           type: string
 *           description: Isi notifikasi
 *         type:
 *           type: string
 *           description: Tipe notifikasi
 *         isRead:
 *           type: boolean
 *           description: Status sudah dibaca atau belum
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Waktu dibuat
 */

class NotificationController {
  /**
   * @swagger
   * /api/notifications:
   *   get:
   *     summary: Get all notifications untuk user
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Jumlah notification per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Offset untuk pagination
   *       - in: query
   *         name: unread_only
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Hanya tampilkan notifikasi yang belum dibaca
   *     responses:
   *       200:
   *         description: Daftar notifikasi berhasil diambil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Notification'
   *                 total:
   *                   type: integer
   *                 unreadCount:
   *                   type: integer
   *       500:
   *         description: Server error
   */
  static async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const unreadOnly = req.query.unread_only === 'true';
      
      const whereClause = { userId };
      if (unreadOnly) {
        whereClause.isRead = false;
      }
      
      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            title: true,
            body: true,
            type: true,
            isRead: true,
            createdAt: true
          }
        }),
        prisma.notification.count({ where: whereClause }),
        prisma.notification.count({ 
          where: { userId, isRead: false } 
        })
      ]);
      
      return res.status(200).json({
        status: 'success',
        message: 'Notifikasi berhasil diambil',
        data: notifications,
        total,
        unreadCount,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
      
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
  
  /**
   * @swagger
   * /api/notifications/{id}/read:
   *   put:
   *     summary: Mark notification sebagai sudah dibaca
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Notification ID
   *     responses:
   *       200:
   *         description: Notifikasi berhasil ditandai sebagai dibaca
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *       404:
   *         description: Notifikasi tidak ditemukan
   *       500:
   *         description: Server error
   */
  static async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = parseInt(req.params.id);
      
      const notification = await prisma.notification.findFirst({
        where: { 
          id: notificationId,
          userId 
        }
      });
      
      if (!notification) {
        return res.status(404).json({
          status: 'error',
          message: 'Notifikasi tidak ditemukan'
        });
      }
      
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Notifikasi berhasil ditandai sebagai dibaca'
      });
      
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
  
  /**
   * @swagger
   * /api/notifications/read-all:
   *   put:
   *     summary: Mark semua notifikasi sebagai sudah dibaca
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Semua notifikasi berhasil ditandai sebagai dibaca
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                 updatedCount:
   *                   type: integer
   *       500:
   *         description: Server error
   */
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await prisma.notification.updateMany({
        where: { 
          userId,
          isRead: false 
        },
        data: { isRead: true }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Semua notifikasi berhasil ditandai sebagai dibaca',
        updatedCount: result.count
      });
      
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
  
  /**
   * @swagger
   * /api/notifications/unread-count:
   *   get:
   *     summary: Get jumlah notifikasi yang belum dibaca
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Jumlah notifikasi belum dibaca berhasil diambil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 unreadCount:
   *                   type: integer
   *       500:
   *         description: Server error
   */
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      
      const unreadCount = await prisma.notification.count({
        where: { 
          userId,
          isRead: false 
        }
      });
      
      return res.status(200).json({
        status: 'success',
        unreadCount
      });
      
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Terjadi kesalahan server',
        error: error.message
      });
    }
  }
}

module.exports = NotificationController; 