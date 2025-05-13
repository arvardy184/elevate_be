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

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth_middleware');
const paymentController = require('../controllers/payment_controller');
const voucherController = require('../controllers/voucher_controller');


// Payment routes
router.post('/charge', verifyToken, paymentController.chargePayment);
router.post('/notification', paymentController.handlePaymentNotification);
router.get('/me', verifyToken, paymentController.getMyPayments);

// Voucher routes
router.post('/vouchers/apply', verifyToken, voucherController.applyVoucher);
router.get('/vouchers/me', verifyToken, voucherController.getMyVouchers);

module.exports = router;