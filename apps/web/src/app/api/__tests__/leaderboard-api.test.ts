import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { EasyAuthPrincipal } from "@hackops/shared";

vi.mock("@/lib/auth", () => ({
  getAuthPrincipal: vi.fn(),
}));
vi.mock("@/lib/roles", () => ({
  resolveRole: vi.fn(),
  getDevRole: vi.fn().mockReturnValue(null),
  isPrimaryAdmin: vi.fn(),
}));
vi.mock("@/lib/leaderboard", () => ({
  buildLeaderboard: vi.fn(),
}));

import { getAuthPrincipal } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";
import { buildLeaderboard } from "@/lib/leaderboard";

const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockResolveRole = vi.mocked(resolveRole);
const mockBuildLeaderboard = vi.mocked(buildLeaderboard);

const fakePrincipal: EasyAuthPrincipal = {
  userId: "user-1",
  githubLogin: "testuser",
  email: "test@example.com",
  avatarUrl: "",
};

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url));
}

describe("GET /api/leaderboard/:hackathonId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { GET } = await import("../leaderboard/[hackathonId]/route");
    const req = createRequest("http://localhost/api/leaderboard/h1");
    const res = await GET(req, { params: Promise.resolve({ hackathonId: "h1" }) });

    expect(res.status).toBe(401);
  });

  it("returns leaderboard data for authenticated user", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("hacker");
    mockBuildLeaderboard.mockResolvedValue({
      hackathonId: "h1",
      hackathonName: "Test Hack",
      entries: [],
      updatedAt: "2025-01-01T00:00:00Z",
    });

    const { GET } = await import("../leaderboard/[hackathonId]/route");
    const req = createRequest("http://localhost/api/leaderboard/h1");
    const res = await GET(req, { params: Promise.resolve({ hackathonId: "h1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.hackathonId).toBe("h1");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=10");
  });

  it("returns 404 when hackathon not found", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockBuildLeaderboard.mockResolvedValue(null);

    const { GET } = await import("../leaderboard/[hackathonId]/route");
    const req = createRequest("http://localhost/api/leaderboard/nonexistent");
    const res = await GET(req, { params: Promise.resolve({ hackathonId: "nonexistent" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error).toContain("not found");
  });
});
