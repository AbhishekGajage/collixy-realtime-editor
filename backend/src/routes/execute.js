// routes/execute.js
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const router = express.Router();
const { getRuntimes, runCode, checkHealth } = require('../controllers/executeController');
const { optionalAuth } = require('../middleware/auth');

// Running code is far more expensive per-request than a normal API call
// (it spins up a sandboxed process on the Piston side), so it gets its own,
// tighter limit instead of sharing the general auth-route limiter.
const executeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.EXECUTE_RATE_LIMIT_MAX ? Number(process.env.EXECUTE_RATE_LIMIT_MAX) : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many execution requests. Please wait a moment before running code again.',
  },
  // Prefer per-user limiting when the caller is authenticated, falling back
  // to per-IP so anonymous/landing-page usage is still capped sensibly.
  // ipKeyGenerator() normalizes IPv6 addresses so a user can't bypass the
  // limit by requesting from different addresses within the same /64.
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
});

router.use(optionalAuth);

// Diagnostic endpoint — not rate-limited, no auth required.
router.get('/health', checkHealth);

router.get('/runtimes', executeLimiter, getRuntimes);
router.post('/', executeLimiter, runCode);

module.exports = router;
