require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/auth_routes');
const userRoutes = require('./routes/user_routes');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Daftar routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Selamat datang di API dengan Node.js, Express.js, MySQL, dan JWT!');
});

// Jalankan server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di port ${PORT}`);
});

