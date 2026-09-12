// backend/src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// ========== SOCKET.IO SETUP ==========
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.log('⚠️ Socket.io CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Store active rooms and users
const rooms = new Map();
const users = new Map();

// Socket.io connection handling
//backend/src/app.js
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Join room
  socket.on('join', ({ roomId, username }) => {
    try {
      // Add user to room
      socket.join(roomId);
      
      // Initialize room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          code: '',
          language: 'javascript',
          createdAt: new Date()
        });
      }
      
      const room = rooms.get(roomId);
      
      // Add user to room's user list
      room.users.set(socket.id, {
        socketId: socket.id,
        username,
        joinedAt: new Date()
      });
      
      // Update user map
      users.set(socket.id, { roomId, username });
      
      // Get all users in room
      const roomUsers = Array.from(room.users.values());
      
      console.log(`👤 ${username} joined room ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        user: { socketId: socket.id, username },
        roomUsers
      });
      
      // Send room info to joining user
      socket.emit('joined', {
        roomId,
        username,
        roomUsers,
        code: room.code,
        language: room.language
      });
      
      // Send updated user list to everyone in room
      io.to(roomId).emit('room-users-updated', { roomUsers });
      
    } catch (error) {
      console.error('❌ Error in join:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle code changes
  socket.on('code-change', ({ roomId, code, user }) => {
    try {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.code = code;
        room.lastUpdated = new Date();
        
        // Broadcast to other users in the room
        socket.to(roomId).emit('code-updated', {
          code,
          user,
          timestamp: new Date().toISOString()
        });
        
        // Log the change (optional)
        if (process.env.NODE_ENV === 'development') {
          console.log(`📝 Code updated in room ${roomId} by ${user || 'unknown'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in code-change:', error);
    }
  });

  // Handle language changes
  socket.on('language-change', ({ roomId, language, user }) => {
    try {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.language = language;
        
        // Broadcast to other users in the room
        socket.to(roomId).emit('language-updated', {
          language,
          user,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error in language-change:', error);
    }
  });

  // Handle chat messages
  socket.on('chat-message', ({ roomId, message, username, timestamp }) => {
    try {
      // Broadcast to all users in the room including sender
      io.to(roomId).emit('new-chat-message', {
        message,
        username,
        timestamp,
        socketId: socket.id
      });
    } catch (error) {
      console.error('❌ Error in chat-message:', error);
    }
  });

  // Sync code request (when user joins)
  socket.on('sync-code', ({ roomId, socketId }) => {
    try {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        io.to(socketId).emit('code-synced', {
          code: room.code,
          language: room.language
        });
      }
    } catch (error) {
      console.error('❌ Error in sync-code:', error);
    }
  });

  // Leave room
  socket.on('leave', ({ roomId, username }) => {
    handleLeave(socket, roomId, username);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    try {
      const user = users.get(socket.id);
      if (user) {
        const { roomId, username } = user;
        handleLeave(socket, roomId, username);
        users.delete(socket.id);
      }
      console.log(`🔌 Client disconnected: ${socket.id}`);
    } catch (error) {
      console.error('❌ Error in disconnect:', error);
    }
  });

  // Handle typing events
  socket.on('typing', ({ roomId, username, isTyping }) => {
    socket.to(roomId).emit('user-typing', {
      socketId: socket.id,
      username,
      isTyping
    });
  });

  // Handle cursor position
  socket.on('cursor-move', ({ roomId, position, username }) => {
    socket.to(roomId).emit('cursor-updated', {
      socketId: socket.id,
      username,
      position
    });
  });

  // Get room info
  socket.on('get-room-info', ({ roomId }) => {
    try {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const roomUsers = Array.from(room.users.values());
        
        socket.emit('room-info', {
          roomId,
          users: roomUsers,
          code: room.code,
          language: room.language,
          createdAt: room.createdAt,
          userCount: roomUsers.length
        });
      } else {
        socket.emit('room-info', { roomId, error: 'Room not found' });
      }
    } catch (error) {
      console.error('❌ Error in get-room-info:', error);
      socket.emit('error', { message: 'Failed to get room info' });
    }
  });

  // Ping/Pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// Helper function to handle leaving room
function handleLeave(socket, roomId, username) {
  try {
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Remove user from room
      room.users.delete(socket.id);
      
      // If room is empty, delete it after a delay
      if (room.users.size === 0) {
        setTimeout(() => {
          if (rooms.has(roomId) && rooms.get(roomId).users.size === 0) {
            rooms.delete(roomId);
            console.log(`🗑️ Room ${roomId} deleted (empty)`);
          }
        }, 60000); // 1 minute delay
      } else {
        // Get updated user list
        const roomUsers = Array.from(room.users.values());
        
        // Notify others in the room
        socket.to(roomId).emit('user-left', {
          user: { socketId: socket.id, username },
          roomUsers
        });
        
        // Send updated user list to everyone in room
        io.to(roomId).emit('room-users-updated', { roomUsers });
      }
      
      console.log(`👋 ${username || 'User'} left room ${roomId}`);
    }
    
    // Leave the socket room
    socket.leave(roomId);
  } catch (error) {
    console.error('❌ Error in handleLeave:', error);
  }
}

