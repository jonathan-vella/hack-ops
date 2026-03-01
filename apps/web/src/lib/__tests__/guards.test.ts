import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("../auth", () => ({
  getAuthPrincipal: vi.fn(),
}));
vi.mock("../roles", () => ({
  resolveRole: vi.fn(),
  getDevRole: vi.fn().mockReturnValue(null),
  isPrimaryAdmin: vi.fn(),
}));

import { requireRole, protectPrimaryAdmin } from "../guards";
import { getAuthPrincipal } from "../auth";
import { resolveRole, isPrimaryAdmin } from "../roles";
import type { EasyAuthPrincipal } from "@hackops/shared";

const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockResolveRole = vi.mocked(resolveRole);
const mockIsPrimaryAdmin = vi.mocked(isPrimaryAdmin);

const fakePrincipal: EasyAuthPrincipal = {
  userId: "user-1",
  githubLogin: "testuser",
  email: "test@example.com",
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

const defaultContext = { params: Promise.resolve({}) };

describe("requireRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no principal is found", async () => {
    mockGetAuth.mockReturnValue(null);

    const handler = vi.fn();
    const guarded = requireRole("admin")(handler);
    const req = createRequest("GET", "http://localhost/api/test?hackathonId=h1");
    const res = await guarded(req, defaultContext);

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 400 when hackathonId cannot be extracted", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);

    const handler = vi.fn();
    const guarded = requireRole("admin")(handler);
    const req = createRequest("GET", "http://localhost/api/test");
    const res = await guarded(req, defaultContext);

    expect(res.status).toBe(400);
  });

  it("returns 403 when role is not in allowed list", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("hacker");

    const handler = vi.fn();
    const guarded = requireRole("admin", "coach")(handler);
    const req = createRequest("GET", "http://localhost/api/test?hackathonId=h1");
    const res = await guarded(req, defaultContext);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Access denied");
  });

  it("calls handler with auth context when role is allowed", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("coach");

    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = requireRole("admin", "coach")(handler);
    const req = createRequest("GET", "http://localhost/api/test?hackathonId=h1");
    const res = await guarded(req, defaultContext);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    const auth = handler.mock.calls[0][2];
    expect(auth.principal).toEqual(fakePrincipal);
    expect(auth.role).toBe("coach");
    expect(auth.hackathonId).toBe("h1");
  });

  it("extracts hackathonId from request body for POST", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = requireRole("admin")(handler);
    const req = createRequest("POST", "http://localhost/api/test", {
      hackathonId: "h2",
    });
    const res = await guarded(req, defaultContext);

    expect(res.status).toBe(200);
    const auth = handler.mock.calls[0][2];
    expect(auth.hackathonId).toBe("h2");
  });

  it("extracts hackathonId from route params", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }));
    const guarded = requireRole("admin")(handler);
    const req = createRequest("GET", "http://localhost/api/hackathons/h3");
    const context = { params: Promise.resolve({ hackathonId: "h3" }) };
    const res = await guarded(req, context);

    expect(res.status).toBe(200);
    const auth = handler.mock.calls[0][2];
    expect(auth.hackathonId).toBe("h3");
  });
});

describe("protectPrimaryAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 response when target is primary admin", async () => {
    mockIsPrimaryAdmin.mockResolvedValue(true);
    const res = await protectPrimaryAdmin("user-1", "hack-1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("returns null when target is not primary admin", async () => {
    mockIsPrimaryAdmin.mockResolvedValue(false);
    const res = await protectPrimaryAdmin("user-2", "hack-1");
    expect(res).toBeNull();
  });
});
