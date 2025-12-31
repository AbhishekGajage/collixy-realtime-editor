const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
  createRoom,
  joinRoom,
  getRoomInfo,
  getUserActiveRooms,
  updateRoomSettings,
  leaveRoom,
  getRoomChat
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

// Validation rules
const createRoomValidation = [
  body('documentId')
    .isMongoId()
    .withMessage('Invalid document ID'),
  body('settings.maxUsers')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max users must be between 1 and 100'),
  body('settings.allowAnonymous')
    .optional()
    .isBoolean()
    .withMessage('Allow anonymous must be boolean'),
  body('settings.requireApproval')
    .optional()
    .isBoolean()
    .withMessage('Require approval must be boolean'),
  body('settings.chatEnabled')
    .optional()
    .isBoolean()
    .withMessage('Chat enabled must be boolean')
];

const joinRoomValidation = [
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required')
    .isLength({ min: 12, max: 12 })
    .withMessage('Room ID must be 12 characters'),
  body('password')
    .optional()
    .isString()
];

// Apply authentication to all routes
router.use(protect);

// Room management routes
router.post('/', createRoomValidation, createRoom);
router.post('/join', joinRoomValidation, joinRoom);
router.get('/user/active', getUserActiveRooms);

// Room-specific routes
router.get('/:roomId',
  param('roomId').isLength({ min: 12, max: 12 }).withMessage('Invalid room ID'),
  getRoomInfo
);

router.put('/:roomId/settings',
  [
    param('roomId').isLength({ min: 12, max: 12 }).withMessage('Invalid room ID'),
    body('settings').optional().isObject(),
    body('isLocked').optional().isBoolean(),
    body('password').optional().isString()
  ],
  updateRoomSettings
);

router.post('/:roomId/leave',
  param('roomId').isLength({ min: 12, max: 12 }).withMessage('Invalid room ID'),
  leaveRoom
);

router.get('/:roomId/chat',
  param('roomId').isLength({ min: 12, max: 12 }).withMessage('Invalid room ID'),
  getRoomChat
);

module.exports = router;