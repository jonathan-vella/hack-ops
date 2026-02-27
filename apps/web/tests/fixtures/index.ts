/**
 * Test fixtures for HackOps integration/E2E tests.
 * Mirrors the seed data in scripts/seed-cosmos.ts.
 */

export const HACKATHON_ID = "hack-2026-swedenai";
export const EVENT_CODE = "4821";
export const ADMIN_USER_ID = "github|12345678";
export const COACH_USER_ID = "github|11111111";
export const HACKER_USER_ID = "github|87654321";

export const fixtures = {
  hackathon: {
    id: HACKATHON_ID,
    _type: "hackathon" as const,
    name: "Sweden AI MicroHack 2026",
    description: "Build AI-powered solutions using Azure OpenAI and Cosmos DB",
    status: "active" as const,
    eventCode: EVENT_CODE,
    teamSize: 5,
    createdBy: ADMIN_USER_ID,
    createdAt: "2026-02-15T09:00:00Z",
    launchedAt: "2026-02-20T08:00:00Z",
    archivedAt: null,
  },

  team: {
    id: "team-alpha-4821",
    _type: "team" as const,
    hackathonId: HACKATHON_ID,
    name: "Team Alpha",
    members: [
      {
        hackerId: "hkr-a1b2c3d4",
        githubLogin: "alice-dev",
        displayName: "Alice Andersson",
      },
      {
        hackerId: "hkr-e5f6g7h8",
        githubLogin: "bob-coder",
        displayName: "Bob Bergström",
      },
      {
        hackerId: "hkr-i9j0k1l2",
        githubLogin: "carol-hacks",
        displayName: "Carol Chen",
      },
    ],
  },

  hacker: {
    id: "hkr-a1b2c3d4",
    _type: "hacker" as const,
    hackathonId: HACKATHON_ID,
    githubUserId: HACKER_USER_ID,
    githubLogin: "alice-dev",
    displayName: "Alice Andersson",
    email: "alice@example.com",
    avatarUrl: "https://avatars.githubusercontent.com/u/87654321",
    eventCode: EVENT_CODE,
    teamId: "team-alpha-4821",
    joinedAt: "2026-02-20T10:15:00Z",
  },

  challenge: {
    id: "ch-001-setup",
    _type: "challenge" as const,
    hackathonId: HACKATHON_ID,
    order: 1,
    title: "Environment Setup",
    description:
      "Configure your development environment with Azure OpenAI access.",
    maxScore: 30,
    createdBy: ADMIN_USER_ID,
    createdAt: "2026-02-18T10:00:00Z",
  },

  rubric: {
    id: "rubric-setup-v1",
    _type: "rubric" as const,
    hackathonId: HACKATHON_ID,
    challengeId: "ch-001-setup",
    version: 1,
    isActive: true,
    criteria: [
      {
        id: "c1",
        label: "Environment configured",
        maxScore: 10,
        description: "Dev env is fully set up",
      },
      {
        id: "c2",
        label: "API key working",
        maxScore: 10,
        description: "Azure OpenAI key validated",
      },
      {
        id: "c3",
        label: "Documentation quality",
        maxScore: 10,
        description: "Clear setup instructions",
      },
    ],
    createdBy: ADMIN_USER_ID,
    createdAt: "2026-02-18T10:30:00Z",
  },

  submission: {
    id: "sub-team-alpha-ch-001",
    _type: "submission" as const,
    teamId: "team-alpha-4821",
    hackathonId: HACKATHON_ID,
    challengeId: "ch-001-setup",
    evidenceUrl:
      "https://github.com/team-alpha/evidence/blob/main/challenge-1.md",
    submittedBy: HACKER_USER_ID,
    submittedAt: "2026-02-21T12:00:00Z",
    status: "reviewed" as const,
    reviewedBy: COACH_USER_ID,
    reviewedAt: "2026-02-21T14:00:00Z",
  },

  score: {
    id: "score-team-alpha-ch-001",
    _type: "score" as const,
    teamId: "team-alpha-4821",
    hackathonId: HACKATHON_ID,
    challengeId: "ch-001-setup",
    rubricId: "rubric-setup-v1",
    totalScore: 25,
    maxScore: 30,
    scoredBy: COACH_USER_ID,
    scoredAt: "2026-02-21T14:00:00Z",
    breakdown: [
      {
        criterionId: "c1",
        label: "Environment configured",
        score: 10,
        maxScore: 10,
      },
      { criterionId: "c2", label: "API key working", score: 8, maxScore: 10 },
      {
        criterionId: "c3",
        label: "Documentation quality",
        score: 7,
        maxScore: 10,
      },
    ],
  },

  adminRole: {
    id: "role-12345678-hack-2026-swedenai",
    _type: "role" as const,
    hackathonId: HACKATHON_ID,
    githubUserId: ADMIN_USER_ID,
    githubLogin: "jonathan-admin",
    role: "admin" as const,
    isPrimaryAdmin: true,
    assignedBy: "system",
    assignedAt: "2026-02-15T09:00:00Z",
  },

  coachRole: {
    id: "role-11111111-hack-2026-swedenai",
    _type: "role" as const,
    hackathonId: HACKATHON_ID,
    githubUserId: COACH_USER_ID,
    githubLogin: "coach-sarah",
    role: "coach" as const,
    isPrimaryAdmin: false,
    assignedBy: ADMIN_USER_ID,
    assignedAt: "2026-02-16T10:00:00Z",
  },

  progression: {
    id: "prog-team-alpha-4821",
    _type: "progression" as const,
    teamId: "team-alpha-4821",
    hackathonId: HACKATHON_ID,
    challenges: [
      {
        challengeId: "ch-001-setup",
        status: "approved" as const,
        unlockedAt: "2026-02-20T08:00:00Z",
        approvedAt: "2026-02-21T14:00:00Z",
      },
    ],
  },

  config: {
    id: "cfg-leaderboard-refresh-interval",
    _type: "config" as const,
    key: "leaderboard-refresh-interval",
    value: 30000,
    updatedBy: ADMIN_USER_ID,
    updatedAt: "2026-02-15T09:30:00Z",
  },

  auditEntry: {
    id: "audit-seed-001",
    _type: "audit" as const,
    hackathonId: HACKATHON_ID,
    action: "hackathon.launch",
    targetType: "hackathon",
    targetId: HACKATHON_ID,
    performedBy: ADMIN_USER_ID,
    timestamp: "2026-02-20T08:00:00Z",
    details: { previousStatus: "draft", newStatus: "active" },
  },
} as const;

