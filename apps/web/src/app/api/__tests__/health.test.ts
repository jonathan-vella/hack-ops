import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cosmos", () => ({
  getContainer: vi.fn(() => ({
    items: {
      query: vi.fn(() => ({
        fetchNext: vi.fn().mockResolvedValue({ resources: [1] }),
      })),
    },
  })),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns status ok with timestamp when no COSMOS_ENDPOINT", async () => {
    delete process.env.COSMOS_ENDPOINT;
    const { GET } = await import("../health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
    expect(body.checks).toEqual([]);
  });

  it("returns status ok with cosmos check when COSMOS_ENDPOINT is set", async () => {
    process.env.COSMOS_ENDPOINT =
      "https://fake-cosmos.documents.azure.com:443/";
    const { GET } = await import("../health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks).toHaveLength(1);
    expect(body.checks[0].name).toBe("cosmos-db");
    expect(body.checks[0].status).toBe("ok");
    expect(body.checks[0].responseTimeMs).toBeTypeOf("number");
  });

  it("returns 503 when cosmos check fails", async () => {
    process.env.COSMOS_ENDPOINT =
      "https://fake-cosmos.documents.azure.com:443/";
    const { getContainer } = await import("@/lib/cosmos");
    vi.mocked(getContainer).mockReturnValue({
      items: {
        query: vi.fn(() => ({
          fetchNext: vi.fn().mockRejectedValue(new Error("Connection refused")),
        })),
      },
    } as never);

    const { GET } = await import("../health/route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.checks[0].name).toBe("cosmos-db");
    expect(body.checks[0].status).toBe("unhealthy");
    expect(body.checks[0].error).toBe("Connection refused");
  });
});
