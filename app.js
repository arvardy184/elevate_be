require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { swaggerUi, swaggerSpec } = require("./docs/swagger");
const chatService = require("./services/chat_service");
console.log("🔥 swaggerUi:", swaggerUi);

// Routes
const authRoutes = require("./routes/auth_routes");
const userRoutes = require("./routes/user_routes");
const assesmentRoutes = require("./routes/assesment_routes");
const categoryRoutes = require("./routes/category_routes");
const courseRoutes = require("./routes/courses_routes");
const roadmapRoutes = require("./routes/roadmap_routes");
const paymentRoutes = require("./routes/payment_routes");
const counselingRoutes = require("./routes/counseling_routes");
const notificationRoutes = require("./routes/notification_routes");
const jobmatchingRoutes = require("./routes/jobmatching_routes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3009;

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize chat service with Socket.IO
chatService.init(io);

// Middleware
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

// Daftar routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/assessment", assesmentRoutes); // Fix typo: assesment -> assessment
app.use("/api/categories", categoryRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/counseling", counselingRoutes); // Counseling routes
app.use("/api/notifications", notificationRoutes); // Notification routes
app.use("/api/job-matching", jobmatchingRoutes); // Job matching routes

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log("Swagger UI test:", swaggerUi);

// Root endpoint
app.get("/", (req, res) => {
  res.send("Selamat datang di API dengan Node.js, Express.js, MySQL, dan JWT!");
});

// WebSocket endpoint info
app.get("/api/chat/info", (req, res) => {
  res.json({
    message: "WebSocket endpoint untuk chat",
    endpoint: `/chat`,
    events: {
      authenticate: "Autentikasi dengan token dan sessionId",
      send_message: "Mengirim pesan",
      typing_start: "Mulai mengetik",
      typing_stop: "Berhenti mengetik",
      complete_session: "Selesaikan session (khusus counselor)"
    }
  });
});

// Jalankan server dengan Socket.IO
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan di port ${PORT}`);
  console.log(`WebSocket ready untuk chat counseling`);
});
