const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript',
    enum: ['javascript', 'python', 'java', 'cpp', 'html', 'css', 'typescript', 'json', 'markdown', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
  isPublic: {
    type: Boolean,
    default: false
  },
  roomId: {
    type: String,
    unique: true,
    sparse: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  },
  history: [{
    content: String,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    version: Number,
    changeType: {
      type: String,
      enum: ['create', 'edit', 'delete'],
      default: 'edit'
    }
  }],
  settings: {
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
    autoSave: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for simplified collaborators info
documentSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators.length;
});

// Virtual for active users count (populated from rooms)
documentSchema.virtual('activeUsers', {
  ref: 'Room',
  localField: 'roomId',
  foreignField: 'roomId',
  justOne: true,
  options: { select: 'activeUsers' }
});

// Indexes for faster queries
documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ isPublic: 1 });
documentSchema.index({ roomId: 1 }, { unique: true, sparse: true });
documentSchema.index({ 'collaborators.user': 1 });

// Update lastModified timestamp on save
documentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.lastModified = Date.now();
    this.version += 1;
    
    // Add to history if content changed significantly
    if (this.content.length > 0) {
      this.history.push({
        content: this.content,
        modifiedBy: this.owner, // In real app, track who made the change
        version: this.version - 1,
        changeType: 'edit'
      });
      
      // Keep only last 50 history entries
      if (this.history.length > 50) {
        this.history = this.history.slice(-50);
      }
    }
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);