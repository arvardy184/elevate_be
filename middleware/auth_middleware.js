// middleware/auth.middleware.js

const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) {
    return res.status(401).json({
      message: 'Akses ditolak! Token tidak tersedia.'
    });
  }

  // Format Authorization: Bearer <token>
  const token = bearerHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Token tidak tersedia!'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; // Menyimpan data decoded ke request
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token tidak valid!'
    });
  }
};
