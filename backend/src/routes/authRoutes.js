// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { protect, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');

console.log('📦 Auth routes initialized');

// Create a validation middleware function
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  };
};

// ========== PUBLIC ROUTES ==========

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      public: [
        '/api/auth/test',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/google/url',
        '/api/auth/google/callback',
        '/api/auth/google/debug',
        '/api/auth/status'
      ],
      protected: [
        '/api/auth/me',
        '/api/auth/profile',
        '/api/auth/logout'
      ]
    }
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
    service: 'authentication'
  });
});

// Auth status check - FIXED: Wrap in try-catch to handle missing function
router.get('/status', (req, res, next) => {
  try {
    if (typeof authController.getAuthStatus !== 'function') {
      throw new Error('getAuthStatus function not found in authController');
    }
    return authController.getAuthStatus(req, res, next);
  } catch (error) {
    console.error('❌ Route handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: error.message
    });
  }
});

// Google OAuth debug endpoint
router.get('/google/debug', (req, res) => {
  const config = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Set (hidden)' : 'Not set',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`,
    JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV
  };
  
  const isConfigured = !!process.env.GOOGLE_CLIENT_ID && 
                      !!process.env.GOOGLE_CLIENT_SECRET && 
                      !!process.env.GOOGLE_REDIRECT_URI;
  
  res.json({
    success: true,
    configured: isConfigured,
    config,
    missing: {
      GOOGLE_CLIENT_ID: !process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: !process.env.GOOGLE_REDIRECT_URI
    },
    testUrls: {
      googleOAuthUrl: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/url`,
      callbackUrl: process.env.GOOGLE_REDIRECT_URI,
      frontendCallback: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`
    },
    instructions: isConfigured ? 'Google OAuth is properly configured' : 'Google OAuth is not configured properly'
  });
});

// Google OAuth configuration debug
router.get('/google/debug-config', (req, res) => {
  const config = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'Not set',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Set (hidden)' : 'Not set',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'Not set',
    FRONTEND_URL: process.env.FRONTEND_URL || 'Not set',
    BACKEND_URL: process.env.BACKEND_URL || 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    PORT: process.env.PORT || 5001
  };
  
  // Validate Google config
  const missing = [];
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.GOOGLE_REDIRECT_URI) missing.push('GOOGLE_REDIRECT_URI');
  
  res.json({
    success: missing.length === 0,
    configured: missing.length === 0,
    config,
    missing,
    googleCloudConsole: {
      oauthConsent: 'https://console.cloud.google.com/apis/credentials/consent',
      credentials: 'https://console.cloud.google.com/apis/credentials',
      authorizedDomains: ['localhost', '127.0.0.1']
    },
    testUrls: {
      oauthUrl: `${req.protocol}://${req.get('host')}/api/auth/google/url`,
      callbackUrl: process.env.GOOGLE_REDIRECT_URI,
      testAuthUrl: `http://localhost:${process.env.PORT || 5001}/api/auth/google/url`
    },
    instructions: {
      setup: '1. Go to Google Cloud Console',
      redirect: `2. Add redirect URI: ${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/auth/google/callback'}`,
      test: '3. Test with /api/auth/google/url endpoint'
    }
  });
});

// Test callback for debugging
router.get('/google/test-callback', (req, res) => {
  console.log('🔍 Test callback hit with query:', req.query);
  
  // Simulate a successful Google login
  const testToken = 'test-jwt-token-' + Date.now();
  const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${testToken}`;
  
  console.log('🔗 Redirecting to:', frontendUrl);
  
  res.redirect(frontendUrl);
});

// Google OAuth Routes - FIXED: Add error handling
router.get('/google/url', (req, res, next) => {
  try {
    if (typeof authController.getGoogleAuthUrl !== 'function') {
      throw new Error('getGoogleAuthUrl function not found in authController');
    }
    return authController.getGoogleAuthUrl(req, res, next);
  } catch (error) {
    console.error('❌ Route handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: error.message
    });
  }
});

router.get('/google/callback', (req, res, next) => {
  try {
    if (typeof authController.googleCallback !== 'function') {
      throw new Error('googleCallback function not found in authController');
    }
    return authController.googleCallback(req, res, next);
  } catch (error) {
    console.error('❌ Route handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: error.message
    });
  }
});

// Register route
router.post('/register',
  validate([
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ]),
  (req, res, next) => {
    try {
      if (typeof authController.register !== 'function') {
        throw new Error('register function not found in authController');
      }
      return authController.register(req, res, next);
    } catch (error) {
      console.error('❌ Route handler error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        error: error.message
      });
    }
  }
);

// Login route
router.post('/login',
  validate([
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('password')
      .exists()
      .withMessage('Password is required')
  ]),
  (req, res, next) => {
    try {
      if (typeof authController.login !== 'function') {
        throw new Error('login function not found in authController');
      }
      return authController.login(req, res, next);
    } catch (error) {
      console.error('❌ Route handler error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        error: error.message
      });
    }
  }
);

// ========== PROTECTED ROUTES ==========

// All routes below this require authentication
router.use((req, res, next) => {
  try {
    if (typeof protect !== 'function') {
      throw new Error('protect middleware not found');
    }
    return protect(req, res, next);
  } catch (error) {
    console.error('❌ Middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: error.message
    });
  }
});

// Get current user
router.get('/me', (req, res, next) => {
  try {
    if (typeof authController.getMe !== 'function') {
      throw new Error('getMe function not found in authController');
    }
    return authController.getMe(req, res, next);
  } catch (error) {
    console.error('❌ Route handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: error.message
    });
  }
});

// Logout user
router.post('/logout', (req, res, next) => {
  try {
    if (typeof authController.logout !== 'function') {
      throw new Error('logout function not found in authController');
    }
    return authController.logout(req, res, next);
  } catch (error) {
    console.error('❌ Route handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
      error: error.message
    });
  }
});

// Get user profile
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Profile accessed successfully',
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
      isVerified: req.user.isVerified,
      createdAt: req.user.createdAt,
      settings: req.user.settings
    }
  });
});

// Update profile
router.put('/profile',
  validate([
    body('username')
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL'),
    body('bio')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Bio cannot exceed 200 characters')
  ]),
  async (req, res) => {
    try {
      const { username, email, avatar, bio, settings } = req.body;
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (username) user.username = username;
      if (email) user.email = email.toLowerCase();
      if (avatar) user.avatar = avatar;
      if (bio !== undefined) user.bio = bio;
      if (settings) user.settings = { ...user.settings, ...settings };
      
      await user.save();
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          settings: user.settings
        }
      });
    } catch (error) {
      console.error('❌ Profile update error:', error);
      
      // Handle duplicate username/email
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field} already exists`
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);
// Add this route (public)
router.get('/debug-token', authController.debugToken);

module.exports = router;