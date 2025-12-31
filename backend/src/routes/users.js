const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { register, login, getProfile, updateProfile } = require('../controllers/userController');
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

// Public routes
router.post('/register',
  validate([
    body('username')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ]),
  register
);

router.post('/login',
  validate([
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .exists()
      .withMessage('Password is required')
  ]),
  login
);

// Protected routes
router.use(protect);

router.get('/profile', getProfile);

router.put('/profile',
  validate([
    body('username')
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please enter a valid email'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL')
  ]),
  updateProfile
);

module.exports = router;