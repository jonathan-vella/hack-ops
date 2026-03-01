-- -----------------------------------------------------------------------
-- HackOps — Azure SQL Database Schema
-- Run this DDL after database creation via sqlcmd or Azure Data Studio.
-- -----------------------------------------------------------------------

-- ── hackathons ──────────────────────────────────────────────────────────

CREATE TABLE hackathons (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  name            NVARCHAR(200)   NOT NULL,
  description     NVARCHAR(MAX)   NOT NULL DEFAULT '',
  status          NVARCHAR(20)    NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'archived')),
  eventCode       NVARCHAR(4)     NOT NULL,
  teamSize        INT             NOT NULL DEFAULT 5,
  createdBy       NVARCHAR(128)   NOT NULL,
  createdAt       DATETIME2       NOT NULL,
  launchedAt      DATETIME2       NULL,
  archivedAt      DATETIME2       NULL,

  INDEX IX_hackathons_eventCode (eventCode) WHERE status != 'archived'
);

-- ── teams ───────────────────────────────────────────────────────────────

CREATE TABLE teams (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  name            NVARCHAR(200)   NOT NULL,
  -- JSON array of {hackerId, githubLogin, displayName}
  members         NVARCHAR(MAX)   NOT NULL DEFAULT '[]',

  INDEX IX_teams_hackathonId (hackathonId)
);

-- ── hackers ─────────────────────────────────────────────────────────────

CREATE TABLE hackers (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  githubUserId    NVARCHAR(128)   NOT NULL,
  githubLogin     NVARCHAR(100)   NOT NULL,
  displayName     NVARCHAR(200)   NOT NULL,
  email           NVARCHAR(200)   NOT NULL,
  avatarUrl       NVARCHAR(500)   NOT NULL,
  eventCode       NVARCHAR(4)     NOT NULL,
  teamId          NVARCHAR(128)   NULL REFERENCES teams(id),
  joinedAt        DATETIME2       NOT NULL,

  INDEX IX_hackers_hackathonId (hackathonId),
  INDEX IX_hackers_githubUserId (githubUserId)
);

-- ── challenges ──────────────────────────────────────────────────────────

CREATE TABLE challenges (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  [order]         INT             NOT NULL,
  title           NVARCHAR(200)   NOT NULL,
  description     NVARCHAR(MAX)   NOT NULL DEFAULT '',
  maxScore        INT             NOT NULL,
  createdBy       NVARCHAR(128)   NOT NULL,
  createdAt       DATETIME2       NOT NULL,

  INDEX IX_challenges_hackathonId_order (hackathonId, [order])
);

-- ── submissions ─────────────────────────────────────────────────────────

CREATE TABLE submissions (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  teamId          NVARCHAR(128)   NOT NULL REFERENCES teams(id),
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  challengeId     NVARCHAR(128)   NOT NULL REFERENCES challenges(id),
  state           NVARCHAR(20)    NOT NULL DEFAULT 'pending'
                    CHECK (state IN ('pending', 'approved', 'rejected')),
  description     NVARCHAR(MAX)   NOT NULL DEFAULT '',
  -- JSON array of attachment URLs
  attachments     NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
  submittedBy     NVARCHAR(128)   NOT NULL,
  submittedAt     DATETIME2       NOT NULL,
  -- JSON array of {categoryId, score} — null until reviewed
  scores          NVARCHAR(MAX)   NULL,
  reviewedBy      NVARCHAR(128)   NULL,
  reviewedAt      DATETIME2       NULL,
  reviewReason    NVARCHAR(MAX)   NULL,

  INDEX IX_submissions_hackathonId_state (hackathonId, state, submittedAt DESC),
  INDEX IX_submissions_teamId (teamId)
);

-- ── scores ──────────────────────────────────────────────────────────────

