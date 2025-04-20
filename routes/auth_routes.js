// routes/auth.routes.js

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth_controller');


//tes route
router.get('/', (req, res) => {
    res.send('Selamat datang di API dengan Node.js, Express.js, MySQL, dan JWT!');
})
// REGISTER
router.post('/register', AuthController.register);

// LOGIN
router.post('/login', AuthController.login);

module.exports = router;
