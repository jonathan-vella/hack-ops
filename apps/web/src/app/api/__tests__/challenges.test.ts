import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { EasyAuthPrincipal } from "@hackops/shared";

// ── Per-container Cosmos mocks ─────────────────────────────

const challengeQuery = vi.fn();
const challengeCreate = vi.fn();
const challengeRead = vi.fn();
const challengeReplace = vi.fn();
const challengeItem = vi.fn(() => ({
  read: challengeRead,
  replace: challengeReplace,
}));

const progressionQuery = vi.fn();
const progressionCreate = vi.fn();
const progressionRead = vi.fn();
const progressionReplace = vi.fn();
const progressionItem = vi.fn(() => ({
  read: progressionRead,
  replace: progressionReplace,
}));

const hackathonQuery = vi.fn();
const hackathonRead = vi.fn();
const hackathonReplace = vi.fn();
const hackathonItem = vi.fn(() => ({
  read: hackathonRead,
  replace: hackathonReplace,
}));

const teamQuery = vi.fn();
const teamCreate = vi.fn();
const teamItem = vi.fn(() => ({ read: vi.fn() }));

const hackerQuery = vi.fn();
const hackerItem = vi.fn(() => ({ read: vi.fn() }));

const submissionQuery = vi.fn();
const submissionCreate = vi.fn();
const submissionReplace = vi.fn();
const submissionItem = vi.fn(() => ({
  read: vi.fn(),
  replace: submissionReplace,
}));

const scoreQuery = vi.fn();
const scoreCreate = vi.fn();
const scoreItem = vi.fn(() => ({ read: vi.fn() }));

const rubricQuery = vi.fn();
const rubricRead = vi.fn();
const rubricItem = vi.fn(() => ({ read: rubricRead }));

const auditCreate = vi.fn();

vi.mock("@/lib/cosmos", () => ({
  getContainer: vi.fn((name: string) => {
    const map: Record<string, unknown> = {
      challenges: {
        items: { query: challengeQuery, create: challengeCreate },
        item: challengeItem,
      },
      progression: {
        items: { query: progressionQuery, create: progressionCreate },
        item: progressionItem,
      },
      hackathons: {
        items: { query: hackathonQuery },
        item: hackathonItem,
      },
      teams: {
        items: { query: teamQuery, create: teamCreate },
        item: teamItem,
      },
      hackers: {
        items: { query: hackerQuery },
        item: hackerItem,
      },
      submissions: {
        items: { query: submissionQuery, create: submissionCreate },
        item: submissionItem,
      },
      scores: {
        items: { query: scoreQuery, create: scoreCreate },
        item: scoreItem,
      },
      rubrics: {
        items: { query: rubricQuery },
        item: rubricItem,
      },
      audit: {
        items: { create: auditCreate },
      },
    };
    return map[name];
  }),
}));

vi.mock("@/lib/auth", () => ({
  getAuthPrincipal: vi.fn(),
}));
vi.mock("@/lib/roles", () => ({
  resolveRole: vi.fn(),
  getDevRole: vi.fn().mockReturnValue(null),
  isPrimaryAdmin: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
}));

import { getAuthPrincipal } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";
import { auditLog } from "@/lib/audit";

const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockResolveRole = vi.mocked(resolveRole);
const mockAuditLog = vi.mocked(auditLog);

const adminPrincipal: EasyAuthPrincipal = {
  userId: "user-admin-1",
  githubLogin: "admin-user",
  email: "admin@example.com",
  avatarUrl: "",
};

const hackerPrincipal: EasyAuthPrincipal = {
  userId: "user-hacker-1",
  githubLogin: "hacker-user",
  email: "hacker@example.com",
  avatarUrl: "",
};

function createRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function emptyFetchAll(resources: unknown[] = []) {
  return {
    fetchAll: vi.fn().mockResolvedValue({ resources }),
    fetchNext: vi
      .fn()
      .mockResolvedValue({ resources, continuationToken: null }),
  };
}

// ── Challenge CRUD ─────────────────────────────────────────

