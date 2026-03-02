import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { EasyAuthPrincipal } from "@hackops/shared";

const mockQuery = vi.fn();
const mockExecute = vi.fn();

vi.mock("@/lib/sql", () => ({
  query: mockQuery,
  execute: mockExecute,
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

  it("returns principal and roles from database", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    mockQuery.mockResolvedValue([
      { hackathonId: "h1", role: "admin" },
      { hackathonId: "h2", role: "coach" },
    ]);

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
    mockQuery.mockResolvedValue([
      { hackathonId: "h1", role: "hacker" },
      { hackathonId: "h2", role: "coach" },
    ]);

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.highestRole).toBe("coach");
  });

  it("returns null highestRole when no roles exist", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    mockQuery.mockResolvedValue([]);

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

  it("falls back to SQL when DEV_USER_ROLE is invalid", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_USER_ROLE", "superuser");
    mockQuery.mockResolvedValue([]);

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.roles).toHaveLength(0);
  });

  it("handles SQL query errors gracefully", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    mockQuery.mockRejectedValue(new Error("SQL connection failed"));

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.roles).toHaveLength(0);
  });

  it("auto-creates admin role for bootstrap admin by userId", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_GITHUB_IDS", "user-1,other-admin");
    mockQuery.mockResolvedValue([]);
    mockExecute.mockResolvedValue(1);

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.roles).toContainEqual({
      hackathonId: "__global__",
      role: "admin",
    });
    expect(mockExecute).toHaveBeenCalled();
  });

  it("auto-creates admin role for bootstrap admin by githubLogin", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_GITHUB_IDS", "testuser");
    mockQuery.mockResolvedValue([]);
    mockExecute.mockResolvedValue(1);

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.roles).toContainEqual({
      hackathonId: "__global__",
      role: "admin",
    });
  });

  it("skips bootstrap when user already has admin role", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_GITHUB_IDS", "user-1");
    mockQuery.mockResolvedValue([
      { hackathonId: "__global__", role: "admin" },
    ]);

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.roles).toHaveLength(1);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("handles bootstrap execute failure gracefully", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_GITHUB_IDS", "user-1");
    mockQuery.mockResolvedValue([]);
    mockExecute.mockRejectedValue(new Error("MERGE failed"));

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.roles).toContainEqual({
      hackathonId: "__global__",
      role: "admin",
    });
  });

  it("skips bootstrap when ADMIN_GITHUB_IDS is empty", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_GITHUB_IDS", "");
    mockQuery.mockResolvedValue([
      { hackathonId: "h1", role: "hacker" },
    ]);

    const { GET } = await import("../me/route");
    const req = createRequest("http://localhost/api/me");
    const res = await GET(req);
    const body = await res.json();

    expect(body.data.roles).toHaveLength(1);
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
