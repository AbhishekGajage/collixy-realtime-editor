// controllers/executeController.js
//
// Proxies code execution to Judge0 CE (Community Edition) via RapidAPI's
// free tier.  Judge0 is used instead of self-hosted Piston because Piston
// requires `privileged: true` Docker containers — which Render (and most
// PaaS platforms) cannot provide.
//
// Judge0 on RapidAPI's free "Basic" plan gives ~50 requests/day at zero
// cost, which is sufficient for a demo / portfolio project.
//
// Required env vars (set them in Render → Environment):
//   JUDGE0_API_KEY   – your RapidAPI key (get one free at rapidapi.com)
//   JUDGE0_API_HOST  – (optional) defaults to judge0-ce.p.rapidapi.com
//
// The API format is completely different from Piston, but this controller
// keeps the *same* request/response interface toward the frontend so that
// `frontend/src/services/api.js` and `Output.jsx` don't need any changes.

const axios = require('axios');

// ─── Configuration ───────────────────────────────────────────────────────────
const JUDGE0_API_KEY  = process.env.JUDGE0_API_KEY || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';
const JUDGE0_BASE_URL = `https://${JUDGE0_API_HOST}`;

if (!JUDGE0_API_KEY) {
  console.warn(
    '⚠️  [EXECUTE] JUDGE0_API_KEY is not set — code execution will be unavailable.\n' +
    '   Get a free key at https://rapidapi.com/judge0-official/api/judge0-ce'
  );
}

const judge0 = JUDGE0_API_KEY
  ? axios.create({
      baseURL: JUDGE0_BASE_URL,
      timeout: 20000,
      headers: {
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': JUDGE0_API_HOST,
        'Content-Type': 'application/json',
      },
    })
  : null;

// Non-blocking startup probe
if (judge0) {
  judge0
    .get('/languages')
    .then((r) => console.log(`✅ [EXECUTE] Judge0 reachable — ${r.data.length} languages available`))
    .catch((e) => console.error(`❌ [EXECUTE] Judge0 NOT reachable: ${e.response?.status || e.message}`));
}

// ─── Language ID mapping ─────────────────────────────────────────────────────
// Judge0 uses numeric IDs.  We map Collixy's language names → the latest
// available Judge0 CE language_id.  Sorted by the names used in
// frontend/src/utils/constants.js → LANGUAGE_NAMES.
//
// Source: GET https://ce.judge0.com/languages  (fetched Sep 2026)
const LANGUAGE_MAP = {
  javascript: { id: 102, name: 'JavaScript (Node.js 22.08.0)' },
  typescript: { id: 101, name: 'TypeScript (5.6.2)' },
  python:     { id: 109, name: 'Python (3.13.2)' },
  java:       { id: 91,  name: 'Java (JDK 17.0.6)' },
  csharp:     { id: 51,  name: 'C# (Mono 6.6.0.161)' },
  php:        { id: 98,  name: 'PHP (8.3.11)' },
  c:          { id: 104, name: 'C (Clang 18.1.8)' },
  cpp:        { id: 105, name: 'C++ (GCC 14.1.0)' },
  ruby:       { id: 72,  name: 'Ruby (2.7.0)' },
  go:         { id: 107, name: 'Go (1.23.5)' },
  rust:       { id: 108, name: 'Rust (1.85.0)' },
  swift:      { id: 83,  name: 'Swift (5.2.3)' },
  kotlin:     { id: 111, name: 'Kotlin (2.1.10)' },
  r:          { id: 99,  name: 'R (4.4.1)' },
  dart:       { id: 90,  name: 'Dart (2.19.2)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Base64-encode a string (Judge0 prefers base64-encoded payloads)
function toBase64(str) {
  return Buffer.from(str || '').toString('base64');
}

// Base64-decode a string returned by Judge0
function fromBase64(b64) {
  if (!b64) return '';
  return Buffer.from(b64, 'base64').toString('utf-8');
}

// Poll for a submission result until it's done (status.id > 2 means finished)
async function pollSubmission(token, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await judge0.get(`/submissions/${token}`, {
      params: { base64_encoded: 'true', fields: '*' },
    });

    // Status IDs: 1 = In Queue, 2 = Processing, 3+ = finished
    if (data.status && data.status.id > 2) {
      return data;
    }

    // Wait before next poll (progressive backoff: 1s, 1.5s, 2s, ...)
    await new Promise((r) => setTimeout(r, 1000 + i * 500));
  }
  throw new Error('Execution timed out — the program took too long to finish.');
}

// ─── Route handlers ──────────────────────────────────────────────────────────

// @desc    List available languages
// @route   GET /api/execute/runtimes
// @access  Public (rate limited)
exports.getRuntimes = async (req, res) => {
  try {
    // Convert our static map to the array format the frontend expects.
    // The frontend used Piston's shape: { language, version, aliases }
    const runtimes = Object.entries(LANGUAGE_MAP).map(([lang, info]) => ({
      language: lang,
      version: info.name.match(/\((.+)\)/)?.[1] || 'latest',
      aliases: [],
    }));
    res.json({ success: true, runtimes });
  } catch (error) {
    console.error('❌ [EXECUTE] Failed to list runtimes:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list runtimes.' });
  }
};

