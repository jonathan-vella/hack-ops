#!/usr/bin/env node
/**
 * HackOps Business Rules Validator
 *
 * Mechanically enforces hackops-domain skill invariants in application code.
 * Paired with `.github/skills/hackops-domain/SKILL.md` (Golden Principle 10:
 * if a rule can be a linter/CI check, make it one).
 *
 * Checks:
 * 1. API route files import types from `packages/shared/types/api-contract.ts`
 * 2. Role guard middleware applied to every protected route
 * 3. Audit logging calls in every mutation endpoint
 * 4. Zod validation at API boundary
 * 5. Score fields not directly mutated (must go through scoring service)
 *
 * @example
 * node scripts/validate-business-rules.mjs
 */

import fs from "node:fs";
import path from "node:path";

const API_ROUTES_DIR = "apps/web/src/app/api";
const SHARED_TYPES_IMPORT = /from\s+['"]@hackops\/shared\/types\/api-contract['"]/;
const ROLE_GUARD_PATTERN = /requireRole\s*\(/;
const AUDIT_LOG_PATTERN = /auditLog\s*\(/;
const ZOD_PARSE_PATTERN = /\.safeParse\s*\(|\.parse\s*\(/;
const SCORE_MUTATION_PATTERN = /\.totalScore\s*=|\.score\s*=(?!=)/;
const MUTATION_EXPORTS = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/g;
const HEALTH_ROUTE = /\/api\/health/;

let errors = 0;
let warnings = 0;
let filesChecked = 0;

function collectRouteFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    const full = path.join(entry.parentPath || entry.path, entry.name);
    if (entry.isFile() && entry.name === "route.ts") {
      files.push(full);
    }
  }
  return files;
}

function isHealthRoute(filePath) {
  return filePath.includes("/api/health/") || filePath.endsWith("/api/health/route.ts");
}

function hasMutationEndpoints(content) {
  return MUTATION_EXPORTS.test(content);
}

function validateRouteFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const relative = path.relative(".", filePath);
  let fileErrors = 0;

  filesChecked++;

  // Skip health endpoint — it's public and has no business logic
  if (isHealthRoute(filePath)) {
    return;
  }

  // Check 1: Shared type imports
  if (!SHARED_TYPES_IMPORT.test(content)) {
    console.error(`  ❌ ${relative}: Missing import from @hackops/shared/types/api-contract`);
    fileErrors++;
  }

  // Check 2: Role guard on protected routes
  if (!ROLE_GUARD_PATTERN.test(content)) {
    console.error(`  ❌ ${relative}: Missing requireRole() call — all protected routes need role guards`);
    fileErrors++;
  }

  // Reset regex lastIndex for mutation check
  MUTATION_EXPORTS.lastIndex = 0;
  const isMutation = hasMutationEndpoints(content);
  MUTATION_EXPORTS.lastIndex = 0;

  // Check 3: Audit logging on mutations
  if (isMutation && !AUDIT_LOG_PATTERN.test(content)) {
    console.error(`  ❌ ${relative}: Missing auditLog() call — mutation endpoints must log audit entries`);
    fileErrors++;
  }

  // Check 4: Zod validation at boundary
  if (!ZOD_PARSE_PATTERN.test(content)) {
    console.warn(`  ⚠️  ${relative}: No Zod safeParse/parse found — API boundaries should validate input`);
    warnings++;
  }

  // Check 5: No direct score mutation
  if (SCORE_MUTATION_PATTERN.test(content)) {
    console.error(
      `  ❌ ${relative}: Direct score field mutation detected — must use scoring service`
    );
    fileErrors++;
  }

  errors += fileErrors;
}

console.log("🔍 HackOps Business Rules Validator\n");

const routeFiles = collectRouteFiles(API_ROUTES_DIR);

if (routeFiles.length === 0) {
  console.log(`ℹ️  No API route files found in ${API_ROUTES_DIR}/`);
  console.log("   This is expected before the app scaffold (Phase E) is created.");
  console.log("\n✅ Business rules validation skipped (no routes to check)\n");
  process.exit(0);
}

console.log(`Found ${routeFiles.length} route file(s) in ${API_ROUTES_DIR}/\n`);

for (const file of routeFiles) {
  validateRouteFile(file);
}

console.log(`\n${"═".repeat(50)}`);
console.log(`Files checked: ${filesChecked} | Errors: ${errors} | Warnings: ${warnings}`);

if (errors > 0) {
  console.error(`\n❌ ${errors} business rule violation(s) found\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n⚠️  Passed with ${warnings} warning(s)\n`);
} else {
  console.log("\n✅ All business rules validated\n");
}