require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const problemRoutes = require('./routes/problemRoutes');
const teamRoutes = require('./routes/teamRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from frontend
    methods: ['GET', 'POST'],
  },
});

// Store io instance on app for controllers to access
app.set('io', io);

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CodeArena Backend API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/admin/teams', teamRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const requiredEnvVars = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'ONLINECOMPILER_API_KEY'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 CodeArena Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Environment:  ${process.env.NODE_ENV}`);
  console.log(`===============================================`);
});
