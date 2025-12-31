const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');
const socketHandler = require('./services/socketService');
const { initializeRedis } = require('./config/redis');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000
});

// Initialize services
const initializeApp = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize Redis (optional)
    if (process.env.REDIS_URL) {
      await initializeRedis();
    }
    
    // Initialize Socket.IO handler
    socketHandler(io);
    
    // Start server
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════╗
║     🚀 Collixy Backend Server Started    ║
╠══════════════════════════════════════════╣
║ 📍 Port: ${PORT}                          ║
║ 🌍 Environment: ${process.env.NODE_ENV || 'development'} ║
║ 🔌 Socket.IO: Ready                     ║
║ 🗄️  MongoDB: Connected                  ║
║ 🕒 Time: ${new Date().toLocaleTimeString()} ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💥 Process terminated');
  });
});

initializeApp();

module.exports = { server, io };