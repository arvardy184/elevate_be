// controllers/auth.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user_model");
const { sendOtpEmail } = require("../utils/mailer");
const prisma = require("../prisma/client");

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegister:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - phoneNumber
 *         - password
 *       properties:
 *         firstName:
 *           type: string
 *           description: Nama depan user
 *         lastName:
 *           type: string
 *           description: Nama belakang user
 *         email:
 *           type: string
 *           format: email
 *           description: Email user (harus unik)
 *         phoneNumber:
 *           type: string
 *           description: Nomor telepon user
 *         password:
 *           type: string
 *           format: password
 *           description: Password user (minimal 6 karakter)
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *     ChangePassword:
 *       type: object
 *       required:
 *         - oldPassword
 *         - newPassword
 *       properties:
 *         oldPassword:
 *           type: string
 *           format: password
 *         newPassword:
 *           type: string
 *           format: password
 *     ForgotPassword:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *     ResetPassword:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *         - newPassword
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         otp:
 *           type: string
 *           description: Kode OTP 6 digit yang dikirim ke email
 *         newPassword:
 *           type: string
 *           format: password
 */

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;
    if (!email || !password || !phoneNumber || !firstName || !lastName) {
      return res.status(400).json({ message: "Harap isi semua field!" });
    }
    console.log(firstName, lastName, email, phoneNumber, password);

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await UserModel.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
    });

    return res.status(201).json({ message: "Registrasi berhasil!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register user baru
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: Registrasi berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Registrasi berhasil!
 *       400:
 *         description: Bad request - Email sudah terdaftar atau field tidak lengkap
 *       500:
 *         description: Server error
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Harap isi email dan password!" });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "User tidak ditemukan!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password salah!" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.SECRET_KEY || "mysecret123",
      { expiresIn: "1h" }
    );

   
    const assessment = await prisma.assessment.findFirst({
      where: { userId: user.id },
    });

    return res.status(200).json({
      message: "Login berhasil!",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isAssessmentCompleted: !!assessment,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
};

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login berhasil!
 *                 token:
 *                   type: string
 *                   description: JWT token untuk autentikasi
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     isAssessmentCompleted:
 *                       type: boolean
 *       400:
 *         description: Bad request - User tidak ditemukan
 *       401:
 *         description: Unauthorized - Password salah
 *       500:
 *         description: Server error
 */

//check token
exports.checkToken = (req, res) => {
  res.json({ valid: true, user: req.user });
}

/**
 * @swagger
 * /api/auth/check-token:
 *   get:
 *     summary: Cek validitas token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Unauthorized - Token tidak valid
 */

exports.changePassword = async (req, res) => {
  try{
    const userId = req.user.id;
    const {oldPassword, newPassword} = req.body;

    if(!oldPassword || !newPassword){
      return res.status(400).json({message: "Harap isi semua field!"});
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    const ok = await bcrypt.compare(oldPassword, user.password);
    if(!ok){
      return res.status(400).json({message: "Password lama salah!"});
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    
    });
    res.status(200).json({message: "Password berhasil diubah!"});
  } catch(e){
console.error(e);
return res.status(500).json({message: "Terjadi kesalahan server."});
  }
}

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Ubah password user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePassword'
 *     responses:
 *       200:
 *         description: Password berhasil diubah
 *       400:
 *         description: Bad request - Password lama salah atau field tidak lengkap
 *       401:
 *         description: Unauthorized - Token tidak valid
 *       500:
 *         description: Server error
 */

//kirim otp
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    //generate otp (angka 6 digit)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    //simpan otp ke db
    await prisma.user.update({
      where: { email },
      data: {
        resetToken: otp,
        resetTokenExpiry: new Date(Date.now() + 3600000), //1 jam
      },
    });
    await sendOtpEmail(email, otp);
    console.log(
      "OTP untuk reset password dikirim ke email:",
      email + "OTP: " + otp
    );

    return res.status(200).json({
      message: "OTP dikirim ke email",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Terjadi kesalahan server.",
    });
  }
};

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Kirim OTP untuk reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPassword'
 *     responses:
 *       200:
 *         description: OTP berhasil dikirim ke email
 *       404:
 *         description: User tidak ditemukan
 *       500:
 *         description: Server error
 */

//reset password
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (
      !user ||
      user.resetToken !== otp ||
      user.resetTokenExpiry < new Date()
    ) {
      return res.status(400).json({
        message: "OTP tidak valid",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.status(200).json({
      message: "Password berhasil direset",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Terjadi kesalahan server.",
    });
  }
};

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password dengan OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *     responses:
 *       200:
 *         description: Password berhasil direset
 *       400:
 *         description: Bad request - OTP tidak valid atau expired
 *       500:
 *         description: Server error
 */
