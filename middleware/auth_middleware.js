// middleware/auth.middleware.js..

const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Akses ditolak! Token tidak tersedia.'
    });
  }

  // Format Authorization: Bearer <token>
  const token = authHeader.split(' ')[1];

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

// Optional auth middleware - tidak wajib login, tapi kalau ada token akan diverifikasi
exports.optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Jika tidak ada header authorization, lanjut tanpa user
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  // Jika tidak ada token, lanjut tanpa user
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; // Menyimpan data decoded ke request
    next();
  } catch (error) {
    // Jika token tidak valid, lanjut tanpa user (tidak throw error)
    req.user = null;
    next();
  }
};

exports.checkRole = (requiredRole) => {
  return (req, res, next) => {
    if(!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        message: 'Akses ditolak! Role tidak sesuai.'
      })
   
    }
    next();
  }
}

