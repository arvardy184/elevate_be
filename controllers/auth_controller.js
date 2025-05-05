// controllers/auth.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user_model");
const { sendOtpEmail } = require("../utils/mailer");
const prisma = require("../prisma/client");

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Harap isi semua field!" });
    }

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
    });

    return res.status(201).json({ message: "Registrasi berhasil!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
};

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
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    const prisma = new PrismaClient();
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

//check token
exports.checkToken = (req, res) => {
  res.json({ valid: true, user: req.user });
}

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
//kirim otp
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Prisma.user.findUnique({
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
    await Prisma.user.update({
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

//reset password
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await Prisma.user.findUnique({
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

    await Prisma.user.update({
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
