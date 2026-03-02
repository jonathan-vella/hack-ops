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
vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

import { query, execute } from "@/lib/sql";
import { getAuthPrincipal } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limiter";

const mockQuery = vi.mocked(query);
const mockExecute = vi.mocked(execute);
const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockRateLimit = vi.mocked(checkRateLimit);

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

// ── Join Tests ─────────────────────────────────────────────

describe("POST /api/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ allowed: true } as ReturnType<
      typeof checkRateLimit
    >);
  });

  it("joins hackathon with valid event code", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);

    // query: hackathon by eventCode
    mockQuery.mockResolvedValueOnce([{ id: "h1", name: "Hack 2025" }]);
    // query: existing hacker check (none)
    mockQuery.mockResolvedValueOnce([]);
    // execute: INSERT hacker
    mockExecute.mockResolvedValueOnce(1);
    // execute: INSERT role
    mockExecute.mockResolvedValueOnce(1);

    const { POST } = await import("../join/route");
    const req = createRequest("POST", "http://localhost/api/join", {
      eventCode: "2025",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.hackathonId).toBe("h1");
    expect(body.data.hackathonName).toBe("Hack 2025");
  });

  it("returns 404 for invalid event code", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);
    mockQuery.mockResolvedValueOnce([]);

    const { POST } = await import("../join/route");
    const req = createRequest("POST", "http://localhost/api/join", {
      eventCode: "9999",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Invalid or expired");
  });

  it("returns 409 for duplicate join", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);
    // query: hackathon found
    mockQuery.mockResolvedValueOnce([{ id: "h1", name: "Hack 2025" }]);
    // query: already joined
    mockQuery.mockResolvedValueOnce([{ id: "hkr-existing" }]);

    const { POST } = await import("../join/route");
    const req = createRequest("POST", "http://localhost/api/join", {
      eventCode: "2025",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Already joined");
  });

  it("returns 429 when rate limited", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);
    mockRateLimit.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 60,
    } as ReturnType<typeof checkRateLimit>);

    const { POST } = await import("../join/route");
    const req = createRequest("POST", "http://localhost/api/join", {
      eventCode: "2025",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("returns 400 for missing eventCode", async () => {
    mockGetAuth.mockReturnValue(hackerPrincipal);

    const { POST } = await import("../join/route");
    const req = createRequest("POST", "http://localhost/api/join", {});
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });
});
