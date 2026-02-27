import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { EasyAuthPrincipal } from "@hackops/shared";
import { _resetForTest } from "@/lib/rate-limiter";

// ── Mocks ──────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/cosmos", () => ({
  getContainer: vi.fn(() => ({
    items: {
      query: mockQuery,
      create: mockCreate,
    },
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

const mockGetAuth = vi.mocked(getAuthPrincipal);

const fakePrincipal: EasyAuthPrincipal = {
  userId: "user-hacker-1",
  githubLogin: "hacker-dev",
  email: "hacker@example.com",
  avatarUrl: "",
};

function createRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
  ip?: string,
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (ip) headers["x-forwarded-for"] = ip;
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Tests ──────────────────────────────────────────────────

describe("POST /api/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTest();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { POST } = await import("../join/route");
    const req = createRequest("POST", "http://localhost/api/join", {
      eventCode: "4821",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
  });

  it("joins with valid event code", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);

    // First query: find hackathon by event code
    // Second query: check existing hacker membership
    let queryCount = 0;
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return Promise.resolve({
            resources: [
              { id: "hack-1", name: "Test Hack", status: "active" },
            ],
          });
        }
        return Promise.resolve({ resources: [] });
      }),
    });
    mockCreate.mockResolvedValue({ resource: {} });

    const { POST } = await import("../join/route");
    const req = createRequest(
      "POST",
      "http://localhost/api/join",
      { eventCode: "4821" },
      "10.0.0.1",
    );
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.hackathonId).toBe("hack-1");
    expect(body.data.hackathonName).toBe("Test Hack");
  });

  it("returns 404 for invalid event code", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    });

    const { POST } = await import("../join/route");
    const req = createRequest(
      "POST",
      "http://localhost/api/join",
      { eventCode: "9999" },
      "10.0.0.2",
    );
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid event code format", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);

    const { POST } = await import("../join/route");
    const req = createRequest(
      "POST",
      "http://localhost/api/join",
      { eventCode: "abc" },
      "10.0.0.3",
    );
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });

  it("returns 409 when already joined", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);

    let queryCount = 0;
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return Promise.resolve({
            resources: [
              { id: "hack-1", name: "Test Hack", status: "active" },
            ],
          });
        }
        return Promise.resolve({
          resources: [{ id: "existing-hacker" }],
        });
      }),
    });

    const { POST } = await import("../join/route");
    const req = createRequest(
      "POST",
      "http://localhost/api/join",
      { eventCode: "4821" },
      "10.0.0.4",
    );
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(409);
  });

  it("returns 429 after 5 attempts from same IP", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    });

    const { POST } = await import("../join/route");
    const ip = "10.0.0.99";

    // First 5 requests should succeed (404 due to no hackathon, not 429)
    for (let i = 0; i < 5; i++) {
      const req = createRequest(
        "POST",
        "http://localhost/api/join",
        { eventCode: "1234" },
        ip,
      );
      const res = await POST(req, { params: Promise.resolve({}) });
      expect(res.status).not.toBe(429);
    }

    // 6th request should be rate-limited
    const req = createRequest(
      "POST",
      "http://localhost/api/join",
      { eventCode: "1234" },
      ip,
    );
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(429);
  });
});
