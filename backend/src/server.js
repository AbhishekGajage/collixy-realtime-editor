// backend/src/server.js - COMPLETE FIXED VERSION WITH GOOGLE AUTH

require("dotenv").config();

// Normalize environment URLs (strip trailing slashes)
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = process.env.FRONTEND_URL.replace(/\/+$/, "");
}
if (process.env.BACKEND_URL) {
  process.env.BACKEND_URL = process.env.BACKEND_URL.replace(/\/+$/, "");
}

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./utils/Actions");
const RoomSession = require("./models/RoomSession");
const User = require("./models/User");
const { encrypt } = require("./utils/encryption");
const app = express();
app.set("trust proxy", 1);

// Helper to validate allowed CORS origins
function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/+$/, "");

  const envOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const allowedOrigins = [
    ...envOrigins,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  if (process.env.NODE_ENV === "development") return true;
  if (allowedOrigins.includes(normalizedOrigin)) return true;
  if (normalizedOrigin.endsWith(".onrender.com")) return true;

  return false;
}

// ========== SOCKET.IO SETUP ==========
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.log("⚠️ Socket.io CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Store active rooms and users
const rooms = new Map();
const users = new Map();
const disconnectTimers = new Map(); // socketId -> { timerId, roomId, username }

// Helper: check if a username is already active in a DIFFERENT room.
// Returns { roomId, user } if found, or null otherwise.
function findUserInOtherRoom(username, targetRoomId) {
  const normalized = (username || "").toLowerCase().trim();
  for (const [rId, room] of rooms) {
    if (rId === targetRoomId) continue; // same room is OK (handled separately)
    for (const u of room.users.values()) {
      if (u.username.toLowerCase().trim() === normalized && u.isOnline) {
        return { roomId: rId, user: u };
      }
    }
  }
  return null;
}

// Helper: check if a username is already ONLINE in ANY room (including the target).
// Returns { roomId, user } if found, or null otherwise.
function findUserInAnyRoom(username) {
  const normalized = (username || "").toLowerCase().trim();
  for (const [rId, room] of rooms) {
    for (const u of room.users.values()) {
      if (u.username.toLowerCase().trim() === normalized && u.isOnline) {
        return { roomId: rId, user: u };
      }
    }
  }
  return null;
}

// ========== SOCKET.IO CONNECTION HANDLING ==========
io.on("connection", (socket) => {
  console.log(`✅ [BACKEND] New socket connection: ${socket.id}`);
  console.log(`   Origin: ${socket.handshake.headers.origin}`);
  console.log(`   User-Agent: ${socket.handshake.headers["user-agent"]}`);

  // ========== CREATE ROOM ==========
  socket.on(
    ACTIONS.CREATE_ROOM,
    async ({ roomId, username, language = "javascript", code = "" }) => {
      try {
        console.log(`🏗️ [BACKEND] CREATE_ROOM event received`);
        console.log(`   Room ID from client: ${roomId}`);
        console.log(`   Username: ${username || "Anonymous"}`);
        console.log(`   Language: ${language}`);

        // Room IDs are matched by exact Map key, so normalize before any lookup.
        roomId = typeof roomId === "string" ? roomId.trim() : roomId;

        // Check if room ID is provided
        if (!roomId) {
          console.log("❌ [BACKEND] No roomId provided in CREATE_ROOM");
          socket.emit(ACTIONS.ERROR, {
            message: "Room ID is required",
            roomId: null,
          });
          return;
        }

        // Check if this user is already ONLINE in ANY room (same or different)
        const activeRoom = findUserInAnyRoom(username);
        if (activeRoom) {
          console.log(
            `⚠️ [BACKEND] User "${username}" is already online in room ${activeRoom.roomId} — must leave first`
          );
          if (activeRoom.roomId === roomId) {
            socket.emit(ACTIONS.USER_ALREADY_IN_ROOM, {
              roomId: activeRoom.roomId,
              username,
              message: `You are already in this room from another session. Please close the other session first.`,
            });
          } else {
            socket.emit(ACTIONS.USER_ALREADY_IN_ANOTHER_ROOM, {
              roomId: activeRoom.roomId,
              username,
              message: `You are already in another room. Please leave that room first before creating a new one.`,
            });
          }
          return;
        }

        // Room already exists. This happens when a re-mounted effect emits
        // CREATE_ROOM twice, or when the creator returns after a refresh.
        // Erroring out used to leave this socket outside the socket.io room, so
        // it never received USER_JOINED / CODE_UPDATED / ROOM_USERS_UPDATED.
        // Treat it as a join instead.
        if (rooms.has(roomId)) {
          const existing = rooms.get(roomId);
          console.log(
            `ℹ️ [BACKEND] Room ${roomId} already exists — joining it instead of creating`
          );

          if (existing.users.size >= (existing.maxUsers || 10)) {
            socket.emit(ACTIONS.ROOM_FULL, {
              roomId,
              currentUsers: existing.users.size,
              maxUsers: existing.maxUsers || 10,
              message: "Room is full",
            });
            return;
          }

          // Check if a user with the same username is already in the room
          const normalizedUsername = (username || "").toLowerCase().trim();

          // Reconnection check: if user with same username is already in room (offline or replacing stale socket)
          const existingInRoom = Array.from(existing.users.values()).find(
            (u) => u.username.toLowerCase().trim() === normalizedUsername
          );
          if (existingInRoom) {
            // If the existing entry is ONLINE, this is a duplicate session — block it
            if (existingInRoom.isOnline && existingInRoom.id !== socket.id) {
              console.log(
                `⚠️ [BACKEND] User "${username}" already has an active session in room ${roomId} — blocking duplicate`
              );
              socket.emit(ACTIONS.USER_ALREADY_IN_ROOM, {
                roomId,
                username,
                message: `You are already in this room from another session. Please close the other session first.`,
              });
              return;
            }

            // Existing entry is OFFLINE — genuine reconnection (e.g., page refresh)
            // Cancel grace period timer and swap socket ID
            const oldSocketId = existingInRoom.id;
            const timerEntry = disconnectTimers.get(oldSocketId);
            if (timerEntry) {
              clearTimeout(timerEntry.timerId);
              disconnectTimers.delete(oldSocketId);
            }

            if (oldSocketId && oldSocketId !== socket.id) {
              const oldSocket = io.sockets.sockets.get(oldSocketId);
              if (oldSocket) {
                console.log(`🔌 [BACKEND] Disconnecting superseded socket ${oldSocketId} for host ${username}`);
                oldSocket.disconnect(true);
              }
              existing.users.delete(oldSocketId);
              users.delete(oldSocketId);
            }

            existingInRoom.id = socket.id;
            existingInRoom.isOnline = true;
            existingInRoom.disconnectedAt = null;

            users.set(socket.id, { ...existingInRoom, roomId });
            socket.join(roomId);
            existing.users.set(socket.id, existingInRoom);
            if (existingInRoom.isHost) existing.host = socket.id;

            const existingUsers = Array.from(existing.users.values()).filter(u => u.isOnline);
            console.log(`🔄 [BACKEND] ${username} reconnected to room ${roomId} (host: ${existingInRoom.isHost})`);

            socket.emit(ACTIONS.ROOM_CREATED, {
              roomId,
              user: existingInRoom,
              message: `Reconnected to room ${roomId}`,
              createdAt: existing.createdAt,
              timestamp: new Date().toISOString(),
            });
            socket.emit(ACTIONS.JOINED, {
              roomId,
              user: existingInRoom,
              clients: existingUsers,
              roomInfo: {
                roomId,
                totalUsers: existingUsers.length,
                createdAt: existing.createdAt,
                language: existing.language || "javascript",
                host: existing.users.get(existing.host)?.username || "Unknown",
                code: existing.code || "",
              },
            });
            socket.emit(ACTIONS.SYNC_CODE, {
              code: existing.code || "",
              language: existing.language || "javascript",
              lastUpdated: existing.lastUpdated,
            });
            socket.to(roomId).emit(ACTIONS.USER_JOINED, {
              user: existingInRoom,
              timestamp: new Date().toISOString(),
              totalUsers: existingUsers.length,
            });
            io.to(roomId).emit(ACTIONS.ROOM_USERS_UPDATED, {
              roomId,
              clients: existingUsers,
              userJoined: existingInRoom.username,
              totalUsers: existingUsers.length,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          // If everyone left, whoever comes back becomes the host.
          const onlineCount = Array.from(existing.users.values()).filter(u => u.isOnline).length;
          const becomesHost = onlineCount === 0;
          const rejoiningUser = {
            id: socket.id,
            username: username || `User-${socket.id.substring(0, 5)}`,
            joinedAt: new Date().toISOString(),
            isOnline: true,
            isHost: becomesHost,
          };
          if (becomesHost) existing.host = socket.id;

          users.set(socket.id, { ...rejoiningUser, roomId });
          socket.join(roomId);
          existing.users.set(socket.id, rejoiningUser);

          const existingUsers = Array.from(existing.users.values()).filter(u => u.isOnline);

          if (!existing.code && code) {
            existing.code = code;
          }

          socket.emit(ACTIONS.ROOM_CREATED, {
            roomId,
            user: rejoiningUser,
            message: `Joined existing room ${roomId}`,
            createdAt: existing.createdAt,
            timestamp: new Date().toISOString(),
          });
          socket.emit(ACTIONS.JOINED, {
            roomId,
            user: rejoiningUser,
            clients: existingUsers,
            roomInfo: {
              roomId,
              totalUsers: existingUsers.length,
              createdAt: existing.createdAt,
              language: existing.language || "javascript",
              host: existing.users.get(existing.host)?.username || "Unknown",
              code: existing.code || "",
            },
          });
          socket.emit(ACTIONS.SYNC_CODE, {
            code: existing.code || "",
            language: existing.language || "javascript",
            lastUpdated: existing.lastUpdated,
          });
          socket.to(roomId).emit(ACTIONS.USER_JOINED, {
            user: rejoiningUser,
            timestamp: new Date().toISOString(),
            totalUsers: existingUsers.length,
          });
          io.to(roomId).emit(ACTIONS.ROOM_USERS_UPDATED, {
            roomId,
            clients: existingUsers,
            userJoined: rejoiningUser.username,
            totalUsers: existingUsers.length,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Create user object
        const user = {
          id: socket.id,
          username: username || `User-${socket.id.substring(0, 5)}`,
          joinedAt: new Date().toISOString(),
          isOnline: true,
          isHost: true,
        };

        // Store user globally
        users.set(socket.id, {
          ...user,
          roomId,
        });

        // Create room WITH THE ID FROM FRONTEND
        const room = {
          id: roomId, // Use the ID from frontend
          host: socket.id,
          hostUsername: user.username,
          code: typeof code === "string" ? code : "",
          language: language,
          users: new Map([[socket.id, user]]),
          createdAt: new Date(),
          lastUpdated: new Date(),
          maxUsers: 10,
        };

        rooms.set(roomId, room);

        // Join the socket room
        socket.join(roomId);

        console.log(`✅ [BACKEND] Room created: ${roomId} by ${user.username}`);
        console.log(`   Users in room: ${room.users.size}`);
        console.log(`   All rooms now:`, Array.from(rooms.keys()));

        // ========== PERSIST SESSION TO DB ==========
        try {
          // Look up the host user in the database by username
          const hostUser = await User.findOne({ username: user.username });
          if (hostUser) {
            const session = new RoomSession({
              roomId,
              hostUserId: hostUser._id,
              hostUsername: user.username,
              language: language,
              participants: [{
                userId: hostUser._id,
                username: user.username,
                joinedAt: new Date(),
              }],
              status: 'active',
            });
            await session.save();
            room.sessionId = session._id;
            console.log(`💾 [BACKEND] Session ${session._id} persisted for room ${roomId}`);
          } else {
            console.warn(`⚠️ [BACKEND] Host user "${user.username}" not found in DB — session not persisted`);
          }
        } catch (dbErr) {
          console.error('❌ [BACKEND] Failed to persist session:', dbErr.message);
        }

        // Send room created event back to creator
        socket.emit(ACTIONS.ROOM_CREATED, {
          roomId,
          user,
          message: `Room ${roomId} created successfully!`,
          createdAt: room.createdAt,
          timestamp: new Date().toISOString(),
        });

        // Send joined event with room info
        socket.emit(ACTIONS.JOINED, {
          roomId,
          user,
          clients: [user],
          roomInfo: {
            roomId,
            totalUsers: 1,
            createdAt: room.createdAt,
            language: room.language,
            host: user.username,
          },
        });
      } catch (error) {
        console.error("❌ [BACKEND] Error in CREATE_ROOM event:", error);
        socket.emit(ACTIONS.ERROR, {
          message: "Failed to create room",
          error: error.message,
        });
      }
    }
  );

  // ========== JOIN ROOM ==========
  // ========== JOIN ROOM ==========
  socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
    try {
      // Pasted room IDs routinely carry whitespace/newlines; the Map lookup below
      // is exact, so normalize first or a valid ID reports ROOM_NOT_FOUND.
      roomId = typeof roomId === "string" ? roomId.trim() : roomId;

      console.log(`👥 [BACKEND] JOIN event received`);
      console.log(`   Room: ${roomId}`);
      console.log(`   Username: ${username || 'Anonymous'}`);
      console.log(`   Socket ID: ${socket.id}`);

      // DEBUG: Show all existing rooms
      const allRooms = Array.from(rooms.keys());
      console.log(`📊 [DEBUG] ALL EXISTING ROOMS:`, allRooms);
      console.log(`📊 [DEBUG] Does room ${roomId} exist? ${rooms.has(roomId)}`);

      // Validate input
      if (!roomId) {
        console.log('❌ [BACKEND] No roomId provided');
        socket.emit(ACTIONS.ERROR, { message: 'Room ID is required' });
        return;
      }

      // Check if this user is already ONLINE in ANY room (same or different)
      const activeRoom = findUserInAnyRoom(username);
      if (activeRoom) {
        console.log(
          `⚠️ [BACKEND] User "${username}" is already online in room ${activeRoom.roomId} — must leave first`
        );
        if (activeRoom.roomId === roomId) {
          socket.emit(ACTIONS.USER_ALREADY_IN_ROOM, {
            roomId: activeRoom.roomId,
            username,
            message: `You are already in this room from another session. Please close the other session first.`,
          });
        } else {
          socket.emit(ACTIONS.USER_ALREADY_IN_ANOTHER_ROOM, {
            roomId: activeRoom.roomId,
            username,
            message: `You are already in another room. Please leave that room first before joining a new one.`,
          });
        }
        return;
      }

      // Check if room exists
      if (!rooms.has(roomId)) {
        console.log(`❌ [BACKEND] Room ${roomId} not found in rooms map`);
        console.log(`   Available rooms: ${allRooms.join(', ') || 'None'}`);
        socket.emit(ACTIONS.ROOM_NOT_FOUND, {
          roomId,
          message: 'Room not found. Please check the Room ID.'
        });
        return;
      }

      const room = rooms.get(roomId);

      // Check if room is full
      if (room.users.size >= (room.maxUsers || 10)) {
        console.log(`❌ [BACKEND] Room ${roomId} is full`);
        socket.emit(ACTIONS.ROOM_FULL, {
          roomId,
          currentUsers: room.users.size,
          maxUsers: room.maxUsers || 10,
          message: "Room is full"
        });
        return;
      }

      // Create user object
      const user = {
        id: socket.id,
        username: username || `User-${socket.id.substring(0, 5)}`,
        joinedAt: new Date().toISOString(),
        isOnline: true,
        isHost: false
      };

      // Reconnection check: if user with same username is already in room (offline or replacing stale socket)
      const normalizedUsername = user.username.toLowerCase().trim();
      const existingInRoom = Array.from(room.users.values()).find(
        (u) => u.username.toLowerCase().trim() === normalizedUsername
      );
      if (existingInRoom) {
        // If the existing entry is ONLINE, this is a duplicate session — block it
        if (existingInRoom.isOnline && existingInRoom.id !== socket.id) {
          console.log(
            `⚠️ [BACKEND] User "${user.username}" already has an active session in room ${roomId} — blocking duplicate`
          );
          socket.emit(ACTIONS.USER_ALREADY_IN_ROOM, {
            roomId,
            username: user.username,
            message: `You are already in this room from another session. Please close the other session first.`,
          });
          return;
        }

        // Existing entry is OFFLINE — genuine reconnection (e.g., page refresh)
        // Cancel grace period timer and swap socket ID
        const oldSocketId = existingInRoom.id;
        const timerEntry = disconnectTimers.get(oldSocketId);
        if (timerEntry) {
          clearTimeout(timerEntry.timerId);
          disconnectTimers.delete(oldSocketId);
        }

        if (oldSocketId && oldSocketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            console.log(`🔌 [BACKEND] Disconnecting superseded socket ${oldSocketId} for participant ${user.username}`);
            oldSocket.disconnect(true);
          }
          room.users.delete(oldSocketId);
          users.delete(oldSocketId);
        }

        existingInRoom.id = socket.id;
        existingInRoom.isOnline = true;
        existingInRoom.disconnectedAt = null;

        users.set(socket.id, { ...existingInRoom, roomId });
        socket.join(roomId);
        room.users.set(socket.id, existingInRoom);

        const roomUsers = Array.from(room.users.values()).filter(u => u.isOnline);
        console.log(`🔄 [BACKEND] ${user.username} reconnected to room ${roomId} via JOIN`);

        socket.emit(ACTIONS.JOINED, {
          roomId,
          user: existingInRoom,
          clients: roomUsers,
          roomInfo: {
            roomId,
            totalUsers: roomUsers.length,
            createdAt: room.createdAt,
            language: room.language || 'javascript',
            host: room.users.get(room.host)?.username || 'Unknown',
            code: room.code || '',
          },
        });
        socket.emit(ACTIONS.SYNC_CODE, {
          code: room.code || '',
          language: room.language || 'javascript',
          lastUpdated: room.lastUpdated,
        });
        socket.to(roomId).emit(ACTIONS.USER_JOINED, {
          user: existingInRoom,
          timestamp: new Date().toISOString(),
          totalUsers: roomUsers.length,
        });
        io.to(roomId).emit(ACTIONS.ROOM_USERS_UPDATED, {
          roomId,
          clients: roomUsers,
          userJoined: existingInRoom.username,
          totalUsers: roomUsers.length,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Store user globally
      users.set(socket.id, {
        ...user,
        roomId
      });

      // Join the socket room
      socket.join(roomId);
      console.log(`✅ [BACKEND] ${user.username} joined room ${roomId}`);

      // Add user to room
      room.users.set(socket.id, user);
      console.log(`✅ [BACKEND] Added ${user.username} to room ${roomId}`);
      console.log(`   Total users in room now: ${room.users.size}`);

      // ========== PERSIST PARTICIPANT TO SESSION ==========
      try {
        if (room.sessionId) {
          const joiningUser = await User.findOne({ username: user.username });
          if (joiningUser) {
            await RoomSession.findByIdAndUpdate(room.sessionId, {
              $addToSet: {
                participants: {
                  userId: joiningUser._id,
                  username: user.username,
                  joinedAt: new Date(),
                },
              },
            });
            console.log(`💾 [BACKEND] Participant ${user.username} added to session ${room.sessionId}`);
          }
        }
      } catch (dbErr) {
        console.error('❌ [BACKEND] Failed to persist participant:', dbErr.message);
      }

      // Get all users in the room (including the new user)
      const roomUsers = Array.from(room.users.values());

      console.log(`📋 [BACKEND] Users in room ${roomId}:`);
      roomUsers.forEach(u => console.log(`   • ${u.username} (${u.id}) ${u.isHost ? '[HOST]' : ''}`));

      // Send joined event to the new user with room info
      console.log(`📤 [BACKEND] Sending JOINED to ${socket.id}`);
      socket.emit(ACTIONS.JOINED, {
        roomId,
        user,
        clients: roomUsers,
        roomInfo: {
          roomId,
          totalUsers: roomUsers.length,
          createdAt: room.createdAt,
          language: room.language || 'javascript',
          host: room.users.get(room.host)?.username || 'Unknown',
          code: room.code || ''
        }
      });

      // Send existing code to new user
      console.log(`🔄 [BACKEND] Sending SYNC_CODE to ${socket.id}`);
      socket.emit(ACTIONS.SYNC_CODE, {
        code: room.code || '',
        language: room.language || 'javascript',
        lastUpdated: room.lastUpdated
      });

      // Notify other users in the room about the new user
      console.log(`📤 [BACKEND] Broadcasting USER_JOINED to room ${roomId}`);
      socket.to(roomId).emit(ACTIONS.USER_JOINED, {
        user,
        timestamp: new Date().toISOString(),
        totalUsers: roomUsers.length
      });

      // Broadcast updated user list to all users in the room
      console.log(`📤 [BACKEND] Broadcasting ROOM_USERS_UPDATED to room ${roomId}`);
      io.to(roomId).emit(ACTIONS.ROOM_USERS_UPDATED, {
        roomId,
        clients: roomUsers,
        userJoined: user.username,
        totalUsers: roomUsers.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [BACKEND] Error in JOIN event:', error);
      socket.emit(ACTIONS.ERROR, {
        message: 'Failed to join room',
        error: error.message
      });
    }
  });
  // ========== CODE CHANGE ==========
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, language, changes }) => {
    try {
      console.log(`📝 [BACKEND] CODE_CHANGE event received`);
      console.log(`   Room: ${roomId}`);
      console.log(`   Code length: ${code?.length}`);
      console.log(`   Changes: ${changes ? changes.length : "none"}`);
      console.log(`   Language: ${language}`);
      console.log(`   Room exists? ${rooms.has(roomId)}`);

      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);

        // Update room code
        if (code !== undefined) {
          room.code = code;
        }
        if (language) room.language = language;
        room.lastUpdated = new Date();

        console.log(
          `✅ [BACKEND] Code updated in room ${roomId} by ${user?.username || "Anonymous"
          }`
        );

        // Broadcast to other users in the room (not the sender)
        console.log(`📤 [BACKEND] Broadcasting CODE_UPDATED to room ${roomId}`);
        socket.to(roomId).emit(ACTIONS.CODE_UPDATED, {
          code,
          changes,
          language: language || room.language,
          user: user?.username || "Anonymous",
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(`❌ [BACKEND] Room ${roomId} not found for code-change`);
      }
    } catch (error) {
      console.error("❌ [BACKEND] Error in code-change:", error);
    }
  });

  // ========== LANGUAGE CHANGE ==========
  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    try {
      console.log(`🌐 [BACKEND] LANGUAGE_CHANGE event received`);
      console.log(`   Room: ${roomId}`);
      console.log(`   New language: ${language}`);
      console.log(`   Room exists? ${rooms.has(roomId)}`);

      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const user = users.get(socket.id);

        room.language = language;
        room.lastUpdated = new Date();

        console.log(
          `✅ [BACKEND] Language changed to ${language} in room ${roomId} by ${user?.username || "Anonymous"
          }`
        );

        // Broadcast to all users in the room
        console.log(
          `📤 [BACKEND] Broadcasting LANGUAGE_UPDATED to room ${roomId}`
        );
        io.to(roomId).emit(ACTIONS.LANGUAGE_UPDATED, {
          language,
          user: user?.username || "Anonymous",
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(
          `❌ [BACKEND] Room ${roomId} not found for language-change`
        );
      }
    } catch (error) {
      console.error("❌ [BACKEND] Error in language-change:", error);
    }
  });

  // ========== CHAT MESSAGE ==========
  socket.on(ACTIONS.CHAT_MESSAGE, ({ roomId, message }) => {
    try {
      console.log(`💬 [BACKEND] CHAT_MESSAGE event received`);
      console.log(`   Room: ${roomId}`);
      console.log(`   Message: ${message}`);
      console.log(`   Room exists? ${rooms.has(roomId)}`);

      if (rooms.has(roomId)) {
        const user = users.get(socket.id);

        // Broadcast to all users in the room including sender
        console.log(
          `📤 [BACKEND] Broadcasting NEW_CHAT_MESSAGE to room ${roomId}`
        );
        io.to(roomId).emit(ACTIONS.NEW_CHAT_MESSAGE, {
          user: user?.username || "Anonymous",
          message,
          timestamp: new Date().toISOString(),
          userId: socket.id,
        });
      } else {
        console.log(`❌ [BACKEND] Room ${roomId} not found for chat-message`);
      }
    } catch (error) {
      console.error("❌ [BACKEND] Error in chat-message:", error);
    }
  });

  // ========== USER TYPING ==========
  socket.on(ACTIONS.USER_TYPING, ({ roomId, isTyping }) => {
    try {
      if (rooms.has(roomId)) {
        const user = users.get(socket.id);

        // Broadcast typing status to other users
        socket.to(roomId).emit(ACTIONS.TYPING, {
          user: user?.username || "Anonymous",
          isTyping,
          userId: socket.id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("❌ [BACKEND] Error in user-typing:", error);
    }
  });

  // ========== CURSOR CHANGE ==========
  socket.on(ACTIONS.CURSOR_CHANGE, ({ roomId, cursor, selection }) => {
    try {
      if (rooms.has(roomId)) {
        const user = users.get(socket.id);
        // Broadcast cursor position to other users in the room (not the sender)
        socket.to(roomId).emit(ACTIONS.CURSOR_UPDATED, {
          userId: socket.id,
          username: user?.username || "Anonymous",
          cursor,
          selection,
        });
      }
    } catch (error) {
      console.error("❌ [BACKEND] Error in cursor-change:", error);
    }
  });

  // ========== GET ROOM INFO ==========
  socket.on(ACTIONS.GET_ROOM_INFO, ({ roomId }) => {
    try {
      console.log(`ℹ️ [BACKEND] GET_ROOM_INFO event received`);
      console.log(`   Room: ${roomId}`);
      console.log(`   Room exists? ${rooms.has(roomId)}`);

      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const roomUsers = Array.from(room.users.values());

        console.log(`📤 [BACKEND] Sending ROOM_INFO to ${socket.id}`);
        socket.emit(ACTIONS.ROOM_INFO, {
          roomId,
          users: roomUsers,
          code: room.code,
          language: room.language,
          createdAt: room.createdAt,
          lastUpdated: room.lastUpdated,
          host: room.users.get(room.host)?.username || "Unknown",
          userCount: roomUsers.length,
          maxUsers: room.maxUsers,
          exists: true,
        });
      } else {
        console.log(`❌ [BACKEND] Room ${roomId} not found`);
        socket.emit(ACTIONS.ROOM_INFO, {
          roomId,
          error: "Room not found",
          exists: false,
        });
      }
    } catch (error) {
      console.error("❌ [BACKEND] Error in get-room-info:", error);
      socket.emit(ACTIONS.ERROR, { message: "Failed to get room info" });
    }
  });

  // ========== PING ==========
  socket.on(ACTIONS.PING, () => {
    socket.emit(ACTIONS.PONG, {
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
    });
  });

  // ========== DISCONNECT (GRACE PERIOD) ==========
  // Browser refresh fires disconnect but the user will reconnect within seconds.
  // Instead of immediately removing them, mark offline and wait 15 s.
  socket.on("disconnect", () => {
    try {
      console.log(`❌ [BACKEND] Socket disconnected: ${socket.id}`);

      const user = users.get(socket.id);
      if (!user) {
        console.log(`⚠️ [BACKEND] No user found for socket ${socket.id}`);
        return;
      }

      const { roomId, username } = user;

      if (!roomId || !rooms.has(roomId)) {
        users.delete(socket.id);
        return;
      }

      const room = rooms.get(roomId);
      const roomUser = room.users.get(socket.id);
      if (!roomUser) {
        users.delete(socket.id);
        return;
      }

      // Mark user as offline — start reconnection grace period
      roomUser.isOnline = false;
      roomUser.disconnectedAt = Date.now();
      console.log(`⏳ [BACKEND] ${username} marked offline in room ${roomId} — 15 s grace period started`);

      const timerId = setTimeout(() => {
        disconnectTimers.delete(socket.id);

        const currentRoom = rooms.get(roomId);
        if (!currentRoom) return; // Room already cleaned up

        // Check if user already reconnected with a new socket
        const reconnected = Array.from(currentRoom.users.values()).find(
          (u) => u.username.toLowerCase().trim() === username.toLowerCase().trim() && u.isOnline
        );
        if (reconnected) {
          // Already reconnected — just clean up the stale entry
          console.log(`✅ [BACKEND] ${username} already reconnected — removing stale socket ${socket.id}`);
          currentRoom.users.delete(socket.id);
          users.delete(socket.id);
          return;
        }

        // User didn't reconnect — do the full leave
        console.log(`⏰ [BACKEND] Grace period expired for ${username} — handling leave`);
        // Re-mark as online so handleLeave recognises them
        const staleUser = currentRoom.users.get(socket.id);
        if (staleUser) staleUser.isOnline = true;
        handleLeave(socket, roomId, username);
        users.delete(socket.id);
      }, 15000);

      disconnectTimers.set(socket.id, { timerId, roomId, username });
    } catch (error) {
      console.error("❌ [BACKEND] Error in disconnect:", error);
    }
  });

  // ========== LEAVE ROOM (EXPLICIT — NO GRACE PERIOD) ==========
  socket.on(ACTIONS.LEAVE, ({ roomId }) => {
    try {
      const user = users.get(socket.id);
      const username = user?.username || "Anonymous";

      // Cancel any pending reconnection timer
      const timerEntry = disconnectTimers.get(socket.id);
      if (timerEntry) {
        clearTimeout(timerEntry.timerId);
        disconnectTimers.delete(socket.id);
      }

      console.log(
        `🚪 [BACKEND] LEAVE event from ${username} for room ${roomId}`
      );
      handleLeave(socket, roomId, username);
      users.delete(socket.id);
    } catch (error) {
      console.error("❌ [BACKEND] Error in LEAVE event:", error);
    }
  });
});

// ========== HELPER FUNCTION: HANDLE LEAVE ==========
async function handleLeave(socket, roomId, username) {
  try {
    if (!roomId) {
      const u = users.get(socket.id);
      if (u?.roomId) {
        roomId = u.roomId;
      } else {
        for (const [rId, r] of rooms) {
          if (r.users.has(socket.id)) {
            roomId = rId;
            break;
          }
        }
      }
    }

    if (!roomId) {
      console.log(`⚠️ [BACKEND] No roomId provided for leave event`);
      return;
    }

    console.log(
      `👋 [BACKEND] Handling leave for ${username || "Anonymous"
      } from room ${roomId}`
    );

    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const leavingUser = users.get(socket.id);
      const userName = username || leavingUser?.username || "Anonymous";

      // Check if user is the host
      const isHostLeaving =
        room.host === socket.id ||
        (leavingUser && leavingUser.isHost) ||
        (room.hostUsername && userName && room.hostUsername.toLowerCase() === userName.toLowerCase());

      if (isHostLeaving) {
        console.log(
          `👑❌ [BACKEND] Host "${userName}" left room ${roomId}. Closing and removing room for all participants.`
        );

        // ========== SAVE SESSION SNAPSHOT TO DB ==========
        try {
          if (room.sessionId) {
            const encryptedCode = encrypt(room.code || '');
            const encryptedLanguage = encrypt(room.language || 'javascript');
            await RoomSession.findByIdAndUpdate(room.sessionId, {
              encryptedCode,
              encryptedLanguage,
              status: 'closed',
              closedAt: new Date(),
            });
            console.log(`💾 [BACKEND] Session ${room.sessionId} closed with encrypted code snapshot`);
          }
        } catch (dbErr) {
          console.error('❌ [BACKEND] Failed to save session snapshot:', dbErr.message);
        }

        // Notify other users in this room that the host closed the room (not the host themselves)
        socket.to(roomId).emit(ACTIONS.ROOM_CLOSED, {
          roomId,
          host: userName,
          message: `${userName} (Host) has left and closed the room.`,
          timestamp: new Date().toISOString(),
        });

        // Clear room references from global users map and remove all sockets from room
        for (const [memberSocketId] of room.users) {
          if (users.has(memberSocketId)) {
            const gUser = users.get(memberSocketId);
            if (gUser) {
              gUser.roomId = null;
            }
          }
          const memberSocket = io.sockets.sockets.get(memberSocketId);
          if (memberSocket) {
            memberSocket.leave(roomId);
          }
        }

        // Delete the room immediately
        rooms.delete(roomId);
        console.log(`🗑️ [BACKEND] Room ${roomId} deleted because host left`);
        return;
      }

      // Check if user exists in room (non-host member)
      if (room.users.has(socket.id)) {
        // Remove user from room
        room.users.delete(socket.id);
        console.log(`✅ [BACKEND] Removed ${userName} from room ${roomId}`);
        console.log(`   Users left in room: ${room.users.size}`);

        // If room is empty, delete it after a delay
        if (room.users.size === 0) {
          console.log(
            `📅 [BACKEND] Room ${roomId} is empty, scheduling deletion in 60s`
          );
          setTimeout(() => {
            if (rooms.has(roomId) && rooms.get(roomId).users.size === 0) {
              rooms.delete(roomId);
              console.log(`🗑️ [BACKEND] Room ${roomId} deleted (empty)`);
            }
          }, 60000);
        } else {
          // Notify others in the room about user leaving
          console.log(
            `📤 [BACKEND] Notifying others in room ${roomId} about user left`
          );
          socket.to(roomId).emit(ACTIONS.USER_LEFT, {
            socketId: socket.id,
            user: {
              id: socket.id,
              username: userName,
            },
            timestamp: new Date().toISOString(),
            totalUsers: room.users.size,
          });

          // Send updated user list to everyone in room
          console.log(
            `📤 [BACKEND] Sending updated user list to room ${roomId}`
          );
          io.to(roomId).emit(ACTIONS.ROOM_USERS_UPDATED, {
            roomId,
            clients: Array.from(room.users.values()),
            userLeft: userName,
            totalUsers: room.users.size,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        console.log(
          `⚠️ [BACKEND] User ${socket.id} not found in room ${roomId}`
        );
      }
    } else {
      console.log(`⚠️ [BACKEND] Room ${roomId} not found or already deleted`);
    }

    // Leave the socket room
    console.log(`🚪 [BACKEND] ${socket.id} leaving room ${roomId}`);
    socket.leave(roomId);
  } catch (error) {
    console.error("❌ [BACKEND] Error in handleLeave:", error);
  }
}

// ========== EXPRESS MIDDLEWARE ==========
app.use(morgan("dev"));

const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log("⚠️ CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ["Authorization"],
};

app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
const passport = require("./config/passport");
app.use(passport.initialize());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ========== DATABASE CONNECTION ==========
const connectDB = require("./config/database");
connectDB();

// ========== ROUTES ==========
console.log("📦 Loading routes...");
console.log("🔧 Environment:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
});

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========== GITHUB OAUTH ROUTES (Passport) ==========

const jwt = require("jsonwebtoken");

// GitHub OAuth — redirect to GitHub authorization page
app.get("/api/auth/github/url", (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      message: "GitHub OAuth not configured",
      error: "GITHUB_CLIENT_ID is not set in environment variables",
    });
  }

  const rootUrl = "https://github.com/login/oauth/authorize";
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri:
      process.env.GITHUB_REDIRECT_URI ||
      `http://${req.headers.host}/api/auth/github/callback`,
    scope: "user:email",
  };

  const qs = new URLSearchParams(options);
  const url = `${rootUrl}?${qs.toString()}`;

  res.json({ success: true, url });
});

// GitHub OAuth callback — Passport handles the exchange, then we issue a JWT
app.get(
  "/api/auth/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: "/login" }),
  (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=github_auth_failed`
        );
      }

      // Generate JWT (same helper used by Google flow)
      const token = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || "1d" }
      );

      console.log("✅ GitHub OAuth successful for:", user.email);

      // Redirect to the same frontend callback page Google uses
      const frontendUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/callback?token=${token}`;
      return res.redirect(frontendUrl);
    } catch (error) {
      console.error("❌ GitHub callback error:", error);
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=github_auth_failed&message=${encodeURIComponent(error.message)}`
      );
    }
  }
);

// Import auth routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authLimiter, authRoutes);

// Import user routes
const userRoutes = require("./routes/user");
app.use("/api/users", userRoutes);
console.log("✅ Execute routes mounted at /api/execute"); // TEMP DEBUG

// Code execution routes — proxies to a self-hosted Piston instance instead
// of the browser calling the (now key-gated) public emkc.org Piston API.
const executeRoutes = require("./routes/execute");
app.use("/api/execute", executeRoutes);

// Room session history routes
const sessionRoutes = require("./routes/sessionRoutes");
app.use("/api/sessions", sessionRoutes);
console.log("✅ Session routes mounted at /api/sessions");

// ========== GOOGLE OAUTH ROUTES ==========

// Google OAuth URL endpoint
app.get("/api/auth/google/url", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      message: "Google OAuth not configured",
      error: "GOOGLE_CLIENT_ID is not set in environment variables",
    });
  }

  // Generate Google OAuth URL
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri:
      process.env.GOOGLE_REDIRECT_URI ||
      `http://${req.headers.host}/api/auth/google/callback`,
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

  res.json({
    success: true,
    url,
    clientId: process.env.GOOGLE_CLIENT_ID.substring(0, 10) + "...",
    redirectUri: options.redirect_uri,
  });
});

// Google OAuth callback endpoint
app.get("/api/auth/google/callback", (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.json({
      success: false,
      message: "Google OAuth failed",
      error: error,
    });
  }

  res.json({
    success: true,
    message: "Google OAuth callback received",
    code: code ? "Received" : "Not received",
    timestamp: new Date().toISOString(),
  });
});

// Google OAuth debug endpoint
app.get("/api/auth/google/debug", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID ? "Set (hidden)" : "Not set",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET
      ? "Set (hidden)"
      : "Not set",
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "Not set",
    frontendUrl: process.env.FRONTEND_URL || "Not set",
    nodeEnv: process.env.NODE_ENV || "Not set",
    backendUrl: `http://${req.headers.host}`,
    socket: {
      activeConnections: io.engine.clientsCount,
      activeRooms: Array.from(rooms.keys()).length,
    },
  });
});

