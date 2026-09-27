// controllers/executeController.js
//
// Proxies code execution to Judge0 CE (Community Edition).
//
// Architecture:
// 1. By default, uses Judge0's official public Community Edition server
//    (https://ce.judge0.com) which is 100% FREE, requires NO API key,
//    and requires NO credit card.
// 2. If JUDGE0_API_KEY is configured in environment variables (e.g., from RapidAPI),
//    it will attempt to use RapidAPI. However, if RapidAPI returns 401 or 403
//    (e.g., key is invalid, expired, or not subscribed to the plan), it
//    automatically and transparently falls back to https://ce.judge0.com so code
//    execution NEVER breaks for the user!
// 3. Self-hosted Judge0 instances can be used by setting JUDGE0_URL in .env.
//
// The API response translates Judge0's output format into the shape expected
// by frontend/src/services/api.js and frontend/src/components/Output.jsx:
//   { success: true, result: { run: { stdout, stderr, output, code, signal } } }

const axios = require('axios');

// ─── Configuration ───────────────────────────────────────────────────────────
const PUBLIC_JUDGE0_URL = 'https://ce.judge0.com';
const CUSTOM_JUDGE0_URL = (process.env.JUDGE0_URL || '').trim();
const JUDGE0_API_KEY    = (process.env.JUDGE0_API_KEY || '').trim();
const JUDGE0_API_HOST   = (process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com').trim();

// Direct client (public CE or custom self-hosted) — NO authentication needed
const directClient = axios.create({
  baseURL: CUSTOM_JUDGE0_URL || PUBLIC_JUDGE0_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// RapidAPI client (only created if JUDGE0_API_KEY is provided)
const rapidClient = JUDGE0_API_KEY
  ? axios.create({
      baseURL: `https://${JUDGE0_API_HOST}`,
      timeout: 20000,
      headers: {
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': JUDGE0_API_HOST,
        'Content-Type': 'application/json',
      },
    })
  : null;

console.log(
  `🚀 [EXECUTE] Initialized Judge0 code execution provider. ` +
  (rapidClient ? `RapidAPI key configured (${JUDGE0_API_HOST}) with public fallback.` : `Using public CE (${PUBLIC_JUDGE0_URL}).`)
);

// ─── Language ID mapping ─────────────────────────────────────────────────────
// Maps Collixy's language keys to Judge0 CE language IDs.
// Verified against https://ce.judge0.com/languages.
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

function toBase64(str) {
  return Buffer.from(str || '').toString('base64');
}

function fromBase64(b64) {
  if (!b64) return '';
  return Buffer.from(b64, 'base64').toString('utf-8');
}

// Poll submission until completed (status.id > 2)
async function pollSubmission(client, token, maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await client.get(`/submissions/${token}`, {
      params: { base64_encoded: 'true', fields: '*' },
    });

    if (data.status && data.status.id > 2) {
      return data;
    }

    // Wait progressively: 800ms, 1200ms, 1600ms...
    await new Promise((r) => setTimeout(r, 800 + i * 400));
  }
  throw new Error('Execution timed out — program took too long to complete.');
}

// Execute code on a given client (submits with wait=true for fast response, falls back to polling)
async function executeOnClient(client, languageId, sourceCode, stdin) {
  const submitRes = await client.post(
    '/submissions',
    {
      language_id: languageId,
      source_code: toBase64(sourceCode),
      stdin: toBase64(stdin || ''),
    },
    {
      params: { base64_encoded: 'true', wait: 'true' },
    }
  );

  const data = submitRes.data;

  // If already finished (status.id > 2)
  if (data.status && data.status.id > 2) {
    return data;
  }

  // If still queued/processing, poll with submission token
  if (data.token) {
    return await pollSubmission(client, data.token);
  }

  return data;
}

// ─── Route handlers ──────────────────────────────────────────────────────────

// @desc    List available runtimes
// @route   GET /api/execute/runtimes
// @access  Public (rate limited)
exports.getRuntimes = async (req, res) => {
  try {
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
      return res.status(413).json({ success: false, message: 'Source code is too large to execute' });
    }

    const langKey = language.toLowerCase();
    const mapped = LANGUAGE_MAP[langKey];
    if (!mapped) {
      return res.status(400).json({
        success: false,
        message: `Language "${language}" is not supported. Supported: ${Object.keys(LANGUAGE_MAP).join(', ')}`,
      });
    }

    console.log(`🏃 [EXECUTE] Running ${language} (Judge0 id=${mapped.id}) — ${sourceCode.length} chars`);

    let result = null;

    // 1. Try RapidAPI if configured
    if (rapidClient) {
      try {
        result = await executeOnClient(rapidClient, mapped.id, sourceCode, stdin);
      } catch (rapidErr) {
        const status = rapidErr.response?.status;
        const msg = rapidErr.response?.data?.message || rapidErr.message;
        console.warn(`⚠️ [EXECUTE] RapidAPI call failed (${status}: ${msg}). Falling back to public Judge0 CE...`);

        // If RapidAPI rejected key / subscription (401, 403, 429), fall back to public CE
        result = await executeOnClient(directClient, mapped.id, sourceCode, stdin);
      }
    } else {
      // 2. Otherwise use direct public client (free, zero configuration)
      result = await executeOnClient(directClient, mapped.id, sourceCode, stdin);
    }

    // Decode Judge0 outputs
    const stdout = fromBase64(result.stdout);
    const stderr = fromBase64(result.stderr);
    const compileOutput = fromBase64(result.compile_output);

    // Compilation errors (status.id === 6) or runtime errors
    const effectiveStderr = stderr || (result.status?.id === 6 ? compileOutput : '');
    const effectiveOutput = stdout || effectiveStderr || compileOutput || (result.message ? fromBase64(result.message) : '');

    res.json({
      success: true,
      result: {
        run: {
          stdout: stdout,
          stderr: effectiveStderr,
          output: effectiveOutput,
          code: result.status?.id === 3 ? 0 : 1, // 3 = Accepted
          signal: result.status?.description || null,
        },
        language: language,
        version: mapped.name,
      },
    });
  } catch (error) {
    const status = error.response?.status;
    const errorDetails = error.response?.data?.message || error.message;
    console.error('❌ [EXECUTE] Execution failed:', status || 'No status', errorDetails);

    if (status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit reached. Please wait a moment before trying again.',
      });
    }

    res.status(502).json({
      success: false,
      message: 'Code execution service is temporarily unavailable. Please try again shortly.',
      error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
  }
};

// @desc    Health check & diagnostic endpoint
// @route   GET /api/execute/health
// @access  Public
exports.checkHealth = async (req, res) => {
  const start = Date.now();

  // Test RapidAPI if configured
  if (rapidClient) {
    try {
      const resp = await rapidClient.get('/languages');
      return res.json({
        success: true,
        mode: 'rapidapi',
        host: JUDGE0_API_HOST,
        languages: resp.data.length,
        latencyMs: Date.now() - start,
        supportedLanguages: Object.keys(LANGUAGE_MAP).length,
      });
    } catch (rapidErr) {
      // RapidAPI failed, check if fallback works
      try {
        const fbResp = await directClient.get('/languages');
        return res.json({
          success: true,
          mode: 'public-fallback',
          rapidApiStatus: rapidErr.response?.status,
          rapidApiMessage: rapidErr.response?.data?.message || rapidErr.message,
          host: CUSTOM_JUDGE0_URL || PUBLIC_JUDGE0_URL,
          languages: fbResp.data.length,
          latencyMs: Date.now() - start,
          supportedLanguages: Object.keys(LANGUAGE_MAP).length,
        });
      } catch (fbErr) {
        return res.status(502).json({
          success: false,
          message: 'Both RapidAPI and public fallback are unreachable',
          rapidApiError: rapidErr.message,
          fallbackError: fbErr.message,
        });
      }
    }
  }

  // Direct public client
  try {
    const resp = await directClient.get('/languages');
    return res.json({
      success: true,
      mode: 'public-direct',
      host: CUSTOM_JUDGE0_URL || PUBLIC_JUDGE0_URL,
      languages: resp.data.length,
      latencyMs: Date.now() - start,
      supportedLanguages: Object.keys(LANGUAGE_MAP).length,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      message: `Cannot reach Judge0: ${err.message}`,
    });
  }
};
