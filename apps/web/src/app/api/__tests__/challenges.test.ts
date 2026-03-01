import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { EasyAuthPrincipal } from "@hackops/shared";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("@/lib/sql", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
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

import { query, queryOne, execute } from "@/lib/sql";
import { getAuthPrincipal } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";

const mockQuery = vi.mocked(query);
const mockQueryOne = vi.mocked(queryOne);
const mockExecute = vi.mocked(execute);
const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockResolveRole = vi.mocked(resolveRole);

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

// ── Challenge CRUD ─────────────────────────────────────────

describe("POST /api/challenges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a challenge with sequential order", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // query: existing orders
    mockQuery.mockResolvedValueOnce([]);
    // execute: INSERT
    mockExecute.mockResolvedValueOnce(1);

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 1,
      title: "Challenge One",
      description: "First challenge",
      maxScore: 100,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.title).toBe("Challenge One");
    expect(body.data.order).toBe(1);
  });

  it("returns 409 for duplicate order", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockResolvedValueOnce([{ order: 1 }]);

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 1,
      title: "Challenge One",
      description: "First challenge",
      maxScore: 100,
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(409);
  });

  it("returns 400 for non-sequential order", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockResolvedValueOnce([{ order: 1 }]);

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 3,
      title: "Challenge Three",
      description: "Skipped two",
      maxScore: 50,
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("sequential");
  });

  it("returns 403 for non-admin", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);
    mockResolveRole.mockResolvedValue("hacker");

    const { POST } = await import("../challenges/route");
    const req = createRequest("POST", "http://localhost/api/challenges", {
      hackathonId: "h1",
      order: 1,
      title: "Challenge",
      description: "desc",
      maxScore: 100,
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
    mockQuery.mockResolvedValueOnce([
      {
        id: "c1",
        hackathonId: "h1",
        order: 1,
        title: "First",
        description: "desc",
        maxScore: 100,
        createdBy: "u1",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "c2",
        hackathonId: "h1",
        order: 2,
        title: "Second",
        description: "desc",
        maxScore: 50,
        createdBy: "u1",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ]);

    const { GET } = await import("../challenges/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/challenges?hackathonId=h1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.items[0].order).toBe(1);
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

describe("GET /api/challenges/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a single challenge", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce({
      id: "c1",
      hackathonId: "h1",
      order: 1,
      title: "Challenge One",
      description: "desc",
      maxScore: 100,
      createdBy: "u1",
      createdAt: "2024-01-01T00:00:00Z",
    });

    const { GET } = await import("../challenges/[id]/route");
    const req = createRequest("GET", "http://localhost/api/challenges/c1");
    const res = await GET(req, { params: Promise.resolve({ id: "c1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("c1");
  });

  it("returns 404 for missing challenge", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { GET } = await import("../challenges/[id]/route");
    const req = createRequest("GET", "http://localhost/api/challenges/missing");
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

    // queryOne: existing challenge
    mockQueryOne.mockResolvedValueOnce({
      id: "c1",
      hackathonId: "h1",
      order: 1,
      title: "Old Title",
      description: "Old desc",
      maxScore: 100,
      createdBy: "u1",
      createdAt: "2024-01-01T00:00:00Z",
    });
    // execute: UPDATE
    mockExecute.mockResolvedValueOnce(1);
    // queryOne: re-read updated record
    mockQueryOne.mockResolvedValueOnce({
      id: "c1",
      hackathonId: "h1",
      order: 1,
      title: "New Title",
      description: "New desc",
      maxScore: 100,
      createdBy: "u1",
      createdAt: "2024-01-01T00:00:00Z",
    });

    const { PATCH } = await import("../challenges/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/challenges/c1", {
      title: "New Title",
      description: "New desc",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "c1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.title).toBe("New Title");
  });

  it("returns 404 for non-existent challenge", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { PATCH } = await import("../challenges/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/challenges/c99", {
      title: "Updated",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "c99" }),
    });

    expect(res.status).toBe(404);
  });
});

// ── Progression ────────────────────────────────────────────

describe("GET /api/progression", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns progression for team + hackathon", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);
    mockResolveRole.mockResolvedValue("hacker");

    mockQueryOne.mockResolvedValueOnce({
      id: "prog-t1",
      teamId: "t1",
      hackathonId: "h1",
      currentChallenge: 2,
      unlockedChallenges: JSON.stringify([
        { challengeId: "c1", unlockedAt: "2024-01-01T00:00:00Z" },
        { challengeId: "c2", unlockedAt: "2024-01-02T00:00:00Z" },
      ]),
    });

    const { GET } = await import("../progression/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/progression?hackathonId=h1&teamId=t1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.currentChallenge).toBe(2);
    expect(body.data.unlockedChallenges).toHaveLength(2);
  });

  it("returns 404 when no progression exists", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);
    mockResolveRole.mockResolvedValue("hacker");
    mockQueryOne.mockResolvedValueOnce(null);

    const { GET } = await import("../progression/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/progression?hackathonId=h1&teamId=t1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(404);
  });
});

