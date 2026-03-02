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

const coachPrincipal: EasyAuthPrincipal = {
  userId: "user-coach-1",
  githubLogin: "coach-user",
  email: "coach@example.com",
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

// ── Rubric CRUD ────────────────────────────────────────────

describe("POST /api/rubrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates first rubric version and auto-activates", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // query: existing versions (none)
    mockQuery.mockResolvedValueOnce([]);
    // execute: INSERT rubric_versions
    mockExecute.mockResolvedValueOnce(1);
    // queryOne: rubric pointer (none → auto-activate)
    mockQueryOne.mockResolvedValueOnce(null);
    // execute: INSERT rubric_pointers
    mockExecute.mockResolvedValueOnce(1);

    const { POST } = await import("../rubrics/route");
    const req = createRequest("POST", "http://localhost/api/rubrics", {
      hackathonId: "h1",
      categories: [
        { id: "cat-1", name: "Innovation", description: "Novel approach", maxScore: 50 },
        { id: "cat-2", name: "Execution", description: "Quality of output", maxScore: 50 },
      ],
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.version).toBe(1);
    expect(body.data.isActive).toBe(true);
    expect(body.data.categories).toHaveLength(2);
  });

  it("creates second version without auto-activating", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // query: existing versions (1 exists)
    mockQuery.mockResolvedValueOnce([{ version: 1 }]);
    // execute: INSERT rubric_versions
    mockExecute.mockResolvedValueOnce(1);
    // queryOne: pointer exists, active = v1
    mockQueryOne.mockResolvedValueOnce({
      id: "rubric-ptr-h1",
      activeRubricId: "rubric-h1-v1",
    });

    const { POST } = await import("../rubrics/route");
    const req = createRequest("POST", "http://localhost/api/rubrics", {
      hackathonId: "h1",
      categories: [{ id: "cat-1", name: "Design", description: "Visual quality", maxScore: 100 }],
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.version).toBe(2);
    expect(body.data.isActive).toBe(false);
  });

  it("returns 403 for non-admin", async () => {
    mockGetAuth.mockReturnValue(coachPrincipal);
    mockResolveRole.mockResolvedValue("coach");

    const { POST } = await import("../rubrics/route");
    const req = createRequest("POST", "http://localhost/api/rubrics", {
      hackathonId: "h1",
      categories: [],
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/rubrics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rubric version list with active flag", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: rubric pointer
    mockQueryOne.mockResolvedValueOnce({ activeRubricId: "rubric-h1-v2" });
    // query: rubric versions
    mockQuery.mockResolvedValueOnce([
      {
        id: "rubric-h1-v2",
        hackathonId: "h1",
        version: 2,
        categories: JSON.stringify([{ id: "c1" }, { id: "c2" }]),
        createdAt: "2024-01-02T00:00:00Z",
      },
      {
        id: "rubric-h1-v1",
        hackathonId: "h1",
        version: 1,
        categories: JSON.stringify([{ id: "c1" }]),
        createdAt: "2024-01-01T00:00:00Z",
      },
    ]);

    const { GET } = await import("../rubrics/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/rubrics?hackathonId=h1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.items[0].isActive).toBe(true);
    expect(body.data.items[1].isActive).toBe(false);
  });
});

describe("GET /api/rubrics/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a single rubric version with active flag", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: rubric version
    mockQueryOne.mockResolvedValueOnce({
      id: "rubric-h1-v1",
      hackathonId: "h1",
      version: 1,
      categories: JSON.stringify([
        { id: "cat-1", name: "Design", maxScore: 100 },
      ]),
      createdBy: "u1",
      createdAt: "2024-01-01T00:00:00Z",
    });
    // queryOne: pointer check
    mockQueryOne.mockResolvedValueOnce({ activeRubricId: "rubric-h1-v1" });

    const { GET } = await import("../rubrics/[id]/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/rubrics/rubric-h1-v1",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "rubric-h1-v1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isActive).toBe(true);
    expect(body.data.categories).toHaveLength(1);
  });

  it("returns 404 for missing rubric", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { GET } = await import("../rubrics/[id]/route");
    const req = createRequest("GET", "http://localhost/api/rubrics/missing");
    const res = await GET(req, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });
});

