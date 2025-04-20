// routes/auth.routes.js

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth_controller');

// REGISTER
router.post('/register', AuthController.register);

// LOGIN
router.post('/login', AuthController.login);

module.exports = router;
