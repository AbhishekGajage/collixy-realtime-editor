// controllers/roomSessionController.js - Room Session History Controller
const RoomSession = require('../models/RoomSession');
const { decrypt } = require('../utils/encryption');

/**
 * GET /api/sessions
 * Get all sessions for the authenticated user (as host or participant).
 * Returns sessions sorted by most recent first, with code decrypted.
 */
exports.getUserSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find sessions where user is host OR a participant
    const query = {
      $or: [
        { hostUserId: userId },
        { 'participants.userId': userId },
      ],
    };

    const [sessions, total] = await Promise.all([
      RoomSession.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RoomSession.countDocuments(query),
    ]);

    // For each session, determine the user's role and add summary info
    // Do NOT decrypt code for the list view — only decrypt on detail view
    const sessionCards = sessions.map((session) => {
      const isHost = session.hostUserId.toString() === userId.toString();
      return {
        _id: session._id,
        roomId: session.roomId,
        hostUsername: session.hostUsername,
        language: session.language,
        status: session.status,
        role: isHost ? 'host' : 'participant',
        participantCount: session.participants ? session.participants.length : 0,
        participants: (session.participants || []).map((p) => ({
          username: p.username,
          joinedAt: p.joinedAt,
        })),
        createdAt: session.createdAt,
        closedAt: session.closedAt,
        duration: session.closedAt && session.createdAt
          ? session.closedAt.getTime() - session.createdAt.getTime()
          : null,
      };
    });

    res.json({
      success: true,
      data: sessionCards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching user sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/sessions/:id
 * Get a single session by its MongoDB _id. Decrypts code for display.
 * Only accessible if the user was the host or a participant.
 */
exports.getSessionById = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessionId = req.params.id;

    const session = await RoomSession.findById(sessionId).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Authorization: only host or participants can view
    const isHost = session.hostUserId.toString() === userId.toString();
    const isParticipant = (session.participants || []).some(
      (p) => p.userId && p.userId.toString() === userId.toString()
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this session',
      });
    }

    // Decrypt sensitive fields
    let decryptedCode = '';
    let decryptedLanguage = session.language || 'javascript';

    if (session.encryptedCode) {
      decryptedCode = decrypt(session.encryptedCode);
    }
    if (session.encryptedLanguage) {
      decryptedLanguage = decrypt(session.encryptedLanguage);
    }

    const result = {
      _id: session._id,
      roomId: session.roomId,
      hostUsername: session.hostUsername,
      language: decryptedLanguage,
      code: decryptedCode,
      status: session.status,
      role: isHost ? 'host' : 'participant',
      participants: (session.participants || []).map((p) => ({
        username: p.username,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
      })),
      participantCount: session.participants ? session.participants.length : 0,
      createdAt: session.createdAt,
      closedAt: session.closedAt,
      duration: session.closedAt && session.createdAt
        ? session.closedAt.getTime() - session.createdAt.getTime()
        : null,
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ Error fetching session detail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
