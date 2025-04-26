// routes/user.routes.js

const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user_controller');
const { verifyToken } = require('../middleware/auth_middleware');

// Route /api/user/profile hanya bisa diakses jika JWT valid
router.get('/profile', verifyToken, UserController.getProfile);

// router.get('/special-consult',verifyToken, checkRole('CONSULTANT'),UserController.specialStuff);

module.exports = router;
