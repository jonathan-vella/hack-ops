import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, _resetForTest } from "../rate-limiter";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetForTest();
  });

  it("allows first request and reports correct remaining count", () => {
    const result = checkRateLimit("ip1:api", 100);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("ip2:join", 5);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("ip3:join", 5);
    }
    const result = checkRateLimit("ip3:join", 5);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks different keys independently", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("ip4:join", 5);
    }
    const joinResult = checkRateLimit("ip4:join", 5);
    const apiResult = checkRateLimit("ip4:api", 100);
    expect(joinResult.allowed).toBe(false);
    expect(apiResult.allowed).toBe(true);
  });

  it("remaining decreases with each request", () => {
    const r1 = checkRateLimit("ip5:api", 3);
    const r2 = checkRateLimit("ip5:api", 3);
    const r3 = checkRateLimit("ip5:api", 3);
    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
  });

  it("_resetForTest clears all state", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("ip6:join", 5);
    }
    expect(checkRateLimit("ip6:join", 5).allowed).toBe(false);
    _resetForTest();
    expect(checkRateLimit("ip6:join", 5).allowed).toBe(true);
  });
});
