/**
 * Next.js instrumentation hook — runs once at server startup.
 *
 * Initializes Azure Monitor OpenTelemetry so traces, metrics, and logs
 * are sent to Application Insights automatically.
 *
 * The connection string is read from the APPLICATIONINSIGHTS_CONNECTION_STRING
 * env var, which is set by the Bicep app-service module. If the env var is
 * missing (e.g. local dev without App Insights), instrumentation is skipped.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_PUBLIC_RUNTIME === "edge") return;

  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.info(
      "[instrumentation] APPLICATIONINSIGHTS_CONNECTION_STRING not set — skipping Azure Monitor init",
    );
    return;
  }

  try {
    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");

    useAzureMonitor({
      azureMonitorExporterOptions: { connectionString },
    });

    console.info("[instrumentation] Azure Monitor OpenTelemetry initialized");
  } catch (err) {
    console.error("[instrumentation] Failed to initialize Azure Monitor:", err);
  }
}