// ========== SOCKET.IO ENDPOINTS ==========

// Socket.io connection info endpoint
app.get("/api/socket/info", (req, res) => {
  const activeRooms = Array.from(rooms.keys()).length;
  const activeUsers = io.engine.clientsCount;

  res.json({
    success: true,
    data: {
      activeRooms,
      activeUsers,
      socketServer: "running",
      rooms: Array.from(rooms.entries()).map(([roomId, room]) => ({
        roomId,
        userCount: room.users.size,
        createdAt: room.createdAt,
        language: room.language || "javascript",
      })),
    },
  });
});

// Endpoint to check if a user is currently active in any room or in a target room
app.get("/api/rooms/user-status", (req, res) => {
  const username = req.query.username;
  const targetRoomId = req.query.targetRoomId || null;
  if (!username) {
    return res.status(400).json({ success: false, error: "Username is required" });
  }

  // Check if user is ONLINE in ANY room
  const activeRoom = findUserInAnyRoom(username);
  if (activeRoom) {
    const isSameRoom = targetRoomId && activeRoom.roomId === targetRoomId;
    return res.json({
      success: true,
      inRoom: true,
      inAnotherRoom: !isSameRoom,
      inSameRoom: isSameRoom,
      roomId: activeRoom.roomId,
      message: isSameRoom
        ? "You are already in this room from another session. Please close the other session first."
        : targetRoomId
          ? "You are already in another room. Please leave that room first before joining a new one."
          : "You are already in another room. Please leave that room first before creating a new one."
    });
  }

  return res.json({
    success: true,
    inRoom: false
  });
});

