const Room = require('../models/Room');
const Document = require('../models/Document');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate random color for user cursor
const generateColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
    '#118AB2', '#EF476F', '#7209B7', '#F3722C',
    '#43AA8B', '#F9C74F', '#277DA1', '#F9844A'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const socketHandler = (io) => {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username email avatar');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      };
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.id})`);

    // Join room handler
    socket.on('join-room', async (data, callback) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          if (callback) callback({ error: 'Room ID is required' });
          return;
        }

        // Find document by roomId
        const document = await Document.findOne({ roomId })
          .populate('owner', 'username email avatar')
          .populate('collaborators.user', 'username email avatar');
        
        if (!document) {
          if (callback) callback({ error: 'Document not found' });
          return;
        }

        // Check permissions
        const canAccess = 
          document.owner._id.toString() === socket.user._id.toString() ||
          document.collaborators.some(c => c.user._id.toString() === socket.user._id.toString()) ||
          document.isPublic;

        if (!canAccess) {
          if (callback) callback({ error: 'Not authorized to join this room' });
          return;
        }

        // Find or create room
        let room = await Room.findOne({ roomId });
        
        if (!room) {
          room = await Room.create({
            roomId,
            documentId: document._id,
            activeUsers: []
          });
        }

        // Check if user is already in the room
        const existingUserIndex = room.activeUsers.findIndex(
          user => user.userId.toString() === socket.user._id.toString()
        );

        const userColor = generateColor();
        
        if (existingUserIndex !== -1) {
          // Update existing user's socketId
          room.activeUsers[existingUserIndex].socketId = socket.id;
          room.activeUsers[existingUserIndex].joinedAt = new Date();
        } else {
          // Add new user to room
          room.activeUsers.push({
            userId: socket.user._id,
            socketId: socket.id,
            username: socket.user.username,
            avatar: socket.user.avatar,
            color: userColor,
            cursorPosition: { line: 0, ch: 0 },
            joinedAt: new Date()
          });
        }

        await room.save();
        
        // Join socket room
        socket.join(roomId);
        
        // Store room info in socket
        socket.roomId = roomId;
        
        // Get updated room info
        const updatedRoom = await Room.findOne({ roomId })
          .populate('activeUsers.userId', 'username avatar');

        // Send success response
        if (callback) {
          callback({
            success: true,
            document: {
              _id: document._id,
              title: document.title,
              content: document.content,
              language: document.language,
              version: document.version,
              settings: document.settings
            },
            room: updatedRoom,
            userColor
          });
        }

        // Notify others in the room about new user
        socket.to(roomId).emit('user-joined', {
          userId: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar,
          socketId: socket.id,
          color: userColor
        });

        // Send list of active users to all users in room
        io.to(roomId).emit('active-users-update', {
          users: updatedRoom.activeUsers.map(user => ({
            userId: user.userId._id || user.userId,
            username: user.username,
            avatar: user.avatar,
            socketId: user.socketId,
            color: user.color,
            cursorPosition: user.cursorPosition
          }))
        });

        console.log(`👥 ${socket.user.username} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        if (callback) {
          callback({ error: 'Failed to join room', details: error.message });
        }
      }
    });

    // Handle text changes with operational transformation
    socket.on('text-change', async (data) => {
      try {
        const { roomId, changes, version, clientId } = data;
        
        if (!socket.roomId || socket.roomId !== roomId) {
          console.warn(`User ${socket.user.username} tried to send changes to room ${roomId} but is in room ${socket.roomId}`);
          return;
        }

        // Broadcast changes to other users in the room (excluding sender)
        socket.to(roomId).emit('text-change', {
          changes,
          version,
          clientId,
          userId: socket.user._id,
          username: socket.user.username,
          timestamp: Date.now()
        });

        // Update document content in database (debounced)
        // In production, use a queue system or debounce this
        const updateDocument = async () => {
          try {
            await Document.findOneAndUpdate(
              { roomId },
              { 
                content: changes.content || '',
                lastModified: Date.now(),
                $inc: { version: 1 }
              }
            );
          } catch (error) {
            console.error('Error updating document:', error);
          }
        };

        // Simple debounce - update after 2 seconds of inactivity
        if (socket.debounceTimeout) {
          clearTimeout(socket.debounce