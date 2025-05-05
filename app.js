require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { swaggerUi, swaggerSpec } = require('./docs/swagger');
console.log("🔥 swaggerUi:", swaggerUi); 

// Routes
const authRoutes = require('./routes/auth_routes');
const userRoutes = require('./routes/user_routes');
const assesmentRoutes = require('./routes/assesment_routes');
const categoryRoutes = require('./routes/category_routes');
const courseRoutes = require('./routes/courses_routes');


const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Daftar routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/assesment', assesmentRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/courses', courseRoutes);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log('Swagger UI test:', swaggerUi); 

// Root endpoint
app.get('/', (req, res) => {
  res.send('Selamat datang di API dengan Node.js, Express.js, MySQL, dan JWT!');
});
//aa

// Jalankan server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di port ${PORT}`);
});

