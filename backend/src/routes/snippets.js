const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const snippetController = require('../controllers/snippetController');
const { protect } = require('../middleware/auth');

// Create a validation middleware function
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ errors: errors.array() });
  };
};

// Apply authentication to all routes
router.use(protect);

// Snippet CRUD routes
router.route('/')
  .get(
    validate([
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 50 }),
      query('search').optional().isString(),
      query('language').optional().isString(),
      query('sort').optional().isIn(['title', 'createdAt', 'updatedAt']),
      query('order').optional().isIn(['asc', 'desc'])
    ]),
    snippetController.getSnippets
  )
  .post(
    validate([
      body('title')
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters'),
      body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
      body('language')
        .isIn([
          'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
          'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala',
          'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml',
          'markdown', 'sql', 'graphql', 'shell', 'dockerfile', 'makefile'
        ])
        .withMessage('Invalid language'),
      body('code').isString().withMessage('Code is required'),
      body('tags').optional().isArray().withMessage('Tags must be an array'),
      body('isPublic').optional().isBoolean()
    ]),
    snippetController.createSnippet
  );

router.route('/:id')
  .get(
    validate([param('id').isMongoId().withMessage('Invalid snippet ID')]),
    snippetController.getSnippet
  )
  .put(
    validate([
      param('id').isMongoId().withMessage('Invalid snippet ID'),
      body('title').optional().isLength({ min: 1, max: 100 }),
      body('description').optional().isLength({ max: 500 }),
      body('language').optional().isString(),
      body('code').optional().isString(),
      body('tags').optional().isArray(),
      body('isPublic').optional().isBoolean()
    ]),
    snippetController.updateSnippet
  )
  .delete(
    validate([param('id').isMongoId().withMessage('Invalid snippet ID')]),
    snippetController.deleteSnippet
  );

// Public snippets route
router.get('/public',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('search').optional().isString(),
    query('language').optional().isString()
  ]),
  snippetController.getPublicSnippets
);

module.exports = router;