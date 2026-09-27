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


const { Agent, setGlobalDispatcher } = require("undici");

// Piston's package-install endpoint doesn't respond until the install
// finishes. undici's default 5-minute headers/body timeout is fine for
// small runtimes, but a full gcc toolchain build can legitimately take
// longer than that under load — this raises it to 15 minutes for this
// one-off setup script.
setGlobalDispatcher(new Agent({ headersTimeout: 900_000, bodyTimeout: 900_000 }));
// Keep this list in sync with the keys of LANGUAGE_NAMES in
// frontend/src/utils/constants.js.
//
// IMPORTANT: Piston's raw package catalog (`GET /api/v2/packages`) is keyed
// by each package's OWN name, which for a few languages is not the language
// name itself — one package can "provide" several languages. For example,
// `javascript` isn't an installable package; it's provided by the `node`
// package. Installing `{ language: "javascript", version: "..." }` 404s
// even though `node` installs fine and gives you JavaScript execution.
// This map covers every case in SUPPORTED_LANGUAGES where the package name
// differs from the language name (confirmed against piston's own package
// metadata — see engineer-man/piston/packages/<pkg>/<version>/metadata.json).
const PACKAGE_NAME_OVERRIDES = {
  javascript: "node", // provides: javascript (aliases: js, node-js, node-javascript)
  c: "gcc",           // provides: c, c++, d, fortran
  cpp: "gcc",          // same package as c — installing one installs both
  csharp: "mono",     // provides: csharp, basic. (dotnet also provides a
  // csharp.net language+alias, but `mono` is what this
  // project's pinned version 6.12.0 corresponds to)
};

// Piston has no package for R at all (the closest is `octave`, a different
// language with a different runtime) — this is a genuine gap, not a bug in
// this script, so it's reported separately from real failures.
const KNOWN_UNAVAILABLE = ["r"];

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

  const results = {
    installed: [],
    alreadyInstalled: [],
    skippedKnownUnavailable: [],
    skippedNoPackage: [],
    failed: [],
  };
  // Some overrides point multiple languages at the same underlying package
  // (c and cpp both -> gcc). Installing it once satisfies both, so track
  // which package names we've already handled this run.
  const handledPackages = new Set();

  for (const language of SUPPORTED_LANGUAGES) {
    if (KNOWN_UNAVAILABLE.includes(language)) {
      console.log(`ℹ️  "${language}" has no Piston package (nothing to install) — skipping`);
      results.skippedKnownUnavailable.push(language);
      continue;
    }

    const packageName = PACKAGE_NAME_OVERRIDES[language] || language;

    if (handledPackages.has(packageName)) {
      console.log(`✅ ${language} covered by already-handled package "${packageName}"`);
      results.alreadyInstalled.push(language);
      continue;
    }

    // A package may have several published versions; prefer the highest
    // version number that isn't already installed, or note it's already there.
    const candidates = catalog
      .filter((pkg) => pkg.language.toLowerCase() === packageName.toLowerCase())
      .sort((a, b) => (a.language_version < b.language_version ? 1 : -1));

    if (candidates.length === 0) {
      console.log(`⚠️  No Piston package found for "${language}" (looked for package "${packageName}") — skipping`);
      results.skippedNoPackage.push(language);
      continue;
    }

    const alreadyInstalled = candidates.find((pkg) => pkg.installed);
    if (alreadyInstalled) {
      console.log(`✅ ${language} already installed (${packageName} ${alreadyInstalled.language_version})`);
      results.alreadyInstalled.push(language);
      handledPackages.add(packageName);
      continue;
    }

    const target = candidates[0];
    console.log(`📦 Installing ${language} via package "${packageName}" ${target.language_version} ...`);
    try {
      const installRes = await fetch(`${PISTON_URL}/api/v2/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: packageName, version: target.language_version }),
      });
      if (!installRes.ok) {
        throw new Error(`${installRes.status} ${await installRes.text()}`);
      }
      console.log(`✅ Installed ${language} (${packageName} ${target.language_version})`);
      results.installed.push(language);
      handledPackages.add(packageName);
    } catch (error) {
      console.error(`❌ Failed to install ${language}: ${error.message}`, error.cause ?? "");
      results.failed.push(language);
    }
  }

  console.log("\n──────── Summary ────────");
  console.log(`Installed this run     : ${results.installed.join(", ") || "(none)"}`);
  console.log(`Already installed      : ${results.alreadyInstalled.join(", ") || "(none)"}`);
  console.log(`No Piston package (bug): ${results.skippedNoPackage.join(", ") || "(none)"}`);
  console.log(`Known unavailable in Piston: ${results.skippedKnownUnavailable.join(", ") || "(none)"}`);
  console.log(`Failed                 : ${results.failed.join(", ") || "(none)"}`);

  if (results.failed.length > 0 || results.skippedNoPackage.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("💥 setup-piston-runtimes failed:", error.message);
  process.exitCode = 1;
});