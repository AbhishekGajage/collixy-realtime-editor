const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
  createDocument,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  getDocumentHistory,
  restoreDocumentVersion
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting and authentication to all routes
router.use(apiLimiter);
router.use(protect);

// Document CRUD routes
router.route('/')
  .get(getUserDocuments)
  .post(
    [
      body('title').optional().isLength({ max: 100 }),
      body('language').optional().isIn(['javascript', 'python', 'java', 'cpp', 'html', 'css', 'typescript', 'json', 'markdown', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin']),
      body('isPublic').optional().isBoolean()
    ],
    createDocument
  );

router.route('/:id')
  .get(
    param('id').isMongoId().withMessage('Invalid document ID'),
    getDocument
  )
  .put(
    [
      param('id').isMongoId().withMessage('Invalid document ID'),
      body('title').optional().isLength({ max: 100 }),
      body('language').optional().isIn(['javascript', 'python', 'java', 'cpp', 'html', 'css', 'typescript', 'json', 'markdown', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin']),
      body('isPublic').optional().isBoolean()
    ],
    updateDocument
  )
  .delete(
    param('id').isMongoId().withMessage('Invalid document ID'),
    deleteDocument
  );

// Collaborator management routes
router.route('/:id/collaborators')
  .post(
    [
      param('id').isMongoId().withMessage('Invalid document ID'),
      body('userId').isMongoId().withMessage('Invalid user ID'),
      body('role').optional().isIn(['viewer', 'editor', 'admin'])
    ],
    addCollaborator
  );

router.route('/:id/collaborators/:userId')
  .delete(
    [
      param('id').isMongoId().withMessage('Invalid document ID'),
      param('userId').isMongoId().withMessage('Invalid user ID')
    ],
    removeCollaborator
  )
  .put(
    [
      param('id').isMongoId().withMessage('Invalid document ID'),
      param('userId').isMongoId().withMessage('Invalid user ID'),
      body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Invalid role')
    ],
    updateCollaboratorRole
  );

// Document history routes
router.get('/:id/history',
  param('id').isMongoId().withMessage('Invalid document ID'),
  getDocumentHistory
);

router.post('/:id/restore/:version',
  [
    param('id').isMongoId().withMessage('Invalid document ID'),
    param('version').isInt({ min: 1 }).withMessage('Invalid version number')
  ],
  restoreDocumentVersion
);

module.exports = router;