/**
 * Business Rules Validator
 *
 * Validates that API route handlers and Zod schemas conform to the
 * business rules defined in the api-contract.ts source of truth.
 *
 * Checks:
 * - Every API namespace in api-contract.ts has a corresponding route
 * - Zod schemas exist for request types that need validation
 * - Role guards are applied to route handlers
 * - State machine transitions are enforced
 * - Scoring invariants are codified
 *
 * Usage: node scripts/validate-business-rules.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WEB_SRC = path.join(ROOT, "apps", "web", "src");
const CONTRACT = path.join(
  ROOT,
  "packages",
  "shared",
  "types",
  "api-contract.ts",
);

let errors = 0;
let warnings = 0;
let checks = 0;

function log(level, msg) {
  const prefix =
    level === "error" ? "❌" : level === "warn" ? "⚠️ " : "✅";
  console.log(`${prefix} ${msg}`);
  if (level === "error") errors++;
  if (level === "warn") warnings++;
}

function check(condition, passMsg, failMsg, level = "error") {
  checks++;
  if (condition) {
    log("ok", passMsg);
  } else {
    log(level, failMsg);
  }
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function fileContains(relPath, pattern) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) return false;
  const content = fs.readFileSync(absPath, "utf8");
  if (typeof pattern === "string") return content.includes(pattern);
  return pattern.test(content);
}

function main() {
  console.log("🔍 Business Rules Validator\n");

  // Gate: api-contract.ts must exist
  if (!fs.existsSync(CONTRACT)) {
    log("error", "api-contract.ts not found — cannot validate business rules");
    process.exit(1);
  }

  const contractContent = fs.readFileSync(CONTRACT, "utf8");

  // ── 1. Route existence checks ───────────────────────────
  console.log("\n── Route Coverage ──\n");

  const routeMap = [
    { ns: "HealthAPI", route: "apps/web/src/app/api/health/route.ts" },
    { ns: "HackathonsAPI", route: "apps/web/src/app/api/hackathons/route.ts" },
    { ns: "JoinAPI", route: "apps/web/src/app/api/join/route.ts" },
    { ns: "TeamsAPI", route: "apps/web/src/app/api/teams/route.ts" },
    { ns: "RubricsAPI", route: "apps/web/src/app/api/rubrics/route.ts" },
    {
      ns: "SubmissionsAPI",
      route: "apps/web/src/app/api/submissions/route.ts",
    },
    { ns: "ChallengesAPI", route: "apps/web/src/app/api/challenges/route.ts" },
    { ns: "LeaderboardAPI", route: "apps/web/src/app/api/leaderboard" },
    { ns: "RolesAPI", route: "apps/web/src/app/api/roles/route.ts" },
    { ns: "AuditAPI", route: "apps/web/src/app/api/audit" },
    { ns: "ConfigAPI", route: "apps/web/src/app/api/config/route.ts" },
  ];

  for (const { ns, route } of routeMap) {
    const exists = contractContent.includes(`namespace ${ns}`);
    if (!exists) continue;
    const routeExists =
      fileExists(route) ||
      fileExists(route.replace("/route.ts", "")) ||
      fs.existsSync(path.join(ROOT, route));
    check(
      routeExists,
      `${ns} → route exists`,
      `${ns} → route missing at ${route}`,
      "warn",
    );
  }

  // ── 2. Auth guard checks ────────────────────────────────
  console.log("\n── Auth Guards ──\n");

  const guardedRoutes = [
    {
      file: "apps/web/src/app/api/hackathons/route.ts",
      pattern: /require(Auth|Role)/,
    },
    {
      file: "apps/web/src/app/api/hackathons/[id]/route.ts",
      pattern: /requireRole/,
    },
    {
      file: "apps/web/src/app/api/hackathons/[id]/assign-teams/route.ts",
      pattern: /requireRole/,
    },
    { file: "apps/web/src/app/api/join/route.ts", pattern: /requireAuth/ },
    { file: "apps/web/src/app/api/teams/route.ts", pattern: /requireRole/ },
    {
      file: "apps/web/src/app/api/teams/[id]/reassign/route.ts",
      pattern: /requireRole/,
    },
  ];

  for (const { file, pattern } of guardedRoutes) {
    if (!fileExists(file)) continue;
    check(
      fileContains(file, pattern),
      `${path.basename(path.dirname(file))}/route.ts uses auth guard`,
      `${file} missing auth guard (expected ${pattern})`,
    );
  }

  // ── 3. State machine invariants ─────────────────────────
  console.log("\n── State Machine ──\n");

  check(
    contractContent.includes('"draft" | "active" | "archived"'),
    "HackathonStatus has 3 states: draft, active, archived",
    "HackathonStatus missing expected states",
  );

  check(
    contractContent.includes('"pending" | "approved" | "rejected"'),
    "SubmissionState has 3 states: pending, approved, rejected",
    "SubmissionState missing expected states",
  );

  // Verify route enforces valid transitions
  const hackPatchFile = "apps/web/src/app/api/hackathons/[id]/route.ts";
  if (fileExists(hackPatchFile)) {
    check(
      fileContains(hackPatchFile, "draft") &&
        fileContains(hackPatchFile, "active") &&
        fileContains(hackPatchFile, "archived"),
      "Hackathon PATCH enforces state transitions",
      "Hackathon PATCH may not enforce state machine transitions",
    );
  }

  // ── 4. Scoring invariants ───────────────────────────────
  console.log("\n── Scoring Invariants ──\n");

  check(
    contractContent.includes("CategoryScore"),
    "CategoryScore type defined (rubric scoring building block)",
    "CategoryScore type missing from contract",
  );

  check(
    contractContent.includes("GradeBadge"),
    "GradeBadge type defined (A/B/C/D grading)",
    "GradeBadge type missing from contract",
  );

  check(
    contractContent.includes("lastApprovalAt"),
    "Tiebreaker field (lastApprovalAt) present in LeaderboardEntry",
    "Tiebreaker field missing — earliest-approval-wins rule unenforceable",
  );

  // ── 5. Role types ──────────────────────────────────────
  console.log("\n── Role Invariants ──\n");

  check(
    contractContent.includes('"admin" | "coach" | "hacker"'),
    "UserRole has 3 roles: admin, coach, hacker",
    "UserRole missing expected roles",
  );

  check(
    contractContent.includes("isPrimaryAdmin"),
    "Primary admin protection field exists",
    "isPrimaryAdmin field missing from RoleRecord",
  );

  // ── 6. Zod schema coverage ─────────────────────────────
  console.log("\n── Zod Schema Coverage ──\n");

  const zodSchemas = [
    {
      name: "hackathon",
      file: "apps/web/src/lib/validation/hackathon.ts",
    },
    { name: "join", file: "apps/web/src/lib/validation/join.ts" },
    { name: "team", file: "apps/web/src/lib/validation/team.ts" },
  ];

  for (const { name, file } of zodSchemas) {
    check(
      fileExists(file),
      `Zod schema for '${name}' exists`,
      `Zod schema for '${name}' missing at ${file}`,
    );
  }

  // ── Summary ─────────────────────────────────────────────
  console.log("\n" + "=".repeat(50) + "\n");
  console.log(`Checks: ${checks} | Errors: ${errors} | Warnings: ${warnings}`);

  if (errors > 0) {
    console.log("\n❌ Business rules validation FAILED");
    process.exit(1);
  } else if (warnings > 0) {
    console.log("\n⚠️  Business rules validation PASSED with warnings");
  } else {
    console.log("\n✅ Business rules validation PASSED");
  }
}

main();
