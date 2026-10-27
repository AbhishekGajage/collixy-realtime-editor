// routes/sessionRoutes.js - Room Session History Routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const roomSessionController = require('../controllers/roomSessionController');

// All session routes require authentication
router.use(protect);

// GET /api/sessions - Get all sessions for the authenticated user
router.get('/', roomSessionController.getUserSessions);

// GET /api/sessions/:id - Get a single session detail by ID
router.get('/:id', roomSessionController.getSessionById);

module.exports = router;
