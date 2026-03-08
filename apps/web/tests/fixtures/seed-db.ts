/**
 * Seed the local SQL Server with test fixtures.
 * Idempotent: truncates all tables then inserts fresh data.
 */
import sql from "mssql";
import {
  HACKATHON_ID,
  EVENT_CODE,
  ADMIN_USER_ID,
  COACH_USER_ID,
  HACKER_USER_ID,
  fixtures,
} from "./index";

const TABLES_IN_FK_ORDER = [
  "audit_log",
  "progressions",
  "scores",
  "submissions",
  "rubric_pointers",
  "rubric_versions",
  "hackers",
  "challenges",
  "teams",
  "config",
  "roles",
  "hackathons",
];

export async function seedDatabase(pool: sql.ConnectionPool): Promise<void> {
  await truncateAll(pool);

  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.hackathon.id)
    .input("name", sql.NVarChar, fixtures.hackathon.name)
    .input("description", sql.NVarChar, fixtures.hackathon.description)
    .input("status", sql.NVarChar, fixtures.hackathon.status)
    .input("eventCode", sql.NVarChar, fixtures.hackathon.eventCode)
    .input("teamSize", sql.Int, fixtures.hackathon.teamSize)
    .input("createdBy", sql.NVarChar, fixtures.hackathon.createdBy)
    .input("createdAt", sql.DateTime2, new Date(fixtures.hackathon.createdAt))
    .input(
      "launchedAt",
      sql.DateTime2,
      fixtures.hackathon.launchedAt
        ? new Date(fixtures.hackathon.launchedAt)
        : null,
    )
    .query(`INSERT INTO hackathons (id, name, description, status, eventCode, teamSize, createdBy, createdAt, launchedAt)
            VALUES (@id, @name, @description, @status, @eventCode, @teamSize, @createdBy, @createdAt, @launchedAt)`);

  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.team.id)
    .input("hackathonId", sql.NVarChar, fixtures.team.hackathonId)
    .input("name", sql.NVarChar, fixtures.team.name)
    .input("members", sql.NVarChar, JSON.stringify(fixtures.team.members))
    .query(`INSERT INTO teams (id, hackathonId, name, members)
            VALUES (@id, @hackathonId, @name, @members)`);

  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.hacker.id)
    .input("hackathonId", sql.NVarChar, fixtures.hacker.hackathonId)
    .input("githubUserId", sql.NVarChar, fixtures.hacker.githubUserId)
    .input("githubLogin", sql.NVarChar, fixtures.hacker.githubLogin)
    .input("displayName", sql.NVarChar, fixtures.hacker.displayName)
    .input("email", sql.NVarChar, fixtures.hacker.email)
    .input("avatarUrl", sql.NVarChar, fixtures.hacker.avatarUrl)
    .input("eventCode", sql.NVarChar, fixtures.hacker.eventCode)
    .input("teamId", sql.NVarChar, fixtures.hacker.teamId)
    .input("joinedAt", sql.DateTime2, new Date(fixtures.hacker.joinedAt))
    .query(`INSERT INTO hackers (id, hackathonId, githubUserId, githubLogin, displayName, email, avatarUrl, eventCode, teamId, joinedAt)
            VALUES (@id, @hackathonId, @githubUserId, @githubLogin, @displayName, @email, @avatarUrl, @eventCode, @teamId, @joinedAt)`);

  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.challenge.id)
    .input("hackathonId", sql.NVarChar, fixtures.challenge.hackathonId)
    .input("order", sql.Int, fixtures.challenge.order)
    .input("title", sql.NVarChar, fixtures.challenge.title)
    .input("description", sql.NVarChar, fixtures.challenge.description)
    .input("maxScore", sql.Int, fixtures.challenge.maxScore)
    .input("createdBy", sql.NVarChar, fixtures.challenge.createdBy)
    .input("createdAt", sql.DateTime2, new Date(fixtures.challenge.createdAt))
    .query(`INSERT INTO challenges (id, hackathonId, [order], title, description, maxScore, createdBy, createdAt)
            VALUES (@id, @hackathonId, @order, @title, @description, @maxScore, @createdBy, @createdAt)`);

  // Second challenge for progression testing
  await pool
    .request()
    .input("id", sql.NVarChar, "ch-002-implement")
    .input("hackathonId", sql.NVarChar, HACKATHON_ID)
    .input("order", sql.Int, 2)
    .input("title", sql.NVarChar, "Implementation")
    .input(
      "description",
      sql.NVarChar,
      "Build the core solution using Azure OpenAI.",
    )
    .input("maxScore", sql.Int, 50)
    .input("createdBy", sql.NVarChar, ADMIN_USER_ID)
    .input("createdAt", sql.DateTime2, new Date("2026-02-18T11:00:00Z"))
    .query(`INSERT INTO challenges (id, hackathonId, [order], title, description, maxScore, createdBy, createdAt)
            VALUES (@id, @hackathonId, @order, @title, @description, @maxScore, @createdBy, @createdAt)`);

  // Rubric pointer
  await pool
    .request()
    .input("id", sql.NVarChar, "rp-" + HACKATHON_ID)
    .input("hackathonId", sql.NVarChar, HACKATHON_ID)
    .input("activeRubricId", sql.NVarChar, fixtures.rubric.id)
    .input("updatedAt", sql.DateTime2, new Date(fixtures.rubric.createdAt))
    .input("updatedBy", sql.NVarChar, ADMIN_USER_ID)
    .query(`INSERT INTO rubric_pointers (id, hackathonId, activeRubricId, updatedAt, updatedBy)
            VALUES (@id, @hackathonId, @activeRubricId, @updatedAt, @updatedBy)`);

  // Rubric version
  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.rubric.id)
    .input("hackathonId", sql.NVarChar, HACKATHON_ID)
    .input("version", sql.Int, fixtures.rubric.version)
    .input("categories", sql.NVarChar, JSON.stringify(fixtures.rubric.criteria))
    .input("createdBy", sql.NVarChar, fixtures.rubric.createdBy)
    .input("createdAt", sql.DateTime2, new Date(fixtures.rubric.createdAt))
    .query(`INSERT INTO rubric_versions (id, hackathonId, version, categories, createdBy, createdAt)
            VALUES (@id, @hackathonId, @version, @categories, @createdBy, @createdAt)`);

  // Roles
  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.adminRole.id)
    .input("hackathonId", sql.NVarChar, fixtures.adminRole.hackathonId)
    .input("githubUserId", sql.NVarChar, fixtures.adminRole.githubUserId)
    .input("githubLogin", sql.NVarChar, fixtures.adminRole.githubLogin)
    .input("role", sql.NVarChar, fixtures.adminRole.role)
    .input("isPrimaryAdmin", sql.Bit, fixtures.adminRole.isPrimaryAdmin ? 1 : 0)
    .input("assignedBy", sql.NVarChar, fixtures.adminRole.assignedBy)
    .input("assignedAt", sql.DateTime2, new Date(fixtures.adminRole.assignedAt))
    .query(`INSERT INTO roles (id, hackathonId, githubUserId, githubLogin, role, isPrimaryAdmin, assignedBy, assignedAt)
            VALUES (@id, @hackathonId, @githubUserId, @githubLogin, @role, @isPrimaryAdmin, @assignedBy, @assignedAt)`);

  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.coachRole.id)
    .input("hackathonId", sql.NVarChar, fixtures.coachRole.hackathonId)
    .input("githubUserId", sql.NVarChar, fixtures.coachRole.githubUserId)
    .input("githubLogin", sql.NVarChar, fixtures.coachRole.githubLogin)
    .input("role", sql.NVarChar, fixtures.coachRole.role)
    .input("isPrimaryAdmin", sql.Bit, fixtures.coachRole.isPrimaryAdmin ? 1 : 0)
    .input("assignedBy", sql.NVarChar, fixtures.coachRole.assignedBy)
    .input("assignedAt", sql.DateTime2, new Date(fixtures.coachRole.assignedAt))
    .query(`INSERT INTO roles (id, hackathonId, githubUserId, githubLogin, role, isPrimaryAdmin, assignedBy, assignedAt)
            VALUES (@id, @hackathonId, @githubUserId, @githubLogin, @role, @isPrimaryAdmin, @assignedBy, @assignedAt)`);

  // Submission (pending state for coach testing)
  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.submission.id)
    .input("teamId", sql.NVarChar, fixtures.submission.teamId)
    .input("hackathonId", sql.NVarChar, fixtures.submission.hackathonId)
    .input("challengeId", sql.NVarChar, fixtures.submission.challengeId)
    .input("state", sql.NVarChar, "pending")
    .input("description", sql.NVarChar, "Challenge 1 evidence")
    .input(
      "attachments",
      sql.NVarChar,
      JSON.stringify([fixtures.submission.evidenceUrl]),
    )
    .input("submittedBy", sql.NVarChar, fixtures.submission.submittedBy)
    .input(
      "submittedAt",
      sql.DateTime2,
      new Date(fixtures.submission.submittedAt),
    )
    .query(`INSERT INTO submissions (id, teamId, hackathonId, challengeId, state, description, attachments, submittedBy, submittedAt)
            VALUES (@id, @teamId, @hackathonId, @challengeId, @state, @description, @attachments, @submittedBy, @submittedAt)`);

  // Progression
  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.progression.id)
    .input("teamId", sql.NVarChar, fixtures.progression.teamId)
    .input("hackathonId", sql.NVarChar, fixtures.progression.hackathonId)
    .input("currentChallenge", sql.Int, 1)
    .input(
      "unlockedChallenges",
      sql.NVarChar,
      JSON.stringify([
        { challengeId: "ch-001-setup", unlockedAt: "2026-02-20T08:00:00Z" },
      ]),
    )
    .query(`INSERT INTO progressions (id, teamId, hackathonId, currentChallenge, unlockedChallenges)
            VALUES (@id, @teamId, @hackathonId, @currentChallenge, @unlockedChallenges)`);

  // Config
  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.config.id)
    .input("key", sql.NVarChar, fixtures.config.key)
    .input("value", sql.NVarChar, String(fixtures.config.value))
    .input("updatedBy", sql.NVarChar, fixtures.config.updatedBy)
    .input("updatedAt", sql.DateTime2, new Date(fixtures.config.updatedAt))
    .query(`INSERT INTO config (id, [key], value, updatedBy, updatedAt)
            VALUES (@id, @key, @value, @updatedBy, @updatedAt)`);

  // Audit log
  await pool
    .request()
    .input("id", sql.NVarChar, fixtures.auditEntry.id)
    .input("hackathonId", sql.NVarChar, fixtures.auditEntry.hackathonId)
    .input("action", sql.NVarChar, fixtures.auditEntry.action)
    .input("targetType", sql.NVarChar, fixtures.auditEntry.targetType)
    .input("targetId", sql.NVarChar, fixtures.auditEntry.targetId)
    .input("performedBy", sql.NVarChar, fixtures.auditEntry.performedBy)
    .input(
      "performedAt",
      sql.DateTime2,
      new Date(fixtures.auditEntry.timestamp),
    )
    .input("details", sql.NVarChar, JSON.stringify(fixtures.auditEntry.details))
    .query(`INSERT INTO audit_log (id, hackathonId, action, targetType, targetId, performedBy, performedAt, details)
            VALUES (@id, @hackathonId, @action, @targetType, @targetId, @performedBy, @performedAt, @details)`);
}

async function truncateAll(pool: sql.ConnectionPool): Promise<void> {
  for (const table of TABLES_IN_FK_ORDER) {
    await pool.request().query(`DELETE FROM ${table}`);
  }
}
