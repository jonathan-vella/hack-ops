import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { EasyAuthPrincipal } from "@hackops/shared";

const mockQuery = vi.fn();

vi.mock("@/lib/cosmos", () => ({
  getContainer: vi.fn(() => ({
    items: {
      query: mockQuery,
    },
  })),
}));

vi.mock("@/lib/auth", () => ({
  getAuthPrincipal: vi.fn(),
}));

import { getAuthPrincipal } from "@/lib/auth";

const mockGetAuth = vi.mocked(getAuthPrincipal);

const fakePrincipal: EasyAuthPrincipal = {
  userId: "user-1",
  githubLogin: "testuser",
  email: "test@example.com",
  avatarUrl: "",
};

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url));
}

function emptyFetchAll(resources: unknown[] = []) {
  return { fetchAll: vi.fn().mockResolvedValue({ resources }) };
}

describe("GET /api/me", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
  });

  it("returns principal and roles from Cosmos", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    mockQuery.mockReturnValue(
      emptyFetchAll([
        { hackathonId: "h1", role: "admin" },
        { hackathonId: "h2", role: "coach" },
      ]),
    );

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.principal.userId).toBe("user-1");
    expect(body.data.roles).toHaveLength(2);
    expect(body.data.highestRole).toBe("admin");
  });

  it("derives highest role correctly (coach when no admin)", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    mockQuery.mockReturnValue(
      emptyFetchAll([
        { hackathonId: "h1", role: "hacker" },
        { hackathonId: "h2", role: "coach" },
      ]),
    );

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.highestRole).toBe("coach");
  });

  it("returns null highestRole when no roles exist", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    mockQuery.mockReturnValue(emptyFetchAll([]));

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.highestRole).toBeNull();
    expect(body.data.roles).toHaveLength(0);
  });

  it("uses DEV_USER_ROLE in development mode", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_USER_ROLE", "admin");

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.roles).toEqual([{ hackathonId: "dev", role: "admin" }]);
    expect(body.data.highestRole).toBe("admin");
  });

  it("falls back to Cosmos when DEV_USER_ROLE is invalid", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_USER_ROLE", "superuser");
    mockQuery.mockReturnValue(emptyFetchAll([]));

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.roles).toHaveLength(0);
  });

  it("handles Cosmos query errors gracefully", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockRejectedValue(new Error("Cosmos unavailable")),
    });

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.roles).toHaveLength(0);
  });
});
