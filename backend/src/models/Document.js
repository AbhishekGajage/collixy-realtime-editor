const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    default: 'Untitled Document'
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript',
    enum: [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala',
      'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml',
      'markdown', 'sql', 'graphql', 'shell', 'dockerfile', 'makefile'
    ]
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Room information (from design - "paste room ID here", "copy room ID")
  roomId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  
  // Collaboration settings
  isPublic: {
    type: Boolean,
    default: false
  },
  allowCopy: {
    type: Boolean,
    default: true
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  allowSuggestions: {
    type: Boolean,
    default: true
  },
  
  // Collaborators
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
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    joinedAt: Date,
    lastActive: Date
  }],
  
  // Document settings (matches editor from design)
  settings: {
    tabSize: {
      type: Number,
      default: 2,
      min: 1,
      max: 8
    },
    fontSize: {
      type: Number,
      default: 14,
      min: 8,
      max: 32
    },
    lineNumbers: {
      type: Boolean,
      default: true
    },
    wordWrap: {
      type: Boolean,
      default: false
    },
    minimap: {
      type: Boolean,
      default: true
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    formatOnSave: {
      type: Boolean,
      default: false
    },
    autoComplete: {
      type: Boolean,
      default: true
    }
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // History (for undo/redo and version control)
  history: [{
    content: String,
    version: Number,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changeType: {
      type: String,
      enum: ['create', 'edit', 'delete', 'restore'],
      default: 'edit'
    },
    changeSize: Number, // Number of characters changed
    operations: [{
      type: {
        type: String,
        enum: ['insert', 'delete', 'replace']
      },
      position: Number,
      text: String,
      removedText: String
    }]
  }],
  
  // Comments and discussions
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    lineNumber: Number,
    position: {
      line: Number,
      ch: Number
    },
    resolved: {
      type: Boolean,
      default: false
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    edits: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    collaboratorsCount: {
      type: Number,
      default: 0
    }
  },
  
  // Metadata
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // File information (if uploaded)
  fileName: String,
  fileSize: Number,
  fileType: String,
  
  // Access control
  passwordProtected: {
    type: Boolean,
    default: false
  },
  accessPassword: {
    type: String,
    select: false
  },
  
  // Expiry (for temporary documents)
  expiresAt: Date,
  
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
documentSchema.virtual('activeCollaborators', {
  ref: 'Room',
  localField: 'roomId',
  foreignField: 'roomId',
  foreignField: 'activeUsers',
  justOne: false
});

documentSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Indexes
documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ 'collaborators.user': 1 });
documentSchema.index({ isPublic: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ roomId: 1 }, { unique: true, sparse: true });
documentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
documentSchema.index({ title: 'text', description: 'text', content: 'text' });

// Pre-save middleware
documentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.lastModified = Date.now();
    this.version += 1;
    
    // Update stats
    this.stats.edits += 1;
  }
  
  // Update collaborators count
  if (this.isModified('collaborators')) {
    this.stats.collaboratorsCount = this.collaborators.length;
  }
  
  next();
});

// Method to check if user has access
documentSchema.methods.canAccess = function(userId, role = 'viewer') {
  // Owner has all access
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Check public access
  if (this.isPublic && role === 'viewer') {
    return true;
  }
  
  // Check collaborators
  const collaborator = this.collaborators.find(
    c => c.user.toString() === userId.toString()
  );
  
  if (!collaborator) {
    return false;
  }
  
  // Check role hierarchy: admin > editor > viewer
  const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };
  const requiredRoleLevel = roleHierarchy[role];
  const userRoleLevel = roleHierarchy[collaborator.role];
  
  return userRoleLevel >= requiredRoleLevel;
};

// Method to add collaborator
documentSchema.methods.addCollaborator = function(userId, role = 'editor', invitedBy) {
  // Check if already a collaborator
  const existingIndex = this.collaborators.findIndex(
    c => c.user.toString() === userId.toString()
  );
  
  if (existingIndex !== -1) {
    // Update existing collaborator
    this.collaborators[existingIndex].role = role;
    this.collaborators[existingIndex].invitedBy = invitedBy || this.collaborators[existingIndex].invitedBy;
    this.collaborators[existingIndex].invitedAt = Date.now();
  } else {
    // Add new collaborator
    this.collaborators.push({
      user: userId,
      role,
      invitedBy: invitedBy || this.owner,
      invitedAt: Date.now()
    });
  }
};

// Method to remove collaborator
documentSchema.methods.removeCollaborator = function(userId) {
  const index = this.collaborators.findIndex(
    c => c.user.toString() === userId.toString()
  );
  
  if (index !== -1) {
    this.collaborators.splice(index, 1);
    return true;
  }
  
  return false;
};

// Method to create a snapshot for history
documentSchema.methods.createHistorySnapshot = function(userId, changeType = 'edit', operations = []) {
  const changeSize = Math.abs(this.content.length - (this.history[this.history.length - 1]?.content?.length || 0));
  
  this.history.push({
    content: this.content,
    version: this.version - 1,
    modifiedBy: userId,
    changeType,
    changeSize,
    operations
  });
  
  // Keep only last 100 history entries
  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }
};

module.exports = mongoose.model('Document', documentSchema);