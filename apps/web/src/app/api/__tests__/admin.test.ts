import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { EasyAuthPrincipal } from "@hackops/shared";

// ── Mocks ──────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockCreate = vi.fn();
const mockRead = vi.fn();
const mockReplace = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/cosmos", () => ({
  getContainer: vi.fn(() => ({
    items: {
      query: mockQuery,
      create: mockCreate,
    },
    item: vi.fn(() => ({
      read: mockRead,
      replace: mockReplace,
      delete: mockDelete,
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
  isGlobalAdmin: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
}));

import { getAuthPrincipal } from "@/lib/auth";
import { resolveRole } from "@/lib/roles";
import { isGlobalAdmin } from "@/lib/roles";
import { auditLog } from "@/lib/audit";

const mockGetAuth = vi.mocked(getAuthPrincipal);
const mockResolveRole = vi.mocked(resolveRole);
const mockIsGlobalAdmin = vi.mocked(isGlobalAdmin);
const mockAuditLog = vi.mocked(auditLog);

const adminPrincipal: EasyAuthPrincipal = {
  userId: "user-admin-1",
  githubLogin: "admin-user",
  email: "admin@example.com",
  avatarUrl: "",
};

const coachPrincipal: EasyAuthPrincipal = {
  userId: "user-coach-1",
  githubLogin: "coach-user",
  email: "coach@example.com",
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

// ── Role Invite Tests ──────────────────────────────────────

describe("POST /api/roles/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      fetchNext: vi
        .fn()
        .mockResolvedValue({ resources: [], continuationToken: null }),
    });
    mockCreate.mockResolvedValue({ resource: {} });
    mockRead.mockResolvedValue({
      resource: { id: "hack-1", name: "Test Hackathon" },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "hack-1",
      githubLogin: "coach-jane",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not admin", async () => {
    mockGetAuth.mockReturnValue(coachPrincipal);
    mockResolveRole.mockResolvedValue("coach");

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "hack-1",
      githubLogin: "new-coach",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when body is invalid", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "hack-1",
      // missing githubLogin and role
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it("returns 201 when role invite succeeds", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    });

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "hack-1",
      githubLogin: "coach-jane",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.githubLogin).toBe("coach-jane");
    expect(json.data.role).toBe("coach");
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "role.invite",
        hackathonId: "hack-1",
      }),
    );
  });

  it("returns 409 when user already has a role", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: "existing-role", githubLogin: "coach-jane" }],
      }),
    });

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "hack-1",
      githubLogin: "coach-jane",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(409);
  });

  it("returns 404 when hackathon does not exist", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockRead.mockResolvedValue({ resource: null });

    const { POST } = await import("../roles/invite/route");
    const req = createRequest("POST", "http://localhost/api/roles/invite", {
      hackathonId: "nonexistent",
      githubLogin: "someone",
      role: "coach",
    });
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(404);
  });
});

// ── Role List Tests ────────────────────────────────────────

describe("GET /api/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { GET } = await import("../roles/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/roles?hackathonId=hack-1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns paginated role list", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockReturnValue({
      fetchNext: vi.fn().mockResolvedValue({
        resources: [
          {
            id: "role-1",
            hackathonId: "hack-1",
            githubUserId: "user-1",
            githubLogin: "admin-user",
            role: "admin",
            isPrimaryAdmin: true,
            assignedBy: "system",
            assignedAt: "2026-01-01T00:00:00Z",
          },
        ],
        continuationToken: null,
      }),
    });

    const { GET } = await import("../roles/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/roles?hackathonId=hack-1",
    );
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].role).toBe("admin");
  });
});

// ── Role Delete Tests ──────────────────────────────────────

describe("DELETE /api/roles/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockResolvedValue({});
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { DELETE } = await import("../roles/[id]/route");
    const req = createRequest(
      "DELETE",
      "http://localhost/api/roles/role-coach-1",
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "role-coach-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when role not found", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    });

    const { DELETE } = await import("../roles/[id]/route");
    const req = createRequest(
      "DELETE",
      "http://localhost/api/roles/role-nonexist?hackathonId=hack-1",
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "role-nonexist" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when trying to delete primary admin", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          {
            id: "role-primary",
            hackathonId: "hack-1",
            isPrimaryAdmin: true,
            githubLogin: "primary-admin",
            role: "admin",
          },
        ],
      }),
    });

    const { DELETE } = await import("../roles/[id]/route");
    const req = createRequest(
      "DELETE",
      "http://localhost/api/roles/role-primary?hackathonId=hack-1",
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "role-primary" }),
    });
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.error).toContain("primary admin");
  });

  it("returns 204 when role is deleted successfully", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          {
            id: "role-coach-1",
            hackathonId: "hack-1",
            isPrimaryAdmin: false,
            githubLogin: "some-coach",
            role: "coach",
          },
        ],
      }),
    });

    const { DELETE } = await import("../roles/[id]/route");
    const req = createRequest(
      "DELETE",
      "http://localhost/api/roles/role-coach-1?hackathonId=hack-1",
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "role-coach-1" }),
    });
    expect(res.status).toBe(204);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "role.remove",
        targetId: "role-coach-1",
      }),
    );
  });
});

