#!/usr/bin/env node
/**
 * Version Manifest Validator
 *
 * Ensures all dependency files honour the approved floors in .github/version-manifest.json.
 * Blocks downgrades — no file may declare a version range whose lower bound is below
 * the minimum recorded in the manifest.
 *
 * @example
 * node scripts/validate-version-manifest.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, ".github", "version-manifest.json");

let errors = 0;
let warnings = 0;
let checks = 0;

function log(level, msg) {
  const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✅";
  console.log(`${prefix} ${msg}`);
  if (level === "error") errors++;
  if (level === "warn") warnings++;
}

/**
 * Parse a semver string into [major, minor, patch] integers.
 * Handles pre-release tags by ignoring them.
 */
function parseSemver(version) {
  const clean = version.replace(/^[~^>=<!\s]+/, "").split("-")[0];
  const parts = clean.split(".").map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Compare two semver tuples. Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareSemver(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Extract the lower-bound version from a range string.
 * Handles: "^4.9.1", ">=3.10.0", "~2.0.0", "4.9.1", ">=3.10,<4"
 */
function extractFloor(range) {
  const cleaned = range.trim();
  // For comma-separated ranges, take the first constraint
  const first = cleaned.split(",")[0].trim();
  // Strip range operators
  const version = first.replace(/^[~^>=<!\s]+/, "");
  if (/^\d+(\.\d+)*/.test(version)) {
    return version;
  }
  return null;
}

/**
 * Read and parse a JSON file; returns null on failure.
 */
function readJson(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

/**
 * Read a requirements.txt and return { name: rangeString } map (lowercased keys).
 */
function parseRequirementsTxt(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  const lines = fs.readFileSync(absPath, "utf8").split("\n");
  const deps = {};
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    // PEP 508: name>=version or name==version etc.
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*([><=!~]+.*)$/);
    if (match) {
      deps[match[1].toLowerCase()] = match[2].trim();
    }
  }
  return deps;
}

/**
 * Read a pyproject.toml and extract dependency lists (basic TOML parsing).
 */
function parsePyprojectDeps(relPath) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  const content = fs.readFileSync(absPath, "utf8");
  const deps = {};

  // Match dependencies = [ ... ] blocks
  const depBlockRegex = /dependencies\s*=\s*\[([\s\S]*?)\]/g;
  let blockMatch;
  while ((blockMatch = depBlockRegex.exec(content)) !== null) {
    const block = blockMatch[1];
    const lineRegex = /"([a-zA-Z0-9_-]+)\s*([><=!~]+[^"]+)"/g;
    let lineMatch;
    while ((lineMatch = lineRegex.exec(block)) !== null) {
      deps[lineMatch[1].toLowerCase()] = lineMatch[2].trim();
    }
  }
  return deps;
}

// ── Main ────────────────────────────────────────────────────────────

console.log("🔍 Version Manifest Validator\n");

