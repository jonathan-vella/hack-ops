import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/sql", () => ({
  query: vi.fn().mockResolvedValue([{ ok: 1 }]),
}));

describe("GET /api/health", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("returns status ok with timestamp when no SQL_SERVER", async () => {
    delete process.env.SQL_SERVER;

    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const { GET } = await import("../health/route");
    now = 121_000;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
    expect(body.checks).toEqual([]);
  });

  it("returns status ok with sql check when SQL_SERVER is set", async () => {
    process.env.SQL_SERVER = "fake-sql-server.database.windows.net";

    // Prime the mock module before the route's fire-and-forget prewarmSql
    const { query } = await import("@/lib/sql");
    vi.mocked(query).mockResolvedValue([{ ok: 1 }] as never);

    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const { GET } = await import("../health/route");
    now = 121_000;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.checks).toHaveLength(1);
    expect(body.checks[0].name).toBe("sql-database");
    expect(body.checks[0].status).toBe("ok");
    expect(body.checks[0].responseTimeMs).toBeTypeOf("number");
  });

  it("returns 503 when sql check fails", async () => {
    process.env.SQL_SERVER = "fake-sql-server.database.windows.net";

    const { query } = await import("@/lib/sql");
    vi.mocked(query).mockRejectedValue(new Error("Connection refused"));

    let now = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);

    const { GET } = await import("../health/route");
    now = 121_000;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.checks[0].name).toBe("sql-database");
    expect(body.checks[0].status).toBe("unhealthy");
    expect(body.checks[0].error).toBe("Connection refused");
  });
});
