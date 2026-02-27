import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAuthPrincipal } from "../auth";

const validPayload = {
  auth_typ: "aad",
  claims: [
    {
      typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      val: "user-123",
    },
    {
      typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      val: "testuser",
    },
    {
      typ: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      val: "test@example.com",
    },
    { typ: "urn:github:avatar_url", val: "https://avatars.example.com/123" },
  ],
};

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

describe("getAuthPrincipal", () => {
  it("parses a valid X-MS-CLIENT-PRINCIPAL header", () => {
    const headers = new Headers({
      "x-ms-client-principal": encodePayload(validPayload),
    });
    const result = getAuthPrincipal(headers);
    expect(result).toEqual({
      userId: "user-123",
      githubLogin: "testuser",
      email: "test@example.com",
      avatarUrl: "https://avatars.example.com/123",
    });
  });

  it("returns null for malformed base64", () => {
    const headers = new Headers({
      "x-ms-client-principal": "!!!not-base64!!!",
    });
    expect(getAuthPrincipal(headers)).toBeNull();
  });

  it("returns null for invalid JSON after decode", () => {
    const headers = new Headers({
      "x-ms-client-principal": Buffer.from("not-json").toString("base64"),
    });
    expect(getAuthPrincipal(headers)).toBeNull();
  });

  it("returns null when claims is not an array", () => {
    const headers = new Headers({
      "x-ms-client-principal": encodePayload({ claims: "not-array" }),
    });
    expect(getAuthPrincipal(headers)).toBeNull();
  });

  it("returns null for missing header (non-dev)", () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = new Headers();
    expect(getAuthPrincipal(headers)).toBeNull();
    vi.unstubAllEnvs();
  });

  it("returns empty strings for missing claims", () => {
    const payload = { claims: [] as unknown[] };
    const headers = new Headers({
      "x-ms-client-principal": encodePayload(payload),
    });
    const result = getAuthPrincipal(headers);
    expect(result).toEqual({
      userId: "",
      githubLogin: "",
      email: "",
      avatarUrl: "",
    });
  });

  describe("dev bypass", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("DEV_USER_ID", "dev-123");
      vi.stubEnv("DEV_USER_LOGIN", "dev-login");
      vi.stubEnv("DEV_USER_EMAIL", "dev@test.com");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns dev principal when header is missing in development", () => {
      const result = getAuthPrincipal(new Headers());
      expect(result).toEqual({
        userId: "dev-123",
        githubLogin: "dev-login",
        email: "dev@test.com",
        avatarUrl: "",
      });
    });

    it("prefers real header over dev bypass", () => {
      const headers = new Headers({
        "x-ms-client-principal": encodePayload(validPayload),
      });
      expect(getAuthPrincipal(headers)?.userId).toBe("user-123");
    });

    it("uses defaults when optional dev vars are missing", () => {
      delete process.env.DEV_USER_LOGIN;
      delete process.env.DEV_USER_EMAIL;
      const result = getAuthPrincipal(new Headers());
      expect(result?.githubLogin).toBe("dev-user");
      expect(result?.email).toBe("dev@example.com");
    });
  });
});
