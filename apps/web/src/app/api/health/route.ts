import { NextResponse } from "next/server";
import type { HealthAPI } from "@hackops/shared";

// Pre-warm Cosmos connection eagerly at module load
let cosmosPrewarmed = false;
const startedAt = Date.now();
const WARMUP_PERIOD_MS = 60_000;

async function prewarmCosmos(): Promise<void> {
  if (cosmosPrewarmed || !process.env.COSMOS_ENDPOINT) return;
  try {
    const { getContainer } = await import("@/lib/cosmos");
    getContainer("hackathons");
    cosmosPrewarmed = true;
  } catch {
    // Swallow — warmup is best-effort
  }
}

// Fire-and-forget at module load
void prewarmCosmos();

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

  // ── Cosmos DB connectivity ────────────────────────────────────
  if (process.env.COSMOS_ENDPOINT) {
    const start = Date.now();
    try {
      const { getContainer } = await import("@/lib/cosmos");
      const container = getContainer("hackathons");
      await container.items.query("SELECT VALUE 1").fetchNext();
      checks.push({
        name: "cosmos-db",
        status: "ok",
        responseTimeMs: Date.now() - start,
      });
    } catch (err) {
      overall = "unhealthy";
      checks.push({
        name: "cosmos-db",
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
