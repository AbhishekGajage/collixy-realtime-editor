// controllers/executeController.js
//
// Proxies code execution to a self-hosted Piston instance
// (https://github.com/engineer-man/piston). The public emkc.org Piston API
// stopped being free to use without an authorization key as of Feb 15, 2026
// (401 on every call), so this project now runs its own Piston container
// (see docker-compose.yml) and the browser never talks to a third-party
// execution API directly.
//
// PISTON_URL should point at the self-hosted instance, e.g.:
//   - docker-compose (services on the same network): http://piston:2000
//   - local dev (piston run via `docker run` on the host): http://localhost:2000
//   - a separately hosted Piston instance: https://piston.yourdomain.com

const axios = require('axios');

const PISTON_URL = (process.env.PISTON_URL || 'http://localhost:2000').replace(/\/+$/, '');

const piston = axios.create({
  baseURL: PISTON_URL,
  timeout: 15000,
});

// In-memory cache for the runtimes list — it rarely changes and every
// execute request would otherwise trigger an extra round trip if the
// caller wants to validate language/version first.
let runtimesCache = { data: null, fetchedAt: 0 };
const RUNTIMES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchRuntimes() {
  const isFresh = runtimesCache.data && Date.now() - runtimesCache.fetchedAt < RUNTIMES_CACHE_TTL_MS;
  if (isFresh) return runtimesCache.data;

  const response = await piston.get('/api/v2/runtimes');
  runtimesCache = { data: response.data, fetchedAt: Date.now() };
  return runtimesCache.data;
}

// @desc    List available languages/versions installed on the Piston instance
// @route   GET /api/execute/runtimes
// @access  Public (rate limited)
exports.getRuntimes = async (req, res) => {
  try {
    const runtimes = await fetchRuntimes();
    res.json({ success: true, runtimes });
  } catch (error) {
    console.error('❌ [EXECUTE] Failed to fetch Piston runtimes:', error.message);
    res.status(502).json({
      success: false,
      message: 'Code execution service is unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Run source code for a given language/version
// @route   POST /api/execute
// @access  Public (rate limited)
exports.runCode = async (req, res) => {
  try {
    const { language, version, sourceCode, stdin } = req.body;

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ success: false, message: 'language is required' });
    }
    if (typeof sourceCode !== 'string' || sourceCode.length === 0) {
      return res.status(400).json({ success: false, message: 'sourceCode is required' });
    }
    // Piston will happily accept huge payloads; cap it so one user can't
    // tie up a sandbox slot (or the request body limit) with a multi-MB file.
    if (sourceCode.length > 200_000) {
      return res.status(413).json({ success: false, message: 'Source is too large to execute' });
    }

    // Resolve the version against the runtimes actually installed on this
    // Piston instance rather than trusting whatever the client sent —
    // a self-hosted instance may not have the exact version the frontend's
    // static LANGUAGE_VERSIONS map expects installed.
    const runtimes = await fetchRuntimes();
    const runtime = runtimes.find(
      (r) => r.language === language || (r.aliases || []).includes(language)
    );

    if (!runtime) {
      return res.status(400).json({
        success: false,
        message: `Language "${language}" is not installed on this execution engine`,
      });
    }

    const resolvedVersion = version || runtime.version;

    console.log(`🏃 [EXECUTE] Running ${language}@${resolvedVersion} (${sourceCode.length} chars)`);

    const response = await piston.post('/api/v2/execute', {
      language: runtime.language,
      version: resolvedVersion,
      files: [{ content: sourceCode }],
      stdin: stdin || '',
    });

    res.json({ success: true, result: response.data });
  } catch (error) {
    const status = error.response?.status;
    console.error('❌ [EXECUTE] Execution failed:', status, error.response?.data || error.message);

    if (status === 400) {
      return res.status(400).json({
        success: false,
        message: error.response?.data?.message || 'Invalid language or version for execution',
      });
    }
    if (status === 401 || status === 403) {
      // Only relevant if PISTON_URL still points at a key-gated instance.
      return res.status(502).json({
        success: false,
        message: 'Execution engine rejected the request (authorization). Check PISTON_URL / instance config.',
      });
    }

    res.status(502).json({
      success: false,
      message: 'Code execution service is unavailable. Please try again shortly.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
