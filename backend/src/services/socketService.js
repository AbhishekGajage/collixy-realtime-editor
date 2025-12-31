const Room = require('../models/Room');
const Document = require('../models/Document');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Store active connections
const activeConnections = new Map();

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
      const user = await User.findById(decoded.id).select('username email avatar settings');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        settings: user.settings
      };
      
      // Store connection
      activeConnections.set(socket.id, {
        userId: user._id,
        username: user.username,
        socketId: socket.id,
        connectedAt: Date.now()
      });
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.id})`);
    
    // Store user's current room
    socket.currentRoom = null;

    // Join room handler (from design - users join via room ID)
    socket.on('join-room', async (data, callback) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          if (callback) callback({ error: 'Room ID is required' });
          return;
        }

        // Find room
        const room = await Room.findOne({ roomId }).populate('documentId');
        
        if (!room) {
          if (callback) callback({ error: 'Room not found' });
          return;
        }

        // Check if room is active
        if (!room.isActive) {
          if (callback) callback({ error: 'Room is not active' });
          return;
        }

        // Check if user has access to the document
        const document = room.documentId;
        if (!document.canAccess(socket.user._id, 'viewer')) {
          if (callback) callback({ error: 'Not authorized to join this room' });
          return;
        }

        // Check if room is full
        if (room.activeUsers.length >= room.settings.maxUsers) {
          if (callback) callback({ error: 'Room is full' });
          return;
        }

        // Generate or get user color
        const existingUser = room.activeUsers.find(
          u => u.userId.toString() === socket.user._id.toString()
        );
        
        const userColor = existingUser ? existingUser.color : generateColor();
        
        // Add user to room
        room.addUser(socket.user, socket.id, userColor);
        await room.save();
        
        // Join socket room
        socket.join(roomId);
        socket.currentRoom = roomId;
        
        // Send success response with room data
        if (callback) {
          callback({
            success: true,
            room: room.getRoomInfo(),
            document: {
              id: document._id,
              title: document.title,
              content: document.content,
              language: document.language,
              settings: document.settings,
              version: document.version
            },
            userColor,
            user: {
              id: socket.user._id,
              username: socket.user.username,
              avatar: socket.user.avatar
            }
          });
        }

        // Notify other users in the room
        socket.to(roomId).emit('user-joined', {
          userId: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar,
          socketId: socket.id,
          color: userColor,
          timestamp: Date.now()
        });

        // Send updated active users list to everyone in room
        io.to(roomId).emit('active-users', {
          users: room.activeUsers.map(user => ({
            userId: user.userId,
            username: user.username,
            avatar: user.avatar,
            socketId: user.socketId,
            color: user.color,
            cursorPosition: user.cursorPosition,
            selection: user.selection,
            isTyping: user.isTyping
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

    // Handle text changes (real-time editing)
    socket.on('text-change', async (data) => {
      try {
        const { roomId, changes, version, clientId } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          console.warn(`User ${socket.user.username} tried to send changes to room ${roomId} but is in room ${socket.currentRoom}`);
          return;
        }

        // Find room and document
        const room = await Room.findOne({ roomId });
        if (!room) return;

        const document = await Document.findById(room.documentId);
        if (!document) return;

        // Check if user can edit
        if (!document.canAccess(socket.user._id, 'editor')) {
          socket.emit('error', { message: 'Not authorized to edit this document' });
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

        // Update document in database (debounced)
        const updateDocument = async () => {
          try {
            // Update document content
            document.content = changes.content || document.content;
            document.lastModified = Date.now();
            document.lastModifiedBy = socket.user._id;
            document.version = version;
            
            // Add to history
            document.createHistorySnapshot(socket.user._id, 'edit', changes.operations);
            
            await document.save();
            
            // Update room activity
            room.lastActivity = Date.now();
            room.stats.totalEdits += 1;
            await room.save();
            
            // Update user editing time
            await User.findByIdAndUpdate(socket.user._id, {
              $inc: { 'stats.totalEditingTime': 0.1 } // Approximate 6 seconds per edit
            });
          } catch (error) {
            console.error('Error updating document:', error);
          }
        };

        // Simple debounce - update after 2 seconds of inactivity
        if (socket.debounceTimeout) {
          clearTimeout(socket.debounceTimeout);
        }
        socket.debounceTimeout = setTimeout(updateDocument, 2000);

      } catch (error) {
        console.error('Text change error:', error);
        socket.emit('error', { message: 'Failed to process text change' });
      }
    });

    // Handle cursor movement (from design - live cursors)
    socket.on('cursor-move', async (data) => {
      try {
        const { roomId, cursorPosition, selection } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          return;
        }

        // Update cursor in database
        const room = await Room.findOne({ roomId });
        if (!room) return;

        room.updateUserActivity(socket.id, cursorPosition, selection);
        await room.save();

        // Broadcast cursor movement to other users
        socket.to(roomId).emit('cursor-move', {
          socketId: socket.id,
          userId: socket.user._id,
          username: socket.user.username,
          cursorPosition,
          selection,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Cursor move error:', error);
      }
    });

    // Handle typing status
    socket.on('typing-status', async (data) => {
      try {
        const { roomId, isTyping } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          return;
        }

        // Update typing status in database
        const room = await Room.findOne({ roomId });
        if (!room) return;

        room.updateUserActivity(socket.id, null, null, isTyping);
        await room.save();

        // Broadcast typing status to other users
        socket.to(roomId).emit('typing-status', {
          userId: socket.user._id,
          username: socket.user.username,
          isTyping,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Typing status error:', error);
      }
    });

    // Handle language change (from design - editor supports multiple languages)
    socket.on('language-change', async (data) => {
      try {
        const { roomId, language } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          return;
        }

        const room = await Room.findOne({ roomId });
        if (!room) return;

        const document = await Document.findById(room.documentId);
        if (!document) return;

        // Check if user can change language (editor or admin)
        if (!document.canAccess(socket.user._id, 'editor')) {
          socket.emit('error', { message: 'Not authorized to change language' });
          return;
        }

        // Update document language
        document.language = language;
        await document.save();

        // Broadcast language change to all users in room
        io.to(roomId).emit('language-change', {
          language,
          changedBy: socket.user.username,
          userId: socket.user._id,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Language change error:', error);
        socket.emit('error', { message: 'Failed to change language' });
      }
    });

    // Handle settings change (editor settings)
    socket.on('settings-change', async (data) => {
      try {
        const { roomId, settings } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          return;
        }

        const room = await Room.findOne({ roomId });
        if (!room) return;

        const document = await Document.findById(room.documentId);
        if (!document) return;

        // Check if user can change settings (admin only)
        if (!document.canAccess(socket.user._id, 'admin')) {
          socket.emit('error', { message: 'Only admins can change document settings' });
          return;
        }

        // Update document settings
        document.settings = { ...document.settings, ...settings };
        await document.save();

        // Broadcast settings change to all users in room
        io.to(roomId).emit('settings-change', {
          settings: document.settings,
          changedBy: socket.user.username,
          userId: socket.user._id,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Settings change error:', error);
      }
    });

    // Handle chat message (from design - team collaboration with communication)
    socket.on('chat-message', async (data) => {
      try {
        const { roomId, message } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          return;
        }

        if (!message || message.trim().length === 0) {
          return;
        }

        const room = await Room.findOne({ roomId });
        if (!room) return;

        // Add message to room chat
        room.addChatMessage(
          socket.user._id,
          socket.user.username,
          socket.user.avatar,
          message.trim()
        );
        await room.save();

        // Broadcast chat message to all users in room
        io.to(roomId).emit('chat-message', {
          userId: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar,
          message: message.trim(),
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Chat message error:', error);
      }
    });

    // Handle leave room (from design - logout/leave functionality)
    socket.on('leave-room', async () => {
      await handleUserLeave(socket);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username} (${socket.id})`);
      await handleUserLeave(socket);
      
      // Remove from active connections
      activeConnections.delete(socket.id);
    });

    // Handle ping for connection health
    socket.on('ping', (callback) => {
      if (callback) callback({ 
        timestamp: Date.now(),
        serverTime: new Date().toISOString()
      });
    });

    // Handle request for room info
    socket.on('get-room-info', async (data, callback) => {
      try {
        const { roomId } = data;
        
        const room = await Room.findOne({ roomId }).populate('documentId');
        
        if (!room) {
          if (callback) callback({ error: 'Room not found' });
          return;
        }

        if (callback) {
          callback({
            success: true,
            room: room.getRoomInfo(),
            document: {
              id: room.documentId._id,
              title: room.documentId.title,
              language: room.documentId.language,
              settings: room.documentId.settings
            }
          });
        }
      } catch (error) {
        console.error('Get room info error:', error);
        if (callback) callback({ error: 'Failed to get room info' });
      }
    });

    // Handle output update (from design - shows output section)
    socket.on('output-update', async (data) => {
      try {
        const { roomId, output } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          return;
        }

        // Broadcast output to all users in room
        io.to(roomId).emit('output-update', {
          output,
          userId: socket.user._id,
          username: socket.user.username,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Output update error:', error);
      }
    });

    // Handle selection sharing (multiple users selecting text)
    socket.on('selection-change', async (data) => {
      try {
        const { roomId, selection } = data;
        
        if (!socket.currentRoom || socket.currentRoom !== roomId) {
          return;
        }

        const room = await Room.findOne({ roomId });
        if (!room) return;

        room.updateUserActivity(socket.id, null, selection);
        await room.save();

        // Broadcast selection change to other users
        socket.to(roomId).emit('selection-change', {
          socketId: socket.id,
          userId: socket.user._id,
          username: socket.user.username,
          selection,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Selection change error:', error);
      }
    });
  });

  // Helper function to handle user leaving
  const handleUserLeave = async (socket) => {
    try {
      const { currentRoom } = socket;
      
      if (currentRoom) {
        const room = await Room.findOne({ roomId: currentRoom });
        
        if (room) {
          // Remove user from room
          const removedUser = room.removeUser(socket.id);
          
          if (removedUser) {
            // Notify remaining users
            socket.to(currentRoom).emit('user-left', {
              socketId: socket.id,
              userId: removedUser.userId,
              username: removedUser.username,
              timestamp: Date.now()
            });
            
            // Send updated active users list
            io.to(currentRoom).emit('active-users', {
              users: room.activeUsers.map(user => ({
                userId: user.userId,
                username: user.username,
                avatar: user.avatar,
                socketId: user.socketId,
                color: user.color,
                cursorPosition: user.cursorPosition,
                selection: user.selection,
                isTyping: user.isTyping
              }))
            });
            
            await room.save();
            console.log(`🚪 ${removedUser.username} left room ${currentRoom}`);
          }
        }

        // Leave socket room
        socket.leave(currentRoom);
        socket.currentRoom = null;
      }
    } catch (error) {
      console.error('Error handling user leave:', error);
    }
  };

  // Periodic cleanup of inactive rooms
  setInterval(async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const result = await Room.updateMany(
        {
          lastActivity: { $lt: oneHourAgo },
          isActive: true,
          activeUsers: { $size: 0 }
        },
        {
          isActive: false,
          stats: { duration: Math.round((Date.now() - '$createdAt') / (1000 * 60)) }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`🧹 Deactivated ${result.modifiedCount} inactive rooms`);
      }
    } catch (error) {
      console.error('Error cleaning up rooms:', error);
    }
  }, 30 * 60 * 1000); // Run every 30 minutes
};

module.exports = socketHandler;