describe("POST /api/challenges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 1,
      title: "Setup",
      description: "Do the setup",
      maxScore: 30,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("creates first challenge with order 1", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    challengeQuery.mockReturnValue(emptyFetchAll([]));
    challengeCreate.mockResolvedValue({ resource: {} });

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 1,
      title: "Environment Setup",
      description: "Configure your dev environment",
      maxScore: 30,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.order).toBe(1);
    expect(body.data.title).toBe("Environment Setup");
    expect(body.data.maxScore).toBe(30);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "challenge.create" }),
    );
  });

  it("rejects duplicate order", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 1 }]));

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 1,
      title: "Duplicate",
      description: "Should fail",
      maxScore: 20,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.error).toContain("already exists");
  });

  it("rejects non-sequential order (gap)", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 1 }]));

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 3,
      title: "Skipped",
      description: "Should fail",
      maxScore: 20,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain("sequential");
  });

  it("rejects hacker role", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);
    mockResolveRole.mockResolvedValue("hacker");

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 1,
      title: "Nope",
      description: "Hackers cannot create",
      maxScore: 10,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/challenges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns challenges sorted by order", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const challenges = [
      {
        id: "ch-1",
        hackathonId: "h1",
        order: 1,
        title: "Setup",
        description: "Do setup",
        maxScore: 30,
        createdBy: "u1",
        createdAt: "2026-01-01T00:00:00Z",
        _type: "challenge",
      },
      {
        id: "ch-2",
        hackathonId: "h1",
        order: 2,
        title: "Build",
        description: "Build it",
        maxScore: 50,
        createdBy: "u1",
        createdAt: "2026-01-01T01:00:00Z",
        _type: "challenge",
      },
    ];
    challengeQuery.mockReturnValue(emptyFetchAll(challenges));

    const { GET } = await import("../challenges/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/challenges?hackathonId=h1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.items[0].order).toBe(1);
    expect(body.data.items[1].order).toBe(2);
  });

  it("returns 400 without hackathonId", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const { GET } = await import("../challenges/route");
    const req = createRequest("GET", "http://localhost/api/challenges");
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });
});

// ── Challenge by ID ────────────────────────────────────────

describe("GET /api/challenges/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a single challenge", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const challenge = {
      id: "ch-1",
      hackathonId: "h1",
      order: 1,
      title: "Setup",
      description: "Do setup",
      maxScore: 30,
      createdBy: "u1",
      createdAt: "2026-01-01T00:00:00Z",
      _type: "challenge",
    };
    challengeQuery.mockReturnValue(emptyFetchAll([challenge]));

    const { GET } = await import("../challenges/[id]/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/challenges/ch-1",
    );
    const res = await GET(req, { params: Promise.resolve({ id: "ch-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe("ch-1");
  });

  it("returns 404 for non-existent challenge", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    challengeQuery.mockReturnValue(emptyFetchAll([]));

    const { GET } = await import("../challenges/[id]/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/challenges/missing",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/challenges/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates challenge title and description", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const existing = {
      id: "ch-1",
      hackathonId: "h1",
      order: 1,
      title: "Old Title",
      description: "Old desc",
      maxScore: 30,
      createdBy: "u1",
      createdAt: "2026-01-01T00:00:00Z",
      _type: "challenge",
    };
    challengeQuery.mockReturnValue(emptyFetchAll([existing]));
    challengeReplace.mockResolvedValue({ resource: {} });

    const { PATCH } = await import("../challenges/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/challenges/ch-1",
      { title: "New Title", description: "New desc" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "ch-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.title).toBe("New Title");
    expect(body.data.description).toBe("New desc");
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "challenge.update" }),
    );
  });

  it("returns 404 for non-existent challenge", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    challengeQuery.mockReturnValue(emptyFetchAll([]));

    const { PATCH } = await import("../challenges/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/challenges/missing",
      { title: "Updated" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

// ── Progression ────────────────────────────────────────────

describe("GET /api/progression", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns team progression record", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const progression = {
      id: "prog-team-1",
      _type: "progression",
      teamId: "team-1",
      hackathonId: "h1",
      currentChallenge: 2,
      unlockedChallenges: [
        { challengeId: "ch-1", unlockedAt: "2026-01-01T00:00:00Z" },
        { challengeId: "ch-2", unlockedAt: "2026-01-02T00:00:00Z" },
      ],
    };
    progressionQuery.mockReturnValue(emptyFetchAll([progression]));

    const { GET } = await import("../progression/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/progression?hackathonId=h1&teamId=team-1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.currentChallenge).toBe(2);
    expect(body.data.unlockedChallenges).toHaveLength(2);
  });

  it("returns 404 when no progression exists", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    progressionQuery.mockReturnValue(emptyFetchAll([]));

    const { GET } = await import("../progression/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/progression?hackathonId=h1&teamId=team-99",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when hackathonId missing", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const { GET } = await import("../progression/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/progression?teamId=team-1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });
});

// ── Challenge Gate (submission gating) ─────────────────────

describe("Challenge gate on submissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows submission for unlocked challenge", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);

    // Hacker lookup
    hackerQuery.mockReturnValue(
      emptyFetchAll([
        {
          _type: "hacker",
          githubUserId: "user-hacker-1",
          teamId: "team-1",
          hackathonId: "h1",
        },
      ]),
    );

    // Hackathon is active
    hackathonRead.mockResolvedValue({
      resource: { id: "h1", status: "active" },
    });

    // Challenge order = 1
    challengeQuery.mockReturnValue(
      emptyFetchAll([{ order: 1 }]),
    );

    // Team's progression: currentChallenge = 1 (unlocked)
    progressionQuery.mockReturnValue(
      emptyFetchAll([
        {
          id: "prog-team-1",
          _type: "progression",
          teamId: "team-1",
          hackathonId: "h1",
          currentChallenge: 1,
          unlockedChallenges: [
            { challengeId: "ch-1", unlockedAt: "2026-01-01T00:00:00Z" },
          ],
        },
      ]),
    );

    submissionCreate.mockResolvedValue({ resource: {} });

    const { POST } = await import("../submissions/route");
    const req = createRequest("POST", "http://localhost/api/submissions", {
      challengeId: "ch-1",
      description: "My evidence for challenge 1",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(201);
  });

  it("rejects submission for locked challenge (403)", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);

    hackerQuery.mockReturnValue(
      emptyFetchAll([
        {
          _type: "hacker",
          githubUserId: "user-hacker-1",
          teamId: "team-1",
          hackathonId: "h1",
        },
      ]),
    );

    hackathonRead.mockResolvedValue({
      resource: { id: "h1", status: "active" },
    });

    // Challenge order = 3, but team is only on challenge 1
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 3 }]));

    progressionQuery.mockReturnValue(
      emptyFetchAll([
        {
          id: "prog-team-1",
          _type: "progression",
          teamId: "team-1",
          hackathonId: "h1",
          currentChallenge: 1,
          unlockedChallenges: [
            { challengeId: "ch-1", unlockedAt: "2026-01-01T00:00:00Z" },
          ],
        },
      ]),
    );

    const { POST } = await import("../submissions/route");
    const req = createRequest("POST", "http://localhost/api/submissions", {
      challengeId: "ch-3",
      description: "Trying to skip ahead",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error).toContain("locked");
  });
});

