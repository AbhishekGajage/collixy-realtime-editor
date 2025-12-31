const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  getDocumentHistory,
  restoreDocumentVersion,
  getPublicDocuments,
  duplicateDocument,
  exportDocument,
  importDocument
} = require('../controllers/documentController');
const { protect } = require('../middleware/auth');

// Validation rules
const createDocumentValidation = [
  body('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('language')
    .optional()
    .isIn([
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala',
      'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml',
      'markdown', 'sql', 'graphql', 'shell', 'dockerfile', 'makefile'
    ])
    .withMessage('Invalid language'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be boolean'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const updateDocumentValidation = [
  param('id').isMongoId().withMessage('Invalid document ID'),
  body('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('language')
    .optional()
    .isIn([
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
      'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala',
      'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml',
      'markdown', 'sql', 'graphql', 'shell', 'dockerfile', 'makefile'
    ])
    .withMessage('Invalid language'),
  body('content').optional().isString(),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be boolean'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const collaboratorValidation = [
  param('id').isMongoId().withMessage('Invalid document ID'),
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('role')
    .optional()
    .isIn(['viewer', 'editor', 'admin'])
    .withMessage('Role must be viewer, editor, or admin')
];

// Apply authentication to all routes
router.use(protect);

// Document CRUD routes
router.route('/')
  .get(
    [
      query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
      query('search').optional().isString(),
      query('sort').optional().isIn(['title', 'createdAt', 'updatedAt', 'language']),
      query('order').optional().isIn(['asc', 'desc']),
      query('language').optional().isString()
    ],
    getDocuments
  )
  .post(createDocumentValidation, createDocument);

// Document-specific routes
router.route('/:id')
  .get(
    param('id').isMongoId().withMessage('Invalid document ID'),
    getDocument
  )
  .put(updateDocumentValidation, updateDocument)
  .delete(
    param('id').isMongoId().withMessage('Invalid document ID'),
    deleteDocument
  );

// Document operations
router.post('/:id/duplicate',
  param('id').isMongoId().withMessage('Invalid document ID'),
  duplicateDocument
);

router.get('/:id/export',
  param('id').isMongoId().withMessage('Invalid document ID'),
  exportDocument
);

router.post('/import',
  [
    body('title').optional().isLength({ max: 100 }),
    body('language').optional().isString(),
    body('content').isString().withMessage('Content is required'),
    body('fileName').optional().isString()
  ],
  importDocument
);

// Collaborator management routes (from design - team collaboration)
router.route('/:id/collaborators')
  .post(collaboratorValidation, addCollaborator);

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

// Document history (version control)
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