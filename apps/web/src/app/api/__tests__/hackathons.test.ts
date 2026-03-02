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

// ── Tests ──────────────────────────────────────────────────

describe("POST /api/hackathons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue([]);
    mockExecute.mockResolvedValue(1);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { POST } = await import("../hackathons/route");
    const req = createRequest("POST", "http://localhost/api/hackathons", {
      name: "Test Hack",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(401);
  });

  it("creates a hackathon with valid input", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);

    const { POST } = await import("../hackathons/route");
    const req = createRequest("POST", "http://localhost/api/hackathons", {
      name: "My Hackathon",
      description: "A test hackathon",
      teamSize: 4,
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.name).toBe("My Hackathon");
    expect(body.data.status).toBe("draft");
    expect(body.data.eventCode).toMatch(/^\d{4}$/);
    expect(body.data.teamSize).toBe(4);
  });

  it("returns 400 with missing name", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);

    const { POST } = await import("../hackathons/route");
    const req = createRequest("POST", "http://localhost/api/hackathons", {});
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });

  it("auto-generates unique 4-digit event code", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    // First call returns collision, subsequent calls succeed
    mockQuery.mockResolvedValueOnce([{ id: "existing" }]).mockResolvedValue([]);

    const { POST } = await import("../hackathons/route");
    const req = createRequest("POST", "http://localhost/api/hackathons", {
      name: "Code Collision Test",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.eventCode).toMatch(/^\d{4}$/);
  });
});

describe("GET /api/hackathons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated hackathons", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockQuery.mockResolvedValueOnce([
      { id: "h1", name: "Hack 1", status: "active" },
    ]);

    const { GET } = await import("../hackathons/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/hackathons?status=active",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.items).toHaveLength(1);
  });
});

describe("GET /api/hackathons/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when hackathon not found", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { GET } = await import("../hackathons/[id]/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/hackathons/nonexistent",
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns hackathon for admin", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce({
      id: "h1",
      name: "Test",
      status: "active",
    });

    const { GET } = await import("../hackathons/[id]/route");
    const req = createRequest("GET", "http://localhost/api/hackathons/h1");
    const res = await GET(req, {
      params: Promise.resolve({ id: "h1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("h1");
  });
});

describe("PATCH /api/hackathons/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("enforces valid state transitions (draft → active)", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    // 1: read existing, 2: re-read after update
    mockQueryOne
      .mockResolvedValueOnce({ id: "h1", name: "Test", status: "draft" })
      .mockResolvedValueOnce({ id: "h1", name: "Test", status: "active" });
    mockExecute.mockResolvedValue(1);
    // Progression init: teams query + challenges query — empty for simplicity
    mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      status: "active",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(200);
  });

  it("rejects invalid state transition (draft → archived)", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce({
      id: "h1",
      name: "Test",
      status: "draft",
    });

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      status: "archived",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toContain("Invalid transition");
  });

  it("rejects state transition from archived", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce({
      id: "h1",
      name: "Test",
      status: "archived",
    });

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      status: "active",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(422);
  });

  it("returns 403 for non-admin role", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("hacker");

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      name: "Updated",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = new NextRequest("http://localhost/api/hackathons/h1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not json{",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid update payload", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      teamSize: -5,
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 when updating non-existent hackathon", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      name: "New Name",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(404);
  });

  it("updates name without status change", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne
      .mockResolvedValueOnce({ id: "h1", name: "Old", status: "draft" })
      .mockResolvedValueOnce({ id: "h1", name: "New Name", status: "draft" });
    mockExecute.mockResolvedValue(1);

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      name: "New Name",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("New Name");
  });

  it("archives an active hackathon", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne
      .mockResolvedValueOnce({ id: "h1", name: "Test", status: "active" })
      .mockResolvedValueOnce({
        id: "h1",
        name: "Test",
        status: "archived",
      });
    mockExecute.mockResolvedValue(1);

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      status: "archived",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(200);
  });

  it("initializes progression when activating with teams and challenges", async () => {
    mockGetAuth.mockReturnValue(fakePrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne
      .mockResolvedValueOnce({ id: "h1", name: "Test", status: "draft" })
      .mockResolvedValueOnce({ id: "h1", name: "Test", status: "active" });
    mockExecute.mockResolvedValue(1);
    mockQuery
      .mockResolvedValueOnce([{ id: "team-1" }, { id: "team-2" }])
      .mockResolvedValueOnce([{ id: "ch-1" }]);

    const { PATCH } = await import("../hackathons/[id]/route");
    const req = createRequest("PATCH", "http://localhost/api/hackathons/h1", {
      status: "active",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(res.status).toBe(200);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });
});