// @desc    Run source code
// @route   POST /api/execute
// @access  Public (rate limited)
exports.runCode = async (req, res) => {
  try {
    const { language, sourceCode, stdin } = req.body;

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ success: false, message: 'language is required' });
    }
    if (typeof sourceCode !== 'string' || sourceCode.length === 0) {
      return res.status(400).json({ success: false, message: 'sourceCode is required' });
    }
    if (sourceCode.length > 200_000) {
      return res.status(413).json({ success: false, message: 'Source is too large to execute' });
    }
    if (!judge0) {
      return res.status(502).json({
        success: false,
        message: 'Code execution is not configured (JUDGE0_API_KEY not set).',
      });
    }

    // Resolve language → Judge0 language_id
    const langKey = language.toLowerCase();
    const mapped = LANGUAGE_MAP[langKey];
    if (!mapped) {
      return res.status(400).json({
        success: false,
        message: `Language "${language}" is not supported. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`,
      });
    }

    console.log(`🏃 [EXECUTE] Running ${language} (Judge0 id=${mapped.id}) — ${sourceCode.length} chars`);

    // Submit to Judge0 with wait=false (async), then poll for result.
    // Using base64 encoding to avoid issues with special characters.
    const submitRes = await judge0.post('/submissions', {
      language_id: mapped.id,
      source_code: toBase64(sourceCode),
      stdin: toBase64(stdin || ''),
      base64_encoded: true,
    }, {
      params: { base64_encoded: 'true', wait: 'false' },
    });

    const token = submitRes.data.token;
    if (!token) {
      throw new Error('Judge0 did not return a submission token.');
    }

    // Poll until execution finishes
    const result = await pollSubmission(token);

    // Transform Judge0's response into the Piston-compatible shape that
    // the frontend (Output.jsx line 32) expects:
    //   { run: { stdout, stderr, output, code } }
    const stdout = fromBase64(result.stdout);
    const stderr = fromBase64(result.stderr);
    const compile_output = fromBase64(result.compile_output);

    // If there's a compilation error, put it in stderr
    const effectiveStderr = stderr || (result.status?.id === 6 ? compile_output : '');
    const effectiveOutput = stdout || effectiveStderr || compile_output || '';

    res.json({
      success: true,
      result: {
        run: {
          stdout: stdout,
          stderr: effectiveStderr,
          output: effectiveOutput,
          code: result.status?.id === 3 ? 0 : 1,  // 3 = Accepted (success)
          signal: result.status?.description || null,
        },
        language: language,
        version: mapped.name,
      },
    });
  } catch (error) {
    const status = error.response?.status;
    console.error('❌ [EXECUTE] Execution failed:', status, error.response?.data || error.message);

    if (status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Daily execution limit reached. The free tier allows ~50 executions/day. Please try again tomorrow.',
      });
    }
    if (status === 401 || status === 403) {
      return res.status(502).json({
        success: false,
        message: 'Judge0 API key is invalid or expired. Check JUDGE0_API_KEY in environment variables.',
      });
    }

    const hint = !JUDGE0_API_KEY
      ? 'Code execution is not configured (JUDGE0_API_KEY not set).'
      : 'Code execution service is temporarily unreachable. Please try again shortly.';
    res.status(502).json({
      success: false,
      message: hint,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Health/debug check for Judge0 connection
// @route   GET /api/execute/health
// @access  Public
exports.checkHealth = async (req, res) => {
  if (!JUDGE0_API_KEY) {
    return res.status(503).json({
      success: false,
      provider: 'judge0',
      message: 'JUDGE0_API_KEY environment variable is not configured. Get a free key at https://rapidapi.com/judge0-official/api/judge0-ce',
    });
  }

  try {
    const start = Date.now();
    const response = await judge0.get('/languages');
    const latency = Date.now() - start;
    res.json({
      success: true,
      provider: 'judge0',
      host: JUDGE0_API_HOST,
      languages: response.data.length,
      latencyMs: latency,
      supportedByCollixy: Object.keys(LANGUAGE_MAP).length,
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      provider: 'judge0',
      host: JUDGE0_API_HOST,
      message: `Cannot reach Judge0: ${error.response?.status || error.message}`,
    });
  }
};
