const Room = require('../models/Room');
const Document = require('../models/Document');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

// @desc    Create a new room (from design - "Get Started" creates room)
// @route   POST /api/rooms
// @access  Private
exports.createRoom = async (req, res, next) => {
  try {
    const { documentId, settings } = req.body;
    
    // Check if document exists and user has access
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check permissions
    if (!document.canAccess(req.user.id, 'editor')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create a room for this document'
      });
    }
    
    // Check if room already exists for this document
    let room = await Room.findOne({ documentId });
    
    if (room) {
      // Update existing room
      room.isActive = true;
      room.lastActivity = Date.now();
      await room.save();
      
      return res.json({
        success: true,
        message: 'Room already exists',
        room: room.getRoomInfo(),
        document: {
          id: document._id,
          title: document.title,
          content: document.content,
          language: document.language,
          settings: document.settings
        }
      });
    }
    
    // Generate room ID (from design - users copy/paste room ID)
    const roomId = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
    
    // Create new room
    room = await Room.create({
      roomId,
      documentId,
      createdBy: req.user.id,
      settings: settings || {}
    });
    
    // Update document with roomId
    document.roomId = roomId;
    await document.save();
    
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: room.getRoomInfo(),
      document: {
        id: document._id,
        title: document.title,
        content: document.content,
        language: document.language,
        settings: document.settings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join a room (from design - "paste room ID here" and "Connect")
// @route   POST /api/rooms/join
// @access  Private
exports.joinRoom = async (req, res, next) => {
  try {
    const { roomId, password } = req.body;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }
    
    // Find room
    const room = await Room.findOne({ roomId }).populate('documentId');
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if room is active
    if (!room.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Room is not active'
      });
    }
    
    // Check if room is locked
    if (room.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Room is locked'
      });
    }
    
    // Check password if required
    if (room.password && room.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect room password'
      });
    }
    
    // Check if user has access to the document
    const document = room.documentId;
    if (!document.canAccess(req.user.id, 'viewer')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to join this room'
      });
    }
    
    // Check if room is full
    if (room.activeUsers.length >= room.settings.maxUsers) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }
    
    // Get user info
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      message: 'You can join the room',
      room: room.getRoomInfo(),
      document: {
        id: document._id,
        title: document.title,
        content: document.content,
        language: document.language,
        settings: document.settings,
        version: document.version
      },
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room information
// @route   GET /api/rooms/:roomId
// @access  Private
exports.getRoomInfo = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId })
      .populate('documentId')
      .populate('activeUsers.userId', 'username avatar');
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if user has access to the document
    const document = room.documentId;
    if (!document.canAccess(req.user.id, 'viewer')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this room'
      });
    }
    
    res.json({
      success: true,
      room: room.getRoomInfo(),
      document: {
        id: document._id,
        title: document.title,
        language: document.language,
        owner: document.owner,
        isPublic: document.isPublic
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's active rooms
// @route   GET /api/rooms/user/active
// @access  Private
exports.getUserActiveRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({
      'activeUsers.userId': req.user.id,
      isActive: true
    })
    .populate('documentId', 'title language owner')
    .sort({ lastActivity: -1 })
    .limit(10);
    
    res.json({
      success: true,
      count: rooms.length,
      rooms: rooms.map(room => ({
        roomId: room.roomId,
        document: room.documentId,
        activeUsers: room.activeUsers.length,
        lastActivity: room.lastActivity
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update room settings
// @route   PUT /api/rooms/:roomId/settings
// @access  Private
exports.updateRoomSettings = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { settings, isLocked, password } = req.body;
    
    const room = await Room.findOne({ roomId }).populate('documentId');
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if user is room creator or document admin
    const document = room.documentId;
    if (!document.canAccess(req.user.id, 'admin') && room.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update room settings'
      });
    }
    
    // Update settings
    if (settings) {
      room.settings = { ...room.settings, ...settings };
    }
    
    if (isLocked !== undefined) {
      room.isLocked = isLocked;
    }
    
    if (password !== undefined) {
      room.password = password || null;
    }
    
    await room.save();
    
    res.json({
      success: true,
      message: 'Room settings updated',
      room: room.getRoomInfo()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave room
// @route   POST /api/rooms/:roomId/leave
// @access  Private
exports.leaveRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if user is in the room
    const userIndex = room.activeUsers.findIndex(
      u => u.userId.toString() === req.user.id
    );
    
    if (userIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not in this room'
      });
    }
    
    // Remove user from room
    room.activeUsers.splice(userIndex, 1);
    
    // Add leave message to chat
    room.chat.push({
      userId: req.user.id,
      username: req.user.username,
      message: `${req.user.username} left the room`,
      type: 'leave'
    });
    room.stats.totalMessages += 1;
    
    // Deactivate room if empty
    if (room.activeUsers.length === 0) {
      room.isActive = false;
      room.stats.duration = Math.round((Date.now() - room.createdAt) / (1000 * 60));
    }
    
    await room.save();
    
    res.json({
      success: true,
      message: 'Left room successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room chat history
// @route   GET /api/rooms/:roomId/chat
// @access  Private
exports.getRoomChat = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    
    const room = await Room.findOne({ roomId }).select('chat');
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Filter chat messages
    let chat = room.chat;
    
    if (before) {
      const beforeDate = new Date(before);
      chat = chat.filter(message => message.timestamp < beforeDate);
    }
    
    // Sort by timestamp (newest first) and limit
    chat.sort((a, b) => b.timestamp - a.timestamp);
    chat = chat.slice(0, parseInt(limit));
    
    // Reverse to show oldest first for display
    chat.reverse();
    
    res.json({
      success: true,
      chat,
      total: room.chat.length
    });
  } catch (error) {
    next(error);
  }
};