// Test endpoint to check server
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Collixy Backend API with Socket.io & Google OAuth",
    version: "2.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      health: "/api/health",
      test: "/api/test",
      socketInfo: "/api/socket/info",
      googleOAuth: {
        getUrl: "/api/auth/google/url",
        callback: "/api/auth/google/callback",
        debug: "/api/auth/google/debug",
      },
    },
    socket: {
      activeRooms: Array.from(rooms.keys()).length,
      activeConnections: io.engine.clientsCount,
    },
    server: {
      environment: process.env.NODE_ENV || "development",
      port: process.env.PORT || 5001,
      timestamp: new Date().toISOString(),
    },
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    service: "collixy-backend",
    socket: {
      activeConnections: io.engine.clientsCount,
      activeRooms: Array.from(rooms.keys()).length,
    },
  });
});

// Test endpoint to check environment
app.get("/api/env-check", (req, res) => {
  res.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      FRONTEND_URL: process.env.FRONTEND_URL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
        ? "Configured"
        : "Not configured",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
        ? "Configured"
        : "Not configured",
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      MONGODB_URI: process.env.MONGODB_URI ? "Configured" : "Not configured",
      PORT: process.env.PORT || 5001,
    },
    socket: {
      activeConnections: io.engine.clientsCount,
      activeRooms: Array.from(rooms.keys()).length,
    },
  });
});

