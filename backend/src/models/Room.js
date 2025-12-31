const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  // Room ID (from design - users paste/connect using this)
  roomId: {
    type: String,
    required: true,
    unique: true,
    // index: true // Not needed when unique: true is present
  },
  
  // Associated document
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  
  // Room creator/owner
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Active users in the room (from design - shows multiple users)
  activeUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    socketId: String,
    username: String,
    avatar: String,
    color: String, // User color for cursor/selection
    cursorPosition: {
      line: Number,
      ch: Number
    },
    selection: {
      anchor: { line: Number, ch: Number },
      head: { line: Number, ch: Number }
    },
    isTyping: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Room settings
  settings: {
    maxUsers: {
      type: Number,
      default: 50,
      min: 1,
      max: 100
    },
    allowAnonymous: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    chatEnabled: {
      type: Boolean,
      default: true
    },
    cursorSharing: {
      type: Boolean,
      default: true
    },
    selectionSharing: {
      type: Boolean,
      default: true
    }
  },
  
  // Chat messages in the room
  chat: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    avatar: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['message', 'join', 'leave', 'system'],
      default: 'message'
    }
  }],
  
  // Room state
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    select: false
  },
  
  // Statistics
  stats: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    },
    totalEdits: {
      type: Number,
      default: 0
    },
    peakUsers: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number, // in minutes
      default: 0
    }
  },
  
  // Activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // This creates an ascending index automatically
  },
  
  // Expiry for temporary rooms
  expiresAt: {
    type: Date,
    index: true, // This creates an index automatically
    expires: 0 // Auto-delete after expiresAt
  }
}, {
  timestamps: true
});

// Indexes - REMOVED DUPLICATES
// Keep only indexes that aren't already defined in field definitions
roomSchema.index({ documentId: 1 });
roomSchema.index({ 'activeUsers.userId': 1 });
roomSchema.index({ lastActivity: -1 }); // Keep this - it's a descending index

// Pre-save middleware
roomSchema.pre('save', function(next) {
  // Update peak users
  if (this.activeUsers.length > this.stats.peakUsers) {
    this.stats.peakUsers = this.activeUsers.length;
  }
  
  // Update last activity
  this.lastActivity = Date.now();
  
  next();
});

// Method to add user to room
roomSchema.methods.addUser = function(user, socketId, color) {
  // Check if user already in room
  const existingIndex = this.activeUsers.findIndex(
    u => u.userId.toString() === user._id.toString()
  );
  
  if (existingIndex !== -1) {
    // Update existing user
    this.activeUsers[existingIndex].socketId = socketId;
    this.activeUsers[existingIndex].lastActivity = Date.now();
    this.activeUsers[existingIndex].color = color || this.activeUsers[existingIndex].color;
  } else {
    // Add new user
    this.activeUsers.push({
      userId: user._id,
      socketId,
      username: user.username,
      avatar: user.avatar,
      color: color || this.generateUserColor(),
      cursorPosition: { line: 0, ch: 0 },
      joinedAt: Date.now(),
      lastActivity: Date.now()
    });
    
    // Update stats
    this.stats.totalUsers += 1;
    
    // Add join message to chat
    this.chat.push({
      userId: user._id,
      username: user.username,
      message: `${user.username} joined the room`,
      type: 'join'
    });
    this.stats.totalMessages += 1;
  }
};

// Method to remove user from room
roomSchema.methods.removeUser = function(socketId) {
  const index = this.activeUsers.findIndex(u => u.socketId === socketId);
  
  if (index !== -1) {
    const user = this.activeUsers[index];
    
    // Add leave message to chat
    this.chat.push({
      userId: user.userId,
      username: user.username,
      message: `${user.username} left the room`,
      type: 'leave'
    });
    this.stats.totalMessages += 1;
    
    // Remove user
    this.activeUsers.splice(index, 1);
    
    // Deactivate room if empty
    if (this.activeUsers.length === 0) {
      this.isActive = false;
      this.stats.duration = Math.round((Date.now() - this.createdAt) / (1000 * 60)); // minutes
    }
    
    return user;
  }
  
  return null;
};

// Method to update user activity
roomSchema.methods.updateUserActivity = function(socketId, cursorPosition, selection, isTyping = false) {
  const userIndex = this.activeUsers.findIndex(u => u.socketId === socketId);
  
  if (userIndex !== -1) {
    this.activeUsers[userIndex].lastActivity = Date.now();
    
    if (cursorPosition) {
      this.activeUsers[userIndex].cursorPosition = cursorPosition;
    }
    
    if (selection) {
      this.activeUsers[userIndex].selection = selection;
    }
    
    this.activeUsers[userIndex].isTyping = isTyping;
    
    return true;
  }
  
  return false;
};

// Method to add chat message
roomSchema.methods.addChatMessage = function(userId, username, avatar, message) {
  this.chat.push({
    userId,
    username,
    avatar,
    message,
    type: 'message',
    timestamp: Date.now()
  });
  
  this.stats.totalMessages += 1;
  this.lastActivity = Date.now();
};

// Method to generate random color for user
roomSchema.methods.generateUserColor = function() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
    '#118AB2', '#EF476F', '#7209B7', '#F3722C',
    '#43AA8B', '#F9C74F', '#277DA1', '#F9844A'
  ];
  
  // Find a color not currently in use
  const usedColors = this.activeUsers.map(u => u.color);
  const availableColors = colors.filter(color => !usedColors.includes(color));
  
  return availableColors.length > 0 
    ? availableColors[0] 
    : colors[Math.floor(Math.random() * colors.length)];
};

// Method to get room info for clients
roomSchema.methods.getRoomInfo = function() {
  return {
    roomId: this.roomId,
    documentId: this.documentId,
    createdBy: this.createdBy,
    activeUsers: this.activeUsers.map(user => ({
      userId: user.userId,
      username: user.username,
      avatar: user.avatar,
      color: user.color,
      cursorPosition: user.cursorPosition,
      selection: user.selection,
      isTyping: user.isTyping
    })),
    settings: this.settings,
    stats: this.stats,
    isActive: this.isActive,
    isLocked: this.isLocked,
    createdAt: this.createdAt,
    lastActivity: this.lastActivity
  };
};

module.exports = mongoose.model('Room', roomSchema);