/** Principal headers for Easy Auth simulation in tests */
export const principals = {
  admin: {
    "x-ms-client-principal": Buffer.from(
      JSON.stringify({
        userId: ADMIN_USER_ID,
        identityProvider: "github",
        userDetails: "jonathan-admin",
        userRoles: ["authenticated"],
        claims: [
          { typ: "name", val: "Jonathan Admin" },
          { typ: "preferred_username", val: "jonathan-admin" },
        ],
      }),
    ).toString("base64"),
  },
  coach: {
    "x-ms-client-principal": Buffer.from(
      JSON.stringify({
        userId: COACH_USER_ID,
        identityProvider: "github",
        userDetails: "coach-sarah",
        userRoles: ["authenticated"],
        claims: [
          { typ: "name", val: "Sarah Coach" },
          { typ: "preferred_username", val: "coach-sarah" },
        ],
      }),
    ).toString("base64"),
  },
  hacker: {
    "x-ms-client-principal": Buffer.from(
      JSON.stringify({
        userId: HACKER_USER_ID,
        identityProvider: "github",
        userDetails: "alice-dev",
        userRoles: ["authenticated"],
        claims: [
          { typ: "name", val: "Alice Andersson" },
          { typ: "preferred_username", val: "alice-dev" },
        ],
      }),
    ).toString("base64"),
  },
};
