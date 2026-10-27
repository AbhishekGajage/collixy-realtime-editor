// models/RoomSession.js - Room Session History Model
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  username: {
    type: String,
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leftAt: {
    type: Date,
    default: null,
  },
}, { _id: false });

const roomSessionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    index: true,
  },
  hostUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Host user ID is required'],
    index: true,
  },
  hostUsername: {
    type: String,
    required: [true, 'Host username is required'],
  },
  participants: [participantSchema],
  language: {
    type: String,
    default: 'javascript',
  },
  // Encrypted code snapshot — stored as AES-256-GCM encrypted string
  encryptedCode: {
    type: String,
    default: '',
  },
  // Encrypted language info for the final snapshot
  encryptedLanguage: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
    index: true,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  // Whether the current user created or joined this room
  // Not stored in DB — computed at query time via virtuals / controller logic
}, {
  timestamps: true, // adds createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound index for efficient user queries
roomSessionSchema.index({ 'participants.userId': 1, createdAt: -1 });
roomSessionSchema.index({ hostUserId: 1, createdAt: -1 });
roomSessionSchema.index({ status: 1, createdAt: -1 });

// Virtual for session duration
roomSessionSchema.virtual('duration').get(function () {
  if (this.closedAt && this.createdAt) {
    return this.closedAt.getTime() - this.createdAt.getTime();
  }
  return null;
});

// Virtual for participant count
roomSessionSchema.virtual('participantCount').get(function () {
  return this.participants ? this.participants.length : 0;
});

const RoomSession = mongoose.model('RoomSession', roomSessionSchema);
module.exports = RoomSession;
