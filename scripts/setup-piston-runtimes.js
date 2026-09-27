#!/usr/bin/env node
/**
 * scripts/setup-piston-runtimes.js
 *
 * A freshly started Piston container (see docker-compose.yml's `piston`
 * service) has zero language runtimes installed. This script installs the
 * latest available version of every language Collixy's editor supports
 * (kept in sync with `frontend/src/utils/constants.js`'s LANGUAGE_NAMES keys)
 * by talking to Piston's package-management HTTP API directly:
 *
 *   GET    /api/v2/packages           - full catalog + install status
 *   POST   /api/v2/packages           - { language, version } -> installs it
 *
 * Usage:
 *   node scripts/setup-piston-runtimes.js
 *   PISTON_URL=http://localhost:2000 node scripts/setup-piston-runtimes.js
 *
 * Run this once after `docker-compose up -d piston` (or whenever you add a
 * new language to the frontend's language list). It's safe to re-run —
 * already-installed languages are skipped.
 */

const PISTON_URL = (process.env.PISTON_URL || "http://localhost:2000").replace(/\/+$/, "");

// Keep this list in sync with the keys of LANGUAGE_NAMES in
// frontend/src/utils/constants.js. Piston's package "language" field is
// lowercase and generally matches these names directly (aliases like "sh"
// for "bash" aren't needed here since we match by primary language name).
const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "csharp",
  "php",
  "c",
  "cpp",
  "ruby",
  "go",
  "rust",
  "swift",
  "kotlin",
  "r",
  "dart",
];

async function main() {
  console.log(`🔌 Talking to Piston at ${PISTON_URL} ...`);

  const catalogRes = await fetch(`${PISTON_URL}/api/v2/packages`);
  if (!catalogRes.ok) {
    throw new Error(
      `Failed to fetch package catalog: ${catalogRes.status} ${await catalogRes.text()}`
    );
  }
  const catalog = await catalogRes.json();

  const results = { installed: [], alreadyInstalled: [], skippedNoPackage: [], failed: [] };

  for (const language of SUPPORTED_LANGUAGES) {
    // A language may have several published versions; prefer the highest
    // version number that isn't already installed, or note it's already there.
    const candidates = catalog
      .filter((pkg) => pkg.language.toLowerCase() === language.toLowerCase())
      .sort((a, b) => (a.language_version < b.language_version ? 1 : -1));

    if (candidates.length === 0) {
      console.log(`⚠️  No Piston package found for "${language}" — skipping`);
      results.skippedNoPackage.push(language);
      continue;
    }

    const alreadyInstalled = candidates.find((pkg) => pkg.installed);
    if (alreadyInstalled) {
      console.log(`✅ ${language} already installed (${alreadyInstalled.language_version})`);
      results.alreadyInstalled.push(language);
      continue;
    }

    const target = candidates[0];
    console.log(`📦 Installing ${language} ${target.language_version} ...`);
    try {
      const installRes = await fetch(`${PISTON_URL}/api/v2/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, version: target.language_version }),
      });
      if (!installRes.ok) {
        throw new Error(`${installRes.status} ${await installRes.text()}`);
      }
      console.log(`✅ Installed ${language} ${target.language_version}`);
      results.installed.push(language);
    } catch (error) {
      console.error(`❌ Failed to install ${language}: ${error.message}`);
      results.failed.push(language);
    }
  }

  console.log("\n──────── Summary ────────");
  console.log(`Installed this run : ${results.installed.join(", ") || "(none)"}`);
  console.log(`Already installed   : ${results.alreadyInstalled.join(", ") || "(none)"}`);
  console.log(`No package found    : ${results.skippedNoPackage.join(", ") || "(none)"}`);
  console.log(`Failed              : ${results.failed.join(", ") || "(none)"}`);

  if (results.failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("💥 setup-piston-runtimes failed:", error.message);
  process.exitCode = 1;
});
