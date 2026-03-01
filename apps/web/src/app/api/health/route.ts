import { NextResponse } from "next/server";
import type { HealthAPI } from "@hackops/shared";

// Pre-warm SQL connection pool eagerly at module load
let sqlPrewarmed = false;
const startedAt = Date.now();
const WARMUP_PERIOD_MS = 60_000;

async function prewarmSql(): Promise<void> {
  if (sqlPrewarmed || !process.env.SQL_SERVER) return;
  try {
    const { query } = await import("@/lib/sql");
    await query("SELECT 1 AS ok");
    sqlPrewarmed = true;
  } catch {
    // Swallow — warmup is best-effort
  }
}

// Fire-and-forget at module load
void prewarmSql();

/**
 * Health check endpoint consumed by Azure App Service Health Check.
 *
 * Returns 200 when all critical dependencies are reachable, 503 otherwise.
 * During the first 60s after container start, returns 200 with status "warming"
 * to avoid premature instance removal while the container initialises (P20).
 *
 * App Service pings this path every 60 s; after WEBSITE_HEALTHCHECK_MAXPINGFAILURES
 * consecutive failures the instance is removed from the load balancer.
 *
 * @see https://learn.microsoft.com/azure/app-service/monitor-instances-health-check
 */
export async function GET() {
  const isWarming = Date.now() - startedAt < WARMUP_PERIOD_MS;
  const checks: HealthAPI.DependencyCheck[] = [];
  let overall: HealthAPI.HealthCheckResponse["status"] = "ok";

  if (isWarming) {
    // During warmup: return 200 with "warming" status, skip dependency checks
    const body: HealthAPI.HealthCheckResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: [{ name: "warmup", status: "ok", responseTimeMs: 0 }],
    };
    return NextResponse.json(body, { status: 200 });
  }

  // ── SQL Database connectivity ──────────────────────────────────
  if (process.env.SQL_SERVER) {
    const start = Date.now();
    try {
      const { query } = await import("@/lib/sql");
      await query("SELECT 1 AS ok");
      checks.push({
        name: "sql-database",
        status: "ok",
        responseTimeMs: Date.now() - start,
      });
    } catch (err) {
      overall = "unhealthy";
      checks.push({
        name: "sql-database",
        status: "unhealthy",
        responseTimeMs: Date.now() - start,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const body: HealthAPI.HealthCheckResponse = {
    status: overall,
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(body, {
    status: overall === "ok" ? 200 : 503,
  });
}
