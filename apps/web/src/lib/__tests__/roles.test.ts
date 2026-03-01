import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../cosmos", () => ({
  getContainer: vi.fn(),
}));

import {
  resolveRole,
  isPrimaryAdmin,
  getDevRole,
  isGlobalAdmin,
} from "../roles";
import { getContainer } from "../cosmos";

const mockGetContainer = vi.mocked(getContainer);

function mockQuery(resources: unknown[]) {
  const fetchAll = vi.fn().mockResolvedValue({ resources });
  const query = vi.fn().mockReturnValue({ fetchAll });
  mockGetContainer.mockReturnValue({ items: { query } } as never);
}

describe("resolveRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the role when found", async () => {
    mockQuery([{ role: "coach", isPrimaryAdmin: false }]);
    const role = await resolveRole("user-1", "hack-1");
    expect(role).toBe("coach");
  });

  it("returns null when no role exists", async () => {
    mockQuery([]);
    const role = await resolveRole("user-2", "hack-1");
    expect(role).toBeNull();
  });
});

describe("isPrimaryAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when user is primary admin", async () => {
    mockQuery([{ isPrimaryAdmin: true }]);
    expect(await isPrimaryAdmin("user-1", "hack-1")).toBe(true);
  });

  it("returns false when user is not primary admin", async () => {
    mockQuery([]);
    expect(await isPrimaryAdmin("user-2", "hack-1")).toBe(false);
  });
});

describe("getDevRole", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the role from env in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_USER_ROLE", "admin");
    expect(getDevRole()).toBe("admin");
  });

  it("returns null for invalid role value", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_USER_ROLE", "superuser");
    expect(getDevRole()).toBeNull();
  });

  it("returns null in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_USER_ROLE", "admin");
    expect(getDevRole()).toBeNull();
  });

  it("returns null when DEV_USER_ROLE is not set", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.DEV_USER_ROLE;
    expect(getDevRole()).toBeNull();
  });
});

describe("isGlobalAdmin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when user has admin role in any hackathon", async () => {
    mockQuery([{ role: "admin" }]);
    expect(await isGlobalAdmin("user-1")).toBe(true);
  });

  it("returns false when user has no admin role", async () => {
    mockQuery([]);
    expect(await isGlobalAdmin("user-2")).toBe(false);
  });

  it("returns true via dev role bypass in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_USER_ROLE", "admin");
    expect(await isGlobalAdmin("any-user")).toBe(true);
  });

  it("does not bypass in development when dev role is not admin", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_USER_ROLE", "coach");
    mockQuery([]);
    expect(await isGlobalAdmin("user-3")).toBe(false);
  });
});
