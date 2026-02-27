import { describe, it, expect } from "vitest";

describe("GET /api/health", () => {
  it("returns status ok with timestamp", async () => {
    const { GET } = await import("../health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
  });
});