if (!fs.existsSync(MANIFEST_PATH)) {
  log("error", ".github/version-manifest.json not found");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

// ── npm checks ──────────────────────────────────────────────────────

console.log("── npm dependencies ──");

const npmManifest = manifest.npm || {};
const packageFiles = [
  "package.json",
  "apps/web/package.json",
  "packages/shared/package.json",
];

for (const pkgPath of packageFiles) {
  const pkg = readJson(pkgPath);
  if (!pkg) continue;

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  for (const [name, entry] of Object.entries(npmManifest)) {
    if (!(name in allDeps)) continue;

    checks++;
    const declaredRange = allDeps[name];
    const floor = extractFloor(declaredRange);
    const minVersion = entry.minVersion;

    if (!floor) {
      log(
        "warn",
        `${pkgPath} → ${name}: could not parse range "${declaredRange}"`,
      );
      continue;
    }

    const declaredSemver = parseSemver(floor);
    const minSemver = parseSemver(minVersion);

    if (compareSemver(declaredSemver, minSemver) < 0) {
      log(
        "error",
        `${pkgPath} → ${name}: floor ${floor} is below manifest minimum ${minVersion}`,
      );
    } else {
      log("ok", `${pkgPath} → ${name}: ${floor} ≥ ${minVersion}`);
    }
  }
}

// ── Python checks ───────────────────────────────────────────────────

console.log("\n── Python dependencies ──");

const pythonManifest = manifest.python || {};

const requirementsFiles = [
  "requirements.txt",
  "mcp/azure-pricing-mcp/requirements.txt",
];

const pyprojectFiles = ["mcp/azure-pricing-mcp/pyproject.toml"];

// Collect all Python deps from requirements.txt files
for (const reqPath of requirementsFiles) {
  const deps = parseRequirementsTxt(reqPath);
  if (!deps) continue;

  for (const [name, entry] of Object.entries(pythonManifest)) {
    const key = name.toLowerCase();
    if (!(key in deps)) continue;

    checks++;
    const declaredRange = deps[key];
    const floor = extractFloor(declaredRange);
    const minVersion = entry.minVersion;

    if (!floor) {
      log(
        "warn",
        `${reqPath} → ${name}: could not parse range "${declaredRange}"`,
      );
      continue;
    }

    const declaredSemver = parseSemver(floor);
    const minSemver = parseSemver(minVersion);

    if (compareSemver(declaredSemver, minSemver) < 0) {
      log(
        "error",
        `${reqPath} → ${name}: floor ${floor} is below manifest minimum ${minVersion}`,
      );
    } else {
      log("ok", `${reqPath} → ${name}: ${floor} ≥ ${minVersion}`);
    }
  }
}

// Collect from pyproject.toml dependency blocks
for (const pyPath of pyprojectFiles) {
  const deps = parsePyprojectDeps(pyPath);
  if (!deps) continue;

  for (const [name, entry] of Object.entries(pythonManifest)) {
    const key = name.toLowerCase();
    if (!(key in deps)) continue;

    checks++;
    const declaredRange = deps[key];
    const floor = extractFloor(declaredRange);
    const minVersion = entry.minVersion;

    if (!floor) {
      log(
        "warn",
        `${pyPath} → ${name}: could not parse range "${declaredRange}"`,
      );
      continue;
    }

    const declaredSemver = parseSemver(floor);
    const minSemver = parseSemver(minVersion);

    if (compareSemver(declaredSemver, minSemver) < 0) {
      log(
        "error",
        `${pyPath} → ${name}: floor ${floor} is below manifest minimum ${minVersion}`,
      );
    } else {
      log("ok", `${pyPath} → ${name}: ${floor} ≥ ${minVersion}`);
    }
  }
}

// ── Runtime version checks ──────────────────────────────────────────

console.log("\n── Runtime versions ──");

const meta = manifest.metadata || {};

// .nvmrc
const nvmrcPath = path.join(ROOT, ".nvmrc");
if (fs.existsSync(nvmrcPath)) {
  checks++;
  const nvmVersion = fs.readFileSync(nvmrcPath, "utf8").trim();
  const expectedNode = meta.nodeVersion;
  if (expectedNode && !nvmVersion.startsWith(expectedNode)) {
    log(
      "error",
      `.nvmrc: "${nvmVersion}" does not match manifest Node ${expectedNode}`,
    );
  } else {
    log("ok", `.nvmrc: ${nvmVersion}`);
  }
}

// engines.node in root package.json
const rootPkg = readJson("package.json");
if (rootPkg?.engines?.node) {
  checks++;
  const enginesNode = rootPkg.engines.node;
  const floor = extractFloor(enginesNode);
  if (floor && meta.nodeVersion) {
    const floorMajor = parseSemver(floor)[0];
    const expectedMajor = Number(meta.nodeVersion);
    if (floorMajor < expectedMajor) {
      log(
        "error",
        `package.json engines.node: floor ${floor} is below manifest Node ${expectedMajor}`,
      );
    } else {
      log("ok", `package.json engines.node: ${enginesNode}`);
    }
  }
}

// requires-python in pyproject.toml
const rootPyproject = path.join(ROOT, "pyproject.toml");
if (fs.existsSync(rootPyproject)) {
  checks++;
  const content = fs.readFileSync(rootPyproject, "utf8");
  const match = content.match(/requires-python\s*=\s*"([^"]+)"/);
  if (match && meta.pythonVersion) {
    const floor = extractFloor(match[1]);
    if (floor) {
      const floorParts = parseSemver(floor);
      const expectedParts = parseSemver(meta.pythonVersion);
      if (compareSemver(floorParts, expectedParts) < 0) {
        log(
          "error",
          `pyproject.toml requires-python: floor ${floor} is below manifest Python ${meta.pythonVersion}`,
        );
      } else {
        log("ok", `pyproject.toml requires-python: ${match[1]}`);
      }
    }
  }
}

// ── Summary ─────────────────────────────────────────────────────────

console.log(
  `\n📊 Checked ${checks} constraints: ${errors} errors, ${warnings} warnings`,
);

if (errors > 0) {
  console.log(
    "\n💡 To fix: update the dependency file to meet or exceed the manifest floor," +
      "\n   or get explicit user approval to update .github/version-manifest.json.",
  );
}

process.exit(errors > 0 ? 1 : 0);