// ── Auto-unlock on approval ────────────────────────────────

describe("Auto-unlock progression on submission approval", () => {
  beforeEach(() => vi.clearAllMocks());

  it("advances progression when current challenge is approved", async () => {
    const coachPrincipal: EasyAuthPrincipal = {
      userId: "user-coach-1",
      githubLogin: "coach-user",
      email: "coach@example.com",
      avatarUrl: "",
    };
    mockGetAuth.mockReturnValue(coachPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const pendingSubmission = {
      id: "sub-1",
      _type: "submission",
      teamId: "team-1",
      hackathonId: "h1",
      challengeId: "ch-1",
      state: "pending",
      description: "Evidence",
      attachments: [],
      submittedBy: "user-hacker-1",
      submittedAt: "2026-01-01T00:00:00Z",
      scores: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    };

    // Submission lookup
    submissionQuery.mockReturnValue(emptyFetchAll([pendingSubmission]));
    submissionReplace.mockResolvedValue({ resource: {} });

    // Active rubric with pointer
    rubricRead
      .mockResolvedValueOnce({
        resource: {
          id: "rubric-ptr-h1",
          _type: "rubric-pointer",
          activeRubricId: "rubric-h1-v1",
        },
      })
      .mockResolvedValueOnce({
        resource: {
          id: "rubric-h1-v1",
          categories: [
            { id: "cat-1", name: "Quality", maxScore: 10 },
          ],
        },
      });

    scoreCreate.mockResolvedValue({ resource: {} });

    // Challenge gate advance — challenge order lookup
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 1 }]));

    // Progression for team
    const currentProgression = {
      id: "prog-team-1",
      _type: "progression",
      teamId: "team-1",
      hackathonId: "h1",
      currentChallenge: 1,
      unlockedChallenges: [
        { challengeId: "ch-1", unlockedAt: "2026-01-01T00:00:00Z" },
      ],
      _etag: '"etag-123"',
    };
    progressionQuery.mockReturnValue(emptyFetchAll([currentProgression]));
    progressionReplace.mockResolvedValue({ resource: {} });

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-1",
      {
        status: "approved",
        reason: "Good work",
        scores: [{ categoryId: "cat-1", score: 8 }],
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-1" }),
    });

    expect(res.status).toBe(200);

    // Verify progression was advanced
    expect(progressionReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        currentChallenge: 2,
        unlockedChallenges: expect.arrayContaining([
          expect.objectContaining({ challengeId: "ch-1" }),
        ]),
      }),
      expect.objectContaining({
        accessCondition: expect.objectContaining({
          type: "IfMatch",
          condition: '"etag-123"',
        }),
      }),
    );
  });

  it("does not advance when a non-current challenge is approved", async () => {
    const coachPrincipal: EasyAuthPrincipal = {
      userId: "user-coach-1",
      githubLogin: "coach-user",
      email: "coach@example.com",
      avatarUrl: "",
    };
    mockGetAuth.mockReturnValue(coachPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const pendingSubmission = {
      id: "sub-2",
      _type: "submission",
      teamId: "team-1",
      hackathonId: "h1",
      challengeId: "ch-1",
      state: "pending",
      description: "Re-submission for ch1",
      attachments: [],
      submittedBy: "user-hacker-1",
      submittedAt: "2026-01-01T00:00:00Z",
      scores: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    };

    submissionQuery.mockReturnValue(emptyFetchAll([pendingSubmission]));
    submissionReplace.mockResolvedValue({ resource: {} });

    rubricRead
      .mockResolvedValueOnce({
        resource: {
          id: "rubric-ptr-h1",
          _type: "rubric-pointer",
          activeRubricId: "rubric-h1-v1",
        },
      })
      .mockResolvedValueOnce({
        resource: {
          id: "rubric-h1-v1",
          categories: [{ id: "cat-1", name: "Quality", maxScore: 10 }],
        },
      });

    scoreCreate.mockResolvedValue({ resource: {} });

    // Challenge order = 1, but team is already on challenge 3
    challengeQuery.mockReturnValue(emptyFetchAll([{ order: 1 }]));

    const progressionAlready = {
      id: "prog-team-1",
      _type: "progression",
      teamId: "team-1",
      hackathonId: "h1",
      currentChallenge: 3,
      unlockedChallenges: [
        { challengeId: "ch-1", unlockedAt: "2026-01-01T00:00:00Z" },
        { challengeId: "ch-2", unlockedAt: "2026-01-02T00:00:00Z" },
        { challengeId: "ch-3", unlockedAt: "2026-01-03T00:00:00Z" },
      ],
      _etag: '"etag-456"',
    };
    progressionQuery.mockReturnValue(emptyFetchAll([progressionAlready]));

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-2",
      {
        status: "approved",
        reason: "Re-graded",
        scores: [{ categoryId: "cat-1", score: 9 }],
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-2" }),
    });

    expect(res.status).toBe(200);
    // Progression should NOT have been updated
    expect(progressionReplace).not.toHaveBeenCalled();
  });
});

