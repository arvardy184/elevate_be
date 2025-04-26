// routes/auth.routes.js

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth_controller');
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register user baru
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registrasi berhasil
 *       400:
 *         description: Data tidak valid
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: Email atau password salah
 */

//tes route
router.get('/', (req, res) => {
    res.send('Selamat datang di API dengan Node.js, Express.js, MySQL, dan JWT!');
})
// REGISTER
router.post('/register', AuthController.register);

// LOGIN
router.post('/login', AuthController.login);


/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Kirim OTP untuk reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP dikirim
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password pakai OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password berhasil diganti
 */

// FORGOT PASSWORD
router.post('/forgot-password', AuthController.forgotPassword);

// RESET PASSWORD
router.post('/reset-password', AuthController.resetPassword);

module.exports = router;
