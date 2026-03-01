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
  isGlobalAdmin: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
}));

import { query, queryOne, execute } from "@/lib/sql";
import { getAuthPrincipal } from "@/lib/auth";
import { resolveRole, isGlobalAdmin } from "@/lib/roles";

const mockQuery = vi.mocked(query);
const mockQueryOne = vi.mocked(queryOne);
const mockExecute = vi.mocked(execute);
const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockResolveRole = vi.mocked(resolveRole);
const mockIsGlobalAdmin = vi.mocked(isGlobalAdmin);

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

// ── Role Invite ────────────────────────────────────────────

describe("POST /api/roles/invite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invites a coach role", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    // queryOne: hackathon exists
    mockQueryOne.mockResolvedValueOnce({ id: "h1" });
    // query: duplicate role check (none)
    mockQuery.mockResolvedValueOnce([]);
    // execute: INSERT role
    mockExecute.mockResolvedValueOnce(1);

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "h1",
      githubLogin: "coach-user",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.role).toBe("coach");
    expect(body.data.githubLogin).toBe("coach-user");
  });

  it("returns 404 when hackathon not found", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "h-missing",
      githubLogin: "coach-user",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(404);
  });

  it("returns 409 for duplicate role", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce({ id: "h1" });
    mockQuery.mockResolvedValueOnce([{ id: "existing-role" }]);

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "h1",
      githubLogin: "coach-user",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(409);
  });

  it("returns 403 for non-admin", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("hacker");

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "h1",
      githubLogin: "someone",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(403);
  });
});

// ── Role List ──────────────────────────────────────────────

describe("GET /api/roles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns roles for a hackathon", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQuery.mockResolvedValueOnce([
      {
        id: "r1",
        hackathonId: "h1",
        githubUserId: "user-1",
        githubLogin: "admin-user",
        role: "admin",
        isPrimaryAdmin: 1,
        assignedBy: "system",
        assignedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "r2",
        hackathonId: "h1",
        githubUserId: "user-2",
        githubLogin: "coach-user",
        role: "coach",
        isPrimaryAdmin: 0,
        assignedBy: "user-1",
        assignedAt: "2024-01-02T00:00:00Z",
      },
    ]);

    const { GET } = await import("../roles/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/roles?hackathonId=h1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.items[0].isPrimaryAdmin).toBe(true);
    expect(body.data.items[1].isPrimaryAdmin).toBe(false);
  });

  it("returns 400 without hackathonId", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const { GET } = await import("../roles/route");
    const req = createRequest("GET", "http://localhost/api/roles");
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });
});

// ── Role Delete ────────────────────────────────────────────

describe("DELETE /api/roles/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a non-primary-admin role", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "r2",
      hackathonId: "h1",
      githubLogin: "coach-user",
      role: "coach",
      isPrimaryAdmin: 0,
    });
    mockExecute.mockResolvedValueOnce(1);

    const { DELETE } = await import("../roles/[id]/route");
    const req = createRequest("DELETE", "http://localhost/api/roles/r2");
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "r2" }),
    });

    expect(res.status).toBe(204);
  });

  it("returns 403 when trying to remove primary admin", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQueryOne.mockResolvedValueOnce({
      id: "r1",
      hackathonId: "h1",
      githubLogin: "admin-user",
      role: "admin",
      isPrimaryAdmin: 1,
    });

    const { DELETE } = await import("../roles/[id]/route");
    const req = createRequest("DELETE", "http://localhost/api/roles/r1");
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "r1" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("primary admin");
  });

  it("returns 404 for missing role", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQueryOne.mockResolvedValueOnce(null);

    const { DELETE } = await import("../roles/[id]/route");
    const req = createRequest("DELETE", "http://localhost/api/roles/missing");
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });
});

// ── Audit Trail ────────────────────────────────────────────

describe("GET /api/audit/:hackathonId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns audit entries for a hackathon", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    mockQuery.mockResolvedValueOnce([
      {
        id: "a1",
        hackathonId: "h1",
        action: "hackathon.create",
        targetType: "hackathon",
        targetId: "h1",
        performedBy: "user-admin-1",
        performedAt: "2024-01-01T00:00:00Z",
        reason: null,
        details: JSON.stringify({ name: "Hack 2025" }),
      },
    ]);

    const { GET } = await import("../audit/[hackathonId]/route");
    const req = createRequest("GET", "http://localhost/api/audit/h1");
    const res = await GET(req, {
      params: Promise.resolve({ hackathonId: "h1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].action).toBe("hackathon.create");
    expect(body.data.items[0].details).toEqual({ name: "Hack 2025" });
  });

  it("filters audit entries by action", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockResolvedValueOnce([]);

    const { GET } = await import("../audit/[hackathonId]/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/audit/h1?action=hackathon.update",
    );
    const res = await GET(req, {
      params: Promise.resolve({ hackathonId: "h1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(0);
  });
});

// ── Config ─────────────────────────────────────────────────

describe("GET /api/config", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns config items for global admin", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(true);

    mockQuery.mockResolvedValueOnce([
      {
        id: "cfg-theme",
        key: "theme",
        value: "dark",
        updatedBy: "system",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ]);

    const { GET } = await import("../config/route");
    const req = createRequest("GET", "http://localhost/api/config");
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].key).toBe("theme");
  });

  it("returns 403 for non-global-admin", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(false);

    const { GET } = await import("../config/route");
    const req = createRequest("GET", "http://localhost/api/config");
    const res = await GET(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/config/:key", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates a config value", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(true);

    // queryOne: existing config
    mockQueryOne.mockResolvedValueOnce({
      id: "cfg-theme",
      key: "theme",
      value: "dark",
      updatedBy: "system",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    // execute: UPDATE
    mockExecute.mockResolvedValueOnce(1);

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest("PATCH", "http://localhost/api/config/theme", {
      value: "light",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "theme" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.value).toBe("light");
  });

  it("returns 404 for missing config key", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(true);
    mockQueryOne.mockResolvedValueOnce(null);

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest("PATCH", "http://localhost/api/config/unknown", {
      value: "something",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "unknown" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 403 for non-global-admin", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(false);

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest("PATCH", "http://localhost/api/config/theme", {
      value: "light",
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "theme" }),
    });

    expect(res.status).toBe(403);
  });
});