// ── Audit Trail Tests ──────────────────────────────────────

describe("GET /api/audit/:hackathonId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { GET } = await import("../audit/[hackathonId]/route");
    const req = createRequest("GET", "http://localhost/api/audit/hack-1");
    const res = await GET(req, {
      params: Promise.resolve({ hackathonId: "hack-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns paginated audit entries", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockReturnValue({
      fetchNext: vi.fn().mockResolvedValue({
        resources: [
          {
            id: "audit-1",
            hackathonId: "hack-1",
            action: "submission.approve",
            targetType: "submission",
            targetId: "sub-1",
            performedBy: "user-coach-1",
            performedAt: "2026-02-27T10:00:00Z",
            reason: "Good work",
            details: null,
          },
        ],
        continuationToken: null,
      }),
    });

    const { GET } = await import("../audit/[hackathonId]/route");
    const req = createRequest("GET", "http://localhost/api/audit/hack-1");
    const res = await GET(req, {
      params: Promise.resolve({ hackathonId: "hack-1" }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].action).toBe("submission.approve");
  });

  it("supports action filter", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockResolveRole.mockResolvedValue("admin");
    mockQuery.mockReturnValue({
      fetchNext: vi.fn().mockResolvedValue({
        resources: [],
        continuationToken: null,
      }),
    });

    const { GET } = await import("../audit/[hackathonId]/route");
    const req = createRequest(
      "GET",
      "http://localhost/api/audit/hack-1?action=score.override",
    );
    const res = await GET(req, {
      params: Promise.resolve({ hackathonId: "hack-1" }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.items).toHaveLength(0);
  });
});

// ── Config GET Tests ───────────────────────────────────────

describe("GET /api/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { GET } = await import("../config/route");
    const req = createRequest("GET", "http://localhost/api/config");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not admin", async () => {
    mockGetAuth.mockReturnValue(coachPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(false);

    const { GET } = await import("../config/route");
    const req = createRequest("GET", "http://localhost/api/config");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it("returns all config values", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(true);
    mockQuery.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          {
            id: "cfg-leaderboard-refresh-interval",
            key: "leaderboard-refresh-interval",
            value: 30000,
            updatedBy: "user-admin-1",
            updatedAt: "2026-02-15T09:30:00Z",
          },
          {
            id: "cfg-max-team-size",
            key: "max-team-size",
            value: 5,
            updatedBy: "user-admin-1",
            updatedAt: "2026-02-15T09:30:00Z",
          },
        ],
      }),
    });

    const { GET } = await import("../config/route");
    const req = createRequest("GET", "http://localhost/api/config");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].key).toBe("leaderboard-refresh-interval");
  });
});

// ── Config PATCH Tests ─────────────────────────────────────

describe("PATCH /api/config/:key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace.mockResolvedValue({});
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetAuth.mockReturnValue(null);

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/config/max-team-size",
      { value: 6 },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "max-team-size" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not admin", async () => {
    mockGetAuth.mockReturnValue(coachPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(false);

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/config/max-team-size",
      { value: 6 },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "max-team-size" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for read-only keys", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(true);

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/config/primary-admin",
      { value: "new-admin-id" },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "primary-admin" }),
    });
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.error).toContain("read-only");
  });

  it("returns 404 when config key does not exist", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(true);
    mockRead.mockResolvedValue({ resource: null });

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/config/nonexistent-key",
      { value: 42 },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "nonexistent-key" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 when config is updated successfully", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(true);
    mockRead.mockResolvedValue({
      resource: {
        id: "cfg-max-team-size",
        _type: "config",
        key: "max-team-size",
        value: 5,
        updatedBy: "user-admin-1",
        updatedAt: "2026-02-15T09:30:00Z",
      },
    });

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/config/max-team-size",
      { value: 8 },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "max-team-size" }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.value).toBe(8);
    expect(json.data.key).toBe("max-team-size");
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "config.update",
        details: expect.objectContaining({
          oldValue: 5,
          newValue: 8,
        }),
      }),
    );
  });

  it("returns 400 when body is invalid", async () => {
    mockGetAuth.mockReturnValue(adminPrincipal);
    mockIsGlobalAdmin.mockResolvedValue(true);

    const { PATCH } = await import("../config/[key]/route");
    const req = createRequest(
      "PATCH",
      "http://localhost/api/config/max-team-size",
      { notValue: 8 },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ key: "max-team-size" }),
    });
    expect(res.status).toBe(400);
  });
});