// ── Progression initialization on hackathon launch ─────────

describe("Progression initialization on hackathon launch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates progression records for each team when hackathon goes active", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const existingHackathon = {
      id: "h1",
      name: "Test Hackathon",
      status: "draft",
      eventCode: "1234",
      teamSize: 4,
      createdBy: "user-admin-1",
      createdAt: "2026-01-01T00:00:00Z",
      launchedAt: null,
      archivedAt: null,
      _type: "hackathon",
    };
    hackathonRead.mockResolvedValue({ resource: existingHackathon });
    hackathonReplace.mockResolvedValue({
      resource: { ...existingHackathon, status: "active" },
    });

    // Teams for the hackathon
    teamQuery.mockReturnValue(
      emptyFetchAll([
        { id: "team-alpha", _type: "team", hackathonId: "h1" },
        { id: "team-bravo", _type: "team", hackathonId: "h1" },
      ]),
    );

    // First challenge
    challengeQuery.mockReturnValue(
      emptyFetchAll([
        { id: "ch-1", _type: "challenge", hackathonId: "h1", order: 1 },
      ]),
    );

    progressionCreate.mockResolvedValue({ resource: {} });

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/hackathons/h1",
      { status: "active" },
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: "h1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    // Should create 2 progression records (one per team)
    expect(progressionCreate).toHaveBeenCalledTimes(2);
    expect(progressionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "progression",
        teamId: "team-alpha",
        hackathonId: "h1",
        currentChallenge: 1,
        unlockedChallenges: expect.arrayContaining([
          expect.objectContaining({ challengeId: "ch-1" }),
        ]),
      }),
    );
  });
});
