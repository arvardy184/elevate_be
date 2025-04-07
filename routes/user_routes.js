// routes/user.routes.js

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Route /api/user/profile hanya bisa diakses jika JWT valid
router.get('/profile', verifyToken, UserController.getProfile);

module.exports = router;