// ── Submissions ────────────────────────────────────────────

describe("POST /api/submissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates submission for unlocked challenge", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);
    // requireAuth — no role check needed, just auth

    // query: hacker records
    mockQuery.mockResolvedValueOnce([
      {
        id: "hkr-1",
        hackathonId: "h1",
        githubUserId: "user-hacker-1",
        teamId: "t1",
      },
    ]);
    // queryOne: hackathon
    mockQueryOne.mockResolvedValueOnce({ id: "h1", status: "active" });

    // challenge-gate calls:
    // queryOne: challenge order
    mockQueryOne.mockResolvedValueOnce({ order: 1 });
    // queryOne: progression
    mockQueryOne.mockResolvedValueOnce({
      currentChallenge: 1,
      rowVersion: Buffer.from([0]),
    });

    // execute: INSERT submission
    mockExecute.mockResolvedValueOnce(1);

    const { POST } = await import("../submissions/route");
    const req = createRequest("POST", "http://localhost/api/submissions", {
      challengeId: "c1",
      description: "My solution",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.state).toBe("pending");
    expect(body.data.teamId).toBe("t1");
  });

  it("rejects submission for locked challenge (challenge-gate)", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);

    // query: hacker records
    mockQuery.mockResolvedValueOnce([
      {
        id: "hkr-1",
        hackathonId: "h1",
        githubUserId: "user-hacker-1",
        teamId: "t1",
      },
    ]);
    // queryOne: hackathon
    mockQueryOne.mockResolvedValueOnce({ id: "h1", status: "active" });
    // challenge-gate: challenge order
    mockQueryOne.mockResolvedValueOnce({ order: 3 });
    // challenge-gate: progression — only at challenge 1
    mockQueryOne.mockResolvedValueOnce({
      currentChallenge: 1,
      rowVersion: Buffer.from([0]),
    });

    const { POST } = await import("../submissions/route");
    const req = createRequest("POST", "http://localhost/api/submissions", {
      challengeId: "c3",
      description: "Trying locked challenge",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain("locked");
  });

  it("rejects submission when hacker has no team", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);

    // query: hacker records — no team assignment
    mockQuery.mockResolvedValueOnce([
      {
        id: "hkr-1",
        hackathonId: "h1",
        githubUserId: "user-hacker-1",
        teamId: null,
      },
    ]);

    const { POST } = await import("../submissions/route");
    const req = createRequest("POST", "http://localhost/api/submissions", {
      challengeId: "c1",
      description: "desc",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("not assigned to a team");
  });

  it("rejects submission when hackathon is not active", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);

    mockQuery.mockResolvedValueOnce([
      {
        id: "hkr-1",
        hackathonId: "h1",
        githubUserId: "user-hacker-1",
        teamId: "t1",
      },
    ]);
    mockQueryOne.mockResolvedValueOnce({ id: "h1", status: "draft" });

    const { POST } = await import("../submissions/route");
    const req = createRequest("POST", "http://localhost/api/submissions", {
      challengeId: "c1",
      description: "desc",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(422);
  });
});

describe("GET /api/submissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns submissions for admin", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQuery.mockResolvedValueOnce([
      {
        id: "sub-1",
        teamId: "t1",
        hackathonId: "h1",
        challengeId: "c1",
        state: "pending",
        description: "desc",
        attachments: JSON.stringify([]),
        submittedBy: "u1",
        submittedAt: "2024-01-01T00:00:00Z",
        scores: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: null,
      },
    ]);

    const { GET } = await import("../submissions/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/submissions?hackathonId=h1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].state).toBe("pending");
  });

  it("returns 400 without hackathonId", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const { GET } = await import("../submissions/route");
    const req = createRequest("GET", "http://localhost/api/submissions");
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });
});

// ── Submission Review (approve/reject) ─────────────────────

