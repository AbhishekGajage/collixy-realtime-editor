const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const path = require('path');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const roomRoutes = require('./routes/rooms');
const userRoutes = require('./routes/users');
const snippetRoutes = require('./routes/snippets');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logger
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Rate limiting
app.use('/api', apiLimiter);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/snippets', snippetRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Collixy Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    message: 'Collixy API Documentation',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        google: 'GET /api/auth/google',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      },
      documents: {
        list: 'GET /api/documents',
        create: 'POST /api/documents',
        get: 'GET /api/documents/:id',
        update: 'PUT /api/documents/:id',
        delete: 'DELETE /api/documents/:id'
      },
      rooms: {
        create: 'POST /api/rooms',
        join: 'POST /api/rooms/join',
        leave: 'POST /api/rooms/leave',
        info: 'GET /api/rooms/:roomId'
      },
      users: {
        profile: 'GET /api/users/profile',
        update: 'PUT /api/users/profile',
        search: 'GET /api/users/search'
      }
    }
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Collixy API - Code Together',
    description: 'Real-time collaborative code editor backend',
    documentation: '/api-docs',
    health: '/health',
    github: 'https://github.com/collixy/collixy-backend'
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  
  app.get('*', (req, res) => {
    // Only serve the frontend for non-API routes
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.resolve(__dirname, '../../frontend/build/index.html'));
    } else {
      res.status(404).json({
        success: false,
        message: `API route ${req.originalUrl} not found`
      });
    }
  });
}

// 404 handler - FIXED: Remove the '*' pattern
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    suggestion: 'Check /api-docs for available endpoints'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;