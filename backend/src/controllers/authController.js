const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  // Cookie options
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      settings: user.settings,
      isVerified: user.isVerified
    }
  });
};

// @desc    Register user (from design - email address sign up)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    // Create user with default avatar
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      avatar,
      settings: {
        theme: 'system',
        editor: {
          fontSize: 14,
          tabSize: 2,
          lineNumbers: true,
          wordWrap: false,
          autoComplete: true
        }
      }
    });

    // Update user stats
    user.stats = {
      documentsCreated: 0,
      collaborations: 0,
      totalEditingTime: 0
    };
    
    await user.save();

    // Send welcome email (implement in emailService)
    // await sendWelcomeEmail(email, username);

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check for user with password selected
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last active
    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login (from design - "Sign in with Google")
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res, next) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    // Verify token
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ 
      $or: [{ googleId }, { email: email.toLowerCase() }] 
    });

    if (user) {
      // Update existing user with Google info if needed
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user with Google info
      const username = name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
      
      user = await User.create({
        username,
        email: email.toLowerCase(),
        googleId,
        avatar: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        isVerified: true,
        settings: {
          theme: 'system',
          editor: {
            fontSize: 14,
            tabSize: 2,
            lineNumbers: true,
            wordWrap: false,
            autoComplete: true
          }
        },
        stats: {
          documentsCreated: 0,
          collaborations: 0,
          totalEditingTime: 0
        }
      });
    }

    // Update last active
    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user (for "Welcome, User" in design)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('documents', 'title language createdAt')
      .populate('collaboratingOn.document', 'title language owner');
    
    // Format response
    const userData = user.getPublicProfile();
    
    // Add stats for dashboard
    const recentDocuments = await Document.find({
      $or: [
        { owner: user._id },
        { 'collaborators.user': user._id }
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('title language updatedAt roomId');
    
    res.json({
      success: true,
      user: userData,
      stats: {
        totalDocuments: user.documents.length,
        totalCollaborations: user.collaboratingOn.length,
        recentDocuments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { username, email, bio, settings } = req.body;
    
    // Build update object
    const updateData = {};
    
    if (username && username !== req.user.username) {
      // Check if username is taken
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      updateData.username = username;
    }
    
    if (email && email !== req.user.email) {
      // Check if email is taken
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: req.user.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      updateData.email = email.toLowerCase();
      updateData.isVerified = false; // Require re-verification
    }
    
    if (bio !== undefined) updateData.bio = bio;
    if (settings) updateData.settings = { ...req.user.settings, ...settings };
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal that user doesn't exist
      return res.json({
        success: true,
        message: 'If an account exists with this email, a reset link will be sent'
      });
    }
    
    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    
    // Send email (implement in emailService)
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    // await sendPasswordResetEmail(user.email, resetUrl);
    
    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};