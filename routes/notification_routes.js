const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification_controller');
const { verifyToken } = require('../middleware/auth_middleware');

// GET /api/notifications - get all notifications
router.get('/', verifyToken, NotificationController.getNotifications);

// GET /api/notifications/unread-count - get unread count
router.get('/unread-count', verifyToken, NotificationController.getUnreadCount);

// PUT /api/notifications/read-all - mark all as read
router.put('/read-all', verifyToken, NotificationController.markAllAsRead);

// PUT /api/notifications/:id/read - mark specific notification as read
router.put('/:id/read', verifyToken, NotificationController.markAsRead);

module.exports = router;

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Ambil daftar notifikasi user
 *     tags: [Notification]
 *     responses:
 *       200:
 *         description: Notifikasi berhasil diambil
 */