// Test route to verify server
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Server API is working!",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
      socketInfo: "/api/socket/info",
      googleOAuth: {
        getUrl: "/api/auth/google/url",
        callback: "/api/auth/google/callback",
        debug: "/api/auth/google/debug",
      },
      envCheck: "/api/env-check",
    },
    socket: {
      activeConnections: io.engine.clientsCount,
      activeRooms: Array.from(rooms.keys()).length,
    },
    request: {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
    },
  });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      auth: "/api/auth/*",
      users: "/api/users/*",
      health: "/api/health",
      test: "/api/test",
      socketInfo: "/api/socket/info",
      googleOAuth: {
        getUrl: "/api/auth/google/url",
        callback: "/api/auth/google/callback",
        debug: "/api/auth/google/debug",
      },
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? {
          name: err.name,
          stack: err.stack,
          details: err.toString(),
        }
        : undefined,
    timestamp: new Date().toISOString(),
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
🚀 Server running in ${process.env.NODE_ENV || "development"} mode
🌐 HTTP Server: http://0.0.0.0:${PORT}
🔌 WebSocket Server: ws://0.0.0.0:${PORT}
🔗 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}
👥 Socket.io: Ready for real-time collaboration

📊 Active connections: ${io.engine.clientsCount}

📋 Google OAuth endpoints:
  • Debug: http://localhost:${PORT}/api/auth/google/debug
  • URL: http://localhost:${PORT}/api/auth/google/url
  • Callback: http://localhost:${PORT}/api/auth/google/callback
  `);
});

// Handle server errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Try a different port.`);
    process.exit(1);
  } else {
    console.error("❌ Server error:", error);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("👋 HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("👋 HTTP server closed");
    process.exit(0);
  });
});

module.exports = { app, server, io };
