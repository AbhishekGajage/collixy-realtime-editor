// models/User.js - COMPLETE WORKING VERSION
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.githubId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [200, 'Bio cannot exceed 200 characters'],
    default: ''
  },
  
  // Social login IDs
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  githubId: {
    type: String,
    sparse: true,
    unique: true
  },
  
  // User settings
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    editor: {
      fontSize: {
        type: Number,
        default: 14,
        min: 8,
        max: 32
      },
      tabSize: {
        type: Number,
        default: 2,
        min: 1,
        max: 8
      },
      lineNumbers: {
        type: Boolean,
        default: true
      },
      wordWrap: {
        type: Boolean,
        default: false
      },
      autoComplete: {
        type: Boolean,
        default: true
      }
    },
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      pushNotifications: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // User stats
  stats: {
    documentsCreated: {
      type: Number,
      default: 0
    },
    collaborations: {
      type: Number,
      default: 0
    },
    totalEditingTime: {
      type: Number,
      default: 0
    }
  },
  
  // Documents owned by user
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  
  // Documents user is collaborating on
  collaboratingOn: [{
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'editor'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Recent activity
  recentRooms: [{
    roomId: String,
    documentTitle: String,
    lastVisited: Date
  }],
  
  // Account status
  isVerified: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Security
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpire;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpire;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpire;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpire;
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual for user display name
userSchema.virtual('displayName').get(function() {
  return this.username;
});

// Indexes
userSchema.index({ 'collaboratingOn.document': 1 });
userSchema.index({ lastActive: -1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// ========== MIDDLEWARE - FIXED VERSION ==========

// Pre-save middleware: Combine all operations into one middleware
userSchema.pre('save', async function() {  // Removed 'next' parameter
  console.log('🔐 User pre-save middleware running...');
  
  try {
    // 1. Ensure email is lowercase
    if (this.email && this.isModified('email')) {
      this.email = this.email.toLowerCase().trim();
    }
    
    // 2. Hash password if modified
    if (this.isModified('password') && this.password) {
      console.log('🔐 Hashing password...');
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      console.log('🔐 Password hashed successfully');
    }
    
    // 3. Set avatar if not set
    if (!this.avatar && this.username) {
      this.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(this.username)}`;
      console.log('🖼️ Avatar set:', this.avatar);
    }
    
    // 4. Set default settings if not provided
    if (!this.settings) {
      this.settings = {
        theme: 'system',
        editor: {
          fontSize: 14,
          tabSize: 2,
          lineNumbers: true,
          wordWrap: false,
          autoComplete: true
        },
        notifications: {
          emailNotifications: true,
          pushNotifications: true
        }
      };
    }
    
    // 5. Set default stats if not provided
    if (!this.stats) {
      this.stats = {
        documentsCreated: 0,
        collaborations: 0,
        totalEditingTime: 0
      };
    }
    
    console.log('✅ User pre-save middleware completed');
    // No need to call next() - async function completes automatically
    
  } catch (error) {
    console.error('❌ User pre-save middleware error:', error);
    throw error;  // Just throw the error instead of next(error)
  }
});

// ========== STATIC METHODS ==========

// Helper to generate username for social login
userSchema.statics.generateUsernameFromEmail = async function(email) {
  const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 25);
  let username = baseUsername;
  let counter = 1;
  
  // Check if username exists
  while (await this.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
};

// Find by email or username
userSchema.statics.findByEmailOrUsername = async function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  }).select('+password');
};

// Create new user with validation
userSchema.statics.createUser = async function(userData) {
  try {
    console.log('👤 Creating user with data:', {
      username: userData.username,
      email: userData.email
    });
    
    const user = new this(userData);
    await user.save();
    
    console.log('✅ User created successfully:', user.email);
    return user;
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    throw error;
  }
};

// ========== INSTANCE METHODS ==========

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('❌ Error comparing password:', error);
    return false;
  }
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  // Remove sensitive data
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpire;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpire;
  delete userObject.__v;
  
  return userObject;
};

// Method to update last active
userSchema.methods.updateLastActive = async function() {
  try {
    this.lastActive = Date.now();
    await this.save({ validateBeforeSave: false });
  } catch (error) {
    console.error('❌ Error updating last active:', error);
  }
};

// Method to generate reset token
userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to generate email verification token
userSchema.methods.getEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

userSchema.methods.verifyEmail = async function() {
  this.isVerified = true;
  this.emailVerificationToken = undefined;
  this.emailVerificationExpire = undefined;
  await this.save({ validateBeforeSave: false });
  return this;
};

// Method to check if email is verified
userSchema.methods.isEmailVerified = function() {
  return this.isVerified === true;
};
// ========== EXPORT ==========

const User = mongoose.model('User', userSchema);
module.exports = User;