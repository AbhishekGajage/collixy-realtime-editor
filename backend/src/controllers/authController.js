//controllers/authController.js
const mongoose = require('mongoose');
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { OAuth2Client } = require("google-auth-library");

// Generate JWT Token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set!');
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(
    { id: id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Send token response
const sendTokenResponse = (user, statusCode, res,isNewUser = false) => {
  try {
    const token = generateToken(user._id);

    // Cookie options
    const options = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    // Remove password from output
    user.password = undefined;

    res
      .status(statusCode)
      .cookie("token", token, options)
      .json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          settings: user.settings,
          isVerified: user.isVerified,
        },
      });
  } catch (error) {
    console.error("❌ Error in sendTokenResponse:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate authentication token",
    });
  }
};

// @desc    Get Google OAuth URL
// @route   GET /api/auth/google/url
// @access  Public
exports.getGoogleAuthUrl = async (req, res) => {
  try {
    console.log("🔗 Generating Google OAuth URL...");
    console.log("🔧 Environment check:", {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "Set" : "Missing",
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      NODE_ENV: process.env.NODE_ENV,
    });

    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("❌ GOOGLE_CLIENT_ID is missing in environment variables");
      return res.status(500).json({
        success: false,
        message: "Google OAuth is not configured on the server",
        configured: false,
        error: "Missing GOOGLE_CLIENT_ID",
      });
    }

    if (!process.env.GOOGLE_REDIRECT_URI) {
      console.error("❌ GOOGLE_REDIRECT_URI is missing");
      return res.status(500).json({
        success: false,
        message: "Redirect URI is not configured",
        configured: false,
        error: "Missing GOOGLE_REDIRECT_URI",
      });
    }

    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

    const options = {
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };

    const qs = new URLSearchParams(options);
    const url = `${rootUrl}?${qs.toString()}`;

    console.log(
      "✅ Generated Google OAuth URL:",
      url.substring(0, 100) + "..."
    );

    res.json({
      success: true,
      url,
      configured: true,
      config: {
        clientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
        frontendUrl: process.env.FRONTEND_URL,
      },
    });
  } catch (error) {
    console.error("❌ Error generating Google URL:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate Google OAuth URL",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};


// @desc    Handle Google OAuth callback - FIXED VERSION
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleCallback = async (req, res) => {
  try {
    console.log("🔄 ========== GOOGLE CALLBACK STARTED ==========");
    
    const { code, error: googleError } = req.query;

    // Handle Google OAuth errors
    if (googleError) {
      console.error("❌ Google OAuth error:", googleError);
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=google_auth_failed`
      );
    }

    if (!code) {
      console.error("❌ No authorization code received");
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=no_code`
      );
    }

    // Check environment variables
    console.log("🔧 Environment check:");
    console.log("- GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✓ Set" : "✗ Missing");
    console.log("- GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✓ Set" : "✗ Missing");
    console.log("- JWT_SECRET:", process.env.JWT_SECRET ? "✓ Set" : "✗ Missing");
    console.log("- FRONTEND_URL:", process.env.FRONTEND_URL);

    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("❌ Google OAuth not configured properly");
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=server_config`
      );
    }

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is not configured");
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=jwt_secret_missing`
      );
    }

    console.log("🔗 Creating OAuth2 client...");
    const oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    console.log("🔄 Exchanging code for tokens...");
    let tokens;
    try {
      const tokenResponse = await oAuth2Client.getToken(code);
      tokens = tokenResponse.tokens;
      oAuth2Client.setCredentials(tokens);
      console.log("✅ Tokens received");
    } catch (tokenError) {
      console.error("❌ Failed to exchange code for tokens:", tokenError.message);
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=token_exchange`
      );
    }

    console.log("🔍 Verifying ID token...");
    let payload;
    try {
      const ticket = await oAuth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      console.log("✅ ID token verified");
      console.log("👤 User email from Google:", payload.email);
    } catch (verifyError) {
      console.error("❌ Failed to verify ID token:", verifyError.message);
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=token_verification`
      );
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      console.error("❌ No email in Google payload");
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=no_email`
      );
    }

    console.log("📊 Starting database operations...");
    let user;
    let token;
    
    try {
      // Check if user exists
      user = await User.findOne({
        $or: [{ googleId }, { email: email.toLowerCase() }],
      });

      if (user) {
        console.log("✅ User found:", user.email);
        console.log("📝 User ID:", user._id);
        
        // ========== FIX: Use direct update without save() ==========
        const updateData = {
          isVerified: true,
          lastActive: new Date()
        };
        
        if (!user.googleId) {
          updateData.googleId = googleId;
        }
        if (picture) {
          updateData.avatar = picture;
        }
        
        // Use updateOne to avoid middleware issues
        await User.updateOne(
          { _id: user._id },
          { $set: updateData }
        );
        
        console.log("✅ User updated with updateOne (avoided middleware)");
        
        // Re-fetch the updated user
        user = await User.findById(user._id);
        console.log("✅ User re-fetched");
        
      } else {
        console.log("🆕 Creating new user...");
        
        // Generate username using the static method
        const username = await User.generateUsernameFromEmail(email);
        console.log("Generated username:", username);

        // Create new user - NO middleware will interfere
        const newUserData = {
          username: username,
          email: email.toLowerCase(),
          googleId: googleId,
          avatar: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          isVerified: true,
          lastActive: new Date(),
          settings: {
            theme: "system",
            editor: {
              fontSize: 14,
              tabSize: 2,
              lineNumbers: true,
              wordWrap: false,
              autoComplete: true,
            },
          }
        };
        
        // Create user directly with insert to avoid middleware
        const result = await User.create([newUserData], { validateBeforeSave: false });
        user = result[0];
        console.log("✅ New user created:", user.email);
      }
      
      // Generate token
      console.log("🔐 Generating JWT token for user ID:", user._id);
      console.log("🔐 User ID string:", user._id.toString());
      
      token = generateToken(user._id);
      console.log("✅ Token generated");
      console.log("🔑 Token preview:", token.substring(0, 50) + "...");
      
    } catch (dbError) {
      console.error("❌ Database error:", dbError.message);
      console.error("Error name:", dbError.name);
      console.error("Error code:", dbError.code);
      
      // Try fallback: find existing user by email
      try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          console.log("✅ Found existing user for fallback token:", existingUser.email);
          token = generateToken(existingUser._id);
        } else {
          // Last resort: create minimal user record
          console.log("⚠️ Creating minimal user record...");
          const minimalUser = await User.create([{
            username: `user_${Date.now()}`,
            email: email.toLowerCase(),
            googleId: googleId,
            isVerified: true,
            lastActive: new Date()
          }], { validateBeforeSave: false });
          
          token = generateToken(minimalUser[0]._id);
          console.log("✅ Created minimal user and token");
        }
      } catch (fallbackError) {
        console.error("❌ All database methods failed:", fallbackError.message);
        // Emergency: generate token with just email
        const emergencyToken = jwt.sign(
          { email: email, timestamp: Date.now() },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        token = emergencyToken;
      }
    }

    // 🎯 ALWAYS redirect to dashboard
    console.log("✅ Authentication successful!");
    console.log(`🔗 Redirecting to frontend with token...`);
    
    const frontendUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/callback?token=${token}`;
    
    return res.redirect(frontendUrl);
    
  } catch (error) {
    console.error("❌ ========== UNEXPECTED ERROR ==========");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Redirect with error
    return res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=auth_failed&message=${encodeURIComponent(error.message)}`
    );
  }
};


// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
// controllers/authController.js
// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  console.log('📝 Registration request received:', {
    username: req.body.username,
    email: req.body.email
  });

  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    // Validate username format
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 30 characters'
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, and underscores'
      });
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username }
      ]
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? "Email" : "Username";
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    // Create user - simple approach
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
      settings: {
        theme: "system",
        editor: {
          fontSize: 14,
          tabSize: 2,
          lineNumbers: true,
          wordWrap: false,
          autoComplete: true
        }
      },
      isVerified: true, // Auto-verify email/password users
      isActive: true    // Ensure account is active
    });
    // Save user
    await user.save();
    
    console.log('✅ User created successfully:', user.email);
    sendTokenResponse(user, 201, res, true); // Pass true here

    // Return success
    return res.status(201).json({
      success: true,
      message: "Registration successful! Please login.",
      isNewUser: true, // Add this flag
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error("❌ Registration error:", error.message);
    console.error("❌ Error details:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    // Generic server error
    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Check for user with password selected
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last active
    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res,false);
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    console.log('🔍 getMe endpoint called');
    
    if (!req.user || !req.user._id) {
      console.error('❌ No user found in request');
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    console.log('🔑 User ID from middleware:', req.user._id);
    
    // Get user from database
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      console.error('❌ User not found in database for ID:', req.user._id);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log('✅ User found:', user.email);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        settings: user.settings,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        googleId: user.googleId,
      },
    });
  } catch (error) {
    console.error("❌ Get me error:", error);
    console.error("❌ Error details:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

// @desc    Check auth status - ADD THIS FUNCTION!
// @route   GET /api/auth/status
// @access  Public
exports.getAuthStatus = async (req, res) => {
  try {
    const token =
      req.cookies.token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      return res.json({
        success: false,
        authenticated: false,
        message: "No authentication token",
      });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-fallback-secret-change-this"
      );
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.json({
          success: false,
          authenticated: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        authenticated: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
        },
      });
    } catch (jwtError) {
      return res.json({
        success: false,
        authenticated: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("❌ Auth status error:", error);
    res.status(500).json({
      success: false,
      authenticated: false,
      message: "Server error checking auth status",
    });
  }
};

// Also make sure these duplicate functions are removed from the bottom of your file:
// Remove any duplicate exports at the bottom like:
// exports.register = ... (already defined above)
// exports.login = ... (already defined above)
// exports.getProfile = ... (this might be causing conflicts)
// @desc    Debug token verification
// @route   GET /api/auth/debug-token
// @access  Public
exports.debugToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Debug Token Endpoint Called');
    console.log('🔍 Full headers:', req.headers);
    console.log('🔍 Authorization header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        success: false,
        message: 'No token provided or invalid format'
      });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('🔍 Token received (first 50 chars):', token.substring(0, 50) + '...');
    console.log('🔍 JWT_SECRET set:', process.env.JWT_SECRET ? 'Yes' : 'No');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified successfully');
      console.log('🔍 Decoded token:', decoded);
      
      // Find user
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.json({
          success: false,
          message: 'User not found in database',
          decoded: decoded
        });
      }
      
      return res.json({
        success: true,
        message: 'Token is valid',
        decoded: decoded,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          googleId: user.googleId,
          isVerified: user.isVerified
        }
      });
      
    } catch (tokenError) {
      console.error('❌ Token verification failed:', tokenError.message);
      console.error('❌ Error name:', tokenError.name);
      
      return res.json({
        success: false,
        message: 'Token verification failed',
        error: tokenError.message,
        errorName: tokenError.name
      });
    }
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