// ========== EXPRESS MIDDLEWARE ==========

// 1. Request logging
app.use(morgan('dev'));

// 2. CORS - More permissive for development
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));

// 3. Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

// 4. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Cookie parser
app.use(cookieParser());

// 6. Static files (if needed)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ========== DATABASE CONNECTION ==========

const connectDB = require('./config/database');
connectDB();

// ========== ROUTES ==========

console.log('📦 Loading routes...');
console.log('🔧 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL
});

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Import auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authLimiter, authRoutes);

// Import user routes
const userRoutes = require('./routes/user');
app.use('/api/users', userRoutes);

// ========== GOOGLE AUTH ROUTES ==========

// Google OAuth URL endpoint
app.get('/api/auth/google/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth not configured',
      error: 'GOOGLE_CLIENT_ID is not set in environment variables'
    });
  }
  
  // Generate Google OAuth URL
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || `http://${req.headers.host}/api/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' '),
  };
  
  const qs = new URLSearchParams(options);
  const url = `${rootUrl}?${qs.toString()}`;
  
  res.json({
    success: true,
    url,
    clientId: process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...',
    redirectUri: options.redirect_uri
  });
});

// Google OAuth callback endpoint
app.get('/api/auth/google/callback', (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.json({
      success: false,
      message: 'Google OAuth failed',
      error: error
    });
  }
  
  res.json({
    success: true,
    message: 'Google OAuth callback received',
    code: code ? 'Received' : 'Not received',
    timestamp: new Date().toISOString()
  });
});

// Google OAuth debug endpoint
app.get('/api/auth/google/debug', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Set (hidden)' : 'Not set',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set (hidden)' : 'Not set',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'Not set',
    frontendUrl: process.env.FRONTEND_URL || 'Not set',
    nodeEnv: process.env.NODE_ENV || 'Not set',
    backendUrl: `http://${req.headers.host}`,
    socket: {
      activeConnections: io.engine.clientsCount,
      activeRooms: Array.from(rooms.keys()).length
    }
  });
});

// Socket.io connection info endpoint
app.get('/api/socket/info', (req, res) => {
  const activeRooms = Array.from(rooms.keys()).length;
  const activeUsers = io.engine.clientsCount;
  
  res.json({
    success: true,
    data: {
      activeRooms,
      activeUsers,
      socketServer: 'running',
      rooms: Array.from(rooms.entries()).map(([roomId, room]) => ({
        roomId,
        userCount: room.users.size,
        createdAt: room.createdAt
      }))
    }
  });
});

// Test endpoint to check server
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Collixy Backend API with Socket.io',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      health: '/api/health',
      test: '/api/test',
      socketInfo: '/api/socket/info',
      googleOAuth: {
        getUrl: '/api/auth/google/url',
        callback: '/api/auth/google/callback',
        debug: '/api/auth/google/debug'
      }
    },
    socket: {
      activeRooms: Array.from(rooms.keys()).length,
      activeConnections: io.engine.clientsCount
    },
    server: {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5001,
      timestamp: new Date().toISOString()
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    service: 'collixy-backend',
    socket: {
      activeConnections: io.engine.clientsCount,
      activeRooms: Array.from(rooms.keys()).length
    }
  });
});

// Test endpoint to check environment
app.get('/api/env-check', (req, res) => {
  res.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      FRONTEND_URL: process.env.FRONTEND_URL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured',
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      MONGODB_URI: process.env.MONGODB_URI ? 'Configured' : 'Not configured',
      PORT: process.env.PORT || 5001
    },
    socket: {
      activeConnections: io.engine.clientsCount
    }
  });
});

// Test route to verify server
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      socketInfo: '/api/socket/info',
      googleOAuth: {
        getUrl: '/api/auth/google/url',
        callback: '/api/auth/google/callback',
        debug: '/api/auth/google/debug'
      },
      envCheck: '/api/env-check'
    },
    socket: {
      activeConnections: io.engine.clientsCount,
      activeRooms: Array.from(rooms.keys()).length
    },
    request: {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl
    }
  });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      health: '/api/health',
      test: '/api/test',
      socketInfo: '/api/socket/info',
      googleOAuth: {
        getUrl: '/api/auth/google/url',
        callback: '/api/auth/google/callback',
        debug: '/api/auth/google/debug'
      }
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  const statusCode = err.status || err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? {
      name: err.name,
      stack: err.stack,
      details: err.toString()
    } : undefined,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`
🚀 Server running in ${process.env.NODE_ENV || 'development'} mode
🌐 HTTP Server: http://localhost:${PORT}
🔌 WebSocket Server: ws://localhost:${PORT}
🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
👥 Socket.io: Ready for real-time collaboration

📊 Active connections: ${io.engine.clientsCount}
  
📋 Available Google OAuth endpoints:
  • Debug: http://localhost:${PORT}/api/auth/google/debug
  • URL: http://localhost:${PORT}/api/auth/google/url
  • Callback: http://localhost:${PORT}/api/auth/google/callback
  `);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try a different port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('👋 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('👋 HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };