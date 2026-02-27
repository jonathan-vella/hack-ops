import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { EasyAuthPrincipal } from "@hackops/shared";

// ── Mocks ──────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockCreate = vi.fn();
const mockRead = vi.fn();
const mockReplace = vi.fn();

vi.mock("@/lib/cosmos", () => ({
  getContainer: vi.fn(() => ({
    items: {
      query: mockQuery,
      create: mockCreate,
    },
    item: vi.fn(() => ({
      read: mockRead,
      replace: mockReplace,
    })),
  })),
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

    // Hackathon read
    mockRead.mockResolvedValueOnce({
      resource: { id: "h1", teamSize: 3, status: "active" },
    });

    // Unassigned hackers query, then existing teams count
    let queryCount = 0;
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return Promise.resolve({
            resources: [
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
            ],
          });
        }
        // Existing teams count
        return Promise.resolve({ resources: [] });
      }),
    });

    mockCreate.mockResolvedValue({ resource: {} });
    // For hacker updates
    mockReplace.mockResolvedValue({ resource: {} });
    mockRead.mockResolvedValue({ resource: {} });

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
    mockRead.mockResolvedValue({
      resource: { id: "h1", teamSize: 3, status: "active" },
    });
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    });

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
    mockQuery.mockReturnValue({
      fetchNext: vi.fn().mockResolvedValue({
        resources: [
          { id: "t1", hackathonId: "h1", name: "Team Alpha", members: [] },
        ],
        continuationToken: null,
      }),
    });

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

    // Source team read, then target team read, then hacker read
    mockRead
      .mockResolvedValueOnce({
        resource: {
          id: "t1",
          hackathonId: "h1",
          members: [
            { hackerId: "hkr-1", githubLogin: "alice", displayName: "Alice" },
            { hackerId: "hkr-2", githubLogin: "bob", displayName: "Bob" },
          ],
        },
      })
      .mockResolvedValueOnce({
        resource: {
          id: "t2",
          hackathonId: "h1",
          members: [
            { hackerId: "hkr-3", githubLogin: "carol", displayName: "Carol" },
          ],
        },
      })
      .mockResolvedValueOnce({
        resource: { id: "hkr-1", hackathonId: "h1", teamId: "t1" },
      });

    mockReplace.mockResolvedValue({ resource: {} });

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

    mockRead
      .mockResolvedValueOnce({
        resource: { id: "t1", hackathonId: "h1", members: [] },
      })
      .mockResolvedValueOnce({
        resource: { id: "t2", hackathonId: "h2", members: [] },
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

    mockRead
      .mockResolvedValueOnce({
        resource: {
          id: "t1",
          hackathonId: "h1",
          members: [
            { hackerId: "hkr-99", githubLogin: "other", displayName: "Other" },
          ],
        },
      })
      .mockResolvedValueOnce({
        resource: {
          id: "t2",
          hackathonId: "h1",
          members: [],
        },
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