CREATE TABLE scores (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  teamId          NVARCHAR(128)   NOT NULL REFERENCES teams(id),
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  challengeId     NVARCHAR(128)   NOT NULL REFERENCES challenges(id),
  submissionId    NVARCHAR(128)   NOT NULL REFERENCES submissions(id),
  -- JSON array of {categoryId, score}
  categoryScores  NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
  total           INT             NOT NULL,
  approvedBy      NVARCHAR(128)   NOT NULL,
  approvedAt      DATETIME2       NOT NULL,
  overriddenBy    NVARCHAR(128)   NULL,
  overriddenAt    DATETIME2       NULL,
  overrideReason  NVARCHAR(MAX)   NULL,

  INDEX IX_scores_hackathonId_total (hackathonId, total DESC),
  INDEX IX_scores_teamId (teamId)
);

-- ── rubric_pointers ─────────────────────────────────────────────────────

CREATE TABLE rubric_pointers (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  activeRubricId  NVARCHAR(128)   NOT NULL,
  updatedAt       DATETIME2       NOT NULL,
  updatedBy       NVARCHAR(128)   NOT NULL,

  CONSTRAINT UQ_rubric_pointers_hackathonId UNIQUE (hackathonId)
);

-- ── rubric_versions ─────────────────────────────────────────────────────

CREATE TABLE rubric_versions (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  version         INT             NOT NULL,
  -- JSON array of {id, name, description, maxScore}
  categories      NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
  createdBy       NVARCHAR(128)   NOT NULL,
  createdAt       DATETIME2       NOT NULL,

  INDEX IX_rubric_versions_hackathonId (hackathonId, version DESC)
);

-- ── config ──────────────────────────────────────────────────────────────

CREATE TABLE config (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  [key]           NVARCHAR(200)   NOT NULL,
  value           NVARCHAR(MAX)   NOT NULL,
  updatedBy       NVARCHAR(128)   NOT NULL,
  updatedAt       DATETIME2       NOT NULL,

  CONSTRAINT UQ_config_key UNIQUE ([key])
);

-- ── roles ───────────────────────────────────────────────────────────────

CREATE TABLE roles (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL,
  githubUserId    NVARCHAR(128)   NOT NULL,
  githubLogin     NVARCHAR(100)   NOT NULL,
  role            NVARCHAR(20)    NOT NULL
                    CHECK (role IN ('admin', 'coach', 'hacker')),
  isPrimaryAdmin  BIT             NOT NULL DEFAULT 0,
  assignedBy      NVARCHAR(128)   NOT NULL,
  assignedAt      DATETIME2       NOT NULL,

  INDEX IX_roles_hackathonId (hackathonId, assignedAt DESC),
  INDEX IX_roles_githubUserId (githubUserId)
);

-- ── progressions ────────────────────────────────────────────────────────

CREATE TABLE progressions (
  id                  NVARCHAR(128)   NOT NULL PRIMARY KEY,
  teamId              NVARCHAR(128)   NOT NULL REFERENCES teams(id),
  hackathonId         NVARCHAR(128)   NOT NULL REFERENCES hackathons(id),
  currentChallenge    INT             NOT NULL DEFAULT 1,
  -- JSON array of {challengeId, unlockedAt}
  unlockedChallenges  NVARCHAR(MAX)   NOT NULL DEFAULT '[]',
  -- Row version for optimistic concurrency
  rowVersion          ROWVERSION      NOT NULL,

  INDEX IX_progressions_teamId_hackathonId (teamId, hackathonId)
);

-- ── audit_log ───────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id              NVARCHAR(128)   NOT NULL PRIMARY KEY,
  hackathonId     NVARCHAR(128)   NOT NULL,
  action          NVARCHAR(100)   NOT NULL,
  targetType      NVARCHAR(100)   NOT NULL,
  targetId        NVARCHAR(128)   NOT NULL,
  performedBy     NVARCHAR(128)   NOT NULL,
  performedAt     DATETIME2       NOT NULL,
  reason          NVARCHAR(MAX)   NULL,
  details         NVARCHAR(MAX)   NULL,

  INDEX IX_audit_log_hackathonId (hackathonId, performedAt DESC),
  INDEX IX_audit_log_action (action)
);
