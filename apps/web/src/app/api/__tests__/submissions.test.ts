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

vi.mock("@/lib/challenge-gate", () => ({
  advanceProgression: vi.fn(),
}));

import { queryOne, execute } from "@/lib/sql";
import { getAuthPrincipal } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";
import { advanceProgression } from "@/lib/challenge-gate";

const mockQueryOne = vi.mocked(queryOne);
const mockExecute = vi.mocked(execute);
const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockResolveRole = vi.mocked(resolveRole);
const mockAdvanceProgression = vi.mocked(advanceProgression);

const adminPrincipal: EasyAuthPrincipal = {
  userId: "user-admin-1",
  githubLogin: "admin-user",
  email: "admin@example.com",
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

// ── Submission Review (PATCH /api/submissions/:id) ──────────

describe("PATCH /api/submissions/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("approves submission and returns 200 even when advanceProgression throws", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: submission record
    mockQueryOne.mockResolvedValueOnce({
      id: "sub-1",
      teamId: "t1",
      hackathonId: "h1",
      challengeId: "c1",
      state: "pending",
      description: "Test submission",
      attachments: JSON.stringify([]),
      submittedBy: "hacker-1",
      submittedAt: "2024-01-01T00:00:00Z",
    });
    // queryOne: rubric pointer
    mockQueryOne.mockResolvedValueOnce({ activeRubricId: "rubric-v1" });
    // queryOne: rubric version
    mockQueryOne.mockResolvedValueOnce({
      categories: JSON.stringify([{ id: "cat-1", maxScore: 50 }]),
    });

    // execute: UPDATE submissions
    mockExecute.mockResolvedValueOnce(1);
    // execute: INSERT scores
    mockExecute.mockResolvedValueOnce(1);

    // advanceProgression throws a concurrent-modification error
    mockAdvanceProgression.mockRejectedValueOnce(
      new Error("Concurrent modification detected on progression record"),
    );

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-1",
      {
        status: "approved",
        reason: "Great work",
        scores: [{ categoryId: "cat-1", score: 40 }],
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.state).toBe("approved");
    expect(body.data.scores).toEqual([{ categoryId: "cat-1", score: 40 }]);
  });

  it("approves submission successfully when advanceProgression succeeds", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "sub-2",
      teamId: "t1",
      hackathonId: "h1",
      challengeId: "c1",
      state: "pending",
      description: "Another submission",
      attachments: JSON.stringify([]),
      submittedBy: "hacker-1",
      submittedAt: "2024-01-02T00:00:00Z",
    });
    mockQueryOne.mockResolvedValueOnce({ activeRubricId: "rubric-v1" });
    mockQueryOne.mockResolvedValueOnce({
      categories: JSON.stringify([
        { id: "cat-1", maxScore: 50 },
        { id: "cat-2", maxScore: 50 },
      ]),
    });

    mockExecute.mockResolvedValueOnce(1);
    mockExecute.mockResolvedValueOnce(1);
    mockAdvanceProgression.mockResolvedValueOnce(undefined);

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-2",
      {
        status: "approved",
        reason: "Excellent",
        scores: [
          { categoryId: "cat-1", score: 45 },
          { categoryId: "cat-2", score: 40 },
        ],
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-2" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.state).toBe("approved");
    expect(body.data.scores).toHaveLength(2);
  });

  it("rejects submission and returns 200", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "sub-3",
      teamId: "t1",
      hackathonId: "h1",
      challengeId: "c1",
      state: "pending",
      description: "Rejected submission",
      attachments: JSON.stringify([]),
      submittedBy: "hacker-1",
      submittedAt: "2024-01-03T00:00:00Z",
    });

    mockExecute.mockResolvedValueOnce(1);

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-3",
      {
        status: "rejected",
        reason: "Does not meet requirements",
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-3" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.state).toBe("rejected");
  });

  it("returns 404 for missing submission", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/missing",
      { status: "rejected", reason: "not found test" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 409 when submission is already reviewed", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "sub-4",
      teamId: "t1",
      hackathonId: "h1",
      challengeId: "c1",
      state: "approved",
      description: "Already approved",
      attachments: JSON.stringify([]),
      submittedBy: "hacker-1",
      submittedAt: "2024-01-01T00:00:00Z",
    });

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-4",
      { status: "rejected", reason: "too late" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-4" }),
    });

    expect(res.status).toBe(409);
  });

  it("returns 400 when approving without scores", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "sub-5",
      teamId: "t1",
      hackathonId: "h1",
      challengeId: "c1",
      state: "pending",
      description: "Test",
      attachments: JSON.stringify([]),
      submittedBy: "hacker-1",
      submittedAt: "2024-01-01T00:00:00Z",
    });

    const { PATCH } = await import("../submissions/[id]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/submissions/sub-5",
      { status: "approved", reason: "good" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "sub-5" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Scores are required");
  });
});