// ── Rubric Activation ──────────────────────────────────────

describe("PATCH /api/rubrics/:id/activate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("activates a rubric version via MERGE pointer", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: rubric version exists
    mockQueryOne.mockResolvedValueOnce({
      id: "rubric-h1-v2",
      hackathonId: "h1",
      version: 2,
      categories: JSON.stringify([{ id: "cat-1", maxScore: 50 }]),
      createdBy: "u1",
      createdAt: "2024-01-01T00:00:00Z",
    });
    // execute: MERGE pointer
    mockExecute.mockResolvedValueOnce(1);

    const { PATCH } = await import("../rubrics/[id]/activate/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/rubrics/rubric-h1-v2/activate",
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "rubric-h1-v2" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isActive).toBe(true);
  });

  it("returns 404 for non-existent rubric", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { PATCH } = await import("../rubrics/[id]/activate/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/rubrics/missing/activate",
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });
});

// ── Score Override ──────────────────────────────────────────

describe("PATCH /api/scores/:id/override", () => {
  beforeEach(() => vi.clearAllMocks());

  it("overrides score with rubric validation", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: score record
    mockQueryOne.mockResolvedValueOnce({
      id: "score-sub-1",
      teamId: "t1",
      hackathonId: "h1",
      challengeId: "c1",
      submissionId: "sub-1",
      categoryScores: JSON.stringify([
        { categoryId: "cat-1", score: 30 },
        { categoryId: "cat-2", score: 20 },
      ]),
      total: 50,
      approvedBy: "u1",
      approvedAt: "2024-01-01T00:00:00Z",
      overriddenBy: null,
      overriddenAt: null,
      overrideReason: null,
    });

    // queryOne: rubric pointer
    mockQueryOne.mockResolvedValueOnce({ activeRubricId: "rubric-v1" });
    // queryOne: rubric
    mockQueryOne.mockResolvedValueOnce({
      categories: JSON.stringify([
        { id: "cat-1", maxScore: 50 },
        { id: "cat-2", maxScore: 50 },
      ]),
    });

    // execute: UPDATE scores
    mockExecute.mockResolvedValueOnce(1);

    const { PATCH } = await import("../scores/[id]/override/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/scores/score-sub-1/override",
      {
        categoryScores: [
          { categoryId: "cat-1", score: 45 },
          { categoryId: "cat-2", score: 40 },
        ],
        reason: "Recalibrated after review",
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "score-sub-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.total).toBe(85);
    expect(body.data.categoryScores).toEqual([
      { categoryId: "cat-1", score: 45 },
      { categoryId: "cat-2", score: 40 },
    ]);
  });

  it("returns 404 for missing score", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { PATCH } = await import("../scores/[id]/override/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/scores/missing/override",
      {
        categoryScores: [{ categoryId: "cat-1", score: 10 }],
        reason: "fix",
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 400 when override score exceeds rubric max", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "score-sub-1",
      hackathonId: "h1",
      categoryScores: JSON.stringify([]),
      total: 0,
      approvedBy: "u1",
      approvedAt: "2024-01-01T00:00:00Z",
    });
    // pointer
    mockQueryOne.mockResolvedValueOnce({ activeRubricId: "rubric-v1" });
    // rubric
    mockQueryOne.mockResolvedValueOnce({
      categories: JSON.stringify([{ id: "cat-1", maxScore: 50 }]),
    });

    const { PATCH } = await import("../scores/[id]/override/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/scores/score-sub-1/override",
      {
        categoryScores: [{ categoryId: "cat-1", score: 999 }],
        reason: "inflate",
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "score-sub-1" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("exceeds max");
  });
});