describe("PATCH /api/submissions/:id (review)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("approves submission with scores and auto-unlocks next challenge", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: submission
    mockQueryOne.mockResolvedValueOnce({
      id: "sub-1",
      teamId: "t1",
      hackathonId: "h1",
      challengeId: "c1",
      state: "pending",
      description: "solution",
      attachments: JSON.stringify([]),
      submittedBy: "user-hacker-1",
      submittedAt: "2024-01-01T00:00:00Z",
      scores: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    });

    // queryOne: rubric pointer
    mockQueryOne.mockResolvedValueOnce({ activeRubricId: "rubric-v1" });
    // queryOne: rubric version
    mockQueryOne.mockResolvedValueOnce({
      categories: JSON.stringify([
        { id: "cat-1", maxScore: 50 },
        { id: "cat-2", maxScore: 50 },
      ]),
    });

    // execute: UPDATE submission to approved
    mockExecute.mockResolvedValueOnce(1);
    // execute: INSERT score record
    mockExecute.mockResolvedValueOnce(1);

    // advanceProgression calls:
    // queryOne: challenge order
    mockQueryOne.mockResolvedValueOnce({ order: 1 });
    // queryOne: progression
    mockQueryOne.mockResolvedValueOnce({
      id: "prog-t1",
      currentChallenge: 1,
      unlockedChallenges: JSON.stringify([
        { challengeId: "c1", unlockedAt: "2024-01-01T00:00:00Z" },
      ]),
      rowVersion: Buffer.from([1, 2, 3]),
    });
    // execute: UPDATE progression
    mockExecute.mockResolvedValueOnce(1);

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-1",
      {
        status: "approved",
        reason: "Well done",
        scores: [
          { categoryId: "cat-1", score: 40 },
          { categoryId: "cat-2", score: 45 },
        ],
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.state).toBe("approved");
    expect(body.data.scores).toHaveLength(2);

    // Verify advanceProgression updated progression
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it("rejects submission (no scores)", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: submission
    mockQueryOne.mockResolvedValueOnce({
      id: "sub-1",
      teamId: "t1",
      hackathonId: "h1",
      challengeId: "c1",
      state: "pending",
      description: "solution",
      attachments: JSON.stringify([]),
      submittedBy: "user-hacker-1",
      submittedAt: "2024-01-01T00:00:00Z",
      scores: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    });

    // execute: UPDATE submission to rejected
    mockExecute.mockResolvedValueOnce(1);

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-1",
      {
        status: "rejected",
        reason: "Incomplete solution",
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.state).toBe("rejected");
    expect(body.data.scores).toBeNull();
  });

  it("returns 404 for missing submission", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/missing",
      { status: "approved", scores: [], reason: "ok" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 409 for already-reviewed submission", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "sub-1",
      state: "approved",
      hackathonId: "h1",
    });

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-1",
      {
        status: "approved",
        scores: [{ categoryId: "cat-1", score: 50 }],
        reason: "ok",
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-1" }),
    });

    expect(res.status).toBe(409);
  });

  it("returns 400 when score exceeds rubric maxScore", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "sub-1",
      state: "pending",
      hackathonId: "h1",
      challengeId: "c1",
      teamId: "t1",
    });
    // rubric pointer
    mockQueryOne.mockResolvedValueOnce({ activeRubricId: "rubric-v1" });
    // rubric
    mockQueryOne.mockResolvedValueOnce({
      categories: JSON.stringify([{ id: "cat-1", maxScore: 50 }]),
    });

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-1",
      {
        status: "approved",
        reason: "ok",
        scores: [{ categoryId: "cat-1", score: 75 }],
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("exceeds max");
  });
});

// ── Hackathon Launch → Progression Init ────────────────────

describe("PATCH /api/hackathons/:id (progression init on launch)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates progression records when activating hackathon", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: existing hackathon (draft)
    mockQueryOne.mockResolvedValueOnce({
      id: "h1",
      status: "draft",
      name: "Hack 2025",
      eventCode: "HACK25",
    });
    // execute: UPDATE hackathon to active
    mockExecute.mockResolvedValueOnce(1);
    // queryOne: re-read hackathon after update
    mockQueryOne.mockResolvedValueOnce({
      id: "h1",
      status: "active",
      name: "Hack 2025",
      eventCode: "HACK25",
      launchedAt: "2024-01-01T00:00:00Z",
    });

    // query: teams for progression init
    mockQuery.mockResolvedValueOnce([{ id: "t1" }, { id: "t2" }]);
    // query: first challenge (order = 1)
    mockQuery.mockResolvedValueOnce([{ id: "c1" }]);

    // execute: INSERT progression for each team
    mockExecute.mockResolvedValueOnce(1); // team t1
    mockExecute.mockResolvedValueOnce(1); // team t2

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      status: "active",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("active");
    // 1 UPDATE + 2 INSERT progressions = 3 execute calls
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });
});
