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

import { query, queryOne, execute, transaction } from "@/lib/sql";
import { getAuthPrincipal } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";

const mockQuery = vi.mocked(query);
const mockQueryOne = vi.mocked(queryOne);
const mockExecute = vi.mocked(execute);
const mockTransaction = vi.mocked(transaction);
const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockResolveRole = vi.mocked(resolveRole);

const fakePrincipal: EasyAuthPrincipal = {
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

// ── Assign Teams Tests ─────────────────────────────────────

describe("POST /api/hackathons/:id/assign-teams", () => {
  beforeEach(() => vi.clearAllMocks());

  it("assigns teams with Fisher-Yates shuffle", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: hackathon read
    mockQueryOne.mockResolvedValueOnce({
      id: "h1",
      teamSize: 3,
      status: "active",
    });

    // query: 1) unassigned hackers, 2) existing teams count
    mockQuery
      .mockResolvedValueOnce([
        {
          id: "hkr-1",
          hackathonId: "h1",
          githubLogin: "a",
          displayName: "A",
          teamId: null,
        },
        {
          id: "hkr-2",
          hackathonId: "h1",
          githubLogin: "b",
          displayName: "B",
          teamId: null,
        },
        {
          id: "hkr-3",
          hackathonId: "h1",
          githubLogin: "c",
          displayName: "C",
          teamId: null,
        },
        {
          id: "hkr-4",
          hackathonId: "h1",
          githubLogin: "d",
          displayName: "D",
          teamId: null,
        },
        {
          id: "hkr-5",
          hackathonId: "h1",
          githubLogin: "e",
          displayName: "E",
          teamId: null,
        },
      ])
      .mockResolvedValueOnce([]); // existing teams

    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        query: vi.fn().mockResolvedValue([]),
        queryOne: vi.fn().mockResolvedValue(null),
        execute: vi.fn().mockResolvedValue(1),
      };
      await fn(tx);
    });

    const { POST } = await import("../hackathons/[id]/assign-teams/route");
    const req = createRequest(
      "POST",
      "http://localhost/api/hackathons/h1/assign-teams",
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: "h1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.hackersAssigned).toBe(5);
    // With teamSize=3 and 5 hackers: 2 teams (3+2, but 2 < ceil(3/2)=2, so last team stays)
    expect(body.data.teamsCreated).toBe(2);
  });

  it("returns 422 when no unassigned hackers", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce({
      id: "h1",
      teamSize: 3,
      status: "active",
    });
    mockQuery.mockResolvedValueOnce([]); // unassigned hackers

    const { POST } = await import("../hackathons/[id]/assign-teams/route");
    const req = createRequest(
      "POST",
      "http://localhost/api/hackathons/h1/assign-teams",
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(422);
  });

  it("returns 403 for non-admin", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("hacker");

    const { POST } = await import("../hackathons/[id]/assign-teams/route");
    const req = createRequest(
      "POST",
      "http://localhost/api/hackathons/h1/assign-teams",
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(403);
  });
});

// ── Team Listing Tests ─────────────────────────────────────

describe("GET /api/teams", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns teams for a hackathon", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockResolvedValueOnce([
      {
        id: "t1",
        hackathonId: "h1",
        name: "Team Alpha",
        members: JSON.stringify([]),
      },
    ]);

    const { GET } = await import("../teams/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/teams?hackathonId=h1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
  });

  it("returns 400 without hackathonId", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const { GET } = await import("../teams/route");
    const req = createRequest("GET", "http://localhost/api/teams");
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });
});

// ── Reassign Tests ─────────────────────────────────────────

describe("PATCH /api/teams/:id/reassign", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reassigns hacker between teams in the same hackathon", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const sourceMembers = [
      { hackerId: "hkr-1", githubLogin: "alice", displayName: "Alice" },
      { hackerId: "hkr-2", githubLogin: "bob", displayName: "Bob" },
    ];
    const targetMembers = [
      { hackerId: "hkr-3", githubLogin: "carol", displayName: "Carol" },
    ];

    // queryOne: source team, target team
    mockQueryOne
      .mockResolvedValueOnce({
        id: "t1",
        hackathonId: "h1",
        members: JSON.stringify(sourceMembers),
      })
      .mockResolvedValueOnce({
        id: "t2",
        hackathonId: "h1",
        members: JSON.stringify(targetMembers),
      });

    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        query: vi.fn().mockResolvedValue([]),
        queryOne: vi.fn().mockResolvedValue(null),
        execute: vi.fn().mockResolvedValue(1),
      };
      await fn(tx);
    });

    const { PATCH } = await import("../teams/[id]/reassign/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/teams/t1/reassign?hackathonId=h1",
      { hackerId: "hkr-1", targetTeamId: "t2" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "t1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("rejects cross-hackathon reassignment", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne
      .mockResolvedValueOnce({
        id: "t1",
        hackathonId: "h1",
        members: JSON.stringify([]),
      })
      .mockResolvedValueOnce({
        id: "t2",
        hackathonId: "h2",
        members: JSON.stringify([]),
      });

    const { PATCH } = await import("../teams/[id]/reassign/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/teams/t1/reassign?hackathonId=h1",
      { hackerId: "hkr-1", targetTeamId: "t2" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "t1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("Cannot reassign across different hackathons");
  });

  it("returns 404 when hacker not in source team", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne
      .mockResolvedValueOnce({
        id: "t1",
        hackathonId: "h1",
        members: JSON.stringify([
          { hackerId: "hkr-99", githubLogin: "other", displayName: "Other" },
        ]),
      })
      .mockResolvedValueOnce({
        id: "t2",
        hackathonId: "h1",
        members: JSON.stringify([]),
      });

    const { PATCH } = await import("../teams/[id]/reassign/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/teams/t1/reassign?hackathonId=h1",
      { hackerId: "hkr-1", targetTeamId: "t2" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "t1" }),
    });

    expect(res.status).toBe(404);
  });
});
