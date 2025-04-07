// controllers/auth.controller.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validasi sederhana
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Harap isi semua field!'
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: 'Email sudah terdaftar!'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Simpan user baru
    await UserModel.createUser({
      name,
      email,
      password: hashedPassword
    });

    return res.status(201).json({
      message: 'Registrasi berhasil!'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Terjadi kesalahan server.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi sederhana
    if (!email || !password) {
      return res.status(400).json({
        message: 'Harap isi email dan password!'
      });
    }

    // Cari user berdasarkan email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({
        message: 'User tidak ditemukan!'
      });
    }

    // Bandingkan password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Password salah!'
      });
    }

    // Jika password cocok, buat token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.SECRET_KEY,
      { expiresIn: '1h' } // token berlaku 1 jam, bisa diubah sesuai kebutuhan
    );

    return res.status(200).json({
      message: 'Login berhasil!',
      token
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Terjadi kesalahan server.'
    });
  }
};
